import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Chat from './components/Chat';
import AdminDashboard from './components/AdminDashboard';
import PasswordReset from './components/PasswordReset';
import { Container, Navbar, Nav, Dropdown } from 'react-bootstrap';

function App() {
    const { user, logout } = useContext(AuthContext);

    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
                <Container>
                    <Navbar.Brand>AI Chatbot</Navbar.Brand>
                    <Nav className="ms-auto align-items-center">
                        {user ? (
                            <>
                                {/* Display user's name */}
                                <Dropdown align="end" className="me-3">
                                    <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                                        Welcome, {user.username}
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                        <Dropdown.Item as={Link} to="/chat">Chat</Dropdown.Item>
                                        {user.role === 'admin' && (
                                            <Dropdown.Item as={Link} to="/admin">Admin Dashboard</Dropdown.Item>
                                        )}
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={logout}>Logout</Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                                <Nav.Link as={Link} to="/signup">Sign Up</Nav.Link>
                            </>
                        )}
                    </Nav>
                </Container>
            </Navbar>

            <Routes>
                <Route path="/login" element={user ? <Navigate to="/chat" replace /> : <Login />} />
                <Route path="/signup" element={user ? <Navigate to="/chat" replace /> : <Signup />} />
                <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" replace />} />
                <Route path="/password-reset" element={user ? <Navigate to="/chat" replace /> : <PasswordReset />} />
                <Route
                    path="/admin"
                    element={
                        user?.role === 'admin' ? (
                            <AdminDashboard />
                        ) : (
                            <Navigate to={user ? "/chat" : "/login"} replace />
                        )
                    }
                />
                <Route path="/" element={<Navigate to={user ? "/chat" : "/login"} replace />} />
            </Routes>
        </>
    );
}

export default App;
