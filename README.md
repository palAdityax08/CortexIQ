# CortexIQ — Agentic Multimodal Intelligence Platform

> **CortexIQ** is an AI-powered knowledge platform that lets you build a personal semantic knowledge base from any type of content — text, web pages, PDFs, images, audio, and video — and interact with it through a conversational agent that retrieves evidence and generates grounded, cited answers.

---

## What is CortexIQ?

Most AI assistants answer from their training data — static, opaque, and prone to hallucination. **CortexIQ** takes a different approach: you bring your own sources, the system indexes them semantically, and every answer is directly grounded in the evidence you provided.

It's built around three core ideas:

1. **Multimodal by default** — not just text. PDFs, images, audio recordings, video clips, and web URLs are all first-class citizens in the knowledge base.
2. **Transparent retrieval** — you can see exactly which sources the agent pulled, their similarity scores, and the evidence text behind every answer.
3. **Visual understanding** — a live 3D view shows your entire knowledge space as a semantic map. When you ask a question, watch your query land in that space and see which sources it's closest to.

---

## Features

| Feature | Description |
|---------|-------------|
| 📄 Text ingestion | Paste or type raw text snippets |
| 🌐 URL ingestion | Feed any public webpage — CortexIQ extracts and embeds the content |
| 📎 File upload | PDFs, images (JPG/PNG/WebP), audio (MP3/WAV), video (MP4) up to 120MB |
| 🧠 Semantic embeddings | Gemini Embedding 2 — 768-dimensional vectors, natively multimodal |
| 🤖 ADK agent | Google Agent Development Kit coordinates retrieval and answer synthesis |
| 📌 Cited answers | Every response references the sources it used with similarity percentages |
| 🌐 3D knowledge map | Real-time PCA projection of your vector space rendered in Three.js |
| ⚡ Fast async API | FastAPI + Uvicorn backend, fully async |

---

## How It Works

```
                         ┌─────────────────────────┐
  You add a source  ───► │  Gemini Embedding 2      │
  (text/PDF/image/       │  768-dimensional vectors │
   audio/video/URL)      └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  In-Memory Vector Store  │
                         │  (cosine similarity)     │
                         └────────────┬────────────┘
                                      │
  You ask a question  ──► embed query │
                          top-K match ▼
                         ┌────────────────────────┐
                         │  Google ADK Agent       │
                         │  · inspect_space tool   │
                         │  · retrieval tool       │
                         │  → grounded answer      │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  React UI               │
                         │  · Answer + Citations   │
                         │  · 3D PCA visualization │
                         └─────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Semantic embeddings | Gemini Embedding 2 (768-dim, natively multimodal) |
| AI agent | Google ADK + Gemini 2.0 Flash |
| Vector search | In-memory cosine similarity |
| Backend | Python · FastAPI · Uvicorn |
| 3D visualization | Three.js (PCA 3D projection) |
| Frontend | React 18 · TypeScript · Vite |
| Styling | Vanilla CSS — dark theme, no framework |
| Backend hosting | Render (free tier) |
| Frontend hosting | Vercel (free tier) |

---

## Project Structure

```
CortexIQ/
├── .gitignore
├── README.md
├── render.yaml                  ← Render deployment config
├── start_backend.bat            ← Windows quick-start
├── start_frontend.bat
│
├── backend/
│   ├── .env.example             ← Template for environment variables
│   ├── requirements.txt
│   ├── server.py                ← FastAPI REST API
│   ├── app_state.py             ← Singleton store
│   ├── rag_store.py             ← Embeddings, chunking, PCA, search
│   └── agentic_rag_agent/
│       ├── __init__.py
│       └── agent.py             ← ADK agent with retrieval tools
│
└── frontend/
    ├── vercel.json              ← Vercel SPA routing config
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── index.html
    └── src/
        ├── vite-env.d.ts
        ├── main.tsx
        ├── App.tsx              ← UI + Three.js 3D canvas
        └── styles.css
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11 or later |
| Node.js | 18 or later |
| Google API Key | Free from [aistudio.google.com](https://aistudio.google.com/app/apikey) |

---

## Run Locally

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate
# Windows:
.venv\Scripts\activate
# Mac / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Open .env and set:  GOOGLE_API_KEY=your_key_here

# Start
python server.py
# → http://localhost:8897
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5177
# → http://localhost:5177
```

---

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | System status, ADK availability, source count |
| `GET` | `/space` | Full embedding space snapshot with PCA points |
| `POST` | `/sources/text` | Add text `{ title, text }` |
| `POST` | `/sources/url` | Add URL `{ url, title? }` |
| `POST` | `/sources/file` | Upload file (multipart form) |
| `DELETE` | `/sources/{id}` | Remove a source |
| `POST` | `/ask` | Ask a question `{ question, top_k? }` |

---

## Deployment

CortexIQ is deployed with a split architecture:

- **Backend** → [Render](https://render.com) (Python, free tier)
- **Frontend** → [Vercel](https://vercel.com) (React/Vite, free tier)

### Backend (Render)

1. New → Web Service → connect your GitHub repo
2. Set **Root Directory** to `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `python server.py`
5. Environment variables:

| Key | Value |
|-----|-------|
| `GOOGLE_API_KEY` | your API key |
| `ALLOWED_ORIGINS` | your Vercel URL (after deploying frontend) |

### Frontend (Vercel)

1. New Project → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework: **Vite**
4. Environment variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | your Render backend URL |


---

## Notes

- **Storage is in-memory.** All sources are lost when the backend restarts. For persistent production use, swap `MultimodalRagStore` for a managed vector database (Pinecone, Qdrant, Weaviate).
- **Render free tier** spins down after 15 minutes of inactivity. The first request after sleep may take ~30 seconds to wake up.
- **URL ingestion** blocks private IP ranges by default for security. Set `ALLOW_PRIVATE_URLS=true` to allow intranet URLs.
- **Media files** are uploaded to the Gemini File API for embedding, then immediately deleted — they are never stored on the server.
- **File size limit:** 120 MB per upload.

---

