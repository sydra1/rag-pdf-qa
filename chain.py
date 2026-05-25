# -*- coding: utf-8 -*-
"""
Created on Wed May 20 16:07:50 2026
@author: sidra

RAG Chain with Groq API - Updated with Latest Available Models (May 2026)
Free tier models available: gemma2-9b-it, llama3-8b-8192, llama3-70b-8192
"""
import os
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq

load_dotenv()

PROMPT_TEMPLATE = """You are a helpful assistant. Use only the context below to answer the question.
If the answer is not in the context, say "I don't know based on this document."

Context:
{context}

Question:
{question}

Answer:"""

def load_chain(index_path: str = "index/"):
    """Load the RAG chain with Groq LLM"""
    print("Loading embeddings...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    vectorstore = FAISS.load_local(
        index_path,
        embeddings,
        allow_dangerous_deserialization=True
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    
 
    llm = ChatGroq(
        model="openai/gpt-oss-120b",  # Latest stable model available on Groq free tier
        temperature=0.7,
        groq_api_key=os.getenv("GROQ_API_KEY"),
        max_tokens=1024
    )
    
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=PROMPT_TEMPLATE
    )
    
    def format_docs(docs):
        """Format retrieved documents into context string"""
        return "\n\n".join(doc.page_content for doc in docs)
    
    def extract_text(message):
        """Extract text from LLM response - Handles all response types"""
        # Handle None response
        if message is None:
            return "No response generated."
        
        # If already a string, return it
        if isinstance(message, str):
            return message
        
        # If it's an AIMessage object with content attribute
        if hasattr(message, 'content'):
            content = message.content
            # Content could be string
            if isinstance(content, str):
                return content
            # Content could be dict (handle it)
            if isinstance(content, dict):
                return str(content)
            # Any other type, convert to string
            return str(content)
        
        # Fallback: convert any object to string
        return str(message)
    
    # Build the RAG chain
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | extract_text  # Custom function instead of StrOutputParser
    )
    
    return chain, retriever