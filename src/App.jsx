import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import FeedWrapper from './components/FeedWrapper';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="loading">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">Risk Network</Link>
      <div className="nav-links">
        <Link to="/profile" className="nav-item">
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="nav-avatar" />
          ) : (
            <UserIcon size={20} />
          )}
          <span>{user.username}</span>
        </Link>
        <button onClick={logout} className="logout-button" title="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <FeedWrapper />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
