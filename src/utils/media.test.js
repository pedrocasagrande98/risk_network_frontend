import { describe, it, expect } from 'vitest';
import { getMediaUrl } from './media';

describe('getMediaUrl', () => {
  it('retorna null para valores vazios, nulos ou inválidos', () => {
    expect(getMediaUrl(null)).toBeNull();
    expect(getMediaUrl(undefined)).toBeNull();
    expect(getMediaUrl('')).toBeNull();
    expect(getMediaUrl('   ')).toBeNull();
    expect(getMediaUrl(123)).toBeNull();
  });

  it('preserva URLs de blob e data-uri (previews locais)', () => {
    expect(getMediaUrl('blob:http://localhost:5173/uuid-1234')).toBe('blob:http://localhost:5173/uuid-1234');
    expect(getMediaUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('preserva URLs externas completas (ex: Cloudinary HTTPS)', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1234/avatar.png';
    expect(getMediaUrl(cloudinaryUrl)).toBe(cloudinaryUrl);
  });

  it('resolve caminhos relativos adicionando a baseURL da API sem barra dupla', () => {
    const resolved = getMediaUrl('/media/avatars/user.jpg');
    expect(resolved).toBeTruthy();
    expect(resolved.endsWith('/media/avatars/user.jpg')).toBe(true);
    expect(resolved).not.toContain('//media');

    // Caminho relativo sem barra inicial
    const resolvedNoSlash = getMediaUrl('media/avatars/user.jpg');
    expect(resolvedNoSlash).toBeTruthy();
    expect(resolvedNoSlash.endsWith('/media/avatars/user.jpg')).toBe(true);
  });
});
