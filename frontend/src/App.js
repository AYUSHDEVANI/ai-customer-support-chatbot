import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Chat from './components/Chat';
import AdminDashboard from './components/AdminDashboard';
import PasswordReset from './components/PasswordReset';
import { Container } from 'react-bootstrap';

function App() {
    const { user, logout, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <>


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
