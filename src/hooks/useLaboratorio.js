import { useState, useCallback } from 'react';
import { message } from 'antd';
import laboratorioService from '../services/laboratorioService';

/**
 * Hook para gerir o fluxo completo do laboratory-service (:8003).
 * Consumido por: Laboratorio.jsx / LaboratorioPaciente.jsx
 *
 * Fluxo:
 *  1. fetchAgendamentosPendentes()        → técnico vê colheitas do dia
 *  2. iniciarColheita(id, payload)        → marca colheita como em_colheita
 *  3. concluirColheita(id, payload)       → regista resultados + notifica consultation
 *  4. adicionarAnexo(id, formData)        → upload PDF / imagem
 *  5. cancelarColheita(id, payload)       → cancela agendamento
 */
const useLaboratorio = () => {
  const [agendamentos, setAgendamentos]           = useState([]);
  const [agendamentosHistorico, setAgendamentosHistorico] = useState([]);
  const [agendamentoAtual, setAgendamentoAtual]   = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [loadingAcao, setLoadingAcao]             = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // LISTAGEM
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Carrega agendamentos de colheita (com filtros opcionais).
   * GET /api/laboratorio/agendamentos
   * @param {Object} params  { status, data }
   */
  const fetchAgendamentos = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const data = await laboratorioService.getAgendamentos(params);
      const lista = data?.data ?? data ?? [];
      const arr = Array.isArray(lista) ? lista : [];
      setAgendamentos(arr);
      return arr;
      } catch (err) {
        message.error('Erro ao carregar agendamentos do laboratório.');
        return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carrega agendamentos pendentes do dia (agendada | em_colheita).
   * GET /api/laboratorio/agendamentos/pendentes
   */
  const fetchAgendamentosPendentes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await laboratorioService.getAgendamentosPendentes();
      const lista = data?.data ?? data ?? [];
      const arr = Array.isArray(lista) ? lista : [];
      setAgendamentos(arr);
      return arr;
      } catch (err) {
        message.error('Erro ao carregar colheitas pendentes.');
        return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carrega histórico de colheitas concluídas.
   * GET /api/laboratorio/agendamentos?status=concluida
   */
  const fetchHistorico = useCallback(async () => {
    setLoading(true);
    try {
      const data = await laboratorioService.getAgendamentos({ status: 'concluida' });
      const lista = data?.data ?? data ?? [];
      const arr = Array.isArray(lista) ? lista : [];
      setAgendamentosHistorico(arr);
      return arr;
      } catch (err) {
        message.error('Erro ao carregar histórico de colheitas.');
        return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carrega detalhes de um agendamento.
   * GET /api/laboratorio/agendamentos/{id}
   */
  const fetchAgendamento = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await laboratorioService.getAgendamento(id);
      const item = data?.data ?? data;
      setAgendamentoAtual(item);
      return item;
      } catch (err) {
        message.error('Erro ao carregar agendamento.');
        return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // FLUXO DE COLHEITA
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Técnico inicia a colheita (paciente chegou ao laboratório).
   * POST /api/laboratorio/colheitas/{id}/iniciar
   *
   * @param {number}   agendamentoId
   * @param {Object}   payload  { tecnico_id, observacoes, hora_inicio }
   * @param {Function} onSuccess
   */
  const iniciarColheita = useCallback(async (agendamentoId, payload = {}, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await laboratorioService.iniciarColheita(agendamentoId, payload);
      message.success(data?.message || 'Colheita iniciada.');
      setAgendamentos(prev =>
        prev.map(a => a.id === agendamentoId ? { ...a, status: 'em_colheita' } : a)
      );
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao iniciar colheita.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, []);

  /**
   * Técnico conclui a colheita e regista resultados de cada exame.
   * POST /api/laboratorio/colheitas/{id}/concluir
   * → Backend notifica consultation-service automaticamente.
   *
   * @param {number} agendamentoId
   * @param {Object} payload
   * @param {number} payload.tecnico_id
   * @param {string} payload.hora_conclusao
   * @param {string} payload.observacoes_gerais
   * @param {Array}  payload.resultados
   *   [{ exame_id, tipo_exame, resultado (string|object), laudo, valores_referencia }]
   * @param {Function} onSuccess
   */
  const concluirColheita = useCallback(async (agendamentoId, payload, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await laboratorioService.concluirColheita(agendamentoId, payload);
      message.success(data?.message || 'Colheita concluída. Resultados enviados ao médico.');
      // Move da lista pendentes para histórico
      setAgendamentos(prev => prev.filter(a => a.id !== agendamentoId));
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao concluir colheita.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, []);

  /**
   * Upload de ficheiro de resultado (PDF / imagem de radiografia).
   * POST /api/laboratorio/colheitas/{id}/anexo  (multipart/form-data)
   *
   * @param {number}   agendamentoId
   * @param {FormData} formData  campos: ficheiro, exame_id, descricao
   * @param {Function} onSuccess
   */
  const adicionarAnexo = useCallback(async (agendamentoId, formData, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await laboratorioService.adicionarAnexo(agendamentoId, formData);
      message.success(data?.message || 'Ficheiro anexado com sucesso.');
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao anexar ficheiro.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, []);

  /**
   * Cancela um agendamento de colheita.
   * POST /api/laboratorio/colheitas/{id}/cancelar
   *
   * @param {number}   agendamentoId
   * @param {Object}   payload  { motivo, notificar_consulta }
   * @param {Function} onSuccess
   */
  const cancelarColheita = useCallback(async (agendamentoId, payload, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await laboratorioService.cancelarColheita(agendamentoId, payload);
      message.success(data?.message || 'Agendamento cancelado.');
      setAgendamentos(prev => prev.filter(a => a.id !== agendamentoId));
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao cancelar agendamento.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────

  return {
    // Estado
    agendamentos,
    agendamentosHistorico,
    agendamentoAtual,
    loading,
    loadingAcao,
    // Listagem
    fetchAgendamentos,
    fetchAgendamentosPendentes,
    fetchHistorico,
    fetchAgendamento,
    // Fluxo de colheita
    iniciarColheita,
    concluirColheita,
    adicionarAnexo,
    cancelarColheita
  };
};

export default useLaboratorio;
