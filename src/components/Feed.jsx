import React from 'react';
import PostCard from './PostCard';

const Feed = ({ posts, loading, error }) => {
  if (loading) {
    return <div className="loading">Carregando feed...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!posts || posts.length === 0) {
    return <div className="loading">Nenhum post encontrado.</div>;
  }

  return (
    <div className="feed-container">
      {posts.map((post) => (
        <PostCard key={post.id || Math.random()} post={post} />
      ))}
    </div>
  );
};

export default Feed;
