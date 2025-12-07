import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Container, Alert, Card, InputGroup, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext } from '../AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [validated, setValidated] = useState(false);
    const usernameRef = useRef(null);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        usernameRef.current.focus();
    }, []);

    const sanitizeInput = (input) => {
        return input.replace(/[<>]/g, '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setValidated(true);
            return;
        }

        setLoading(true);
        setError('');
        const sanitizedUsername = sanitizeInput(username);
        try {
            const success = await login(sanitizedUsername, password);
            if (success) {
                toast.success('Login successful!', { position: 'top-right', autoClose: 2000 });
            } else {
                setError('Invalid credentials');
                toast.error('Login failed. Please check your credentials.', { position: 'top-right' });
            }
        } catch (e) {
            console.error('Login error:', e);
            if (e.response?.status === 429) {
                setError('Too many login attempts. Please try again later.');
                toast.error('Too many login attempts. Please try again later.', { position: 'top-right' });
            } else {
                setError('Login failed: ' + (e.response?.data?.detail || e.message));
                toast.error('Login failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <Card className="glass-card" style={{ width: '100%', maxWidth: '400px', border: 'none' }}>
                <Card.Body className="p-4">
                    <h2 className="text-center mb-4 fw-bold text-dark">Welcome Back</h2>
                    {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
                    <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                            <Form.Label className="fw-semibold">Username</Form.Label>
                            <Form.Control
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyDown}
                                ref={usernameRef}
                                required
                                isInvalid={validated && !username}
                                placeholder="Enter your username"
                                className="mb-3"
                            />
                            <Form.Control.Feedback type="invalid">
                                Please enter a username.
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-4" controlId="password">
                            <Form.Label className="fw-semibold">Password</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    required
                                    isInvalid={validated && !password}
                                    placeholder="Enter your password"
                                />
                                <Button
                                    variant="outline-light"
                                    className="border-0 text-secondary bg-white"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ borderLeft: 'none' }}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </Button>
                                <Form.Control.Feedback type="invalid">
                                    Please enter a password.
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={loading}
                            className="w-100 mb-3"
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : 'Log In'}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <span className="text-muted">Don't have an account? </span>
                        <Link to="/signup" className="fw-bold text-decoration-none" style={{ color: '#764ba2' }}>
                            Sign Up
                        </Link>
                        <br />
                        <Link to="/password-reset" className="small text-muted text-decoration-none mt-2 d-inline-block">
                            Forgot Password?
                        </Link>
                    </div>
                </Card.Body>
            </Card>
            <ToastContainer />
        </Container>
    );
};

export default Login;