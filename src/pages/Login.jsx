import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isRegistering) {
        await api.post('/users/auth/register/', { username, password });
        setIsRegistering(false);
        setError('Conta criada! Faça login.');
      } else {
        const response = await api.post('/users/auth/login/', { username, password });
        localStorage.setItem('access_token', response.data.access);
        navigate('/feed');
      }
    } catch (err) {
      setError('Erro na operação. Verifique suas credenciais.');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
          {isRegistering ? 'Criar Conta' : 'Login'}
        </h2>
        
        {error && <p style={{ color: '#ef4444', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label>Usuário</label>
            <input 
              type="text" 
              className="input-field" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label>Senha</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="btn" style={{ marginTop: '10px' }}>
            {isRegistering ? 'Registrar' : 'Entrar'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          {isRegistering ? 'Já tem conta? ' : 'Não tem conta? '}
          <span 
            style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }} 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Faça Login' : 'Cadastre-se'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
