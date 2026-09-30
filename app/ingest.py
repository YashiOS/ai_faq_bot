import io
import logging
import threading
import uuid

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.rag import chroma_client, embedding_model
from document_config import get_collection_name


logger = logging.getLogger(__name__)


CHUNK_SIZE = 800

CHUNK_OVERLAP = 150



STAGE_UPLOADED = "uploaded"
STAGE_EXTRACTING = "extracting"
STAGE_CHUNKING = "chunking"
STAGE_EMBEDDING = "embedding"
STAGE_INDEXING = "indexing"
STAGE_READY = "ready"


class IngestionError(Exception):
    """An expected failure with a user-safe message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# In-memory job store. Fine for a single-process dev server;
# swap for Redis/a database when running multiple workers.
_jobs: dict[str, dict] = {}

_jobs_lock = threading.Lock()


def create_job(filename: str) -> dict:

    job = {
        "document_id": uuid.uuid4().hex[:12],
        "filename": filename,
        "collection_name": get_collection_name(filename),
        "status": "processing",
        "stage": STAGE_UPLOADED,
        "pages": None,
        "chunks": None,
        "error": None,
    }

    with _jobs_lock:
        _jobs[job["document_id"]] = job

    return dict(job)


def get_job(document_id: str) -> dict | None:

    with _jobs_lock:
        job = _jobs.get(document_id)
        return dict(job) if job else None


def _update_job(document_id: str, **fields):

    with _jobs_lock:
        _jobs[document_id].update(fields)


def create_chunks(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def _ingest(document_id: str, pdf_bytes: bytes):

    job = get_job(document_id)
    pdf_name = job["filename"]
    collection_name = job["collection_name"]


    # Extract text
    _update_job(document_id, stage=STAGE_EXTRACTING)

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = reader.pages
        total_pages = len(pages)
    except (PdfReadError, ValueError) as error:
        raise IngestionError(
            "invalid_pdf",
            "This file doesn't appear to be a valid PDF."
        ) from error

    if total_pages == 0:
        raise IngestionError(
            "empty_pdf",
            "This PDF has no pages."
        )

    page_texts = []

    for page_number, page in enumerate(pages, start=1):
        page_text = (page.extract_text() or "").strip()
        if page_text:
            page_texts.append((page_number, page_text))

    if not page_texts:
        raise IngestionError(
            "no_text",
            "No readable text was found in this PDF. "
            "It may be a scanned document or contain only images."
        )

    _update_job(document_id, pages=total_pages)


    # Chunk
    _update_job(document_id, stage=STAGE_CHUNKING)

    all_chunks = []
    global_chunk_id = 0

    for page_number, page_text in page_texts:

        for chunk_index, chunk in enumerate(create_chunks(page_text)):

            all_chunks.append({
                "id": str(global_chunk_id),
                "text": chunk,
                "metadata": {
                    "document": pdf_name,
                    "page": page_number,
                    "chunk": chunk_index,
                    "global_chunk_id": global_chunk_id
                }
            })

            global_chunk_id += 1

    _update_job(document_id, chunks=len(all_chunks))


    # Embed
    _update_job(document_id, stage=STAGE_EMBEDDING)

    embeddings = embedding_model.encode(
        [item["text"] for item in all_chunks],
        normalize_embeddings=True
    ).tolist()


    # Index (replace any previous version of this document)
    _update_job(document_id, stage=STAGE_INDEXING)

    try:
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass

    collection = chroma_client.get_or_create_collection(
        name=collection_name
    )

    collection.add(
        ids=[item["id"] for item in all_chunks],
        documents=[item["text"] for item in all_chunks],
        embeddings=embeddings,
        metadatas=[item["metadata"] for item in all_chunks]
    )


def run_ingestion(document_id: str, pdf_bytes: bytes):
    """Entry point for FastAPI BackgroundTasks."""

    try:
        _ingest(document_id, pdf_bytes)

    except IngestionError as error:
        _update_job(
            document_id,
            status="failed",
            error={"code": error.code, "message": error.message}
        )
        return

    except Exception:
        logger.exception("Ingestion failed for %s", document_id)
        _update_job(
            document_id,
            status="failed",
            error={
                "code": "processing_failed",
                "message": "Something went wrong while processing your document."
            }
        )
        return

    _update_job(document_id, status="ready", stage=STAGE_READY)
