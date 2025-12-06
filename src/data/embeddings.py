from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from sqlalchemy.orm import Session
from pinecone import Pinecone, ServerlessSpec
from src.config.settings import EMBEDDING_MODEL, PINECONE_API_KEY, PINECONE_INDEX_NAME, HUGGINGFACE_API_KEY
from src.data.loader import load_documents_from_book
from src.db.models import Book
from src.utils.logger import setup_logger

logger = setup_logger()

def build_vector_store(db: Session, force_rebuild: bool = False):
    """
    Build or update the Pinecone vector store with active books.
    If force_rebuild is True, deletes all vectors and re-uploads.
    """
    logger.info("Connecting to Pinecone...")
    
    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists, create if not
    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
        logger.info(f"Creating new Pinecone index: {PINECONE_INDEX_NAME}")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=384,  # all-MiniLM-L6-v2 dimension
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
    
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # Initialize embeddings
    embeddings = HuggingFaceEndpointEmbeddings(
        huggingfacehub_api_token=HUGGINGFACE_API_KEY, 
        model=EMBEDDING_MODEL
    )
    
    # Load active books
    books = db.query(Book).filter(Book.active == True).all()
    
    if not books:
        logger.warning("No active books found for vector store")
        # Ensure we return a valid vector store even if empty, so retriever doesn't fail
        return PineconeVectorStore(index_name=PINECONE_INDEX_NAME, embedding=embeddings)
    
    # If force rebuild, delete all vectors
    if force_rebuild:
        logger.info("Force rebuild: Deleting all vectors from Pinecone index")
        try:
            index.delete(delete_all=True)
        except Exception as e:
            logger.warning(f"Could not delete vectors (index might be empty): {e}")
    
    # Initialize Vector Store (wrapper)
    vector_store = PineconeVectorStore(index_name=PINECONE_INDEX_NAME, embedding=embeddings)

    """
    Get a retriever for the Pinecone vector store.
    """
    logger.info("Initializing Pinecone retriever...")
    
    # Initialize embeddings
    embeddings = HuggingFaceEndpointEmbeddings(
        huggingfacehub_api_token=HUGGINGFACE_API_KEY, 
        model=EMBEDDING_MODEL
    )
    
    try:
        # Connect to existing Pinecone index
        vector_store = PineconeVectorStore(
            index_name=PINECONE_INDEX_NAME,
            embedding=embeddings
        )
        
        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 8})
        
        def wrapped_retriever(query):
            docs = retriever.invoke(query)
            used_book_ids = [doc.metadata.get("book_id") for doc in docs if doc.metadata.get("book_id")]
            return {"results": [doc.page_content for doc in docs], "used_book_ids": used_book_ids}
        
        return wrapped_retriever
    
    except Exception as e:
        logger.warning(f"Pinecone retriever initialization failed: {e}, rebuilding...")
        vector_store = build_vector_store(db, force_rebuild=True)
        
        if vector_store:
            retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 8})
            
            def wrapped_retriever(query):
                docs = retriever.invoke(query)
                used_book_ids = [doc.metadata.get("book_id") for doc in docs if doc.metadata.get("book_id")]
                return {"results": [doc.page_content for doc in docs], "used_book_ids": used_book_ids}
            
            return wrapped_retriever
        
        return None