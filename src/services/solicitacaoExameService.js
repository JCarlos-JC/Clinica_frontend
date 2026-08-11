import api from './api';

const getSolicitacoes = async (params = {}) => {
  const response = await api.get('/api/solicitacoes-exames', { params });
  return response.data;
};

const getSolicitacao = async (id) => {
  const response = await api.get(`/api/solicitacoes-exames/${id}`);
  return response.data;
};

const confirmarExames = async (id, payload) => {
  const response = await api.put(`/api/solicitacoes-exames/${id}/confirmar`, payload);
  return response.data;
};

const processarPagamento = async (id, payload) => {
  const response = await api.post(`/api/solicitacoes-exames/${id}/processar-pagamento`, payload);
  return response.data;
};

const agendarColheita = async (id, payload) => {
  const response = await api.post(`/api/solicitacoes-exames/${id}/agendar-colheita`, payload);
  return response.data;
};

const rejeitarSolicitacao = async (id, payload) => {
  const response = await api.post(`/api/solicitacoes-exames/${id}/rejeitar`, payload);
  return response.data;
};

const cancelarSolicitacao = async (id, payload) => {
  const response = await api.post(`/api/solicitacoes-exames/${id}/cancelar`, payload);
  return response.data;
};

const solicitacaoExameService = {
  getSolicitacoes,
  getSolicitacao,
  confirmarExames,
  rejeitarSolicitacao,
  processarPagamento,
  agendarColheita,
  cancelarSolicitacao,
};

export default solicitacaoExameService;
