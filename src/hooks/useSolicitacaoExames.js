import { useState, useCallback } from 'react';
import { message } from 'antd';
import solicitacaoExameService from '../services/solicitacaoExameService';
import { invalidateCachedRequest } from '../services/requestCache';

/**
 * Normaliza cada item retornado pela API (campos snake_case / aninhados) para os campos
 * esperados pela tabela (camelCase flat).
 *
 * Cobre as variações:
 *   FLAT:    { nid, nome, medico_solicitante, exames_solicitados: [...] }
 *   NESTED:  { paciente: { nid, nome, apelido }, medico: { nome }, exames: [...] }
 */
const normalizar = (item) => {
  // ── Paciente ──────────────────────────────────────────────────────────────
  const nid =
    item.paciente_nid ||
    item.nid ||
    item.paciente?.nid ||
    '';  // API real usa: paciente_nid

  const nome =
    item.paciente_nome ||   // API real usa: paciente_nome
    item.nome_paciente ||
    item.nome ||
    item.paciente?.nome ||
    item.paciente?.nome_completo ||
    item.paciente?.nome_paciente ||
    (item.paciente?.primeiro_nome
      ? `${item.paciente.primeiro_nome} ${item.paciente.apelido || ''}`.trim()
      : '') ||
    (item.primeiro_nome
      ? `${item.primeiro_nome} ${item.apelido_paciente || item.apelido || ''}`.trim()
      : '') ||
    // se nome é um objecto inesperado, tenta extrair dele
    (typeof item.nome === 'object' && item.nome !== null
      ? item.nome.nome || item.nome.name || item.nome.nome_completo || ''
      : '') ||
    '';

  const apelido =
    item.apelido ||
    item.paciente?.apelido ||
    item.paciente_apelido ||
    '';

  // ── Médico Solicitante ────────────────────────────────────────────────────
  const medicoSolicitante =
    item.medico_nome ||          // API real usa: medico_nome
    item.medico_solicitante ||
    item.solicitado_por ||
    item.nome_medico ||
    item.doctor_name ||
    item.medico?.nome ||
    item.medico?.name ||
    item.medico?.nome_completo ||
    '';

  // ── Exames ────────────────────────────────────────────────────────────────
  // API real: cada linha tem nome_exame como campo directo (1 exame por linha)
  const exameDirecto = item.nome_exame || item.tipo_exame || null;

  const examesRaw =
    item.exames_solicitados ||
    item.exames ||
    item.examesSolicitados ||
    item.lista_exames ||
    null;

  const parsearExames = (raw) => {
    if (!raw) return 'N/A';
    let parsed = raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try { parsed = JSON.parse(trimmed); } catch { return trimmed || 'N/A'; }
      } else {
        return trimmed || 'N/A';
      }
    }
    if (Array.isArray(parsed)) {
      const nomes = parsed.map(e => {
        if (typeof e === 'string') return e;
        return e.nome_exame || e.tipo_exame || e.nome || e.exame || e.name || '';
      }).filter(Boolean);
      return nomes.join(', ') || 'N/A';
    }
    return String(parsed) || 'N/A';
  };

  const examesSolicitados = exameDirecto || parsearExames(examesRaw);

  // ── Data ──────────────────────────────────────────────────────────────────
  const dataSolicitacao =
    item.data_solicitacao ||
    item.dataSolicitacao ||
    item.created_at ||
    null;

  // ── Status ────────────────────────────────────────────────────────────────
  // Mapeia qualquer variante (masculino/inglês/alias) para os valores canónicos
  // usados nas condições da coluna de acções.
  const STATUS_MAP = {
    // ← status real da API (confirmado via chamada directa)
    'solicitado':         'pending',
    'pending':            'pending',
    'pendente':           'pending',
    'pendente_aprovacao': 'pending',
    'confirmado':         'confirmada',
    'confirmada':         'confirmada',
    'aceito':             'confirmada',
    'aceita':             'confirmada',
    'accepted':           'confirmada',
    'approved':           'confirmada',
    'aprovado':           'confirmada',
    'aprovado_parcial':   'confirmada',
    'aprovado_total':     'confirmada',
    'confirmed':          'confirmada',
    'pago':               'paga',
    'paga':               'paga',
    'paid':               'paga',
    'pago_laboratorio':   'pago_laboratorio',
    'agendado':           'agendada',
    'agendada':           'agendada',
    'scheduled':          'agendada',
    'em_realizacao':      'agendada',
    'concluido':          'concluida',
    'concluida':          'concluida',
    'completed':          'concluida',
    'done':               'concluida',
    'cancelado':          'cancelada',
    'cancelada':          'cancelada',
    'cancelled':          'cancelada',
    'canceled':           'cancelada',
    'rejeitado':          'cancelada',
    'rejeitada':          'cancelada',
    'rejected':           'cancelada',
    'recusado':           'cancelada',
  };
  const rawStatus = item.status || '';
  const status = STATUS_MAP[rawStatus] || rawStatus || 'pending';
  const statusPagamento = item.status_pagamento || item.statusPagamento || 'pendente';

  return {
    ...item,
    nid,
    nome,
    apelido,
    medico_solicitante: medicoSolicitante,
    examesSolicitados,
    dataSolicitacao,
    status,
    statusPagamento,
  };
};

