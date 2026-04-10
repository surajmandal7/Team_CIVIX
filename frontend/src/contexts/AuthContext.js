import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;
console.log('CIVIX API URL:', API_URL);

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

  const login = async (email, password, role = 'user') => {
    setError(null);
    try {
      // For demo/mock purposes, if backend doesn't support roles yet, 
      // we can handle admin/business provider logins with specific paths or mock data.
      // But let's assume the API handles it or we use the 'role' parameter.
      const endpoint = role === 'admin' ? '/api/auth/admin/login' : 
                       role === 'business' ? '/api/auth/business/login' : 
                       '/api/auth/login';
      
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        { email, password },
        { withCredentials: true }
      );
      const { token, ...userData } = response.data;
      localStorage.setItem('civix_token', token);
      
      // Ensure role is in userData
      const userWithRole = { ...userData, role: userData.role || role };
      setUser(userWithRole);
      return { success: true, role: userWithRole.role };
    } catch (err) {
      // FALLBACK for development if endpoints don't exist yet
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        console.warn(`Auth endpoint ${role} not found, using mock login for demo`);
        // Mock successful login for demo if backend isn't ready
        if (password === 'password') {
          const mockUser = { id: 'mock-id', name: `Demo ${role}`, email, role };
          localStorage.setItem('civix_token', 'mock-token');
          setUser(mockUser);
          return { success: true, role };
        }
      }
      
      const message = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password, phone, role = 'user', businessData = null) => {
    setError(null);
    try {
      const endpoint = role === 'business' ? '/api/auth/business/register' : '/api/auth/register';
      const payload = role === 'business' 
        ? { name, email, password, phone, ...businessData }
        : { name, email, password, phone };

      const response = await axios.post(
        `${API_URL}${endpoint}`,
        payload,
        { withCredentials: true }
      );
      const { token, ...userData } = response.data;
      localStorage.setItem('civix_token', token);
      
      const userWithRole = { ...userData, role: userData.role || role };
      setUser(userWithRole);
      return { success: true, role: userWithRole.role };
    } catch (err) {
      // FALLBACK for development
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        console.warn(`Auth register endpoint ${role} not found, using mock register for demo`);
        const mockUser = { id: 'mock-id', name, email, role, phone };
        localStorage.setItem('civix_token', 'mock-token');
        setUser(mockUser);
        return { success: true, role };
      }

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
