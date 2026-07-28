import React, { useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Image as ImageIcon, Save } from 'lucide-react';

const Profile = () => {
  const { user, fetchUser } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('username', username);
    
    if (newPassword) {
      formData.append('current_password', currentPassword);
      formData.append('password', newPassword);
    }
    
    if (avatar) {
      formData.append('avatar', avatar);
    }

    try {
      await api.patch('/api/users/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setAvatar(null);
      await fetchUser(); // Atualiza o contexto
    } catch (err) {
      let errorText = 'Erro ao atualizar perfil.';
      if (err.response?.data) {
        // Formata os erros vindos do Django
        const errors = Object.values(err.response.data).flat();
        errorText = errors.join(' ');
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="loading">Carregando...</div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-title">
          <User className="icon" /> Meu Perfil
        </h2>
        
        {message.text && (
          <div className={`alert-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="current-profile">
          <div className="avatar-large">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          <p>@{user.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label><User size={16}/> Nome de Usuário</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label><ImageIcon size={16}/> Foto de Perfil (Avatar)</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files[0])} 
              className="form-input file-input"
            />
          </div>

          <h3 className="section-title"><Lock size={16}/> Alterar Senha (Opcional)</h3>
          
          <div className="form-group">
            <label>Senha Atual</label>
            <input 
              type="password" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              className="form-input"
              placeholder="Necessário se for alterar a senha"
            />
          </div>
          
          <div className="form-group">
            <label>Nova Senha</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="form-input"
            />
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
