from langchain_community.document_loaders import PyPDFLoader
from sqlalchemy.orm import Session
from langchain_text_splitters import RecursiveCharacterTextSplitter
from src.db.models import Book
from src.db.database import get_db
from src.utils.logger import setup_logger

logger = setup_logger()

from src.data.storage import storage_client
import os

def load_documents_from_book(book: Book):
    """
    Load documents from a single book.
    """
    temp_path = None
    try:
        # Check if path is a URL (Supabase)
        if book.path.startswith("http"):
            temp_path = storage_client.download_to_temp(book.path, book.name)
            loader = PyPDFLoader(temp_path)
        else:
            # Fallback for local files (if any exist)
            loader = PyPDFLoader(book.path)
            
        # Use yield from to return an iterator and keep the function scope active
        # This ensures the finally block (cleanup) runs ONLY after the iterator is exhausted
        yield from loader.lazy_load()
    except Exception as e:
        logger.error(f"Failed to load book {book.name}: {str(e)}")
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

def load_documents_from_books(db: Session):
    """
    Load documents from active books in the database, including book_id in metadata.
    DEPRECATED: Use load_documents_from_book in a loop for better memory management.
    """
    books = db.query(Book).filter(Book.active == True).all()
    if not books:
        logger.warning("No active books found")
        return []
    
    documents = []
    for book in books:
        docs = load_documents_from_book(book)
        documents.extend(docs)
    
    return documents
