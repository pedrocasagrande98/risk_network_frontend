/**
 * Utilitário para resolução de URLs de mídia (avatares, fotos, anexos).
 *
 * Garante que caminhos relativos gerados pelo backend (ex: /media/avatars/foto.jpg)
 * sejam resolvidos contra a URL base da API (VITE_API_URL) e não contra o domínio
 * do frontend (ex: Vercel), evitando erros 404 e imagens quebradas.
 */

export function getMediaUrl(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  // Se já for blob local (preview durante seleção do arquivo) ou data-uri
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Se já for URL absoluta (ex: Cloudinary https://res.cloudinary.com/... ou S3)
  if (/^https?:\/\//i.test(trimmed)) {
    // Se a aplicação estiver em HTTPS e o backend devolveu HTTP em produção, normaliza para HTTPS
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      trimmed.startsWith('http://') &&
      !trimmed.includes('localhost') &&
      !trimmed.includes('127.0.0.1')
    ) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return trimmed;
  }

  // Caminho relativo (ex: /media/... ou media/...)
  const rawBase =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'http://127.0.0.1:8000';
  const cleanBase = rawBase.replace(/\/+$/, '').replace(/\/api$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${cleanBase}${cleanPath}`;
}
