from langchain_core.tools import tool
from sqlalchemy.orm import Session
from src.data.embeddings import get_retriever
from src.utils.logger import setup_logger
from src.db.models import Book

logger = setup_logger()

def make_faq_retriever_tool(db: Session):
    @tool
    def faq_retriever_tool(query: str) -> dict:
        """Retrieve relevant FAQs from the knowledge base.

        Args:
            query (str): The search query.

        Returns:
            dict: Contains 'content' (concatenated document content) and 'used_book_ids' (list of book IDs).
        """
        retriever = get_retriever(db)
        if not retriever:
            return {"content": "No active books available for retrieval.", "used_book_ids": []}
        
        result = retriever(query)
        docs = result["results"]
        used_book_ids = result["used_book_ids"]
        
        truncated_docs = [
            doc[:300] + "..." if len(doc) > 300 else doc
            for doc in docs
        ]
        
        sources = []
        for book_id in used_book_ids:
            book = db.query(Book).filter(Book.id == book_id).first()
            sources.append(book.name if book else "Unknown")
        
        logger.info(f"Retrieved {len(docs)} docs from active books for query: {query}")
        content = f"From {', '.join(sources)}:\n\n" + "\n\n".join(truncated_docs)
        return {"content": content, "used_book_ids": used_book_ids}
    
    return faq_retriever_tool

@tool
def human_handoff_tool(query: str) -> str:
    """Simulate handing off to a human agent."""
    logger.info(f"Handing off query: {query}")
    return "Query escalated to human support. You'll be contacted soon."