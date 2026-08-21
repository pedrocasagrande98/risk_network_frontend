import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!currentPassword || !password) {
      setMessage('Erro: Preencha a senha atual e a nova senha.');
      return;
    }

    try {
      await api.patch('/api/users/me/', {
        current_password: currentPassword,
        password: password
      });
      setMessage('Senha alterada com sucesso!');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.current_password) {
        setMessage(`Erro: ${err.response.data.current_password}`);
      } else {
        setMessage('Erro ao atualizar a senha.');
      }
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '500px' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <Link to="/profile" className="btn btn-outline" style={{ display: 'inline-block', marginBottom: '20px', textDecoration: 'none' }}>
          &larr; Voltar
        </Link>
        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔒 Trocar Senha
        </h2>

        {message && <p style={{ color: message.includes('Erro') ? '#ef4444' : '#10b981', marginBottom: '15px' }}>{message}</p>}

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Senha Atual</label>
            <input 
              type="password"
              className="input-field" 
              value={currentPassword}
              required
              onChange={e => setCurrentPassword(e.target.value)} 
              autoComplete="current-password"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Nova Senha</label>
            <input 
              type="password"
              className="input-field" 
              value={password}
              required
              onChange={e => setPassword(e.target.value)} 
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn" style={{ marginTop: '10px' }}>
            Atualizar Senha
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
