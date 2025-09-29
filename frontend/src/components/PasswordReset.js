import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button, Container, Alert, Card, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PasswordReset = () => {
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Request, 2: Reset

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!username) {
            setError('Please enter a username');
            toast.error('Please enter a username', { position: 'top-right' });
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('http://localhost:8000/password-reset-request', {
                username
            });
            setToken(response.data.token); // For testing, use returned token
            setStep(2);
            toast.info('Reset token generated (check console for token; SMTP will be added later)', { position: 'top-right' });
            console.log('Reset Token:', response.data.token); // Temporary for testing
        } catch (e) {
            setError('Failed: ' + (e.response?.data?.detail || e.message));
            toast.error('Failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!newPassword || !token) {
            setError('Please fill in all fields');
            toast.error('Please fill in all fields', { position: 'top-right' });
            return;
        }

        setLoading(true);
        setError('');
        try {
            await axios.post('http://localhost:8000/password-reset', {
                username,
                token,
                new_password: newPassword
            });
            toast.success('Password reset successful! Redirecting to login...', { position: 'top-right' });
            setTimeout(() => window.location.href = '/login', 2000);
        } catch (e) {
            setError('Reset failed: ' + (e.response?.data?.detail || e.message));
            toast.error('Reset failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '100%', maxWidth: '400px', padding: '20px' }} className="shadow-lg rounded-4">
                <Card.Body>
                    <h2 className="text-center mb-4">Reset Password</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {step === 1 ? (
                        <Form onSubmit={handleRequest}>
                            <Form.Group className="mb-3" controlId="username">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    placeholder="Enter username"
                                    className="rounded-pill"
                                />
                            </Form.Group>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                                className="w-100 rounded-pill"
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : 'Request Reset'}
                            </Button>
                        </Form>
                    ) : (
                        <Form onSubmit={handleReset}>
                            <Form.Group className="mb-3" controlId="token">
                                <Form.Label>Reset Token</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    required
                                    placeholder="Enter reset token"
                                    className="rounded-pill"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="newPassword">
                                <Form.Label>New Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="Enter new password"
                                    className="rounded-pill"
                                />
                            </Form.Group>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                                className="w-100 rounded-pill"
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : 'Reset Password'}
                            </Button>
                        </Form>
                    )}
                    <div className="text-center mt-3">
                        <Link to="/login">Back to Login</Link>
                    </div>
                </Card.Body>
            </Card>
            <ToastContainer />
        </Container>
    );
};

export default PasswordReset;