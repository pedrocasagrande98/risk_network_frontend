import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import api from '../services/api';

function TweetCard({ tweet, currentUser, onUpdate }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(tweet.is_liked);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);

  const handleLike = async () => {
    try {
      await api.post(`/tweets/${tweet.id}/like/`);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (err) {
      console.error('Erro ao dar like:', err);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      try {
        const res = await api.get(`/tweets/${tweet.id}/comments/`);
        setComments(res.data);
      } catch (err) {
        console.error('Erro ao buscar comentários', err);
      }
    }
    setShowComments(!showComments);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/tweets/${tweet.id}/comments/`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
      if (onUpdate) onUpdate(); // para atualizar contagem no pai se necessário
    } catch (err) {
      console.error('Erro ao comentar', err);
    }
  };

  const [followText, setFollowText] = useState('Seguir / Unfollow');

  const handleFollow = async (userId) => {
    try {
      setFollowText('Aguarde...');
      await api.post(`/users/${userId}/follow/`);
      setFollowText('✅ Sucesso!');
      if (onUpdate) onUpdate(); // Refresh the feed or user list
      
      // Volta o texto original depois de 2 segundos
      setTimeout(() => {
        setFollowText('Seguir / Unfollow');
      }, 2000);
    } catch (err) {
      console.error('Erro ao seguir', err);
      setFollowText('❌ Erro');
      setTimeout(() => setFollowText('Seguir / Unfollow'), 2000);
    }
  };

  const isOwnTweet = currentUser && currentUser.id === tweet.author.id;

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {tweet.author.avatar ? (
            <img src={tweet.author.avatar} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
              {tweet.author.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 style={{ color: 'var(--text-color)', margin: 0 }}>@{tweet.author.username}</h4>
            <small style={{ color: 'var(--text-muted)' }}>{new Date(tweet.created_at).toLocaleString()}</small>
          </div>
        </div>
        {!isOwnTweet && (
          <button 
            className="btn btn-outline" 
            style={{ padding: '5px 10px', fontSize: '12px', transition: 'all 0.3s ease' }} 
            onClick={() => handleFollow(tweet.author.id)}
          >
            {followText}
          </button>
        )}
      </div>

      <p style={{ marginTop: '15px', fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{tweet.content}</p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
        <button 
          style={{ background: 'none', border: 'none', color: isLiked ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={handleLike}
        >
          <Heart size={20} fill={isLiked ? '#ef4444' : 'none'} />
          <span>{likesCount}</span>
        </button>

        <button 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={handleToggleComments}
        >
          <MessageCircle size={20} />
          <span>{tweet.comments_count}</span>
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed var(--glass-border)' }}>
          <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              className="input-field" 
              placeholder="Escreva um comentário..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" className="btn">Enviar</button>
          </form>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--primary-color)' }}>@{c.user.username}</strong>
                <p style={{ fontSize: '14px', margin: '5px 0 0 0' }}>{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TweetCard;
