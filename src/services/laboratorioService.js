import api from './api';

const getAgendamentos = async (params = {}) => {
  const response = await api.get('/api/laboratorio/agendamentos', { params });
  return response.data;
};

const getAgendamentosPendentes = async (params = {}) => {
  const response = await api.get('/api/laboratorio/agendamentos/pendentes', { params });
  return response.data;
};

const getAgendamento = async (id) => {
  const response = await api.get(`/api/laboratorio/agendamentos/${id}`);
  return response.data;
};

const iniciarColheita = async (agendamentoId, payload = {}) => {
  const response = await api.post(`/api/laboratorio/colheitas/${agendamentoId}/iniciar`, payload);
  return response.data;
};

const concluirColheita = async (agendamentoId, payload) => {
  const response = await api.post(`/api/laboratorio/colheitas/${agendamentoId}/concluir`, payload);
  return response.data;
};

const adicionarAnexo = async (agendamentoId, formData) => {
  const response = await api.post(
    `/api/laboratorio/colheitas/${agendamentoId}/anexo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

const cancelarColheita = async (agendamentoId, payload) => {
  const response = await api.post(`/api/laboratorio/colheitas/${agendamentoId}/cancelar`, payload);
  return response.data;
};

const laboratorioService = {
  getAgendamentos,
  getAgendamentosPendentes,
  getAgendamento,
  iniciarColheita,
  concluirColheita,
  adicionarAnexo,
  cancelarColheita,
};

export default laboratorioService;
