# AI Document Assistant

Upload a PDF and ask questions about it. Every answer cites the pages it came from.

Everything runs locally:

```
Browser ──► Next.js frontend ──► FastAPI backend ──► BGE embeddings / ChromaDB / LM Studio (Gemma)
```

The browser only talks to FastAPI. LM Studio is never exposed to the frontend.

| Layer      | Tech                                                    |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS v4       |
| Backend    | FastAPI, PyPDF                                          |
| Embeddings | `BAAI/bge-small-en-v1.5` (sentence-transformers)        |
| Vector DB  | ChromaDB (persistent, `./chroma_db`)                    |
| LLM        | Gemma via LM Studio's OpenAI-compatible API (`:1234`)   |

---

## Running it

### 1. LM Studio

Load the Gemma model and start the local server on `http://127.0.0.1:1234`.

### 2. Backend (from the repo root)

```bash
source venv/bin/activate
pip install python-multipart   # needed for file uploads, if not already installed
uvicorn app.main:app --reload --port 8000
```

| Variable           | Default                                         | Purpose                          |
| ------------------ | ----------------------------------------------- | -------------------------------- |
| `FRONTEND_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000`   | Comma-separated CORS allow-list  |

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local     # then edit if your backend isn't on :8000
npm install
npm run dev                    # http://localhost:3000
```

| Variable              | Example                  | Purpose                    |
| --------------------- | ------------------------ | -------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000`  | FastAPI backend base URL   |

`NEXT_PUBLIC_*` values are inlined at build time, so restart `npm run dev` (or rebuild) after changing them.

Production build: `npm run build && npm start`.

---

## Backend API contract

Endpoint paths are defined in one place, [`frontend/src/api/config.ts`](frontend/src/api/config.ts), and the response types in [`frontend/src/api/types.ts`](frontend/src/api/types.ts). If the backend contract changes, update those two files.

### `GET /health`

```json
{ "status": "healthy" }
```

### `POST /documents/upload`

`multipart/form-data` with a single field, `file` (PDF, max 25 MB). Returns **202** straight away. Processing continues in the background.

```json
{
  "document_id": "c419b15f6bb0",
  "collection_name": "pdf_855244c7",
  "filename": "employee_handbook.pdf",
  "status": "processing",
  "stage": "uploaded",
  "pages": null,
  "chunks": null,
  "error": null
}
```

### `GET /documents/{document_id}`

Same shape as above. The frontend polls this until `status` becomes `ready` or `failed`.

- `status`: `processing` | `ready` | `failed`
- `stage`: `uploaded` → `extracting` → `chunking` → `embedding` → `indexing` → `ready`
- `error` (when failed): `{ "code": "no_text", "message": "No readable text was found in this PDF…" }`

If a backend processes synchronously and returns `status: "ready"` from the upload call, the frontend skips polling.

### `POST /chat`

```json
{ "question": "What is the leave policy?", "collection_name": "pdf_855244c7" }
```

```json
{
  "answer": "Employees receive 18 days of annual leave.",
  "sources": [{ "document": "employee_handbook.pdf", "page": 12 }]
}
```

`POST /ask` still works as before and accepts the same body.

### Errors

Structured errors use FastAPI's `detail` field with a user-safe message:

```json
{ "detail": { "code": "llm_unavailable", "message": "The language model is not reachable. Make sure LM Studio is running." } }
```

The frontend shows `detail.message` only when it is structured like this. Plain-string details, which may be raw Python exceptions, are never shown. Those requests get a generic message, and the raw response is logged to the browser console.

| Code                 | When                                              |
| -------------------- | ------------------------------------------------- |
| `invalid_file_type`  | Upload isn't a `.pdf`                             |
| `file_too_large`     | Over 25 MB                                        |
| `empty_pdf`          | Zero-byte file or PDF with no pages               |
| `invalid_pdf`        | Corrupt or not really a PDF                       |
| `no_text`            | No extractable text (e.g. scanned PDF)            |
| `processing_failed`  | Unexpected ingestion error (details in server log)|
| `document_not_found` | Unknown `document_id` or `collection_name`        |
| `llm_unavailable`    | LM Studio isn't reachable                         |

---

## How the upload flow works

1. **Select.** The user drops or browses for a PDF. The type (`.pdf` / `application/pdf`), empty files and the 25 MB limit are checked in the browser first.
2. **Upload.** The file is sent with `XMLHttpRequest`, so the "Uploading" step shows the browser's real upload percentage.
3. **Process.** The backend returns `202` with a `document_id`. A background job ([`app/ingest.py`](app/ingest.py)) runs extract → chunk → embed → index, updating `stage` as it goes.
4. **Track.** The frontend polls `GET /documents/{id}` every 800 ms and moves the checklist to the stage the backend reports. There are no fake timers or percentages. Short network blips are retried. A failure marks the exact step that failed and shows the reason.
5. **Ready.** The app switches to the chat view with the document's `collection_name`.

Ingestion keeps the original `pdf_ingest.py` behavior: 800-word chunks with 150-word overlap, per-page metadata (`document`, `page`, `chunk`), and collection name `pdf_<md5(filename)[:8]>`. Re-uploading a file with the same name replaces its collection.

> The job store is in memory, so status is lost if the server restarts. That's fine for a single dev process. Use Redis or a database before running multiple workers.

## How the chat flow works

1. The user types a question (Enter sends, Shift+Enter adds a new line) or picks a suggested question.
2. The question and a pending assistant message appear straight away. Sending is disabled until the answer arrives.
3. `POST /chat` goes out with the question and `collection_name`. The backend embeds the question, retrieves the top-k chunks from Chroma, and asks Gemma to answer using only those chunks.
4. The answer is rendered as Markdown (headings, lists, code, tables; raw HTML is never rendered), with its sources listed underneath.
5. On failure, the message shows a friendly error and a **Retry** button.

---

## Frontend structure

```
frontend/src/
├── api/                    # All HTTP calls. Components never call fetch directly.
│   ├── config.ts           #   base URL, endpoint paths, limits, timeouts
│   ├── types.ts            #   backend contract types
│   ├── client.ts           #   fetch wrapper, ApiError, error → friendly message
│   ├── documents.ts        #   upload (XHR w/ progress), status, polling
│   ├── chat.ts
│   └── health.ts
├── state/
│   ├── session-reducer.ts  # pure state: phase, file, stage, document, messages
│   └── SessionProvider.tsx # context + async actions (process, ask, retry, reset)
├── components/
│   ├── upload/             # UploadScreen, PdfUpload, UploadProgress
│   ├── chat/               # ChatContainer, ChatMessage, ChatInput, SourceList,
│   │                       # SuggestedQuestions, Markdown
│   ├── layout/             # ChatLayout, Sidebar (desktop + mobile drawer), Header
│   └── common/             # Button, Logo, LoadingState, ErrorState
└── app/                    # Next.js App Router entry (layout, page, globals.css)
```

Design tokens (colors for light and dark mode) live in `globals.css` and are exposed to Tailwind as `bg-surface`, `text-muted`, `border-line`, `text-accent`, and so on.
