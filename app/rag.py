import chromadb
from sentence_transformers import SentenceTransformer
from openai import OpenAI


CHROMA_PATH = "./chroma_db"

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"

TOP_K = 3


# Embedding model
embedding_model = SentenceTransformer(
    EMBEDDING_MODEL
)


# ChromaDB
chroma_client = chromadb.PersistentClient(
    path=CHROMA_PATH
)


# LM Studio
llm_client = OpenAI(
    base_url="http://127.0.0.1:1234/v1",
    api_key="lm-studio"
)


def ask_question(
    question: str,
    collection_name: str
):

    collection = chroma_client.get_collection(
        name=collection_name
    )


    # Create question embedding
    question_vector = embedding_model.encode(
        question,
        normalize_embeddings=True
    ).tolist()


    # Search Chroma
    results = collection.query(
        query_embeddings=[question_vector],
        n_results=TOP_K
    )


    documents = results["documents"][0]
    metadata = results["metadatas"][0]


    # Build context
    context_parts = []


    for index, document in enumerate(documents):

        meta = metadata[index]

        context_parts.append(
            f"""
SOURCE {index + 1}

Document: {meta.get("document", "Unknown")}
Page: {meta.get("page", "Unknown")}
Chunk: {meta.get("chunk", "Unknown")}

Content:
{document}
"""
        )


    context = "\n".join(context_parts)


    # Prompt
    prompt = f"""
You are an AI assistant answering questions
about a PDF document.

Use ONLY the information provided in the context.

Do not use outside knowledge.

Do not invent information.

If the answer cannot be found in the context,
say:

"I couldn't find that information in the document."

Context:

{context}

Question:

{question}

Answer clearly and briefly.
"""


    # Call Gemma through LM Studio
    response = llm_client.chat.completions.create(

        model="google/gemma-4-e4b",

        messages=[
            {
                "role": "system",
                "content": (
                    "Answer questions using only "
                    "the provided document context."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.2
    )


    answer = response.choices[0].message.content


    # Sources
    sources = []

    seen = set()


    for meta in metadata:

        document = meta.get(
            "document",
            "Unknown"
        )

        page = meta.get(
            "page",
            "Unknown"
        )


        source_key = (
            document,
            page
        )


        if source_key in seen:
            continue


        seen.add(source_key)


        sources.append(
            {
                "document": document,
                "page": page
            }
        )


    return {
        "answer": answer,
        "sources": sources
    }