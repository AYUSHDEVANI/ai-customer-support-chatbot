import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import {
  Container,
  Form,
  Button,
  Alert,
  Card,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../AuthContext";

// Error Boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="danger">
          Something went wrong: {this.state.error?.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}

const API_URL = "http://localhost:8000/chat";
// const API_URL = "https://0785b392eac8.ngrok-free.app/chat";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, logout } = useContext(AuthContext);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.chat_history && Array.isArray(response.data.chat_history)) {
          setMessages(response.data.chat_history);
        } else {
          setError("Invalid chat history format");
        }
      } catch (e) {
        setError("Failed to load chat history");
      }
    };
    if (user) fetchHistory();
  }, [user]);

  // Send message
  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        API_URL,
        { user_input: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.data.chat_history || !Array.isArray(response.data.chat_history)) {
        throw new Error("Invalid chat history format");
      }
      setMessages(response.data.chat_history);
    } catch (error) {
      console.error("API Error:", error);
      setError("Failed to get response from server");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <Container className="mt-4 d-flex flex-column align-items-center">
        <Card className="shadow-lg rounded-4" style={{ width: "100%", maxWidth: "700px" }}>
          <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white rounded-top-4">
            <h5 className="mb-0">🤖 AI Support Assistant</h5>
            <Button variant="outline-light" size="sm" onClick={logout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </Button>
          </Card.Header>

          <Card.Body
            className="chat-container"
            style={{
              height: "70vh",
              overflowY: "auto",
              background: "#f7f9fc",
              padding: "1rem",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex mb-3 ${
                  msg.role === "user" ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  className={`p-3 rounded-4 shadow-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white"
                      : "bg-white border"
                  }`}
                  style={{ maxWidth: "70%" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="d-flex justify-content-start mb-3">
                <div
                  className="p-3 rounded-4 bg-white border shadow-sm"
                  style={{ maxWidth: "50%" }}
                >
                  <span className="typing-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </Card.Body>

          <Card.Footer className="bg-light">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="d-flex"
            >
              <Form.Control
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="rounded-pill"
              />
              <Button
                variant="primary"
                type="submit"
                className="ms-2 rounded-pill px-3"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </Form>
          </Card.Footer>
        </Card>

        {error && <Alert className="mt-3 w-100">{error}</Alert>}
      </Container>

      {/* Typing animation CSS */}
      <style>{`
        .typing-dots span {
          animation: blink 1.5s infinite;
          display: inline-block;
          margin-right: 2px;
          font-size: 1.2rem;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </ErrorBoundary>
  );
}

export default Chat;
