import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TweetCard from '../components/TweetCard';

function Feed({ global = false }) {
  const [tweets, setTweets] = useState([]);
  const [newTweet, setNewTweet] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      const res = await api.get('/api/users/me/');
      setCurrentUser(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchTweets = async () => {
    try {
      const endpoint = global ? '/api/tweets/' : '/api/tweets/feed/';
      const response = await api.get(endpoint);
      setTweets(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchTweets();
  }, [global]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newTweet.trim()) return;
    try {
      await api.post('/api/tweets/', { content: newTweet });
      setNewTweet('');
      fetchTweets(); // Atualiza a lista
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '700px' }}>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', borderLeft: '4px solid var(--primary-color)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Criar novo post</h3>
        <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            className="input-field"
            placeholder="O que está acontecendo?&#10;Tipo de evento&#10;Severidade: Baixa/Media/Critica&#10;Descrição do evento&#10;Lat/Long: "
            value={newTweet}
            onChange={(e) => setNewTweet(e.target.value)}
            style={{ resize: 'none', height: '100px', fontSize: '16px' }}
          />
          <button className="btn" type="submit" style={{ alignSelf: 'flex-end', padding: '10px 25px', fontWeight: 'bold' }}>Postar</button>
        </form>
      </div>

      <h2 style={{ marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
        {global ? 'Posts Globais (Explorar)' : 'Seu Feed (Seguindo)'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tweets.map(tweet => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            currentUser={currentUser}
            onUpdate={fetchTweets}
          />
        ))}
        {tweets.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            {global
              ? 'Nenhum tweet encontrado na plataforma.'
              : 'Seu feed está vazio! Descubra novas pessoas para seguir.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default Feed;
