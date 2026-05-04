import axios from 'axios';

// patient-service — porta 8002
const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8002/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ...existing code...
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// LISTAGEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista solicitações de exames.
 * GET /api/solicitacoes-exames
 * @param {Object} params  status | paciente_id
 */
const getSolicitacoes = async (params = {}) => {
  const response = await api.get('/solicitacoes-exames', { params });
  return response.data;
};

/**
 * Detalhes de uma solicitação.
 * GET /api/solicitacoes-exames/{id}
 */
const getSolicitacao = async (id) => {
  const response = await api.get(`/solicitacoes-exames/${id}`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// FLUXO: confirmar → pagar → agendar colheita
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Receção confirma exames disponíveis e define preços.
 * PUT /api/solicitacoes-exames/{id}/confirmar
 *
 * @param {number} id
 * @param {Object} payload
 * @param {Array}  payload.exames_confirmados  [{ tipo_exame, disponivel, preco }]
 * @param {string} payload.observacoes
 */
const confirmarExames = async (id, payload) => {
  const response = await api.put(`/solicitacoes-exames/${id}/confirmar`, payload);
  return response.data;
};

/**
 * Regista o pagamento dos exames.
 * POST /api/solicitacoes-exames/{id}/processar-pagamento
 *
 * @param {number} id
 * @param {Object} payload
 * @param {number} payload.valor_pago
 * @param {string} payload.metodo_pagamento  dinheiro | cartao | transferencia | seguro
 * @param {string} payload.referencia_pagamento
 * @param {string} payload.observacoes
 */
const processarPagamento = async (id, payload) => {
  const response = await api.post(`/solicitacoes-exames/${id}/processar-pagamento`, payload);
  return response.data;
};

/**
 * Agenda a colheita no laboratório.
 * POST /api/solicitacoes-exames/{id}/agendar-colheita
 * → Notifica laboratory-service automaticamente.
 *
 * @param {number} id
 * @param {Object} payload
 * @param {string} payload.data_colheita  ISO 8601
 * @param {string} payload.hora_colheita  "14:00"
 * @param {string} payload.observacoes
 * @param {number} payload.tecnico_id
 */
const agendarColheita = async (id, payload) => {
  const response = await api.post(`/solicitacoes-exames/${id}/agendar-colheita`, payload);
  return response.data;
};

/**
 * Rejeita uma solicitação de exames.
 * POST /api/solicitacoes-exames/{id}/rejeitar
 *
 * @param {number} id
 * @param {Object} payload  { motivo }
 */
const rejeitarSolicitacao = async (id, payload) => {
  const response = await api.post(`/solicitacoes-exames/${id}/rejeitar`, payload);
  return response.data;
};

/**
 * Cancela uma solicitação de exames.
 * POST /api/solicitacoes-exames/{id}/cancelar
 *
 * @param {number} id
 * @param {Object} payload  { motivo }
 */
const cancelarSolicitacao = async (id, payload) => {
  const response = await api.post(`/solicitacoes-exames/${id}/cancelar`, payload);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────

const solicitacaoExameService = {
  getSolicitacoes,
  getSolicitacao,
  confirmarExames,
  rejeitarSolicitacao,
  processarPagamento,
  agendarColheita,
  cancelarSolicitacao
};

export default solicitacaoExameService;
