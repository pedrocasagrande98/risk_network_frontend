import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import UserAvatar from './UserAvatar';

function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/api/users/me/');
        setCurrentUser(res.data);
      } catch (err) {
        // Not logged in or token expired
      }
    };
    if (localStorage.getItem('access_token')) {
      fetchUser();
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px', backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>
          RiskNetwork
        </h2>
        <nav style={{ display: 'flex', gap: '15px' }}>
          <Link to="/feed" className="btn btn-outline" style={{ textDecoration: 'none' }}>Seu Feed</Link>
          <Link to="/posts" className="btn btn-outline" style={{ textDecoration: 'none' }}>Posts Globais</Link>
          <Link to="/users" className="btn btn-outline" style={{ textDecoration: 'none' }}>Descobrir Usuários</Link>
          <Link to="/georisk" className="btn btn-outline" style={{ textDecoration: 'none', color: '#10b981', borderColor: '#10b981' }}>GeoRisk</Link>
        </nav>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {currentUser && (
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-color)' }} title="Ver meu perfil">
            <UserAvatar avatar={currentUser.avatar} username={currentUser.username} size={34} />
            <span style={{ fontWeight: '500' }}>@{currentUser.username}</span>
          </Link>
        )}
        <Link to="/profile" className="btn btn-outline" style={{ textDecoration: 'none' }}>Meu Perfil</Link>
        <button className="btn btn-outline" onClick={logout}>Sair</button>
      </div>
    </header>
  );
}

export default Navbar;
