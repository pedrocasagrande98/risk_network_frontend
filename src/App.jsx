import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Feed from './components/Feed';

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const normalizedBase = baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
        const response = await axios.get(`${normalizedBase}/api/tweets/`);
        // Handle paginated response if applicable, else assume array
        const data = response.data.results ? response.data.results : response.data;
        setPosts(data);
      } catch (err) {
        setError('Não foi possível carregar os posts. O servidor pode estar offline.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <main>
      <header className="app-header">
        <h1 className="app-title">Risk Network</h1>
        <p className="app-subtitle">A rede mais segura para suas postagens</p>
      </header>
      <section>
        <Feed posts={posts} loading={loading} error={error} />
      </section>
    </main>
  );
}

export default App;
