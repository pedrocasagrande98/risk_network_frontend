import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Feed from './Feed';

const FeedWrapper = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/api/tweets/');
        const data = response.data.results ? response.data.results : response.data;
        setPosts(data);
      } catch (err) {
        setError('Não foi possível carregar os posts.');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <section>
      <header className="feed-header">
        <h1 className="app-title">Feed</h1>
        <p className="app-subtitle">Fique por dentro das novidades</p>
      </header>
      <Feed posts={posts} loading={loading} error={error} />
    </section>
  );
};

export default FeedWrapper;
