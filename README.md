# 📄 DocMind — RAG PDF Q&A System

> Upload any PDF. Ask questions in plain English. Get instant AI-powered answers with source citations.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100-green?logo=fastapi) ![Python](https://img.shields.io/badge/Python-3.10+-yellow?logo=python) ![Groq](https://img.shields.io/badge/Groq-LLM-orange) ![FAISS](https://img.shields.io/badge/FAISS-Vector_Search-purple) ![LangChain](https://img.shields.io/badge/LangChain-RAG-red)

---

## 🌟 What This Project Does

DocMind is a full-stack AI application that lets you:

1. **Upload any PDF** — textbooks, research papers, reports, notes
2. **Ask questions in plain English** — no commands or syntax needed
3. **Get accurate answers** — the AI reads only YOUR document, not the internet
4. **See sources** — every answer shows which part of the PDF it came from

---

## 🖥️ Live Demo

| | Link |
|--|--|
| 🌐 Frontend | `https://your-app.vercel.app` *(add your Vercel link here)* |
| ⚙️ Backend API | `https://your-app.onrender.com` *(add your Render link here)* |
| 📖 API Docs | `https://your-app.onrender.com/docs` |

---

## 🏗️ How It Works — The RAG Pipeline

```
User uploads PDF
      ↓
PDF text is extracted (PyMuPDF + OCR fallback)
      ↓
Text is split into 500-character chunks
      ↓
Each chunk is converted to a vector (HuggingFace embeddings)
      ↓
Vectors are stored in FAISS index
      ↓
User asks a question
      ↓
Question is converted to a vector
      ↓
FAISS finds the 4 most similar chunks
      ↓
Chunks + question are sent to Groq LLM
      ↓
LLM generates an answer based ONLY on the document
      ↓
Answer + sources returned to user
```

**RAG** stands for **Retrieval-Augmented Generation** — it retrieves relevant text from your document before generating an answer. This means the AI never makes things up; it only answers from your PDF.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Development server and bundler |
| JavaScript (JSX) | Component logic |
| CSS-in-JS | Styling (no external CSS library) |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API framework |
| Python 3.10+ | Backend language |
| LangChain | RAG pipeline orchestration |
| Groq API | LLM inference (fast, free tier) |
| FAISS | Vector similarity search |
| HuggingFace | Sentence embeddings (`all-MiniLM-L6-v2`) |
| PyMuPDF (fitz) | PDF text extraction |
| Pytesseract | OCR fallback for image PDFs |

---

## 📁 Project Structure

```
rag-pdf-qa/
│
├── app/                          # Python backend
│   ├── api.py                    # FastAPI routes (/upload, /ask, /health)
│   ├── chain.py                  # LangChain RAG chain with Groq LLM
│   └── ingest.py                 # PDF loading, chunking, FAISS indexing
│
├── frontend folder/              # React frontend
│   ├── src/
│   │   ├── App.jsx               # Main UI component (upload + chat)
│   │   └── main.jsx              # React entry point
│   ├── index.html                # HTML shell
│   ├── package.json              # Node dependencies
│   └── vite.config.js            # Vite configuration
│
├── data/                         # Uploaded PDFs (auto-created, gitignored)
├── index/                        # FAISS vector index (auto-created, gitignored)
├── .gitignore                    # Excludes node_modules, data, index, .env
└── README.md                     # This file
```

---

## ⚙️ Local Setup — Step by Step

### Prerequisites
- Python 3.10+
- Node.js 18+ (download from nodejs.org)
- A free Groq API key (get from console.groq.com)

---

### Step 1 — Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/rag-pdf-qa.git
cd rag-pdf-qa
```

### Step 2 — Set up Python backend
```bash
# Install Python dependencies
pip install fastapi uvicorn langchain langchain-groq langchain-huggingface
pip install langchain-community faiss-cpu pymupdf python-dotenv
pip install sentence-transformers pytesseract pillow
```

### Step 3 — Add your Groq API key
Create a file called `.env` in the root folder:
```
GROQ_API_KEY=your_actual_key_here
```
Get your free key at: https://console.groq.com

### Step 4 — Start the backend
```bash
uvicorn app.api:app --reload --port 8000
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

### Step 5 — Set up React frontend
Open a second terminal:
```bash
cd "frontend folder"
npm install
npm run dev
```
You should see: `Local: http://localhost:3000`

### Step 6 — Open the app
Go to **http://localhost:3000** in your browser.

---

## 🚀 Deployment

### Frontend → Vercel (free)
1. Push code to GitHub
2. Go to vercel.com → New Project → Select repo
3. Set **Root Directory** to `frontend folder`
4. Click Deploy → get a live link instantly

### Backend → Render (free)
1. Go to render.com → New Web Service → Connect GitHub repo
2. Set these values:

| Field | Value |
|-------|-------|
| Runtime | Python |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.api:app --host 0.0.0.0 --port 8000` |

3. Add environment variable: `GROQ_API_KEY` = your key
4. Deploy → get a live backend URL

### Connect them
In `App.jsx`, change:
```javascript
const API_BASE = "http://127.0.0.1:8000";
// to:
const API_BASE = "https://your-render-url.onrender.com";
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Upload and index a PDF |
| `POST` | `/ask` | Ask a question about the PDF |
| `GET` | `/health` | Check if index is loaded |

### Example: Upload a PDF
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@your-document.pdf"
```

### Example: Ask a question
```bash
curl -X POST "http://localhost:8000/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic of this document?"}'
```

### Example Response
```json
{
  "question": "What is Python?",
  "answer": "Python is a high-level, general-purpose programming language created by Guido van Rossum in 1991.",
  "sources": ["Introduction to Python: Python is a widely used general-purpose..."],
  "status": "success"
}
```

---

## ✨ Features

- 🖱️ **Drag and drop** PDF upload
- 💬 **Chat interface** with message history
- 📚 **Source citations** — see exactly which part of the PDF was used
- 🔄 **OCR fallback** — works even on scanned/image PDFs
- ⚡ **Fast responses** — Groq LLM is one of the fastest inference APIs
- 📱 **Responsive design** — works on mobile and desktop
- 🌙 **Dark theme** — easy on the eyes

---

## 🧠 Key Concepts Learned

| Concept | What it means |
|---------|--------------|
| RAG | Combining document retrieval with AI generation |
| Vector embeddings | Converting text into numbers for similarity search |
| FAISS | Facebook's library for fast similarity search |
| Chunking | Breaking large documents into searchable pieces |
| REST API | How frontend and backend communicate |
| CORS | Security setting allowing cross-origin requests |
| Full-stack | Building both frontend (React) and backend (FastAPI) |

---

## 🐛 Common Issues & Fixes

| Error | Fix |
|-------|-----|
| `Could not reach backend` | Make sure FastAPI is running on port 8000 |
| `CORS error` | Make sure you are using the updated `api.py` with CORSMiddleware |
| `No text found in PDF` | PDF is image-based — OCR will run automatically |
| `npm: command not found` | Install Node.js from nodejs.org |
| `GROQ_API_KEY not found` | Create a `.env` file with your key |

---

## 👩‍💻 Author

**Sidra**
- Built as a portfolio project demonstrating full-stack AI development
- Skills demonstrated: React, FastAPI, Python, LangChain, FAISS, Groq API, REST APIs, Deployment

---

## 📄 License

This project is open source and available under the MIT License.

---

*Built with ❤️ using React · FastAPI · LangChain · Groq · FAISS*
