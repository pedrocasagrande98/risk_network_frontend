import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import GeoRisk from './pages/GeoRisk';
import Users from './pages/Users';
import Navbar from './components/Navbar';

function App() {
  // Aplicar tema no body permanentemente
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <Router>
      <div className="app-wrapper">

        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas com Navbar */}
          <Route path="/feed" element={<><Navbar /><Feed global={false} /></>} />
          <Route path="/posts" element={<><Navbar /><Feed global={true} /></>} />
          <Route path="/profile" element={<><Navbar /><Profile /></>} />
          <Route path="/change-password" element={<><Navbar /><ChangePassword /></>} />
          <Route path="/users" element={<><Navbar /><Users /></>} />
          
          <Route path="/georisk" element={<GeoRisk />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
