import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Table, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AdminDashboard = () => {
    const [books, setBooks] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState('');
    const [userAnalytics, setUserAnalytics] = useState([]);
    const [bookAnalytics, setBookAnalytics] = useState([]);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Use environment variable for API URL, default to empty string (relative path) for production
    const API_URL = process.env.REACT_APP_API_URL || "";

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/admin/books`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBooks(response.data);
            } catch (e) {
                setError('Failed to load books: ' + (e.response?.data?.detail || e.message));
                toast.error('Failed to load books', { position: 'top-right' });
            }
        };
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem('token');
                const [userResponse, bookResponse] = await Promise.all([
                    axios.get(`${API_URL}/admin/analytics/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${API_URL}/admin/analytics/books`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setUserAnalytics(userResponse.data);
                setBookAnalytics(bookResponse.data);
            } catch (e) {
                setError('Failed to load analytics: ' + (e.response?.data?.detail || e.message));
                toast.error('Failed to load analytics', { position: 'top-right' });
            }
        };
        fetchBooks();
        fetchAnalytics();
    }, []);

    useEffect(() => {
        console.log("Book Analytics:", bookAnalytics);
    }, [bookAnalytics]);

    const handleFileChange = (e) => {
        setFiles(e.target.files);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!files.length) {
            setError('Please select at least one file');
            toast.error('Please select at least one file', { position: 'top-right' });
            return;
        }
        setLoading(true);
        setError('');
        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/admin/books/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get(`${API_URL}/admin/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(booksResponse.data);
            setFiles([]);
            e.target.reset();
        } catch (e) {
            setError('Upload failed: ' + (e.response?.data?.detail || e.message));
            toast.error('Upload failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (bookId, active) => {
        setActionLoading((prev) => ({ ...prev, [bookId]: true }));
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/admin/books/toggle`, { id: bookId, active }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get(`${API_URL}/admin/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(booksResponse.data);
        } catch (e) {
            setError('Toggle failed: ' + (e.response?.data?.detail || e.message));
            toast.error('Toggle failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
        } finally {
            setActionLoading((prev) => ({ ...prev, [bookId]: false }));
        }
    };

    const handleDelete = async (bookId, bookName) => {
        if (!window.confirm(`Are you sure you want to delete '${bookName}'?`)) return;
        setActionLoading((prev) => ({ ...prev, [bookId]: true }));
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/admin/books/delete`, { id: bookId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get(`${API_URL}/admin/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(booksResponse.data);
        } catch (e) {
            setError('Delete failed: ' + (e.response?.data?.detail || e.message));
            toast.error('Delete failed: ' + (e.response?.data?.detail || e.message), { position: 'top-right' });
        } finally {
            setActionLoading((prev) => ({ ...prev, [bookId]: false }));
        }
    };

    const userChartData = {
        labels: userAnalytics.map(u => u.username),
        datasets: [
            {
                label: 'Logins',
                data: userAnalytics.map(u => u.logins),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
                label: 'Chats',
                data: userAnalytics.map(u => u.chats),
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
            {
                label: 'Password Resets',
                data: userAnalytics.map(u => u.password_resets),
                backgroundColor: 'rgba(255, 206, 86, 0.6)',
            }
        ]
    };

    const bookChartData = {
        labels: bookAnalytics.map(b => b.name),
        datasets: [
            {
                data: bookAnalytics.map(b => Number(b.usage_count)), // ensure numeric
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderColor: '#fff',
                borderWidth: 2,
            }
        ]
    };

    return (
        <Container className="mt-4" style={{ minHeight: '90vh' }}>
            <Card className="glass-card shadow-sm border-0">
                <Card.Header className="bg-transparent border-bottom-0 p-4 d-flex justify-content-between align-items-center">
                    <div>
                        <h3 className="mb-0 fw-bold text-dark">Admin Dashboard</h3>
                        <p className="text-secondary mb-0">Manage knowledge base and view analytics</p>
                    </div>
                    <div>
                        <Button variant="outline-primary" onClick={() => navigate('/chat')} className="rounded-pill fw-bold me-2">
                            Back to Chat
                        </Button>
                        <Button variant="outline-danger" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} className="rounded-pill fw-bold">
                            Logout
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-4">
                    <Tabs defaultActiveKey="books" id="admin-tabs" className="mb-4 nav-pills">
                        <Tab eventKey="books" title="Knowledge Base">
                            <div className="bg-white p-4 rounded-4 shadow-sm border border-light mb-4">
                                <h5 className="fw-bold mb-3">Upload Documents</h5>
                                {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
                                <Form onSubmit={handleUpload}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Select PDF Files</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="file"
                                                accept=".pdf"
                                                multiple
                                                onChange={handleFileChange}
                                                className="shadow-none"
                                            />
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                disabled={loading}
                                                className="px-4"
                                            >
                                                {loading ? <Spinner animation="border" size="sm" /> : 'Upload'}
                                            </Button>
                                        </div>
                                    </Form.Group>
                                </Form>
                            </div>

                            <h5 className="fw-bold mb-3">Manage Books</h5>
                            <div className="table-responsive bg-white rounded-4 shadow-sm border border-light p-2">
                                <Table hover className="mb-0 align-middle">
                                    <thead className="bg-light text-secondary">
                                        <tr>
                                            <th className="border-0 ps-4">Name</th>
                                            <th className="border-0">Status</th>
                                            <th className="border-0 text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {books.map((book) => (
                                            <tr key={book.id}>
                                                <td className="ps-4 fw-medium text-dark">{book.name}</td>
                                                <td>
                                                    <span className={`badge rounded-pill ${book.active ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                                                        {book.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="text-end pe-4">
                                                    <Button
                                                        variant={book.active ? 'outline-warning' : 'outline-success'}
                                                        size="sm"
                                                        onClick={() => handleToggle(book.id, !book.active)}
                                                        className="rounded-pill me-2 fw-semibold"
                                                        disabled={actionLoading[book.id]}
                                                    >
                                                        {actionLoading[book.id] ? <Spinner animation="border" size="sm" /> : (book.active ? 'Deactivate' : 'Activate')}
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(book.id, book.name)}
                                                        className="rounded-pill fw-semibold"
                                                        disabled={actionLoading[book.id]}
                                                    >
                                                        {actionLoading[book.id] ? <Spinner animation="border" size="sm" /> : 'Delete'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Tab>
                        <Tab eventKey="analytics" title="Analytics">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <div className="bg-white p-4 rounded-4 shadow-sm border border-light h-100">
                                        <h5 className="fw-bold mb-4">User Activity</h5>
                                        <div style={{ height: '300px' }}>
                                            <Bar
                                                data={userChartData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: { position: 'top' },
                                                    },
                                                    scales: {
                                                        y: { beginAtZero: true, grid: { display: false } },
                                                        x: { grid: { display: false } },
                                                    },
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="bg-white p-4 rounded-4 shadow-sm border border-light h-100">
                                        <h5 className="fw-bold mb-4">Popular Sources</h5>
                                        <div style={{ height: '300px' }}>
                                            <Pie
                                                data={bookChartData}
                                                options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: { position: 'right' },
                                                    },
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
            <ToastContainer />
        </Container>
    );
};

export default AdminDashboard;