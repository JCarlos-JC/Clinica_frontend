
import axios from 'axios';

const API_BASE = 'http://196.3.100.216/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});


const getTriagens = async (params = {}, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  // ✅ CORREÇÃO: Usar o endpoint específico para triagens pendentes
  // GET /api/solicitacoes-triagem/pendentes - retorna solicitações com status 'aguardando_triagem'
  // Ignorar query params de status, pois o endpoint já filtra automáticamente
  const response = await api.get('/solicitacoes-triagem/pendentes', {
    params: {
      page: params.page || 1,
      per_page: params.per_page || 20
    },
    headers
  });
  return response.data;
};


const createTriagem = async (payload, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.post('/triagens', payload, { headers });
  return response.data;
};


const updateTriagem = async (id, payload, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.put(`/triagens/${id}`, payload, { headers });
  return response.data;
};


const updateTriagemStatus = async (id, status, token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // ✅ CORREÇÃO: Usar PATCH em vez de PUT (conforme definido nas rotas do backend)
  const response = await api.patch(`/triagens/${id}/status`, { status }, { headers });
  return response.data;
};


const getTiposConsulta = async (token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/options/tipos-consulta', { headers });
  return response.data;
};


const getMedicos = async (token = null) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/options/medicos', { headers });
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
