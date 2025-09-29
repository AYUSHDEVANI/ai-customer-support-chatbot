import os
from dotenv import load_dotenv

load_dotenv()



GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
MAX_CONTEXT: int = 3
MODEL_NAME = "openai/gpt-oss-120b"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# DATA_PATH = "A:\\Projects\\AI Customer Support Chatbot\\data\\sample_docs\\thebook.pdf"
FAISS_INDEX_PATH = "A:\\Projects\\AI Customer Support Chatbot\\src\\data/faiss_index"
BOOKS_UPLOAD_DIR = "A:\\Projects\\AI Customer Support Chatbot\\src\\data\\books\\uploads"

SECRET_KEY = os.getenv("SECRET_KEY", "ayushdevani1718")
ALGORITHM = "HS256"

DATABASE_URL = "sqlite:///./A:\\Projects\\AI Customer Support Chatbot\\instance\\users.db"




