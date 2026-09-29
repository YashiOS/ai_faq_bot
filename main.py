import chromadb
import os
import hashlib
from sentence_transformers import SentenceTransformer
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:1234/v1",
    api_key="lm-studio"
)

TOP_K=3
embedding_model = SentenceTransformer("BAAI/bge-small-en-v1.5")


chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

pdf_path = input("Enter the path to the PDF file: ").strip()

pdf_name = os.path.basename(pdf_path)

document_id = hashlib.md5(
    pdf_name.encode()
).hexdigest()[:8]

collection_name = f"pdf_{document_id}"

collection = chroma_client.get_or_create_collection(
    name=collection_name
)


question = input("\nPlease enter your question: ").strip()


question_vector = embedding_model.encode(
    question,
    normalize_embeddings=True
).tolist()


results = collection.query(
    query_embeddings=[question_vector],
    n_results=TOP_K
)


retrieved_documents = results["documents"][0]
retrieved_metadata = results["metadatas"][0]
retrieved_distances = results.get(
    "distances",
    [[]]
)[0]


context_parts = []

for index, document in enumerate(retrieved_documents):
    metadata = retrieved_metadata[index]

    page = metadata.get("page", "Unknown")
    document_name = metadata.get("document_name", pdf_name)
    chunk_number = metadata.get("chunk", "Unknown")

    context_parts.append(

        f"""
        SOURCE {index + 1}

        Document:
        {document_name}

        Page:
        {page}

        Chunk:
        {chunk_number}

        Content:
        {document}
        """
    )

context = "\n".join(context_parts)    

prompt = f"""
You are an AI assistant that answers questions
about a PDF document.

IMPORTANT RULES:

1. Use ONLY the information provided in the
   document context.

2. Do NOT use your general knowledge.

3. Do NOT invent or assume information.

4. If the answer cannot be found in the provided
   context, say exactly:

"I couldn't find that information in the document."

5. Give a clear and concise answer.

6. Do not mention information that is not supported
   by the provided context.


DOCUMENT CONTEXT:

{context}


USER QUESTION:

{question}
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

shown_sources = set()

for item in retrieved_metadata:
    document_name = item.get("document", pdf_name)
    page = item.get("page", "Unknown")


    source_key = (document_name, page)

    if source_key in shown_sources:
        continue    

    shown_sources.add(source_key)

    print(
        f"📄 {document_name}"
    )

    print(
        f"   Page {page}"
    )

    print()
