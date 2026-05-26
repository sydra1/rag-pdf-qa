# -*- coding: utf-8 -*-
"""
Created on Wed May 20 15:35:16 2026
@author: sidra
"""
import os
import fitz  # PyMuPDF
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

def load_pdf(path: str) -> str:
    """Extract text from PDF file with OCR fallback for image PDFs"""
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    
    # If PDF has no text, try OCR
    if not text.strip():
        print("⚠️  No text found in PDF. Trying OCR...")
        try:
            import pytesseract
            from PIL import Image
            import io
            
            ocr_text = ""
            for page_num, page in enumerate(doc):
                # Convert page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Extract text using Tesseract
                page_text = pytesseract.image_to_string(img)
                ocr_text += page_text + "\n"
                print(f"   OCR Page {page_num + 1}: {len(page_text)} characters")
            
            text = ocr_text
            print("✓ OCR extraction complete")
        except ImportError:
            print("❌ Tesseract not installed. Install with: pip install pytesseract pillow")
            print("   Or convert your PDF using an online tool: https://smallpdf.com/pdf-to-text")
            raise
    
    doc.close()
    return text

def chunk_text(text: str) -> list[str]:
    """Split text into chunks for embedding"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " "]
    )
    return splitter.split_text(text)

def build_index(chunks: list[str], save_path: str = "index/"):
    """Create and save FAISS vector index"""
    print("Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    print(f"Creating index from {len(chunks)} chunks...")
    vectorstore = FAISS.from_texts(chunks, embeddings)
    
    os.makedirs(save_path, exist_ok=True)
    vectorstore.save_local(save_path)
    
    print(f"✓ Indexed {len(chunks)} chunks → saved to {save_path}")
    return vectorstore

if __name__ == "__main__":
    text = load_pdf("data/sample.pdf")
    chunks = chunk_text(text)
    print(f"PDF loaded! Split into {len(chunks)} chunks.")
    build_index(chunks)
