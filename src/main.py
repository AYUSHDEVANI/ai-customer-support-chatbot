import uvicorn

# from src.data.embeddings import build_vector_store
# build_vector_store()

if __name__ == "__main__":
    uvicorn.run("src.interfaces.api:app", host="0.0.0.0", port=8000, reload=True)