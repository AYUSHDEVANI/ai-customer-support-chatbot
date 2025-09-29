import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                console.log('AuthContext: Decoded JWT=', decoded); // Debug
                setUser({ username: decoded.sub, role: decoded.role || 'user' });
            } catch (e) {
                console.error('Invalid token:', e);
                localStorage.removeItem('token');
                setUser(null);
            }
        } else {
            console.log('AuthContext: No token found');
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await axios.post('http://localhost:8000/login', { username, password });
            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            const decoded = jwtDecode(access_token);
            console.log('Login: Decoded JWT=', decoded); // Debug
            setUser({ username: decoded.sub, role: decoded.role || 'user' });
            navigate(decoded.role === 'admin' ? '/admin' : '/chat');
            return true;
        } catch (e) {
            console.error('Login failed:', e);
            return false;
        }
    };

    const signup = async (username, password, role = 'user') => {
        try {
            const response = await axios.post('http://localhost:8000/signup', {
                username,
                password,
                role
            });
            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            const decoded = jwtDecode(access_token);
            console.log('Signup: Decoded JWT=', decoded); // Debug
            setUser({ username: decoded.sub, role: decoded.role || 'user' });
            navigate(decoded.role === 'admin' ? '/admin' : '/chat');
            return true;
        } catch (e) {
            console.error('Signup failed:', e);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        console.log('Logged out');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};