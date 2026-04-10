import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import EmergencyFAB from "./components/EmergencyFAB";
import Landing from "./pages/Landing";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Dashboard from "./pages/Dashboard";
import Bookmarks from "./pages/Bookmarks";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for system preference or saved preference
    const savedMode = localStorage.getItem('civix_dark_mode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('civix_dark_mode', darkMode.toString());
  }, [darkMode]);

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      <AuthProvider>
        <BrowserRouter>
          <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
          <EmergencyFAB />
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
