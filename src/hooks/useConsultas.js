import { useState, useEffect, useCallback } from 'react';
import consultaService from '../services/consultaService';
import { message } from 'antd';

/**
 * Hook customizado para gerenciar consultas médicas
 * Fornece métodos para buscar, criar, atualizar e finalizar consultas
 * @param {number|string} medicoId - ID do médico logado (opcional) para filtrar consultas automaticamente
 */
export default function useConsultas(medicoId = null) {
  const [consultasPendentes, setConsultasPendentes] = useState([]);
  const [consultasRealizadas, setConsultasRealizadas] = useState([]);
  const [pacientesComExames, setPacientesComExames] = useState([]);
  const [examesPendentes, setExamesPendentes] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [loadingRealizadas, setLoadingRealizadas] = useState(false);
  const [loadingExames, setLoadingExames] = useState(false);
  const [loadingTransferencias, setLoadingTransferencias] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Buscar consultas pendentes (pacientes aguardando atendimento)
   */
  const fetchConsultasPendentes = useCallback(async (params = {}) => {
    setLoadingPendentes(true);
    setError(null);
    try {
      // Incluir medico_id automaticamente se fornecido
      const queryParams = medicoId
        ? { ...params, medico_id: medicoId }
        : params;

      console.log('🔍 Buscando consultas pendentes com params:', queryParams);
      const data = await consultaService.getConsultasPendentes(queryParams);
      console.log('✅ Resposta da API de consultas pendentes:', data);

      let consultas = [];
      
      // Suporta diferentes formatos de resposta da API
      if (data.status === "success" && data.data) {
        // Formato paginado: {status: "success", data: {data: [...], current_page: 1, ...}}
        consultas = data.data.data || data.data || [];
        console.log('📋 Consultas extraídas (formato paginado):', consultas);
      } else if (data.success) {
        // Formato antigo: {success: true, data: [...]}
        consultas = data.data || data.consultas || [];
        console.log('📋 Consultas extraídas (formato success):', consultas);
      } else if (Array.isArray(data)) {
        console.log('📋 Consultas extraídas (formato array):', data);
        consultas = data;
      } else {
        console.log('⚠️ Formato de resposta desconhecido:', data);
        consultas = [];
      }
      
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
          
          if (!podeListar) {
            console.log(`🚫 Transferência especialidade ${consulta.nid || consulta.paciente?.nid} não listada:`, {
              status: consulta.status,
              status_pagamento: consulta.status_pagamento,
              valido: consulta.valido,
              tipo: consulta.tipo,
              tem_historico_transferencia: temTransferenciaNoHistorico
            });
          } else {
            console.log(`✅ Transferência especialidade ${consulta.nid || consulta.paciente?.nid} LIBERADA para atendimento (pagamento confirmado)`);
          }
          
          return podeListar;
        }
        
        // Outras consultas normais passam direto
        return true;
      });
      
      console.log(`✅ Consultas filtradas: ${consultasFiltradas.length} de ${consultas.length} (${consultas.length - consultasFiltradas.length} transferências sem pagamento excluídas)`);
      setConsultasPendentes(consultasFiltradas);
    } catch (err) {
      console.error('❌ Erro ao buscar consultas pendentes:', err);
      setError(err);
      message.error('Erro ao carregar consultas pendentes');
    } finally {
      setLoadingPendentes(false);
    }
  }, [medicoId]);

  /**
   * Buscar prescrições do paciente da API
   */
  const fetchPrescricoesPaciente = useCallback(async (pacienteId, nid) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      // Buscar prescrições do paciente da porta 8007
      const response = await fetch(`http://127.0.0.1:8007/api/prescricoes?paciente_id=${pacienteId}&nid=${nid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('⚠️ Erro ao buscar prescrições do paciente');
        return [];
      }
      
      const data = await response.json();
      console.log('✅ Prescrições do paciente:', data);
      
      // Extrair prescrições do formato de resposta
      if (data.status === "success" && data.data) {
        return data.data.data || data.data || [];
      } else if (data.success) {
        return data.data || data.prescricoes || [];
      } else if (Array.isArray(data)) {
        return data;
      }
      
      return [];
    } catch (err) {
      console.error('❌ Erro ao buscar prescrições:', err);
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

      let consultas = [];
      if (data.success) {
        consultas = data.data || data.consultas || [];
      } else if (Array.isArray(data)) {
        consultas = data;
      }
      
      // Buscar prescrições para cada consulta da API http://127.0.0.1:8007/api/prescricoes
      console.log('🔍 Buscando prescrições para consultas realizadas...');
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
            console.error('Erro ao buscar prescrições para consulta:', err);
            return consulta;
          }
        })
      );
      
      console.log('✅ Consultas com prescrições carregadas:', consultasComPrescricoes);
      setConsultasRealizadas(consultasComPrescricoes);
    } catch (err) {
      console.error('❌ Erro ao buscar consultas realizadas:', err);
      setError(err);
      // message.error('Erro ao carregar histórico de consultas');
      console.warn('⚠️ Histórico de consultas não disponível');
    } finally {
      setLoadingRealizadas(false);
    }
  }, [medicoId, fetchPrescricoesPaciente]);

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

      if (data.success) {
        const pacientes = data.data || data.pacientes || [];
        setPacientesComExames(pacientes);
      } else if (Array.isArray(data)) {
        setPacientesComExames(data);
      } else {
        setPacientesComExames([]);
      }
    } catch (err) {
      console.error('Erro ao buscar pacientes com exames:', err);
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
      message.success('Consulta criada com sucesso');
      
      // Atualizar lista de consultas pendentes
      await fetchConsultasPendentes();
      
      return data;
    } catch (err) {
      console.error('Erro ao criar consulta:', err);
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
      message.success('Consulta finalizada com sucesso');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);
      
      return data;
    } catch (err) {
      console.error('Erro ao finalizar consulta:', err);
      if (err.response?.status === 422) {
        console.error('❌ Erros de validação (422):', JSON.stringify(err.response?.data?.errors || err.response?.data, null, 2));
      }
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
      // Não mostrar mensagem aqui - deixar o componente decidir
      
      // Atualizar consultas pendentes
      await fetchConsultasPendentes();
      
      return data;
    } catch (err) {
      console.error('Erro ao solicitar exames:', err);
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
      message.success('Alta registrada com sucesso');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);
      
      return data;
    } catch (err) {
      console.error('Erro ao registrar alta:', err);
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
      message.success('Óbito registrado');
      
      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);
      
      return data;
    } catch (err) {
      console.error('Erro ao registrar óbito:', err);
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
      
      console.log('🔄 Iniciando transferência de médico:', {
        agendamentoId: id,
        payload,
        url: `/consultas-agendadas/${id}/transferir-medico`
      });
      
      const data = await consultaService.transferirMedico(id, payload);
      
      console.log('✅ Transferência concluída:', data);
      message.success('Paciente transferido com sucesso');
      
      // Atualizar consultas pendentes
      await fetchConsultasPendentes();
      
      return data;
    } catch (err) {
      console.error('❌ Erro ao transferir médico:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);
      const errorMsg = err.response?.data?.message || err.message || 'Erro ao transferir paciente';
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
      message.success('Paciente transferido para nova especialidade');
      
      // Atualizar consultas pendentes
      await fetchConsultasPendentes();
      
      return data;
    } catch (err) {
      console.error('Erro ao transferir especialidade:', err);
      message.error('Erro ao transferir paciente');
      throw err;
    }
  }, [fetchConsultasPendentes]);

  /**
   * Adicionar prescrição
   */
  const adicionarPrescricao = useCallback(async (consultaId, payload) => {
    try {
      const data = await consultaService.adicionarPrescricao(consultaId, payload);
      message.success('Prescrição adicionada com sucesso');
      return data;
    } catch (err) {
      console.error('Erro ao adicionar prescrição:', err);
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
      console.error('Erro ao atualizar prescrição:', err);
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
      console.error('Erro ao remover prescrição:', err);
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
      console.error('❌ Erro ao buscar exames pendentes:', err);
      setError(err);
      console.warn('⚠️ Exames pendentes não disponíveis');
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
      message.success('Transferência criada com sucesso');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao criar transferência:', err);
      message.error('Erro ao criar transferência');
      throw err;
    }
  }, [fetchTransferenciasPendentes]);

  /**
   * Aceitar transferência
   */
  const aceitarTransferencia = useCallback(async (transferenciaid, payload = {}) => {
    try {
      const data = await consultaService.aceitarTransferencia(transferenciaid, payload);
      message.success('Transferência aceita');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao aceitar transferência:', err);
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
      message.success('Transferência recusada');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao recusar transferência:', err);
      message.error('Erro ao recusar transferência');
      throw err;
    }
  }, [fetchTransferenciasPendentes]);

  /**
   * Processar pagamento de transferência
   */
  const processarPagamentoTransferencia = useCallback(async (transferenciaid, payload) => {
    try {
      const data = await consultaService.processarPagamentoTransferencia(transferenciaid, payload);
      message.success('Pagamento processado com sucesso');
      await fetchTransferenciasPendentes();
      return data;
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      message.error('Erro ao processar pagamento');
      throw err;
    }
  }, [fetchTransferenciasPendentes]);

  /**
   * Atualizar todas as listas
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchConsultasPendentes(),
      fetchConsultasRealizadas(),
      fetchPacientesComExames(),
      fetchExamesPendentes(),
      fetchTransferenciasPendentes()
    ]);
  }, [fetchConsultasPendentes, fetchConsultasRealizadas, fetchPacientesComExames, fetchExamesPendentes, fetchTransferenciasPendentes]);

  // Buscar dados iniciais ao montar o componente
  useEffect(() => {
    fetchConsultasPendentes();
    fetchConsultasRealizadas();
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
    processarPagamentoTransferencia
  };
}
