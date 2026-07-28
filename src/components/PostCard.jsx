import React from 'react';

const PostCard = ({ post }) => {
  // Simple fallback for avatar initials
  const initial = post.author?.username ? post.author.username.charAt(0).toUpperCase() : '?';
  const authorName = post.author?.username || 'Unknown User';
  const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now';

  return (
    <article className="post-card" id={`post-${post.id}`}>
      <header className="post-header">
        <div className="avatar">{initial}</div>
        <div className="user-info">
          <span className="username">{authorName}</span>
          <time className="timestamp" dateTime={post.created_at}>{dateStr}</time>
        </div>
      </header>
      <div className="post-content">
        <p>{post.content}</p>
      </div>
      <footer className="post-actions">
        <button className="action-button" aria-label="Like post">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          {post.likes_count || 0}
        </button>
        <button className="action-button" aria-label="Comment on post">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          {post.comments_count || 0}
        </button>
      </footer>
    </article>
  );
};

export default PostCard;
