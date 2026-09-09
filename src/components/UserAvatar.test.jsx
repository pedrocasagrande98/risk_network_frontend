import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
  it('renderiza o fallback com a primeira letra do username quando avatar não é fornecido', () => {
    render(<UserAvatar avatar={null} username="pedro" size={40} />);
    const fallback = screen.getByLabelText('Avatar de @pedro');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toBe('P');
  });

  it('renderiza fallback com "?" quando username não é fornecido', () => {
    render(<UserAvatar avatar={null} username="" size={40} />);
    const fallback = screen.getByLabelText('Avatar de @');
    expect(fallback.textContent).toBe('?');
  });

  it('renderiza a tag img quando avatar é fornecido', () => {
    render(<UserAvatar avatar="https://example.com/avatar.jpg" username="pedro" size={40} />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    expect(img.getAttribute('alt')).toBe('Avatar de @pedro');
  });

  it('alterna para o fallback de iniciais quando ocorre onError na imagem', () => {
    render(<UserAvatar avatar="https://example.com/broken-image.jpg" username="pedro" size={40} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    const fallback = screen.getByLabelText('Avatar de @pedro');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toBe('P');
  });
});
