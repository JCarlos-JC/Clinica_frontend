
import { useState, useEffect, useCallback, useRef } from 'react';
import consultaService, { normalizarPacienteConsulta } from '../services/consultaService';
import { message } from 'antd';
import { normalizeApiList } from '../services/apiConfig';
import { invalidateCachedRequest, peekCachedRequest, setCachedRequest } from '../services/requestCache';
import { isOutOfConsultationQueue } from '../utils/patientWorkflowStatus';

const getConsultaIdentifiers = (consulta = {}) => [
  consulta.id,
  consulta.consulta_id,
  consulta.consultaId,
  consulta.agendamento_id,
  consulta.agendamentoId,
  consulta.consulta?.id,
  consulta.agendamento?.id
].filter(value => value !== undefined && value !== null).map(value => String(value));

const consultaMatchesId = (consulta, consultaId) => {
  const targetId = String(consultaId);
  return getConsultaIdentifiers(consulta).includes(targetId);
};


/**
 * Hook customizado para gerenciar consultas médicas
 * Fornece métodos para buscar, criar, atualizar e finalizar consultas
 * @param {number|string} medicoId - ID do médico logado (opcional) para filtrar consultas automaticamente
 */
export default function useConsultas(medicoId = null) {
  const snapshotSuffix = medicoId || 'all';
  const [consultasPendentes, setConsultasPendentes] = useState(() => peekCachedRequest(`consultas:pendentes:last:${snapshotSuffix}`, null, { persist: true, allowStale: true }) || []);
  const [consultasRealizadas, setConsultasRealizadas] = useState(() => peekCachedRequest(`consultas:realizadas:last:${snapshotSuffix}`, null, { persist: true, allowStale: true }) || []);
  const [pacientesComExames, setPacientesComExames] = useState([]);
  const [examesPendentes, setExamesPendentes] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [loadingRealizadas, setLoadingRealizadas] = useState(false);
  const [loadingExames, setLoadingExames] = useState(false);
  const [loadingTransferencias, setLoadingTransferencias] = useState(false);
  const [error, setError] = useState(null);
  const fetchPendentesSeqRef = useRef(0);

  /**
   * Buscar consultas pendentes (pacientes aguardando atendimento)
   */
  const fetchConsultasPendentes = useCallback(async (params = {}) => {
    const fetchSeq = fetchPendentesSeqRef.current + 1;
    fetchPendentesSeqRef.current = fetchSeq;

    if (params.force === true || consultasPendentes.length === 0) {
      setLoadingPendentes(true);
    }

    setError(null);
    try {
      // Incluir medico_id automaticamente se fornecido
      const queryParams = medicoId
        ? { ...params, medico_id: medicoId }
        : params;

      const data = await consultaService.getConsultasPendentes(queryParams);

      const consultas = normalizeApiList(data).filter(consulta => !isOutOfConsultationQueue(consulta));
      
      // FILTRAR: Transferências de especialidade só aparecem se pagamento estiver confirmado
      const consultasFiltradas = consultas.filter(consulta => {
        // Verificar se é transferência de especialidade no nível principal
        const isTransferenciaEspecialidade = 
          consulta.tipo === 'transferencia_especialidade' ||
          consulta.status === 'transferido_especialidade';
        
        // Verificar também no histórico de consultas
        let temTransferenciaNoHistorico = false;
        if (consulta.historico_consultas?.data && Array.isArray(consulta.historico_consultas.data)) {
          temTransferenciaNoHistorico = consulta.historico_consultas.data.some(
            hist => hist.status === 'transferido_especialidade'
          );
        }
        
        // Se for transferência de especialidade (nível principal OU histórico)
        if (isTransferenciaEspecialidade || temTransferenciaNoHistorico) {
          // Para transferências de especialidade, verificar múltiplas condições
          const statusConfirmada = consulta.status === 'confirmada';
          const pagamentoOk = consulta.status_pagamento === 'pago';
          const agendamentoValido = consulta.valido === true;
          
          const podeListar = statusConfirmada && pagamentoOk && agendamentoValido;
          
          return podeListar;
        }
        
        // Outras consultas normais passam direto
        return true;
      });
      
      if (fetchSeq === fetchPendentesSeqRef.current) {
        setConsultasPendentes(consultasFiltradas);
        setCachedRequest(`consultas:pendentes:last:${snapshotSuffix}`, consultasFiltradas, { persist: true });
      }
    } catch (err) {
      if (fetchSeq === fetchPendentesSeqRef.current) {
        setError(err);
        message.error('Erro ao carregar consultas pendentes');
      }
    } finally {
      if (fetchSeq === fetchPendentesSeqRef.current) {
        setLoadingPendentes(false);
      }
    }
  }, [medicoId, consultasPendentes.length, snapshotSuffix]);

  /**
   * Buscar prescrições do paciente da API
   */
  const fetchPrescricoesPaciente = useCallback(async (pacienteId, nid) => {
    try {
      const data = await consultaService.getPrescricoes(null, { paciente_id: pacienteId, nid });
      return normalizeApiList(data);
    } catch (err) {
      return [];
    }
  }, []);

  /**
   * Buscar consultas realizadas (histórico)
   */
  const fetchConsultasRealizadas = useCallback(async (params = {}) => {
    setLoadingRealizadas(true);
    setError(null);
    try {
      // Incluir medico_id automaticamente se fornecido
      const queryParams = medicoId
        ? { ...params, medico_id: medicoId }
        : params;

      const data = await consultaService.getConsultasRealizadas(queryParams);

      let consultas = normalizeApiList(data).map(normalizarPacienteConsulta);
      
      // Buscar prescrições para cada consulta da API http://127.0.0.1:8007/api/prescricoes
      const consultasComPrescricoes = await Promise.all(
        consultas.map(async (consulta) => {
          try {
            if (consulta.paciente_id || consulta.pacienteId) {
              const pacienteId = consulta.paciente_id || consulta.pacienteId;
              const nid = consulta.nid;
              
              // Buscar prescrições da API
              const prescricoes = await fetchPrescricoesPaciente(pacienteId, nid);
              
              return {
                ...consulta,
                prescricoes: prescricoes || consulta.prescricoes || []
              };
            }
            return consulta;
          } catch (err) {
            return consulta;
          }
        })
      );
      
      setConsultasRealizadas(consultasComPrescricoes);
      setCachedRequest(`consultas:realizadas:last:${snapshotSuffix}`, consultasComPrescricoes, { persist: true });
    } catch (err) {
      setError(err);
      // message.error('Erro ao carregar histórico de consultas');
    } finally {
      setLoadingRealizadas(false);
    }
  }, [medicoId, fetchPrescricoesPaciente, snapshotSuffix]);

  /**
   * Buscar pacientes que retornaram com exames
   */
  const fetchPacientesComExames = useCallback(async (params = {}) => {
    setLoadingExames(true);
    setError(null);
    try {
      // Incluir medico_id automaticamente se fornecido
      const queryParams = medicoId
        ? { ...params, medico_id: medicoId }
        : params;

      const data = await consultaService.getPacientesComExames(queryParams);

      setPacientesComExames(normalizeApiList(data));
    } catch (err) {
      setError(err);
      message.error('Erro ao carregar pacientes com exames');
    } finally {
      setLoadingExames(false);
    }
  }, [medicoId]);

  /**
   * Criar nova consulta
   */
  const criarConsulta = useCallback(async (payload) => {
    try {
      const data = await consultaService.createConsulta(payload);
      invalidateCachedRequest('consultas:');
      message.success('Consulta criada com sucesso');
      
      // Atualizar lista de consultas pendentes
      await fetchConsultasPendentes({ force: true });
      
      return data;
    } catch (err) {
      message.error('Erro ao criar consulta');
      throw err;
    }
  }, [fetchConsultasPendentes]);

  /**
   * Finalizar consulta
   */
  const finalizarConsulta = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.finalizarConsulta(consultaId, payload);
      invalidateCachedRequest('consultas:');
      setConsultasPendentes(prev => prev.filter(consulta => !consultaMatchesId(consulta, consultaId)));
      message.success('Consulta finalizada com sucesso');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes({ force: true }),
        fetchConsultasRealizadas({ force: true })
      ]);
      
      return data;
    } catch (err) {
      message.error('Erro ao finalizar consulta');
      throw err;
    }
  }, [fetchConsultasPendentes, fetchConsultasRealizadas]);

  /**
   * Solicitar exames
   */
  const solicitarExames = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.solicitarExames(consultaId, payload);
      invalidateCachedRequest('consultas:');
      // Não mostrar mensagem aqui - deixar o componente decidir
      
      // Atualizar consultas pendentes
      await fetchConsultasPendentes({ force: true });
      
      return data;
    } catch (err) {
      message.error('Erro ao solicitar exames');
      throw err;
    }
  }, [fetchConsultasPendentes]);

  /**
   * Registrar alta
   */
  const registrarAlta = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.registrarAlta(consultaId, payload);
      invalidateCachedRequest('consultas:');
      message.success('Alta registrada com sucesso');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes({ force: true }),
        fetchConsultasRealizadas({ force: true })
      ]);
      
      return data;
    } catch (err) {
      message.error('Erro ao registrar alta');
      throw err;
    }
  }, [fetchConsultasPendentes, fetchConsultasRealizadas]);

  /**
   * Registrar óbito
   */
  const registrarObito = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.registrarObito(consultaId, payload);
      invalidateCachedRequest('consultas:');
      message.success('Óbito registrado');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes({ force: true }),
        fetchConsultasRealizadas({ force: true })
      ]);
      
      return data;
    } catch (err) {
      message.error('Erro ao registrar óbito');
      throw err;
    }
  }, [fetchConsultasPendentes, fetchConsultasRealizadas]);

  /**
   * Transferir para outro médico
   * @param {number} agendamentoId - ID numérico do agendamento
   * @param {Object} payload - Dados da transferência
   */
  const transferirMedico = useCallback(async (agendamentoId, payload) => {
    try {
      // Garantir que o ID seja numérico
      const id = Number(agendamentoId);
      
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`ID inválido: ${agendamentoId}. Deve ser um número inteiro positivo.`);
      }
      
      const data = await consultaService.transferirMedico(id, payload);
      invalidateCachedRequest('consultas:');
      
      message.success('Paciente transferido com sucesso');
      
      // Atualizar consultas pendentes
      await fetchConsultasPendentes({ force: true });
      
      return data;
    } catch (err) {
      const errors = err.response?.data?.errors;
      const errorMsg = err.response?.data?.message ||
        (errors ? Object.values(errors).flat().join('; ') : null) ||
        err.message ||
        'Erro ao transferir paciente';
      message.error(errorMsg);
      throw err;
    }
  }, [fetchConsultasPendentes]);

  /**
   * Transferir para outra especialidade
   */
  const transferirEspecialidade = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.transferirEspecialidade(consultaId, payload);
      invalidateCachedRequest('consultas:');
      invalidateCachedRequest('pacientes:transferidos-especialidade');
      invalidateCachedRequest('clinical-data:');
      message.success('Paciente transferido para nova especialidade');

      await Promise.all([
        fetchConsultasPendentes({ force: true }),
        fetchConsultasRealizadas({ force: true })
      ]);

      return data;
    } catch (err) {
      message.error('Erro ao transferir paciente');
      throw err;
    }
  }, [fetchConsultasPendentes, fetchConsultasRealizadas]);

  /**
   * Adicionar prescrição
   */
  const adicionarPrescricao = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.adicionarPrescricao(consultaId, payload);
      message.success('Prescrição adicionada com sucesso');
      return data;
    } catch (err) {
      message.error('Erro ao adicionar prescrição');
      throw err;
    }
  }, []);

  /**
   * Atualizar prescrição
   */
  const atualizarPrescricao = useCallback(async (consultaId, prescricaoId, payload) => {
    try {
      const data = await consultaService.atualizarPrescricao(consultaId, prescricaoId, payload);
      message.success('Prescrição atualizada com sucesso');
      return data;
    } catch (err) {
      message.error('Erro ao atualizar prescrição');
      throw err;
    }
  }, []);

  /**
   * Remover prescrição
   */
  const removerPrescricao = useCallback(async (consultaId, prescricaoId) => {
    try {
      const data = await consultaService.removerPrescricao(consultaId, prescricaoId);
      message.success('Prescrição removida com sucesso');
      return data;
    } catch (err) {
      message.error('Erro ao remover prescrição');
      throw err;
    }
  }, []);

  // ============================================================================
  // EXAMES
  // ============================================================================

  /**
   * Buscar exames pendentes
   */
  const fetchExamesPendentes = useCallback(async () => {
    setLoadingExames(true);
    setError(null);
    try {
      const data = await consultaService.getExamesPendentes();

      let lista = [];
      if (data?.success) {
        lista = data.data || data.exames || [];
      } else if (Array.isArray(data)) {
        lista = data;
      } else if (data?.data && Array.isArray(data.data)) {
        lista = data.data;
      }

      // Normaliza campos: achata paciente.* para o nível raiz e padroniza nomes
      const normalizada = lista.map(exame => ({
        ...exame,
        // Dados do paciente (podem vir aninhados ou no topo)
        nome:             exame.nome             || exame.paciente?.nome             || '',
        apelido:          exame.apelido           || exame.paciente?.apelido           || '',
        nid:              exame.nid               || exame.paciente?.nid               || '',
        paciente_id:      exame.paciente_id       || exame.paciente?.id,
        // Campos com nome diferente entre frontend e backend
        examesSolicitados: exame.examesSolicitados || exame.exames_solicitados         || '',
        dataSolicitacao:   exame.dataSolicitacao   || exame.data_solicitacao           || '',
        statusPagamento:   exame.statusPagamento   || exame.status_pagamento           || 'pendente',
        solicitadoPor:     exame.solicitadoPor     || exame.medico_solicitante?.nome   || '',
      }));

      setExamesPendentes(normalizada);
    } catch (err) {
      setError(err);
      setExamesPendentes([]);
    } finally {
      setLoadingExames(false);
    }
  }, []);

  /**
   * Buscar exames por paciente
   */
  const fetchExamesPorPaciente = useCallback(async (pacienteId) => {
    try {
      const data = await consultaService.getExamesPorPaciente(pacienteId);
      
      if (data.success) {
        return data.data || data.exames || [];
      } else if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (err) {
      console.error('Erro ao buscar exames do paciente:', err);
      message.error('Erro ao carregar exames do paciente');
      throw err;
    }
  }, []);

  /**
   * Criar novo exame
   */
  const criarExame = useCallback(async (payload) => {
    try {
      const data = await consultaService.createExame(payload);
      message.success('Exame criado com sucesso');
      await fetchExamesPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao criar exame:', err);
      message.error('Erro ao criar exame');
      throw err;
    }
  }, [fetchExamesPendentes]);

  /**
   * Adicionar resultado ao exame
   */
  const adicionarResultadoExame = useCallback(async (exameId, payload) => {
    try {
      const data = await consultaService.adicionarResultadoExame(exameId, payload);
      message.success('Resultado adicionado com sucesso');
      await fetchExamesPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao adicionar resultado:', err);
      message.error('Erro ao adicionar resultado do exame');
      throw err;
    }
  }, [fetchExamesPendentes]);

  /**
   * Cancelar exame
   */
  const cancelarExame = useCallback(async (exameId, payload) => {
    try {
      const data = await consultaService.cancelarExame(exameId, payload);
      message.success('Exame cancelado');
      await fetchExamesPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao cancelar exame:', err);
      message.error('Erro ao cancelar exame');
      throw err;
    }
  }, [fetchExamesPendentes]);

  // ============================================================================
  // TRANSFERÊNCIAS
  // ============================================================================

  /**
   * Buscar transferências pendentes
   */
  const fetchTransferenciasPendentes = useCallback(async () => {
    setLoadingTransferencias(true);
    setError(null);
    try {
      const data = await consultaService.getTransferenciasPendentes();
      
      if (data.success) {
        setTransferencias(data.data || data.transferencias || []);
      } else if (Array.isArray(data)) {
        setTransferencias(data);
      } else {
        setTransferencias([]);
      }
    } catch (err) {
      console.warn('❌ Erro ao buscar transferências pendentes:', err);
      setError(err);
      // message.error('Erro ao carregar transferências pendentes');
    } finally {
      setLoadingTransferencias(false);
    }
  }, []);

  /**
   * Buscar transferências recebidas pelo médico
   */
  const fetchTransferenciasRecebidas = useCallback(async (medicoIdParam) => {
    const id = medicoIdParam || medicoId;
    if (!id) {
      message.warning('ID do médico não fornecido');
      return;
    }

    setLoadingTransferencias(true);
    setError(null);
    try {
      const data = await consultaService.getTransferenciasRecebidas(id);
      
      if (data.success) {
        setTransferencias(data.data || data.transferencias || []);
      } else if (Array.isArray(data)) {
        setTransferencias(data);
      } else {
        setTransferencias([]);
      }
    } catch (err) {
      console.error('Erro ao buscar transferências recebidas:', err);
      setError(err);
      message.error('Erro ao carregar transferências recebidas');
    } finally {
      setLoadingTransferencias(false);
    }
  }, [medicoId]);

  /**
   * Criar transferência
   */
  const criarTransferencia = useCallback(async (payload) => {
    try {
      const data = await consultaService.createTransferencia(payload);
      invalidateCachedRequest('consultas:');
      message.success('Transferência criada com sucesso');
      await Promise.all([
        fetchTransferenciasPendentes(),
        fetchConsultasPendentes({ force: true }),
        fetchConsultasRealizadas({ force: true }),
      ]);
      return data;
    } catch (err) {
      console.error('Erro ao criar transferência:', err);
      message.error('Erro ao criar transferência');
      throw err;
    }
  }, [fetchTransferenciasPendentes, fetchConsultasPendentes, fetchConsultasRealizadas]);

  /**
   * Aceitar transferência
   */
  const aceitarTransferencia = useCallback(async (transferenciaid, payload = {}) => {
    try {
      const data = await consultaService.aceitarTransferencia(transferenciaid, payload);
      invalidateCachedRequest('consultas:');
      message.success('Transferência aceita');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      message.error('Erro ao aceitar transferência');
      throw err;
    }
  }, [fetchTransferenciasPendentes]);

  /**
   * Recusar transferência
   */
  const recusarTransferencia = useCallback(async (transferenciaid, payload) => {
    try {
      const data = await consultaService.recusarTransferencia(transferenciaid, payload);
      invalidateCachedRequest('consultas:');
      message.success('Transferência recusada');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      message.error('Erro ao recusar transferência');
      throw err;
    }
  }, [fetchTransferenciasPendentes]);



  /**
   * Atualizar todas as listas
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchConsultasPendentes({ force: true }),
      fetchConsultasRealizadas({ force: true }),
      fetchPacientesComExames(),
      fetchExamesPendentes(),
      fetchTransferenciasPendentes()
    ]);
  }, [fetchConsultasPendentes, fetchConsultasRealizadas, fetchPacientesComExames, fetchExamesPendentes, fetchTransferenciasPendentes]);

  // Buscar dados iniciais ao montar o componente
  useEffect(() => {
    fetchConsultasPendentes({ force: true });
    fetchConsultasRealizadas({ force: true });
    fetchPacientesComExames();
    fetchExamesPendentes();
    fetchTransferenciasPendentes();
  }, [fetchConsultasPendentes, fetchConsultasRealizadas, fetchPacientesComExames, fetchExamesPendentes, fetchTransferenciasPendentes]);

  return {
    // Estados
    consultasPendentes,
    consultasRealizadas,
    pacientesComExames,
    examesPendentes,
    transferencias,
    loadingPendentes,
    loadingRealizadas,
    loadingExames,
    loadingTransferencias,
    error,
    
    // Setters (para uso direto se necessário)
    setConsultasPendentes,
    setConsultasRealizadas,
    setPacientesComExames,
    setExamesPendentes,
    setTransferencias,
    
    // Métodos de fetch
    fetchConsultasPendentes,
    fetchConsultasRealizadas,
    fetchPacientesComExames,
    fetchExamesPendentes,
    fetchExamesPorPaciente,
    fetchPrescricoesPaciente,
    fetchTransferenciasPendentes,
    fetchTransferenciasRecebidas,
    refreshAll,
    
    // Métodos de ação - Consultas
    criarConsulta,
    finalizarConsulta,
    solicitarExames,
    registrarAlta,
    registrarObito,
    transferirMedico,
    transferirEspecialidade,
    
    // Métodos de ação - Prescrições
    adicionarPrescricao,
    atualizarPrescricao,
    removerPrescricao,
    
    // Métodos de ação - Exames
    criarExame,
    adicionarResultadoExame,
    cancelarExame,
    
    // Métodos de ação - Transferências
    criarTransferencia,
    aceitarTransferencia,
    recusarTransferencia,
  };
}
