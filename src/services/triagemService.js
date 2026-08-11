
import api from './api';

const getTriagens = async (params = {}, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isPendingQueue = !params.status || params.status === 'aguardando_triagem';
  const queryParams = {
    page: params.page || 1,
    per_page: params.per_page || 20,
    ...(params.search ? { search: params.search } : {}),
    ...(!isPendingQueue && params.status ? { status: params.status } : {})
  };

  if (!isPendingQueue) {
    const response = await api.get('/api/triagens', { params: queryParams, headers });
    return response.data;
  }

  const response = await api.get('/api/solicitacoes-triagem/pendentes', {
    params: queryParams,
    headers
  });
  return response.data;
};


const createTriagem = async (payload, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.post('/api/triagens', payload, { headers });
  return response.data;
};


const updateTriagem = async (id, payload, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.put(`/api/triagens/${id}`, payload, { headers });
  return response.data;
};


const updateTriagemStatus = async (id, status, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // ✅ CORREÇÃO: Usar PATCH em vez de PUT (conforme definido nas rotas do backend)
  const response = await api.patch(`/api/triagens/${id}/status`, { status }, { headers });
  return response.data;
};


const getTiposConsulta = async (token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/api/options/tipos-consulta', { headers });
  return response.data;
};


const getMedicos = async (token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/api/options/medicos', { headers });
  return response.data;
};


const triagemService = {
  getTriagens,
  createTriagem,
  updateTriagem,
  updateTriagemStatus,
  getTiposConsulta,
  getMedicos
};

export default triagemService;
