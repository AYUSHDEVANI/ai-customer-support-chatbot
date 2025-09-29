from langchain_community.document_loaders import PyPDFLoader
from sqlalchemy.orm import Session
from langchain.text_splitter import RecursiveCharacterTextSplitter
from src.db.models import Book
from src.db.database import get_db
from src.utils.logger import setup_logger

# def load_documents(folder_path = "app/data/sample_docs"):
#     """
#     Load PDFs from the folder and return as LangChain documents.
#     """

#     loader = PyPDFLoader(DATA_PATH)
#     return loader.load_and_split()

logger = setup_logger()

def load_documents_from_books(db: Session):
    """
    Load documents from active books in the database, including book_id in metadata.
    
    Args:
        db (Session): SQLAlchemy session for database access.
    
    Returns:
        List[Document]: List of documents with metadata including book_id.
    """
    books = db.query(Book).filter(Book.active == True).all()
    if not books:
        logger.warning("No active books found")
        return []
    
    documents = []
    for book in books:
        try:
            loader = PyPDFLoader(book.path)
            docs = loader.load()
            for doc in docs:
                doc.metadata["book_id"] = book.id
                doc.metadata["source"] = book.name
            documents.extend(docs)
            logger.info(f"Loaded {len(docs)} documents from book: {book.name}")
        except Exception as e:
            logger.error(f"Failed to load book {book.name}: {str(e)}")
    
    return documents

