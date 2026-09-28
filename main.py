import chromadb
import os
import hashlib
from sentence_transformers import SentenceTransformer
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:1234/v1",
    api_key="lm-studio"
)

embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")


chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

pdf_path = input("Enter the path to the PDF file: ")

pdf_name = os.path.basename(pdf_path)

document_id = hashlib.md5(
    pdf_name.encode()
).hexdigest()[:8]

collection_name = f"pdf_{document_id}"

collection = chroma_client.get_or_create_collection(
    name=collection_name
)


question = input("\nPlease enter your question: ")


question_vector = embedding_model.encode(
    question,
    normalize_embeddings=True
).tolist()


results = collection.query(
    query_embeddings=[question_vector],
    n_results=3
)


retrieved_documents = results["documents"][0]

context = "\n\n".join(retrieved_documents)

prompt = f"""
You are an AI assistant answering questions about a PDF document.

Use ONLY the information provided in the document context below.

If the answer cannot be found in the provided context,
say:

"I couldn't find that information in the document."

Document context:
{context}

User question:
{question}

Answer clearly and briefly.
"""



response = client.chat.completions.create(
    model="google/gemma-4-e4b",
    messages=[
        {
            "role": "system",
            "content": "You answer questions using provided document context."
        },
        {
            "role": "user",
            "content": prompt
        }
    ],
    temperature=0.2
)


print("\n🤖 AI Assistant:")
print(
    response.choices[0].message.content
)