/**
 * Hook para gerir o fluxo completo de solicitações de exames no patient-service (:8002).
 *
 * Fluxo:
 *  1. fetchSolicitacoes()          → receção vê pendentes
 *  2. confirmarExames(id, payload) → confirma exames disponíveis + preços
 *  3. processarPagamento(id, p)    → regista pagamento
 *  4. agendarColheita(id, p)       → agenda colheita → notifica laboratory-service
 *  5. cancelarSolicitacao(id, p)   → cancela em qualquer fase
 */

const useSolicitacaoExames = () => {
  const [solicitacoes, setSolicitacoes]       = useState([]);
  const [solicitacaoAtual, setSolicitacaoAtual] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [loadingAcao, setLoadingAcao]         = useState(false);

  const invalidateFluxoExames = useCallback(() => {
    invalidateCachedRequest('solicitacoes-exames:');
    invalidateCachedRequest('laboratorio:agendamentos');
    invalidateCachedRequest('consultas:');
    invalidateCachedRequest('clinical-data:');
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // LISTAGEM
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Carrega solicitações de exames.
   * @param {Object} params  { status, paciente_id }
   */
  const fetchSolicitacoes = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const data = await solicitacaoExameService.getSolicitacoes(params);

      // Laravel pode retornar:
      //  A) { success: true, data: [...] }            → array directo
      //  B) { success: true, data: { data: [...] } }  → paginado
      //  C) [...]                                      → array directo sem wrapper
      let lista = data?.data ?? data ?? [];
      if (!Array.isArray(lista) && lista?.data) {
        // Resposta paginada: { current_page, data: [...], total, ... }
        lista = lista.data;
      }
      const listaArray = Array.isArray(lista) ? lista : [];

      const listaNormalizada = listaArray.map(normalizar);
      setSolicitacoes(listaNormalizada);
      return listaNormalizada;
    } catch (err) {
      console.error('[useSolicitacaoExames] fetchSolicitacoes:', err);
      message.error('Erro ao carregar solicitações de exames.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carrega detalhes de uma solicitação específica.
   * @param {number} id
   */
  const fetchSolicitacao = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await solicitacaoExameService.getSolicitacao(id);
      const item = data?.data ?? data;
      setSolicitacaoAtual(item);
      return item;
    } catch (err) {
      console.error('[useSolicitacaoExames] fetchSolicitacao:', err);
      message.error('Erro ao carregar detalhes da solicitação.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // FLUXO
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Confirma exames solicitados.
   * POST /api/solicitacoes-exames/{id}/confirmar
   *
   * @param {number} id
   * @param {Object} payload
   */
  const confirmarExames = useCallback(async (id, payload, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await solicitacaoExameService.confirmarExames(id, payload);
      invalidateFluxoExames();
      message.success(data?.message || 'Exames confirmados com sucesso.');
      // Atualiza item na lista local
      setSolicitacoes(prev =>
        prev.map(s => s.id === id ? { ...s, status: 'confirmada', ...data?.data } : s)
      );
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao confirmar exames.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, [invalidateFluxoExames]);

  /**
   * Regista o pagamento dos exames.
   * POST /api/solicitacoes-exames/{id}/processar-pagamento
   *
   * @param {number} id
   * @param {Object} payload  { valor_pago, metodo_pagamento, referencia_pagamento, observacoes }
   * @param {Function} onSuccess
   */
  const processarPagamento = useCallback(async (id, payload, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await solicitacaoExameService.processarPagamento(id, payload);
      invalidateFluxoExames();
      message.success(data?.message || 'Pagamento registado com sucesso.');
      setSolicitacoes(prev =>
        prev.map(s => s.id === id ? { ...s, status: 'paga', status_pagamento: 'pago', ...data?.data } : s)
      );
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao processar pagamento.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, [invalidateFluxoExames]);

  /**
   * Agenda a colheita no laboratório.
   * POST /api/solicitacoes-exames/{id}/agendar-colheita
   * → Notifica laboratory-service automaticamente.
   *
   * @param {number} id
   * @param {Object} payload  { data_colheita, hora_colheita, observacoes, tecnico_id }
   * @param {Function} onSuccess
   */
  const agendarColheita = useCallback(async (id, payload, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await solicitacaoExameService.agendarColheita(id, payload);
      invalidateFluxoExames();
      message.success(data?.message || 'Colheita agendada com sucesso.');
      setSolicitacoes(prev =>
        prev.map(s => s.id === id ? { ...s, status: 'agendada', ...data?.data } : s)
      );
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao agendar colheita.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, [invalidateFluxoExames]);

  /**
   * Cancela uma solicitação de exames.
   * POST /api/solicitacoes-exames/{id}/cancelar
   *
   * @param {number} id
   * @param {string} motivo
   * @param {Function} onSuccess
   */
  /**
   * Rejeita uma solicitação de exames.
   * POST /api/solicitacoes-exames/{id}/rejeitar
   *
   * @param {number} id
   * @param {string} motivo
   * @param {Function} onSuccess
   */
  const rejeitarSolicitacao = useCallback(async (id, motivo, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await solicitacaoExameService.rejeitarSolicitacao(id, { motivo });
      invalidateFluxoExames();
      message.success(data?.message || 'Solicitação rejeitada com sucesso.');
      setSolicitacoes(prev => prev.filter(s => s.id !== id));
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao rejeitar solicitação.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, [invalidateFluxoExames]);

  const cancelarSolicitacao = useCallback(async (id, motivo, onSuccess) => {
    setLoadingAcao(true);
    try {
      const data = await solicitacaoExameService.cancelarSolicitacao(id, { motivo });
      invalidateFluxoExames();
      message.success(data?.message || 'Solicitação cancelada.');
      setSolicitacoes(prev => prev.filter(s => s.id !== id));
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao cancelar solicitação.';
      message.error(msg);
      throw err;
    } finally {
      setLoadingAcao(false);
    }
  }, [invalidateFluxoExames]);

  // ───────────────────────────────────────────────────────────────────────────

  return {
    // Estado
    solicitacoes,
    solicitacaoAtual,
    loading,
    loadingAcao,
    // Listagem
    fetchSolicitacoes,
    fetchSolicitacao,
    // Fluxo
    confirmarExames,
    rejeitarSolicitacao,
    processarPagamento,
    agendarColheita,
    cancelarSolicitacao
  };
};

export default useSolicitacaoExames;
