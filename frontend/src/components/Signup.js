import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Container, Alert, Card, Spinner } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext } from '../AuthContext';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signup } = useContext(AuthContext);
    const navigate = useNavigate();
    const role = "user"; // Hardcoded role

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Please fill in all fields');
            toast.error('Please fill in all fields', { position: 'top-right' });
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await signup(username, password, role);
            if (success) {
                toast.success('Signup successful!', { position: 'top-right', autoClose: 2000 });
                setTimeout(() => {
                    navigate('/chat');
                }, 2000);
            } else {
                setError('Signup failed. Username may already exist.');
                toast.error('Signup failed. Username may already exist.', { position: 'top-right' });
            }
        } catch (err) {
            setError('Signup failed: ' + err.message);
            toast.error('Signup failed: ' + err.message, { position: 'top-right' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '100%', maxWidth: '400px', padding: '20px' }} className="shadow-lg rounded-4">
                <Card.Body>
                    <h2 className="text-center mb-4">Sign Up</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="rounded-pill"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="password">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="rounded-pill"
                            />
                        </Form.Group>
                        <Button
                            variant="primary"
                            type="submit"
                            className="w-100 rounded-pill"
                            disabled={loading}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : 'Sign Up'}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <span>Already have an account? </span>
                        <Link to="/login">Login</Link>
                    </div>
                </Card.Body>
            </Card>
            <ToastContainer />
        </Container>
    );
};

export default Signup;