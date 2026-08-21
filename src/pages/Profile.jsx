import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/users/me/');
      setUser(res.data);
      setUsername(res.data.username);
      setBio(res.data.bio || '');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('bio', bio);
    if (avatar) {
      formData.append('avatar', avatar);
    }

    try {
      const res = await api.patch('/api/users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      if (err.response?.data?.current_password) {
        setMessage(`Erro: ${err.response.data.current_password}`);
      } else {
        setMessage('Erro ao atualizar perfil.');
      }
    }
  };

  const [activeTab, setActiveTab] = useState('edit');

  if (!user) return <div className="container">Carregando...</div>;

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '600px' }}>
      <div className="glass-panel" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center' }}>
          <div 
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            {avatarPreview || user.avatar ? (
              <img 
                src={avatarPreview || user.avatar} 
                alt="avatar" 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', opacity: 0.8 }} 
              />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold', opacity: 0.8 }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.3)' }}>
              📷
            </div>
          </div>
          <div>
            <h3>@{user.username}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {user.followers_count} Seguidores | {user.following_count} Seguindo
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          <button className={`btn ${activeTab !== 'edit' ? 'btn-outline' : ''}`} onClick={() => setActiveTab('edit')}>Editar</button>
          <button className={`btn ${activeTab !== 'followers' ? 'btn-outline' : ''}`} onClick={() => setActiveTab('followers')}>Seguidores</button>
          <button className={`btn ${activeTab !== 'following' ? 'btn-outline' : ''}`} onClick={() => setActiveTab('following')}>Seguindo</button>
        </div>

        {activeTab === 'edit' && (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {message && <p style={{ color: message.includes('Erro') ? '#ef4444' : '#10b981' }}>{message}</p>}
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nome de Usuário</label>
              <input 
                className="input-field" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Bio</label>
              <textarea 
                className="input-field" 
                value={bio} 
                placeholder="Fale sobre vc"
                onChange={e => setBio(e.target.value)} 
                style={{ resize: 'none', height: '80px' }}
              />
            </div>

            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files[0]) {
                  setAvatar(e.target.files[0]);
                  setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                }
              }}
              style={{ display: 'none' }}
            />

            <div style={{ marginTop: '10px' }}>
              <Link to="/change-password" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)', textDecoration: 'none', fontWeight: 'bold' }}>
                <span>🔒</span> Trocar senha
              </Link>
            </div>

            <button type="submit" className="btn" style={{ marginTop: '10px' }}>
              Salvar Alterações
            </button>
          </form>
        )}

        {activeTab === 'followers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.followers_list?.length > 0 ? user.followers_list.map(f => (
              <div key={f.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--primary-color)' }}>@{f.username}</strong>
              </div>
            )) : <p>Ninguém está seguindo você ainda.</p>}
          </div>
        )}

        {activeTab === 'following' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.following_list?.length > 0 ? user.following_list.map(f => (
              <div key={f.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                <strong style={{ color: 'var(--primary-color)' }}>@{f.username}</strong>
              </div>
            )) : <p>Você não segue ninguém ainda.</p>}
          </div>
        )}

      </div>
    </div>
  );
}

export default Profile;
