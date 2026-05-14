# 🧠 Multimodal Agentic RAG

> A full-stack AI app that lets you index **any type of content** — text, URLs, PDFs, images, audio, video — into a semantic vector space, then ask questions and get **grounded, cited answers** powered by **Gemini Embedding 2** and the **Google Agent Development Kit (ADK)**.

![UI Screenshot](https://raw.githubusercontent.com/Shubhamsaboo/awesome-llm-apps/main/rag_tutorials/multimodal_agentic_rag/assets/multimodal-agentic-rag-architecture.png)

---

## ✨ Features

- 📄 **Multimodal ingestion** — text snippets, web URLs, PDFs, images, audio, video
- 🔍 **Gemini Embedding 2** — state-of-the-art 768-dimensional semantic embeddings
- 🤖 **Google ADK Agent** — coordinates retrieval tools and synthesizes grounded answers
- 📌 **Citations panel** — every answer shows exactly which sources it came from and similarity scores
- 🌐 **Live 3D embedding view** — PCA projection of your vector space rendered in Three.js so you can literally *see* how semantically similar your sources are
- ⚡ **FastAPI backend** — async Python REST API
- 🎨 **React + Vite frontend** — dark-themed, responsive, zero-dependency CSS

---

## 🏗️ Architecture

```
User uploads content
        ↓
Gemini Embedding 2  ──►  768-dim vectors  ──►  In-Memory Vector Store
                                                        ↓
User asks a question  ──►  Query embedded  ──►  Cosine similarity search
                                                        ↓
                                            Google ADK Agent
                                            (uses retrieval tool)
                                                        ↓
                                          Grounded answer + citations
                                                        ↓
                                      React UI with 3D PCA visualization
```

---

## 🗂️ Project Structure

```
multimodal_agentic_rag/
├── .gitignore
├── README.md
├── render.yaml                      ← Render (backend) deployment config
├── start_backend.bat                ← Windows quick-start script
├── start_frontend.bat               ← Windows quick-start script
│
├── backend/
│   ├── .env.example                 ← Copy to .env and add your API key
│   ├── requirements.txt
│   ├── server.py                    ← FastAPI app (port 8897)
│   ├── app_state.py                 ← Singleton RAG store
│   ├── rag_store.py                 ← Embeddings, chunking, PCA, search
│   └── agentic_rag_agent/
│       ├── __init__.py
│       └── agent.py                 ← Google ADK agent definition
│
└── frontend/
    ├── vercel.json                  ← Vercel (frontend) deployment config
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    ├── index.html
    └── src/
        ├── vite-env.d.ts
        ├── main.tsx
        ├── App.tsx                  ← Full UI + Three.js 3D canvas
        └── styles.css
```

---

## 🔑 API Key Required

You need a **Google AI Studio API Key** (free):

1. Visit → **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIzaSy...`)

Free tier: **1,500 requests/day** — plenty for testing and demos.

---

## 🖥️ Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API key
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=your_key_here

# Start server
python server.py
# → Running at http://localhost:8897
```

### Frontend

```bash
cd frontend

npm install
npm run dev -- --port 5177
# → Running at http://localhost:5177
```

Open **http://localhost:5177** in your browser.

---

## 🚀 Deploy to Production (Free)

### Strategy
| Component | Platform | Cost |
|-----------|----------|------|
| Frontend  | **Vercel** | Free forever |
| Backend   | **Render** | Free (750 hrs/month) |

> ⚠️ **Note:** The backend uses in-memory storage. Data resets when the Render instance restarts or spins down (free tier sleeps after 15 min inactivity).

---

### Step 1 — Push to GitHub

```bash
# In D:\Multimodel
git init
git add .
git commit -m "feat: multimodal agentic RAG app"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

### Step 2 — Deploy Backend on Render

1. Go to **https://render.com** → Sign up / Log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `backend` |
   | **Environment** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `python server.py` |
   | **Plan** | `Free` |
5. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `GOOGLE_API_KEY` | `your_actual_key` |
   | `ALLOWED_ORIGINS` | *(leave blank for now — fill in after Step 3)* |
6. Click **"Create Web Service"**
7. Wait for deploy → copy your URL e.g. `https://multimodal-rag-backend.onrender.com`

---

### Step 3 — Deploy Frontend on Vercel

1. Go to **https://vercel.com** → Sign up / Log in with GitHub
2. Click **"Add New Project"** → import your repo
3. Configure:
   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
4. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://your-render-url.onrender.com` |
5. Click **"Deploy"**
6. Copy your Vercel URL e.g. `https://multimodal-rag.vercel.app`

---

### Step 4 — Update CORS on Render

Go back to Render → your backend service → **Environment**:

| Key | Value |
|-----|-------|
| `ALLOWED_ORIGINS` | `https://multimodal-rag.vercel.app` |

Click **"Save Changes"** → Render will redeploy automatically.

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System status, source count, dimensions |
| `GET` | `/space` | Full embedding space snapshot (PCA points) |
| `POST` | `/sources/text` | Add a text source `{title, text}` |
| `POST` | `/sources/url` | Add a URL source `{url, title?}` |
| `POST` | `/sources/file` | Upload file (PDF/image/audio/video) |
| `DELETE` | `/sources/{id}` | Remove a source from the vector space |
| `POST` | `/ask` | Ask a question `{question, top_k?}` |

---

## 📝 Notes

- **In-memory only** — restarting the backend clears all sources. For production with persistence, replace `MultimodalRagStore` with a vector database like Pinecone, Weaviate, or Qdrant.
- **URL ingestion** blocks private/localhost IPs by default. Set `ALLOW_PRIVATE_URLS=true` to override.
- **File upload limit** is 120 MB per file.
- **Media files** (audio/video) are uploaded to the Gemini File API for embedding, then deleted immediately after.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Embeddings | Gemini Embedding 2 (768-dim, multimodal) |
| Agent | Google ADK + Gemini 2.0 Flash |
| Backend | FastAPI + Uvicorn + Python 3.11+ |
| Vector search | Cosine similarity (in-memory) |
| 3D visualization | Three.js (PCA projection) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (dark theme) |
| Frontend deploy | Vercel |
| Backend deploy | Render |

---

## 📄 License

MIT — based on [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) by Shubham Saboo.
