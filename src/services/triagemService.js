
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8005/api';

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
  const response = await api.get('/triagens', {
    params,
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
  const response = await api.put(`/triagens/${id}/status`, { status }, { headers });
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
