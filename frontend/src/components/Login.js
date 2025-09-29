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
            <Card style={{ width: '100%', maxWidth: '400px', padding: '20px' }} className="shadow-lg rounded-4">
                <Card.Body>
                    <h2 className="text-center mb-4">Login</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyDown}
                                ref={usernameRef}
                                required
                                isInvalid={validated && !username}
                                placeholder="Enter username"
                                className="rounded-pill"
                                aria-label="Username"
                            />
                            <Form.Control.Feedback type="invalid">
                                Please enter a username.
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="password">
                            <Form.Label>Password</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    required
                                    isInvalid={validated && !password}
                                    placeholder="Enter password"
                                    className="rounded-pill"
                                    aria-label="Password"
                                />
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                            className="w-100 rounded-pill"
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : 'Login'}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <span>Don't have an account? </span>
                        <Link to="/signup">Sign Up</Link>
                        <br />
                        <Link to="/password-reset">Forgot Password?</Link>
                    </div>
                </Card.Body>
            </Card>
            <ToastContainer />
        </Container>
    );
};

export default Login;