import os

from chromadb.errors import NotFoundError
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError
from pydantic import BaseModel

from app.ingest import create_job, get_job, run_ingestion
from app.rag import ask_question


MAX_UPLOAD_BYTES = 25 * 1024 * 1024


app = FastAPI(
    title="AI FAQ Bot API",
    description="RAG-based PDF Question Answering API",
    version="1.0.0"
)


# Allow the Next.js frontend to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):

    question: str

    collection_name: str


@app.get("/")
def root():

    return {
        "message": "AI FAQ Bot API is running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.post("/ask")
def ask(request: QuestionRequest):

    if not request.question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )


    try:

        result = ask_question(
            question=request.question,
            collection_name=request.collection_name
        )

        return result


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.post("/documents/upload", status_code=202)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):

    filename = os.path.basename(file.filename or "")

    if not filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_file_type",
                "message": "Only PDF files are supported."
            }
        )


    pdf_bytes = file.file.read(MAX_UPLOAD_BYTES + 1)

    if len(pdf_bytes) > MAX_UPLOAD_BYTES:

        raise HTTPException(
            status_code=413,
            detail={
                "code": "file_too_large",
                "message": "PDF must be 25 MB or smaller."
            }
        )

    if not pdf_bytes:

        raise HTTPException(
            status_code=400,
            detail={
                "code": "empty_pdf",
                "message": "The uploaded file is empty."
            }
        )

    if not pdf_bytes.startswith(b"%PDF"):

        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_pdf",
                "message": "This file doesn't appear to be a valid PDF."
            }
        )


    job = create_job(filename)

    background_tasks.add_task(
        run_ingestion,
        job["document_id"],
        pdf_bytes
    )

    return job


@app.get("/documents/{document_id}")
def document_status(document_id: str):

    job = get_job(document_id)

    if job is None:

        raise HTTPException(
            status_code=404,
            detail={
                "code": "document_not_found",
                "message": "Document not found."
            }
        )

    return job


@app.post("/chat")
def chat(request: QuestionRequest):

    if not request.question.strip():

        raise HTTPException(
            status_code=400,
            detail={
                "code": "empty_question",
                "message": "Question cannot be empty."
            }
        )


    try:

        return ask_question(
            question=request.question,
            collection_name=request.collection_name
        )


    except NotFoundError:

        raise HTTPException(
            status_code=404,
            detail={
                "code": "document_not_found",
                "message": "This document is no longer available. Please upload it again."
            }
        )


    except APIConnectionError:

        raise HTTPException(
            status_code=503,
            detail={
                "code": "llm_unavailable",
                "message": "The language model is not reachable. Make sure LM Studio is running."
            }
        )
