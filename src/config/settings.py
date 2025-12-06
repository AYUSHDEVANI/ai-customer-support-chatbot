import os
from dotenv import load_dotenv

load_dotenv()



GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
HUGGINGFACE_API_KEY: str = os.getenv("HF_TOKEN")
PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME")
SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
MAX_CONTEXT: int = 3
MODEL_NAME = "openai/gpt-oss-120b"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# DATA_PATH = "A:\\Projects\\AI Customer Support Chatbot\\data\\sample_docs\\thebook.pdf"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Use DATA_DIR env var if set (for Render Disk), otherwise default to local src/data
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))

FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")
BOOKS_UPLOAD_DIR = os.path.join(DATA_DIR, "books", "uploads")

SECRET_KEY = os.getenv("SECRET_KEY", "ayushdevani1718")
ALGORITHM = "HS256"


# DATABASE_URL = "sqlite:///./A:\\Projects\\AI Customer Support Chatbot\\instance\\users.db"
DATABASE_URL = os.getenv("DATABASE_URL")



