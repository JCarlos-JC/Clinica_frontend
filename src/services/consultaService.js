import axios from 'axios';

const API_BASE = 'http://196.3.100.216/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      // Você pode adicionar lógica de refresh token ou redirect para login aqui
    }
    return Promise.reject(error);
  }
);

/**
 * Buscar consultas pendentes (pacientes aguardando atendimento)
 * @param {Object} params - Parâmetros de filtro (especialidade, medico_id, etc.)
 * @returns {Promise} - Dados das consultas pendentes
 */
const getConsultasPendentes = async (params = {}) => {
  try {
    // Tentar primeiro o endpoint de agendamentos (consultas agendadas)
    const agendamentosResponse = await api.get('http://196.3.100.216/api/agenda/agendamentos/', { params });
    
    console.log('📋 Agendamentos recebidos:', agendamentosResponse.data);
    console.log('📊 Total de agendamentos:', agendamentosResponse.data?.data?.length || 0);
    
    // A resposta vem em formato paginado: { data: { data: [...], current_page, etc }, status: 'success' }
    // Precisamos retornar no formato esperado pelo hook: { status: 'success', data: { data: [...] } }
    if (agendamentosResponse.data?.status === 'success' && agendamentosResponse.data?.data) {
      const paginatedData = agendamentosResponse.data.data;
      
      // Retornar mantendo a estrutura paginada para o hook extrair corretamente
      return {
        status: 'success',
        data: paginatedData,  // Aqui já tem { data: [...], current_page, etc }
        message: 'Agendamentos encontrados'
      };
    }
    
    // Se vazio, retornar estrutura paginada vazia
    return {
      status: 'success',
      data: {
        data: [],
        current_page: 1,
        total: 0,
        per_page: 15
      },
      message: 'Nenhum agendamento encontrado'
    };
  } catch (error) {
    console.error('❌ Erro ao buscar consultas pendentes:', error);
    
    // Retornar vazio em vez de erro para não quebrar a interface
    return {
      status: 'success',
      data: {
        data: [],
        current_page: 1,
        total: 0,
        per_page: 15
      },
      message: 'Nenhum agendamento disponível'
    };
  }
};

/**
 * Buscar consultas realizadas (histórico)
 * @param {Object} params - Parâmetros de filtro (data_inicio, data_fim, paciente_id, etc.)
 * @returns {Promise} - Dados das consultas realizadas
 */
const getConsultasRealizadas = async (params = {}) => {
  try {
    const response = await api.get('/consultas/realizadas/', { params });
    return response.data;
  } catch (error) {
    console.warn('⚠️ Histórico de consultas não disponível:', error.message);
    throw error;
  }
};

/**
 * Buscar consultas de um paciente específico
 * @param {number} pacienteId - ID do paciente
 * @param {string} token - Token de autenticação (opcional, já incluído no interceptor)
 * @returns {Promise} - Dados das consultas do paciente
 */
const getConsultasPaciente = async (pacienteId, token = null) => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await api.get('/consultas', {
    params: { paciente_id: pacienteId },
    headers
  });
  
  return response.data;
};

/**
 * Buscar detalhes de uma consulta específica
 * @param {number} id - ID da consulta
 * @returns {Promise} - Dados detalhados da consulta
 */
const getConsulta = async (id) => {
  const response = await api.get(`/consultas/${id}`);
  return response.data;
};

/**
 * Criar uma nova consulta
 * @param {Object} payload - Dados da consulta
 * @returns {Promise} - Consulta criada
 */
const createConsulta = async (payload) => {
  const response = await api.post('/consultas', payload);
  return response.data;
};

/**
 * Atualizar uma consulta existente
 * @param {number} id - ID da consulta
 * @param {Object} payload - Dados para atualizar
 * @returns {Promise} - Consulta atualizada
 */
const updateConsulta = async (id, payload) => {
  const response = await api.put(`/consultas/${id}`, payload);
  return response.data;
};

/**
 * Finalizar uma consulta com prescrições e/ou exames
 * @param {Object} payload - Dados completos da consulta (diagnóstico, prescrições, exames, etc.)
 * @returns {Promise} - Consulta finalizada
 * @endpoint POST http://127.0.0.1:8007/api/consultas/finalizar
 */
/**
 * Converte data de DD/MM/YYYY ou DD/MM/YY para YYYY-MM-DD (ISO).
 * Se já estiver no formato ISO, retorna como está.
 */
const toISODate = (dateStr) => {
  if (!dateStr) return null;
  // Já é ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  // DD/MM/YYYY ou DD/MM/YY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
};

