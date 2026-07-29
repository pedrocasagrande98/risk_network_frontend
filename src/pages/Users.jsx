import { useEffect, useState } from 'react';
import api from '../services/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me/');
      setCurrentUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await api.post(`/users/${userId}/follow/`);
      // Update the user list and current user follow lists
      fetchUsers();
      fetchCurrentUser();
    } catch (err) {
      console.error('Erro ao seguir', err);
    }
  };

  const isFollowing = (userId) => {
    if (!currentUser || !currentUser.following_list) return false;
    return currentUser.following_list.some(f => f.id === userId);
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '700px' }}>
      <h2 style={{ marginBottom: '30px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>Descobrir Usuários</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {users.map(user => {
          if (currentUser && user.id === currentUser.id) return null; // Não mostrar a si mesmo
          
          return (
            <div key={user.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>@{user.username}</h4>
                  <small style={{ color: 'var(--text-muted)' }}>
                    {user.followers_count} Seguidor{user.followers_count !== 1 ? 'es' : ''}
                  </small>
                </div>
              </div>
              
              <button 
                className={`btn ${isFollowing(user.id) ? 'btn-outline' : ''}`}
                onClick={() => handleFollow(user.id)}
                style={{ padding: '8px 15px' }}
              >
                {isFollowing(user.id) ? 'Deixar de Seguir' : 'Seguir'}
              </button>
            </div>
          );
        })}
        {users.length <= 1 && (
          <p style={{ color: 'var(--text-muted)' }}>Não há outros usuários na plataforma ainda.</p>
        )}
      </div>
    </div>
  );
}

export default Users;
