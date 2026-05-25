# -*- coding: utf-8 -*-
"""
RAG PDF Q&A API with Groq - Complete Working Version
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.chain import load_chain
from app.ingest import load_pdf, chunk_text, build_index
import shutil
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RAG PDF Q&A", version="1.0")

# ── CORS: Allow React (port 3000) to talk to FastAPI (port 8000) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

qa_chain = None
retriever = None

@app.on_event("startup")
async def startup_event():
    global qa_chain, retriever
    if os.path.exists("index/index.faiss"):
        print("Found existing index — loading automatically...")
        try:
            qa_chain, retriever = load_chain()
            print("✓ Chain ready!")
        except Exception as e:
            logger.error(f"Error loading chain: {e}")

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"message": "RAG PDF Q&A is running!", "docs": "/docs", "status": "online"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        os.makedirs("data", exist_ok=True)
        path = f"data/{file.filename}"
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        print(f"📄 Processing {file.filename}...")
        text = load_pdf(path)
        chunks = chunk_text(text)
        build_index(chunks)
        global qa_chain, retriever
        qa_chain, retriever = load_chain()
        return {"message": f"✓ Successfully indexed {file.filename}", "chunks": len(chunks), "status": "success"}
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/ask")
async def ask_question(req: QuestionRequest):
    if qa_chain is None:
        raise HTTPException(status_code=400, detail="No PDF indexed. Upload a PDF first via /upload endpoint.")
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        print(f"❓ Question: {req.question}")
        answer = qa_chain.invoke(req.question)
        if answer is None:
            answer = "Unable to generate answer."
        elif not isinstance(answer, str):
            answer = str(answer)
        answer = answer.strip() or "No answer generated."
        docs = retriever.invoke(req.question)
        sources = [doc.page_content[:200] for doc in docs] if docs else []
        return {"question": req.question, "answer": answer, "sources": sources, "status": "success"}
    except Exception as e:
        logger.error(f"Ask error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/health")
def health():
    return {"status": "healthy", "index_loaded": qa_chain is not None, "service": "RAG PDF Q&A"}
