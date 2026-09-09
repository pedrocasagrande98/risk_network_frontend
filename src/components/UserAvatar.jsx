import { useState, useEffect } from 'react';
import { getMediaUrl } from '../utils/media';

export default function UserAvatar({
  avatar,
  username = '',
  size = 40,
  fontSize,
  style = {},
  className = '',
}) {
  const [hasError, setHasError] = useState(false);
  const src = getMediaUrl(avatar);

  // Se a URL mudar (ex: novo upload), reseta o estado de erro
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const calculatedFontSize = fontSize || `${Math.max(14, Math.floor(size * 0.4))}px`;

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    ...style,
  };

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={username ? `Avatar de @${username}` : 'Avatar'}
        onError={() => setHasError(true)}
        className={className}
        style={{
          ...containerStyle,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...containerStyle,
        backgroundColor: 'var(--primary-color)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: calculatedFontSize,
        userSelect: 'none',
      }}
      aria-label={`Avatar de @${username}`}
    >
      {initial}
    </div>
  );
}
