import { useState, useEffect, useCallback } from 'react';
import triagemService from '../services/triagemService';
import { normalizeApiList } from '../services/apiConfig';

// Hook para buscar triagens do serviço na porta 8005
export default function useTriagens(initialParams = { page: 1, per_page: 20 }) {
  const [triagens, setTriagens] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchTriagens = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    try {
      const p = { ...params, ...(overrideParams || {}) };
      const data = await triagemService.getTriagens(p, token);
      const lista = normalizeApiList(data);
      const meta = data?.meta || data?.pagination || data?.data?.meta || data?.data?.pagination || data?.data || {};

      setTriagens(lista);
      setTotal(meta.total ?? lista.length);

      // Atualizar params apenas se houve override para evitar loop
      if (overrideParams) {
        setParams(p);
      }
    } catch (err) {
      console.error('Erro ao buscar triagens:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  // fetch on mount only
  useEffect(() => {
    fetchTriagens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  const refresh = useCallback(() => fetchTriagens(), [fetchTriagens]);

  return {
    triagens,
    total,
    loading,
    error,
    params,
    setParams,
    fetchTriagens,
    refresh
  };
}
