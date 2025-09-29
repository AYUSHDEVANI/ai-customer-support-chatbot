import React, { useState, useEffect, useContext } from 'react';
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

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:8000/admin/books', {
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
                    axios.get('http://localhost:8000/admin/analytics/users', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('http://localhost:8000/admin/analytics/books', {
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
            const response = await axios.post('http://localhost:8000/admin/books/upload', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get('http://localhost:8000/admin/books', {
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
            const response = await axios.post('http://localhost:8000/admin/books/toggle', { id: bookId, active }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get('http://localhost:8000/admin/books', {
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
            const response = await axios.post('http://localhost:8000/admin/books/delete', { id: bookId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message, { position: 'top-right' });
            const booksResponse = await axios.get('http://localhost:8000/admin/books', {
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
        <Container className="mt-4">
            <Card className="shadow-lg rounded-4">
                <Card.Header className="bg-primary text-white rounded-top-4">
                    <h3 className="mb-0">Admin Dashboard</h3>
                </Card.Header>
                <Card.Body>
                    <Tabs defaultActiveKey="books" id="admin-tabs" className="mb-3">
                        <Tab eventKey="books" title="Books">
                            <h4>Upload Books</h4>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleUpload}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Upload PDFs</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".pdf"
                                        multiple
                                        onChange={handleFileChange}
                                        className="rounded-pill"
                                        aria-label="Upload PDFs"
                                    />
                                </Form.Group>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-pill"
                                >
                                    {loading ? <Spinner animation="border" size="sm" /> : 'Upload'}
                                </Button>
                            </Form>
                            <h4 className="mt-4">Books</h4>
                            <Table striped bordered hover responsive aria-label="Books table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Active</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {books.map((book) => (
                                        <tr key={book.id}>
                                            <td>{book.name}</td>
                                            <td>{book.active ? 'Yes' : 'No'}</td>
                                            <td>
                                                <Button
                                                    variant={book.active ? 'warning' : 'success'}
                                                    onClick={() => handleToggle(book.id, !book.active)}
                                                    className="rounded-pill me-2"
                                                    disabled={actionLoading[book.id]}
                                                    aria-label={book.active ? 'Deactivate book' : 'Activate book'}
                                                >
                                                    {actionLoading[book.id] ? <Spinner animation="border" size="sm" /> : (book.active ? 'Deactivate' : 'Activate')}
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    onClick={() => handleDelete(book.id, book.name)}
                                                    className="rounded-pill"
                                                    disabled={actionLoading[book.id]}
                                                    aria-label={`Delete book ${book.name}`}
                                                >
                                                    {actionLoading[book.id] ? <Spinner animation="border" size="sm" /> : 'Delete'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Tab>
                        <Tab eventKey="analytics" title="Analytics">
  <h4>User Activity</h4>
  <div style={{ height: '400px', marginBottom: '20px' }}>
    <Bar
      data={userChartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'User Activity by Type' },
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Count' } },
          x: { title: { display: true, text: 'Username' } },
        },
      }}
    />
  </div>

  <h4>Book Usage</h4>
  <div style={{ height: '400px' }}>
    <Pie
      data={bookChartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Book Usage in Chats' },
        },
      }}
    />
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