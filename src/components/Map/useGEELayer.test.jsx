/**
 * Testes do useGEELayer — mockam a API (axios) e validam o contrato:
 * busca tile_fetcher, expõe loading/error e invalidate respostas obsoletas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import useGEELayer from './useGEELayer';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

import api from '../../services/api';

const GEE_PAYLOAD = {
  mapid: 'projects/ee-phccasagrande20/maps/abc',
  token: '',
  tile_fetcher: 'https://earthengine.googleapis.com/v1/projects/p/maps/abc/tiles/{z}/{x}/{y}',
  visualization: { min: 300, max: 400 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGEELayer', () => {
  it('não busca nada quando eventType é null', async () => {
    const { result } = renderHook(() => useGEELayer(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.tileUrl).toBeNull();
  });

  it('busca a URL do tile do backend e retorna tile_fetcher', async () => {
    api.get.mockResolvedValueOnce({ data: GEE_PAYLOAD });

    const { result } = renderHook(() => useGEELayer('queimada'));

    expect(api.get).toHaveBeenCalledWith('/api/georisk/gee/queimada/');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tileUrl).toBe(GEE_PAYLOAD.tile_fetcher);
    expect(result.current.error).toBeNull();
  });

  it('expõe erro amigável quando o backend responde 503', async () => {
    api.get.mockRejectedValueOnce({
      response: { status: 503, data: { error: 'Earth Engine não autenticado' } },
    });

    const { result } = renderHook(() => useGEELayer('queimada'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tileUrl).toBeNull();
    expect(result.current.error).toBe('Earth Engine não autenticado');
  });

  it('expõe erro quando falta tile_fetcher no payload', async () => {
    api.get.mockResolvedValueOnce({ data: { mapid: 'x' } });

    const { result } = renderHook(() => useGEELayer('queimada'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/não retornou tile_fetcher/);
  });

  it('refetch revalida a camada sob demanda', async () => {
    api.get.mockResolvedValue({ data: GEE_PAYLOAD });

    const { result } = renderHook(() => useGEELayer('queimada'));
    await waitFor(() => expect(result.current.tileUrl).toBeTruthy());
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('enabled=false bloqueia a busca', async () => {
    const { result } = renderHook(() => useGEELayer('queimada', { enabled: false }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.tileUrl).toBeNull();
  });
});