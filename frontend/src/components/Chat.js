import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const API_URL = (process.env.REACT_APP_API_URL || "") + "/chat";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, logout } = useContext(AuthContext);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

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
      <Container className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh', padding: '20px' }}>
        <Card className="glass-card w-100" style={{ maxWidth: "800px", height: "85vh", display: 'flex', flexDirection: 'column' }}>
          <Card.Header className="d-flex justify-content-between align-items-center bg-transparent border-bottom-0 p-4">
            <div className="d-flex align-items-center">
                <div className="bg-white rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{ width: 45, height: 45, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <span role="img" aria-label="robot" style={{ fontSize: '1.5rem' }}>🤖</span>
                </div>
                <div>
                    <h5 className="mb-0 fw-bold text-dark">AI Support Agent</h5>
                    <small className="text-secondary" style={{ fontSize: '0.8rem' }}>Always online</small>
                </div>
            </div>
            <div className="d-flex align-items-center gap-2">
                {user?.role === 'admin' && (
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => navigate('/admin')}
                        className="rounded-pill px-3 fw-bold border-2"
                        style={{ fontSize: '0.85rem' }}
                    >
                         Dashboard
                    </Button>
                )}
                <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={logout}
                    className="rounded-pill px-3 fw-bold border-2"
                    style={{ fontSize: '0.85rem' }}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Logout
                </Button>
            </div>
          </Card.Header>

          <Card.Body className="chat-window flex-grow-1">
            {messages.length === 0 && (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                    <FontAwesomeIcon icon={faPaperPlane} size="3x" className="mb-3" />
                    <p>Start a conversation...</p>
                </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.role === "user" ? "user-msg" : "ai-msg"}
              >
                <div className={msg.role === "user" ? "user-bubble" : "ai-bubble"}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => <table className="table table-bordered table-sm" style={{ fontSize: '0.9rem' }} {...props} />,
                      p: ({node, ...props}) => <p className="mb-0" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg">
                <div className="ai-bubble d-flex align-items-center" style={{ minWidth: 60 }}>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </Card.Body>

          <Card.Footer className="bg-transparent border-top-0 p-4 pt-0">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="position-relative"
            >
              <Form.Control
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="rounded-pill py-3 px-4 shadow-sm border-0"
                style={{ paddingRight: '60px', background: 'rgba(255,255,255,0.95)' }}
                disabled={loading}
              />
              <Button
                variant="primary"
                type="submit"
                className="position-absolute end-0 top-50 translate-middle-y rounded-circle me-2 d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40, padding: 0 }}
                disabled={!input.trim() || loading}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </Form>
          </Card.Footer>
        </Card>

        {error && <Alert variant="danger" className="mt-3 w-100 shadow-sm rounded-3" style={{ maxWidth: "800px" }}>{error}</Alert>}
      </Container>
    </ErrorBoundary>
  );
}



export default Chat;
