from pypdf import PdfReader
import chromadb
import os
import hashlib
from sentence_transformers import SentenceTransformer


model = SentenceTransformer("BAAI/bge-small-en-v1.5")

chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

pdf_path = input("Enter the path to the PDF file: ")

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

text = ""

for page in reader.pages:

    page_text = page.extract_text()

    if page_text:
        text += page_text + "\n"


chunks = [
    chunk.strip()
    for chunk in text.split("\n\n")
    if chunk.strip()
]


print(f"Found {len(chunks)} chunks")


for i, chunk in enumerate(chunks):

    embedding_vector = model.encode(
        chunk,
        normalize_embeddings=True
    ).tolist()

    collection.add(
        ids=[str(i)],
        documents=[chunk],
        embeddings=[embedding_vector]
    )

    print(f"Stored chunk {i + 1}/{len(chunks)}")

print(f"Collection: {collection_name}")