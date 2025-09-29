from fastapi.testclient import TestClient
from src.interfaces.api import app


client = TestClient(app)

def test_chat_endpoint():
    response = client.post("/chat", json={"user_input": "test", "chat_history": []})
    assert response.status_code == 200
    assert "response" in response.json()