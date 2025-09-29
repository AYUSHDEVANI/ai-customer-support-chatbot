from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from sqlalchemy.orm import Session
import os
import time
from filelock import FileLock
from src.config.settings import EMBEDDING_MODEL, FAISS_INDEX_PATH
from src.data.loader import load_documents_from_books
from src.db.database import get_db
from src.db.models import Book
from src.utils.logger import setup_logger

logger = setup_logger()

def build_vector_store(db: Session, force_rebuild: bool = False):
    index_path = os.path.join(FAISS_INDEX_PATH, "index.faiss")
    last_modified = os.path.getmtime(index_path) if os.path.exists(index_path) else 0
    books = db.query(Book).filter(Book.active == True).all()
    books_modified = any(os.path.getmtime(book.path) > last_modified for book in books)
    
    if not force_rebuild and os.path.exists(index_path) and not books_modified:
        logger.info("FAISS index up-to-date, skipping rebuild")
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        return FAISS.load_local(FAISS_INDEX_PATH, embeddings=embeddings, allow_dangerous_deserialization=True)
    
    lock = FileLock(f"{FAISS_INDEX_PATH}/index.lock")
    with lock:
        logger.info("Rebuilding FAISS index for active books")
        docs = load_documents_from_books(db)
        if not docs:
            logger.warning("No active books found for vector store")
            return None
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vector_store = FAISS.from_documents(docs, embedding=embeddings)
        vector_store.save_local(FAISS_INDEX_PATH)
        return vector_store

def get_retriever(db: Session):
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    try:
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings=embeddings, allow_dangerous_deserialization=True)
        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 2})
        def wrapped_retriever(query):
            docs = retriever.invoke(query)
            used_book_ids = [doc.metadata.get("book_id") for doc in docs if doc.metadata.get("book_id")]
            return {"results": [doc.page_content for doc in docs], "used_book_ids": used_book_ids}
        return wrapped_retriever
    except Exception as e:
        logger.warning(f"FAISS index load failed: {e}, rebuilding...")
        vector_store = build_vector_store(db, force_rebuild=True)
        if vector_store:
            retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 2})
            def wrapped_retriever(query):
                docs = retriever.invoke(query)
                used_book_ids = [doc.metadata.get("book_id") for doc in docs if doc.metadata.get("book_id")]
                return {"results": [doc.page_content for doc in docs], "used_book_ids": used_book_ids}
            return wrapped_retriever
        return None