const finalizarConsulta = async (consultaId, payload) => {
  // Transforma o array de exames para o formato esperado pela API
  const examesTransformados = (payload.exames || []).map(exame => ({
    nome: exame.nome || exame.examesSolicitados || exame.tipo_exame || '',
    prioridade: (exame.prioridade || 'Normal').toLowerCase(),
    data_coleta: toISODate(exame.dataColeta || exame.data_coleta) || null,
    observacoes: exame.observacoes || '',
  }));
  
  const fullPayload = {
    agendamentoId: consultaId,  // Changed to camelCase to match FinalizarConsultaRequest
    ...payload,
    exames: examesTransformados,
  };

  console.log('📤 Enviando finalização de consulta:', {
    consultaId,
    endpoint: `/api/consultas/${consultaId}/finalizar`,
    payload: fullPayload
  });

  const response = await axios.post(
    `http://196.3.100.216/api/consultas/${consultaId}/finalizar`,
    fullPayload,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`
      }
    }
  );

  console.log('✅ Consulta finalizada com sucesso:', response.data);
  return response.data;
};

/**
 * Solicitar exames durante uma consulta
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Exames solicitados
 * @returns {Promise} - Consulta atualizada com exames
 */
const solicitarExames = async (consultaId, payload) => {
  const response = await api.post(`/consultas/${consultaId}/exames`, payload);
  
  return response.data;
};

/**
 * Registrar alta do paciente
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Dados da alta
 * @returns {Promise} - Registro de alta
 */
const registrarAlta = async (consultaId, payload) => {
  const response = await api.post(`/consultas/${consultaId}/alta`, payload);
  return response.data;
};

/**
 * Registrar óbito
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Dados do óbito
 * @returns {Promise} - Registro de óbito
 */
const registrarObito = async (consultaId, payload) => {
  const response = await api.post(`/consultas/${consultaId}/obito`, payload);
  return response.data;
};

/**
 * Transferir paciente para outro médico
 * @param {string|number} consultaId - ID ou código_agendamento da consulta
 * @param {Object} payload - Dados da transferência
 * @param {number} payload.medico_destino_id - ID do médico destino
 * @param {string} payload.motivo - Motivo da transferência (obrigatório)
 * @param {string} payload.observacoes - Observações adicionais (opcional)
 * @returns {Promise} - Registro de transferência
 * @endpoint POST http://127.0.0.1:8007/api/agenda/consultas-agendadas/{consulta_id}/transferir-medico
 */
const transferirMedico = async (agendamentoId, payload) => {
  // Garantir que o ID seja numérico
  const id = Number(agendamentoId);
  
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`ID inválido: ${agendamentoId}. Deve ser um número inteiro positivo.`);
  }
  
  const response = await axios.post(
    `http://196.3.100.216/api/agenda/consultas-agendadas/${id}/transferir-medico`,
    payload,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('token')}`
      }
    }
  );
  
  return response.data;
};

/**
 * Transferir paciente para outra especialidade
 * @param {string|number} consultaId - ID ou código_agendamento da consulta
 * @param {Object} payload - Dados da transferência
 * @param {string} payload.especialidade_destino - Especialidade de destino
 * @param {number} payload.medico_destino_id - ID do médico destino
 * @param {string} payload.motivo - Motivo da transferência (obrigatório)
 * @param {string} payload.observacoes - Observações adicionais (opcional)
 * @returns {Promise} - Registro de transferência
 * @endpoint POST /api/consultas/{codigo_agendamento}/transferir-especialidade
 */
const transferirEspecialidade = async (consultaId, payload) => {
  const response = await api.post(`/consultas/${consultaId}/transferir-especialidade`, payload);
  return response.data;
};

/**
 * Buscar pacientes que retornaram com exames
 * @param {Object} params - Parâmetros de filtro
 * @returns {Promise} - Pacientes com exames concluídos
 */
const getPacientesComExames = async (params = {}) => {
  try {
    const response = await api.get('/consultas/retorno-exames/', { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar pacientes com exames:', error);
    throw error;
  }
};

/**
 * Adicionar prescrição a uma consulta
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Dados da prescrição
 * @returns {Promise} - Prescrição criada
 */
const adicionarPrescricao = async (consultaId, payload) => {
  const response = await api.post(`/consultas/${consultaId}/prescricoes`, payload);
  return response.data;
};

/**
 * Atualizar prescrição
 * @param {number} consultaId - ID da consulta
 * @param {number} prescricaoId - ID da prescrição
 * @param {Object} payload - Dados atualizados
 * @returns {Promise} - Prescrição atualizada
 */
const atualizarPrescricao = async (consultaId, prescricaoId, payload) => {
  const response = await api.put(`/consultas/${consultaId}/prescricoes/${prescricaoId}`, payload);
  return response.data;
};

/**
 * Remover prescrição
 * @param {number} consultaId - ID da consulta
 * @param {number} prescricaoId - ID da prescrição
 * @returns {Promise} - Confirmação de remoção
 */
const removerPrescricao = async (consultaId, prescricaoId) => {
  const response = await api.delete(`/consultas/${consultaId}/prescricoes/${prescricaoId}`);
  return response.data;
};

/**
 * Buscar prescrições de uma consulta
 * @param {number} consultaId - ID da consulta
 * @returns {Promise} - Lista de prescrições
 */
const getPrescricoes = async (consultaId) => {
  const response = await api.get(`/consultas/${consultaId}/prescricoes`);
  return response.data;
};

// ============================================================================
// EXAMES
// ============================================================================

/**
 * Buscar todos os exames
 * @param {Object} params - Parâmetros de filtro
 * @returns {Promise} - Lista de exames
 */
const getExames = async (params = {}) => {
  const response = await api.get('/exames', { params });
  return response.data;
};

/**
 * Buscar exames pendentes
 * @returns {Promise} - Lista de exames pendentes
 */
const getExamesPendentes = async () => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const tokenPreview = token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'Missing';
    console.log('🔍 Buscando exames pendentes com token:', tokenPreview);
    
    const response = await api.get('/laboratorio/agendamentos/pendentes/');
    console.log('✅ Exames pendentes carregados:', response.data);
    return response.data;
  } catch (error) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const tokenPreview = token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'Missing';
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    console.error('❌ Erro ao buscar exames pendentes:', {
      status,
      message,
      tokenPreview,
      tokenPresent: !!token,
      url: error.config?.url,
      authHeader: error.config?.headers?.Authorization?.substring(0, 30) + '...'
    });
    
    // Se for 401, pode ser token expirado - limpar e forçar novo login
    if (status === 401) {
      console.warn('⚠️ Token inválido/expirado. Usuário precisa fazer login novamente.');
    }
    throw error;
  }
};

/**
 * Buscar exames urgentes
 * @returns {Promise} - Lista de exames urgentes
 */
const getExamesUrgentes = async () => {
  const response = await api.get('/exames/urgentes');
  return response.data;
};

/**
 * Buscar exames por paciente
 * @param {number} pacienteId - ID do paciente
 * @returns {Promise} - Lista de exames do paciente
 */
const getExamesPorPaciente = async (pacienteId) => {
  const response = await api.get(`/exames/paciente/${pacienteId}`);
  return response.data;
};

/**
 * Buscar exames por consulta
 * @param {number} consultaId - ID da consulta
 * @returns {Promise} - Lista de exames da consulta
 */
const getExamesPorConsulta = async (consultaId) => {
  const response = await api.get(`/exames/consulta/${consultaId}`);
  return response.data;
};

/**
 * Criar novo exame
 * @param {Object} payload - Dados do exame
 * @returns {Promise} - Exame criado
 */
const createExame = async (payload) => {
  const response = await api.post('/exames', payload);
  return response.data;
};

/**
 * Atualizar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados atualizados
 * @returns {Promise} - Exame atualizado
 */
const updateExame = async (id, payload) => {
  const response = await api.put(`/exames/${id}`, payload);
  return response.data;
};

/**
 * Agendar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados do agendamento
 * @returns {Promise} - Exame agendado
 */
const agendarExame = async (id, payload) => {
  const response = await api.post(`/exames/${id}/agendar`, payload);
  return response.data;
};

/**
 * Coletar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados da coleta
 * @returns {Promise} - Exame coletado
 */
const coletarExame = async (id, payload) => {
  const response = await api.post(`/exames/${id}/coletar`, payload);
  return response.data;
};

/**
 * Adicionar resultado ao exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Resultados do exame
 * @returns {Promise} - Exame com resultado
 */
const adicionarResultadoExame = async (id, payload) => {
  const response = await api.post(`/exames/${id}/resultado`, payload);
  return response.data;
};

/**
 * Adicionar laudo ao exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Laudo do exame
 * @returns {Promise} - Exame com laudo
 */
const adicionarLaudoExame = async (id, payload) => {
  const response = await api.post(`/exames/${id}/laudo`, payload);
  return response.data;
};

/**
 * Adicionar anexo ao exame
 * @param {number} id - ID do exame
 * @param {FormData} formData - Arquivo anexo
 * @returns {Promise} - Exame com anexo
 */
const adicionarAnexoExame = async (id, formData) => {
  const response = await api.post(`/exames/${id}/anexo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Cancelar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Motivo do cancelamento
 * @returns {Promise} - Exame cancelado
 */
const cancelarExame = async (id, payload) => {
  const response = await api.post(`/exames/${id}/cancelar`, payload);
  return response.data;
};

/**
 * Deletar exame
 * @param {number} id - ID do exame
 * @returns {Promise} - Confirmação de deleção
 */
const deleteExame = async (id) => {
  const response = await api.delete(`/exames/${id}`);
  return response.data;
};

// ============================================================================
// TRANSFERÊNCIAS
// ============================================================================

/**
 * Buscar todas as transferências
 * @param {Object} params - Parâmetros de filtro
 * @returns {Promise} - Lista de transferências
 */
const getTransferencias = async (params = {}) => {
  const response = await api.get('/transferencias', { params });
  return response.data;
};

/**
 * Buscar transferências pendentes
 * @returns {Promise} - Lista de transferências pendentes
 */
const getTransferenciasPendentes = async () => {
  const response = await api.get('/transferencias/pendentes');
  return response.data;
};

/**
 * Buscar transferências por paciente
 * @param {number} pacienteId - ID do paciente
 * @returns {Promise} - Lista de transferências do paciente
 */
const getTransferenciasPorPaciente = async (pacienteId) => {
  const response = await api.get(`/transferencias/paciente/${pacienteId}`);
  return response.data;
};

/**
 * Buscar transferências recebidas por médico
 * @param {number} medicoId - ID do médico
 * @returns {Promise} - Lista de transferências recebidas
 */
const getTransferenciasRecebidas = async (medicoId) => {
  const response = await api.get(`/transferencias/medico/${medicoId}/recebidas`);
  return response.data;
};

/**
 * Buscar transferências enviadas por médico
 * @param {number} medicoId - ID do médico
 * @returns {Promise} - Lista de transferências enviadas
 */
const getTransferenciasEnviadas = async (medicoId) => {
  const response = await api.get(`/transferencias/medico/${medicoId}/enviadas`);
  return response.data;
};

/**
 * Criar nova transferência
 * @param {Object} payload - Dados da transferência
 * @returns {Promise} - Transferência criada
 */
const createTransferencia = async (payload) => {
  const response = await api.post('/transferencias', payload);
  return response.data;
};

/**
 * Aceitar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Dados da aceitação
 * @returns {Promise} - Transferência aceita
 */
const aceitarTransferencia = async (id, payload = {}) => {
  const response = await api.post(`/transferencias/${id}/aceitar`, payload);
  return response.data;
};

/**
 * Recusar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Motivo da recusa
 * @returns {Promise} - Transferência recusada
 */
const recusarTransferencia = async (id, payload) => {
  const response = await api.post(`/transferencias/${id}/recusar`, payload);
  return response.data;
};

/**
 * Finalizar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Dados de finalização
 * @returns {Promise} - Transferência finalizada
 */
const finalizarTransferencia = async (id, payload = {}) => {
  const response = await api.post(`/transferencias/${id}/finalizar`, payload);
  return response.data;
};

/**
 * Cancelar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Motivo do cancelamento
 * @returns {Promise} - Transferência cancelada
 */
const cancelarTransferencia = async (id, payload) => {
  const response = await api.post(`/transferencias/${id}/cancelar`, payload);
  return response.data;
};

/**
 * Processar pagamento de transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Dados do pagamento
 * @returns {Promise} - Transferência com pagamento processado
 */
const processarPagamentoTransferencia = async (id, payload) => {
  const response = await api.post(`/transferencias/${id}/processar-pagamento`, payload);
  return response.data;
};

const consultaService = {
  // Consultas
  getConsultasPendentes,
  getConsultasRealizadas,
  getConsultasPaciente,
  getConsulta,
  createConsulta,
  updateConsulta,
  finalizarConsulta,
  solicitarExames,
  registrarAlta,
  registrarObito,
  transferirMedico,
  transferirEspecialidade,
  getPacientesComExames,
  
  // Prescrições
  adicionarPrescricao,
  atualizarPrescricao,
  removerPrescricao,
  getPrescricoes,
  
  // Exames
  getExames,
  getExamesPendentes,
  getExamesUrgentes,
  getExamesPorPaciente,
  getExamesPorConsulta,
  createExame,
  updateExame,
  agendarExame,
  coletarExame,
  adicionarResultadoExame,
  adicionarLaudoExame,
  adicionarAnexoExame,
  cancelarExame,
  deleteExame,
  
  // Transferências
  getTransferencias,
  getTransferenciasPendentes,
  getTransferenciasPorPaciente,
  getTransferenciasRecebidas,
  getTransferenciasEnviadas,
  createTransferencia,
  aceitarTransferencia,
  recusarTransferencia,
  finalizarTransferencia,
  cancelarTransferencia,
  processarPagamentoTransferencia,
  
  // Teste/Debug
  validateToken: async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        console.warn('❌ Nenhum token encontrado');
        return { valid: false, reason: 'No token' };
      }
      
      const response = await api.get('/auth/me');
      console.log('✅ Token válido:', response.data);
      return { valid: true, data: response.data };
    } catch (error) {
      console.error('❌ Token inválido/expirado:', error.response?.data || error.message);
      return { valid: false, reason: error.response?.data?.message || error.message };
    }
  }
};

export default consultaService;
