from pypdf import PdfReader
import chromadb
import os
import hashlib
from sentence_transformers import SentenceTransformer


model = SentenceTransformer("BAAI/bge-small-en-v1.5")

chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

pdf_path = input("Enter the path to the PDF file: ").strip()

if os.path.exists(pdf_path) is False:
    print(f"File not found: {pdf_path}")
    exit()


pdf_name = os.path.basename(pdf_path)


document_id = hashlib.md5(
    pdf_name.encode()
).hexdigest()[:8]

collection_name = f"pdf_{document_id}"

try:
    chroma_client.delete_collection(name=collection_name)
    print(f"Deleted old collection: {collection_name}")
except Exception:
    pass



collection = chroma_client.get_or_create_collection(
    name=collection_name
)


reader = PdfReader(pdf_path)
total_pages = len(reader.pages)

text = ""

def create_chunks(text, chunk_size=800, overlap=150):
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

all_chunks = []
global_chunk_id = 0


for page_number, page in enumerate(reader.pages, start=1):

    page_text = page.extract_text()

    if not page_text:
        print(f"Warning: No text found on page {page_number}")
        continue

    page_text = page_text.strip()

    page_chunks = create_chunks(
        page_text,
        chunk_size=800,
        overlap=150
    )

    for chunk_index, chunk in enumerate(page_chunks):
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

print(
    f"\nFound {len(all_chunks)} chunks."
)


for item in all_chunks:

    embedding_vector = model.encode(
        item["text"],
        normalize_embeddings=True
    ).tolist()

    collection.add(

        ids=[
            item["id"]
        ],

        documents=[
            item["text"]
        ],

        embeddings=[
            embedding_vector
        ],

        metadatas=[
            item["metadata"]
        ]
    )

print("\n====================================")
print("✅ PDF ingestion completed")
print("====================================")

print(f"Document  : {pdf_name}")
print(f"Pages     : {total_pages}")
print(f"Chunks    : {len(all_chunks)}")
print(f"Collection: {collection_name}")

print("====================================")