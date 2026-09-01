/**
 * Hook useGEELayer — comunicação com o backend Django p/ camadas GEE.
 *
 * SRP: só busca a URL do tile; o componente de mapa apenas consome o resultado.
 * Retorna { tileUrl, loading, error, refetch } — refetch força nova consulta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';

const GEE_ENDPOINT = '/api/georisk/gee';

export function useGEELayer(eventType, options = {}) {
  const { enabled = true } = options;
  const [tileUrl, setTileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  const refetch = useCallback(async () => {
    if (!eventType || !enabled) {
      setTileUrl(null);
      setError(null);
      setLoading(false);
      return null;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      // Backend: /api/georisk/gee/<event_type>/ (views_gee.GEETileView)
      const res = await api.get(`${GEE_ENDPOINT}/${eventType}/`);
      if (seq !== requestSeq.current) return null; // resposta obsoleta

      const { tile_fetcher: fetcher } = res.data || {};
      if (!fetcher) {
        throw new Error('Backend GEE não retornou tile_fetcher.');
      }
      setTileUrl(fetcher);
      return fetcher;
    } catch (err) {
      if (seq !== requestSeq.current) return null;
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao buscar camada GEE no backend.';
      setError(msg);
      setTileUrl(null);
      return null;
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [eventType, enabled]);

  useEffect(() => {
    // Reinicia estado e busca automaticamente ao mudar o evento
    setTileUrl(null);
    setError(null);
    if (!eventType || !enabled) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    refetch();
    return () => {
      // invalida respostas em voo ao trocar de evento/desmontar
      requestSeq.current += 1;
    };
  }, [eventType, enabled, refetch]);

  return { tileUrl, loading, error, refetch };
}

export default useGEELayer;