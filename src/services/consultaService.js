import api from './api';
import { isOutOfConsultationQueue } from '../utils/patientWorkflowStatus';

const extractList = (payload) => {
  const data = payload?.data?.data || payload?.data || payload?.items || payload?.results || payload || [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

export const normalizarPacienteConsulta = (item) => {
  const agendamento = item?.agendamento || item?.agendamento_consulta || item?.agendamentoConsulta || {};
  const triagem = item?.triagem || item?.dados_triagem || agendamento?.triagem || {};
  const consulta = item?.consulta || item?.consulta_medica || agendamento?.consulta || {};
  const paciente = item?.paciente || item?.utente || item?.paciente_dados || agendamento?.paciente || triagem?.paciente || consulta?.paciente || {};
  const sinaisVitais = item?.sinais_vitais || agendamento?.sinais_vitais || triagem?.sinais_vitais || triagem?.sinaisVitais || {};
  const historicoSinais = item?.historico_sinais_vitais || item?.historicoSinaisVitais || agendamento?.historico_sinais_vitais || { data: [] };
  const historicoConsultas = item?.historico_consultas || item?.historicoConsultas || agendamento?.historico_consultas || { data: [] };
  const historicoPrescricoes = item?.historico_prescricoes || item?.historicoPrescricoes || agendamento?.historico_prescricoes || { data: [] };
  const consultaId = item?.consulta_id || item?.consultaId || agendamento?.consulta_id || agendamento?.consultaId || consulta?.id || null;
  const pareceAgendamento = Boolean(
    item?.agendamento_id ||
    item?.agendamentoId ||
    agendamento?.id ||
    agendamento?.agendamento_id ||
    item?.codigo_agendamento ||
    agendamento?.codigo_agendamento ||
    item?.data_agendamento ||
    agendamento?.data_agendamento ||
    item?.hora_agendamento ||
    agendamento?.hora_agendamento ||
    item?.consulta_criada !== undefined
  );
  const agendamentoId = item?.agendamento_id || item?.agendamentoId || agendamento?.id || agendamento?.agendamento_id || (pareceAgendamento ? item?.id : null);
  const pacienteId = item?.paciente_id || item?.pacienteId || agendamento?.paciente_id || agendamento?.pacienteId || consulta?.paciente_id || triagem?.paciente_id || paciente?.id;
  const dataNascimento = item?.data_nascimento || item?.dataNascimento || agendamento?.data_nascimento || consulta?.data_nascimento || triagem?.data_nascimento || paciente?.data_nascimento;
  const nomeCompletoPaciente = paciente?.nome_completo || paciente?.nomeCompleto || '';
  const nome = item?.nome || agendamento?.nome || consulta?.nome || triagem?.nome || paciente?.nome || (nomeCompletoPaciente ? nomeCompletoPaciente.split(' ')[0] : '') || '';
  const apelido = item?.apelido || agendamento?.apelido || consulta?.apelido || triagem?.apelido || paciente?.apelido || (nomeCompletoPaciente ? nomeCompletoPaciente.split(' ').slice(1).join(' ') : '') || '';
  const telefone = item?.telefone || item?.celular || agendamento?.telefone || consulta?.telefone || paciente?.telefone || paciente?.celular || '';
  const tipoUtente = item?.tipoUtente || item?.tipo_utente || agendamento?.tipo_utente || consulta?.tipo_utente || paciente?.tipo_utente || triagem?.tipo_utente || '';
  const motivoConsulta = item?.motivo_consulta || item?.motivoConsulta || item?.motivo || agendamento?.motivo_consulta || agendamento?.motivo || consulta?.motivo_consulta || triagem?.observacoes || '';
  const dataConsulta = item?.dataConsulta || agendamento?.dataConsulta || consulta?.dataConsulta || item?.data_consulta_local || item?.data_consulta || agendamento?.data_consulta || consulta?.data_consulta || item?.data_agendamento || agendamento?.data_agendamento || item?.created_at;
  const horaConsulta = item?.horaConsulta || item?.hora_consulta || agendamento?.hora_consulta || consulta?.hora_consulta || item?.hora_agendamento || agendamento?.hora_agendamento;

  return {
    ...item,
    id: consultaId || agendamentoId || item?.id || item?.codigo_agendamento || item?.nid,
    key: consultaId || agendamentoId || item?.id || item?.codigo_agendamento || item?.nid,
    consulta_id: consultaId,
    consultaId,
    agendamento_id: agendamentoId,
    agendamentoId,
    codigo_agendamento: item?.codigo_agendamento || item?.codigoAgendamento || agendamento?.codigo_agendamento || agendamento?.codigoAgendamento,
    triagem_id: item?.triagem_id || agendamento?.triagem_id || triagem?.id,
    triagemId: item?.triagem_id || agendamento?.triagem_id || triagem?.id,
    paciente_id: pacienteId,
    pacienteId,
    nid: item?.nid || agendamento?.nid || triagem?.nid || paciente?.nid,
    nome,
    apelido,
    nomeCompleto: [nome, apelido].filter(Boolean).join(' '),
    genero: item?.genero || agendamento?.genero || triagem?.genero || paciente?.genero || paciente?.sexo || '',
    idade: item?.idade || agendamento?.idade || triagem?.idade || paciente?.idade,
    data_nascimento: dataNascimento,
    dataNascimento,
    tipo_utente: tipoUtente,
    tipoUtente,
    telefone,
    celular: item?.celular || telefone,
    telefoneAlternativo: item?.telefone_alternativo || paciente?.telefone_alternativo || '',
    email: item?.email || paciente?.email || '',
    endereco: item?.endereco || paciente?.endereco || '',
    medico: item?.medico || item?.medico_nome || agendamento?.medico || agendamento?.medico_nome || consulta?.medico || triagem?.medico || '',
    medico_id: item?.medico_id || item?.medicoId || agendamento?.medico_id || agendamento?.medicoId || consulta?.medico_id,
    medicoId: item?.medico_id || item?.medicoId || agendamento?.medico_id || agendamento?.medicoId || consulta?.medico_id,
    especialidade: item?.especialidade || agendamento?.especialidade || consulta?.especialidade || triagem?.especialidade || '',
    especialidade_id: item?.especialidade_id || item?.especialidadeId || agendamento?.especialidade_id || agendamento?.especialidadeId || consulta?.especialidade_id || null,
    dataConsulta,
    data_consulta: dataConsulta,
    horaConsulta,
    hora_consulta: item?.hora_consulta || horaConsulta,
    tipoConsulta: item?.tipoConsulta || item?.tipo_consulta || agendamento?.tipoConsulta || agendamento?.tipo_consulta || '',
    tipo_consulta: item?.tipo_consulta || item?.tipoConsulta || agendamento?.tipo_consulta || agendamento?.tipoConsulta || '',
    motivoConsulta,
    motivo_consulta: motivoConsulta,
    observacoes: item?.observacoes || triagem?.observacoes || '',
    status: item?.status || agendamento?.status || consulta?.status || 'agendado',
    prioridade: item?.prioridade || item?.estado_urgencia || agendamento?.prioridade || triagem?.urgencia || triagem?.estado_urgencia || 'normal',
    origem: item?.origem || (consultaId ? 'consultation-service' : 'triagem'),
    sinais_vitais: sinaisVitais,
    sinaisVitais,
    peso: item?.peso || sinaisVitais?.peso,
    altura: item?.altura || sinaisVitais?.altura,
    imc: item?.imc || sinaisVitais?.imc,
    pressaoArterial: item?.pressaoArterial || item?.pressao_arterial || sinaisVitais?.pressao_arterial,
    frequenciaCardiaca: item?.frequenciaCardiaca || item?.frequencia_cardiaca || sinaisVitais?.frequencia_cardiaca,
    temperatura: item?.temperatura || sinaisVitais?.temperatura,
    oximetria: item?.oximetria || sinaisVitais?.oximetria,
    glicemiaCapilar: item?.glicemiaCapilar || item?.glicemia_capilar || sinaisVitais?.glicemia_capilar,
    historico_sinais_vitais: historicoSinais,
    historicoSinaisVitais: historicoSinais,
    historico_consultas: historicoConsultas,
    historicoConsultas,
    historico_prescricoes: historicoPrescricoes,
    historicoPrescricoes,
  };
};

const isBlankValue = (value) => (
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
);

const mergePreferindoPreenchidos = (base = {}, novo = {}) => {
  const merged = { ...base };

  Object.entries(novo).forEach(([key, value]) => {
    const atual = merged[key];

    if (isBlankValue(atual) && !isBlankValue(value)) {
      merged[key] = value;
      return;
    }

    if (
      atual &&
      value &&
      typeof atual === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(atual) &&
      !Array.isArray(value)
    ) {
      merged[key] = mergePreferindoPreenchidos(atual, value);
    }
  });

  return merged;
};

const mergeConsultasPendentes = (...listas) => {
  const mapa = new Map();

  listas.flat().forEach((item) => {
    const normalizado = normalizarPacienteConsulta(item);

    const temIdentificacaoClinica = Boolean(
      normalizado.nid ||
      normalizado.nome ||
      normalizado.apelido ||
      normalizado.nomeCompleto
    );

    if (!temIdentificacaoClinica) {
      return;
    }

    const chave = normalizado.nid
      ? `nid:${normalizado.nid}`
      : normalizado.paciente_id || normalizado.pacienteId
        ? `paciente:${normalizado.paciente_id || normalizado.pacienteId}`
        : normalizado.agendamento_id
          ? `agendamento:${normalizado.agendamento_id}`
          : `id:${normalizado.id}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, normalizado);
      return;
    }

    mapa.set(chave, mergePreferindoPreenchidos(mapa.get(chave), normalizado));
  });

  return Array.from(mapa.values());
};

const requestListOrEmpty = async (url, params = {}, timeout = 6000) => {
  try {
    const response = await api.get(url, { params, timeout });
    return extractList(response.data);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[consultas] Endpoint ignorado no carregamento parcial: ${url}`, error?.message || error);
    }
    return [];
  }
};

/**
 * Buscar consultas pendentes (pacientes aguardando atendimento)
 * @param {Object} params - Parâmetros de filtro (especialidade, medico_id, etc.)
 * @returns {Promise} - Dados das consultas pendentes
 */
const getConsultasPendentes = async (params = {}) => {
  const perPage = params.per_page || params.perPage || 100;
  const parametrosConsultas = { ...params, per_page: perPage };

  const [consultasCriadas, agendamentosTriagem] = await Promise.all([
    requestListOrEmpty('/api/pacientes/consultorio/consultas/pendentes', parametrosConsultas, 4500),
    requestListOrEmpty('/api/pacientes/consultorio/agenda/pendentes', parametrosConsultas, 4500),
  ]);

  const consultas = mergeConsultasPendentes(consultasCriadas, agendamentosTriagem)
    .filter(item => item.nid || item.nome || item.apelido || item.nomeCompleto)
    .filter(item => !isOutOfConsultationQueue(item));

  return {
    status: 'success',
    data: {
      data: consultas,
      current_page: 1,
      total: consultas.length,
      per_page: consultas.length || 15,
    },
    message: consultas.length > 0
      ? 'Pacientes aguardando consulta encontrados'
      : 'Nenhum paciente aguardando consulta',
  };
};

/**
 * Buscar consultas realizadas (histórico)
 * @param {Object} params - Parâmetros de filtro (data_inicio, data_fim, paciente_id, etc.)
 * @returns {Promise} - Dados das consultas realizadas
 */
const getConsultasRealizadas = async (params = {}) => {
  try {
    const response = await api.get('/api/pacientes/consultorio/consultas/realizadas/', { params });
    return response.data;
  } catch (error) {
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
  const response = await api.get('/api/pacientes/consultorio/consultas', {
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
  const response = await api.get(`/api/pacientes/consultorio/consultas/${id}`);
  return response.data;
};

/**
 * Criar uma nova consulta
 * @param {Object} payload - Dados da consulta
 * @returns {Promise} - Consulta criada
 */
const createConsulta = async (payload) => {
  const response = await api.post('/api/pacientes/consultorio/consultas', payload);
  return response.data;
};

/**
 * Atualizar uma consulta existente
 * @param {number} id - ID da consulta
 * @param {Object} payload - Dados para atualizar
 * @returns {Promise} - Consulta atualizada
 */
const updateConsulta = async (id, payload) => {
  const response = await api.put(`/api/pacientes/consultorio/consultas/${id}`, payload);
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

const finalizarConsulta = async (consultaId, payload = {}) => {
  // Transforma o array de exames para o formato esperado pela API
  const examesTransformados = (payload.exames || []).map(exame => ({
    nome: exame.nome || exame.examesSolicitados || exame.tipo_exame || '',
    prioridade: (exame.prioridade || 'Normal').toLowerCase(),
    data_coleta: toISODate(exame.dataColeta || exame.data_coleta) || null,
    observacoes: exame.observacoes || '',
  }));

  const agendamentoId = payload.agendamentoId || payload.agendamento_id || consultaId;
  
  const fullPayload = {
    ...payload,
    agendamentoId,
    agendamento_id: agendamentoId,
    exames: examesTransformados,
  };

  const response = await api.post(
    '/api/pacientes/consultorio/consultas/finalizar',
    fullPayload
  );

  return response.data;
};

/**
 * Solicitar exames durante uma consulta
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Exames solicitados
 * @returns {Promise} - Consulta atualizada com exames
 */
const solicitarExames = async (consultaId, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/consultas/${consultaId}/exames`, payload);
  
  return response.data;
};

/**
 * Registrar alta do paciente
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Dados da alta
 * @returns {Promise} - Registro de alta
 */
const registrarAlta = async (consultaId, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/consultas/${consultaId}/alta`, payload);
  return response.data;
};

/**
 * Registrar óbito
 * @param {number} consultaId - ID da consulta
 * @param {Object} payload - Dados do óbito
 * @returns {Promise} - Registro de óbito
 */
const registrarObito = async (consultaId, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/consultas/${consultaId}/obito`, payload);
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
  
  const response = await api.post(
    `/api/pacientes/consultorio/agenda/consultas-agendadas/${id}/transferir-medico`,
    payload
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
  const response = await api.post(`/api/pacientes/consultorio/consultas/${consultaId}/transferir-especialidade`, payload);
  return response.data;
};

/**
 * Buscar pacientes que retornaram com exames
 * @param {Object} params - Parâmetros de filtro
 * @returns {Promise} - Pacientes com exames concluídos
 */
const getPacientesComExames = async (params = {}) => {
  try {
    const response = await api.get('/api/pacientes/consultorio/consultas/retorno-exames/', { params });
    return response.data;
  } catch (error) {
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
  const response = await api.post(`/api/pacientes/consultorio/consultas/${consultaId}/prescricoes`, payload);
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
  const response = await api.put(`/api/pacientes/consultorio/consultas/${consultaId}/prescricoes/${prescricaoId}`, payload);
  return response.data;
};

/**
 * Remover prescrição
 * @param {number} consultaId - ID da consulta
 * @param {number} prescricaoId - ID da prescrição
 * @returns {Promise} - Confirmação de remoção
 */
const removerPrescricao = async (consultaId, prescricaoId) => {
  const response = await api.delete(`/api/pacientes/consultorio/consultas/${consultaId}/prescricoes/${prescricaoId}`);
  return response.data;
};

/**
 * Buscar prescrições de uma consulta
 * @param {number} consultaId - ID da consulta
 * @returns {Promise} - Lista de prescrições
 */
const getPrescricoes = async (consultaId, params = {}) => {
  const url = consultaId ? `/api/pacientes/consultorio/consultas/${consultaId}/prescricoes` : '/api/pacientes/consultorio/prescricoes';
  const response = await api.get(url, { params });
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
  const response = await api.get('/api/pacientes/consultorio/exames', { params });
  return response.data;
};

/**
 * Buscar exames pendentes
 * @returns {Promise} - Lista de exames pendentes
 */
const getExamesPendentes = async () => {
  const response = await api.get('/api/laboratorio/agendamentos/pendentes');
  return response.data;
};

/**
 * Buscar exames urgentes
 * @returns {Promise} - Lista de exames urgentes
 */
const getExamesUrgentes = async () => {
  const response = await api.get('/api/pacientes/consultorio/exames/urgentes');
  return response.data;
};

/**
 * Buscar exames por paciente
 * @param {number} pacienteId - ID do paciente
 * @returns {Promise} - Lista de exames do paciente
 */
const getExamesPorPaciente = async (pacienteId) => {
  const response = await api.get(`/api/pacientes/consultorio/exames/paciente/${pacienteId}`);
  return response.data;
};

/**
 * Buscar exames por consulta
 * @param {number} consultaId - ID da consulta
 * @returns {Promise} - Lista de exames da consulta
 */
const getExamesPorConsulta = async (consultaId) => {
  const response = await api.get(`/api/pacientes/consultorio/exames/consulta/${consultaId}`);
  return response.data;
};

/**
 * Criar novo exame
 * @param {Object} payload - Dados do exame
 * @returns {Promise} - Exame criado
 */
const createExame = async (payload) => {
  const response = await api.post('/api/pacientes/consultorio/exames', payload);
  return response.data;
};

/**
 * Atualizar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados atualizados
 * @returns {Promise} - Exame atualizado
 */
const updateExame = async (id, payload) => {
  const response = await api.put(`/api/pacientes/consultorio/exames/${id}`, payload);
  return response.data;
};

/**
 * Agendar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados do agendamento
 * @returns {Promise} - Exame agendado
 */
const agendarExame = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/agendar`, payload);
  return response.data;
};

/**
 * Coletar exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Dados da coleta
 * @returns {Promise} - Exame coletado
 */
const coletarExame = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/coletar`, payload);
  return response.data;
};

/**
 * Adicionar resultado ao exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Resultados do exame
 * @returns {Promise} - Exame com resultado
 */
const adicionarResultadoExame = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/resultado`, payload);
  return response.data;
};

/**
 * Adicionar laudo ao exame
 * @param {number} id - ID do exame
 * @param {Object} payload - Laudo do exame
 * @returns {Promise} - Exame com laudo
 */
const adicionarLaudoExame = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/laudo`, payload);
  return response.data;
};

/**
 * Adicionar anexo ao exame
 * @param {number} id - ID do exame
 * @param {FormData} formData - Arquivo anexo
 * @returns {Promise} - Exame com anexo
 */
const adicionarAnexoExame = async (id, formData) => {
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/anexo`, formData, {
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
  const response = await api.post(`/api/pacientes/consultorio/exames/${id}/cancelar`, payload);
  return response.data;
};

/**
 * Deletar exame
 * @param {number} id - ID do exame
 * @returns {Promise} - Confirmação de deleção
 */
const deleteExame = async (id) => {
  const response = await api.delete(`/api/pacientes/consultorio/exames/${id}`);
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
  const response = await api.get('/api/pacientes/consultorio/transferencias', { params });
  return response.data;
};

/**
 * Buscar transferências pendentes
 * @returns {Promise} - Lista de transferências pendentes
 */
const getTransferenciasPendentes = async () => {
  const response = await api.get('/api/pacientes/consultorio/transferencias/pendentes');
  return response.data;
};

/**
 * Buscar transferências por paciente
 * @param {number} pacienteId - ID do paciente
 * @returns {Promise} - Lista de transferências do paciente
 */
const getTransferenciasPorPaciente = async (pacienteId) => {
  const response = await api.get('/api/pacientes/consultorio/transferencias', { params: { paciente_id: pacienteId } });
  return response.data;
};

/**
 * Buscar transferências recebidas por médico
 * @param {number} medicoId - ID do médico
 * @returns {Promise} - Lista de transferências recebidas
 */
const getTransferenciasRecebidas = async (medicoId) => {
  const response = await api.get('/api/pacientes/consultorio/transferencias', { params: { medico_destino_id: medicoId } });
  return response.data;
};

/**
 * Buscar transferências enviadas por médico
 * @param {number} medicoId - ID do médico
 * @returns {Promise} - Lista de transferências enviadas
 */
const getTransferenciasEnviadas = async (medicoId) => {
  const response = await api.get('/api/pacientes/consultorio/transferencias', { params: { medico_origem_id: medicoId } });
  return response.data;
};

/**
 * Criar nova transferência
 * @param {Object} payload - Dados da transferência
 * @returns {Promise} - Transferência criada
 */
const createTransferencia = async (payload) => {
  const response = await api.post('/api/pacientes/consultorio/transferencias', payload);
  return response.data;
};

/**
 * Aceitar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Dados da aceitação
 * @returns {Promise} - Transferência aceita
 */
const aceitarTransferencia = async (id, payload = {}) => {
  const response = await api.post(`/api/pacientes/consultorio/transferencias/${id}/aceitar`, payload);
  return response.data;
};

/**
 * Recusar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Motivo da recusa
 * @returns {Promise} - Transferência recusada
 */
const recusarTransferencia = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/transferencias/${id}/recusar`, payload);
  return response.data;
};

/**
 * Finalizar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Dados de finalização
 * @returns {Promise} - Transferência finalizada
 */
const finalizarTransferencia = async (id, payload = {}) => {
  const response = await api.post(`/api/pacientes/consultorio/transferencias/${id}/concluir`, payload);
  return response.data;
};

/**
 * Cancelar transferência
 * @param {number} id - ID da transferência
 * @param {Object} payload - Motivo do cancelamento
 * @returns {Promise} - Transferência cancelada
 */
const cancelarTransferencia = async (id, payload) => {
  const response = await api.post(`/api/pacientes/consultorio/transferencias/${id}/cancelar`, payload);
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
};

export default consultaService;
