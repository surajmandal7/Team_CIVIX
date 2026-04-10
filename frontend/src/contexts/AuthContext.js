import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to format API error details
function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not authenticated, object = authenticated
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('civix_token');
      if (token) {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        setUser(response.data);
      } else {
        setUser(false);
      }
    } catch (err) {
      localStorage.removeItem('civix_token');
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const { token, ...userData } = response.data;
      localStorage.setItem('civix_token', token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password, phone) => {
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        { name, email, password, phone },
        { withCredentials: true }
      );
      const { token, ...userData } = response.data;
      localStorage.setItem('civix_token', token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const message = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      // Ignore errors during logout
    }
    localStorage.removeItem('civix_token');
    setUser(false);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && user !== false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
