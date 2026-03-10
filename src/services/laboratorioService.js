import axios from 'axios';

// laboratory-service — porta 8003
const API_BASE = process.env.REACT_APP_LABORATORY_SERVICE_URL || 'http://127.0.0.1:8003/api';

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
    if (error.response?.status === 401) {
      console.error('[laboratorioService] Token inválido ou expirado.');
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AGENDAMENTOS DE COLHEITA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista agendamentos de colheita.
 * GET /api/laboratorio/agendamentos
 * @param {Object} params  status | data (YYYY-MM-DD)
 */
const getAgendamentos = async (params = {}) => {
  const response = await api.get('/laboratorio/agendamentos', { params });
  return response.data;
};

/**
 * Lista agendamentos pendentes do dia (agendada | em_colheita).
 * GET /api/laboratorio/agendamentos/pendentes
 */
const getAgendamentosPendentes = async () => {
  const response = await api.get('/laboratorio/agendamentos/pendentes');
  return response.data;
};

/**
 * Detalhes de um agendamento.
 * GET /api/laboratorio/agendamentos/{id}
 */
const getAgendamento = async (id) => {
  const response = await api.get(`/laboratorio/agendamentos/${id}`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// FLUXO DE COLHEITA: iniciar → concluir (com resultados)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Técnico regista que o paciente chegou e inicia a colheita.
 * POST /api/laboratorio/colheitas/{agendamentoId}/iniciar
 *
 * @param {number} agendamentoId
 * @param {Object} payload
 * @param {number} payload.tecnico_id
 * @param {string} payload.observacoes
 * @param {string} payload.hora_inicio  "14:05"
 */
const iniciarColheita = async (agendamentoId, payload = {}) => {
  const response = await api.post(`/laboratorio/colheitas/${agendamentoId}/iniciar`, payload);
  return response.data;
};

/**
 * Técnico regista os resultados e conclui a colheita.
 * POST /api/laboratorio/colheitas/{agendamentoId}/concluir
 * → Notifica consultation-service automaticamente com os resultados.
 *
 * @param {number} agendamentoId
 * @param {Object} payload
 * @param {number} payload.tecnico_id
 * @param {string} payload.hora_conclusao
 * @param {string} payload.observacoes_gerais
 * @param {Array}  payload.resultados  [{ exame_id, tipo_exame, resultado, laudo, valores_referencia }]
 *
 * Exemplo de resultado:
 * {
 *   exame_id: 1,
 *   tipo_exame: "Hemograma Completo",
 *   resultado: {
 *     "Hemácias": "4.5 milhões/mm³ - Normal",
 *     "Hemoglobina": "12 g/dL - Normal"
 *   },
 *   laudo: "Discreta leucocitose.",
 *   valores_referencia: { "Hemácias": "4.0–5.5 milhões/mm³" }
 * }
 */
const concluirColheita = async (agendamentoId, payload) => {
  const response = await api.post(`/laboratorio/colheitas/${agendamentoId}/concluir`, payload);
  return response.data;
};

/**
 * Upload de anexo (PDF / imagem de radiografia).
 * POST /api/laboratorio/colheitas/{agendamentoId}/anexo
 * Content-Type: multipart/form-data
 *
 * @param {number}   agendamentoId
 * @param {FormData} formData  campos: ficheiro (File), exame_id (int), descricao (string)
 */
const adicionarAnexo = async (agendamentoId, formData) => {
  const response = await api.post(
    `/laboratorio/colheitas/${agendamentoId}/anexo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

/**
 * Cancela um agendamento de colheita.
 * POST /api/laboratorio/colheitas/{agendamentoId}/cancelar
 *
 * @param {number} agendamentoId
 * @param {Object} payload  { motivo, notificar_consulta }
 */
const cancelarColheita = async (agendamentoId, payload) => {
  const response = await api.post(`/laboratorio/colheitas/${agendamentoId}/cancelar`, payload);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────

const laboratorioService = {
  // Agendamentos
  getAgendamentos,
  getAgendamentosPendentes,
  getAgendamento,
  // Colheitas
  iniciarColheita,
  concluirColheita,
  adicionarAnexo,
  cancelarColheita
};

export default laboratorioService;
