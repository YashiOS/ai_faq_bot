from pypdf import PdfReader

reader = PdfReader("data/Voltaro.pdf")

text = ""

for page in reader.pages:
    text += page.extract_text() + "\n\n"

chunks = [
    chunk.strip()
    for chunk in text.split("\n\n")
    if chunk.strip()
]

print(f"Total chunks: {len(chunks)}")

for i, chunk in enumerate(chunks):
    print(f"\n--- Chunk {i + 1} ---")
    print(chunk[:300])

