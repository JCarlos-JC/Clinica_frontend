import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import patientService from '../services/patientService';
import consultaService from '../services/consultaService';
import laboratorioService from '../services/laboratorioService';
import { normalizeApiList } from '../services/apiConfig';
import { getCachedRequest, peekCachedRequest, setCachedRequest } from '../services/requestCache';
import { subscribeClinicalEvents } from '../services/clinicalRealtime';

const normalizarPaciente = (paciente = {}) => ({
  ...paciente,
  id: paciente.id,
  nid: paciente.nid || paciente.numero_identificacao,
  nome: paciente.nome || paciente.nome_paciente || paciente.paciente?.nome,
  apelido: paciente.apelido || paciente.paciente?.apelido,
  dataNascimento: paciente.dataNascimento || paciente.data_nascimento,
  dataCadastro: paciente.dataCadastro || paciente.data_cadastro || paciente.created_at,
});

const normalizarConsulta = (consulta = {}) => ({
  ...consulta,
  id: consulta.id || consulta.consulta_id || consulta.consultaId || consulta.agendamento_id,
  pacienteId: consulta.pacienteId || consulta.paciente_id,
  nid: consulta.nid || consulta.paciente?.nid,
  nome: consulta.nome || consulta.paciente_nome || consulta.paciente?.nome,
  apelido: consulta.apelido || consulta.paciente_apelido || consulta.paciente?.apelido,
  dataConsulta: consulta.dataConsulta || consulta.data_consulta || consulta.data_hora_fim || consulta.updated_at || consulta.created_at,
  diagnostico: consulta.diagnostico || consulta.hipotese_diagnostica || consulta.motivo_consulta,
  medicamentos: consulta.medicamentos || consulta.prescricoes || [],
  examesSolicitados: consulta.examesSolicitados || consulta.exames_solicitados || consulta.exames || [],
});

const normalizarTriagem = (triagem = {}) => ({
  ...triagem,
  id: triagem.id || triagem.triagem_id || triagem.paciente_id,
  pacienteId: triagem.pacienteId || triagem.paciente_id,
  nid: triagem.nid || triagem.paciente_nid || triagem.paciente?.nid,
  nome: triagem.nome || triagem.paciente_nome || triagem.paciente?.nome,
  apelido: triagem.apelido || triagem.paciente_apelido || triagem.paciente?.apelido,
  dataTriagem: triagem.dataTriagem || triagem.data_triagem || triagem.updated_at || triagem.created_at,
  peso: triagem.peso,
  altura: triagem.altura,
  pressaoArterial: triagem.pressaoArterial || triagem.pressao_arterial,
  frequenciaCardiaca: triagem.frequenciaCardiaca || triagem.frequencia_cardiaca,
  glicoseCapilar: triagem.glicoseCapilar || triagem.glicose_capilar,
});

const totalFrom = (payload, list) => (
  payload?.pagination?.total ??
  payload?.meta?.total ??
  payload?.data?.pagination?.total ??
  payload?.data?.meta?.total ??
  payload?.data?.total ??
  payload?.total ??
  list.length
);

const buildEmptyTotals = () => ({
  pacientes: 0,
  triagensPendentes: 0,
  triagensRealizadas: 0,
  consultasPendentes: 0,
  consultasRealizadas: 0,
  examesPendentes: 0,
  examesConcluidos: 0,
});

export default function useClinicalBackendData(options = {}) {
  const { autoLoad = true, perPage = 20 } = options;
  const snapshotKey = `clinical-data:${perPage}`;
  const snapshot = peekCachedRequest(snapshotKey, null, { persist: true, allowStale: true });
  const hasSnapshot = Boolean(snapshot);
  const [pacientes, setPacientes] = useState(snapshot?.pacientes || []);
  const [triagensPendentes, setTriagensPendentes] = useState(snapshot?.triagensPendentes || []);
  const [triagensRealizadas, setTriagensRealizadas] = useState(snapshot?.triagensRealizadas || []);
  const [consultasPendentes, setConsultasPendentes] = useState(snapshot?.consultasPendentes || []);
  const [consultasRealizadas, setConsultasRealizadas] = useState(snapshot?.consultasRealizadas || []);
  const [examesPendentes, setExamesPendentes] = useState(snapshot?.examesPendentes || []);
  const [examesConcluidos, setExamesConcluidos] = useState(snapshot?.examesConcluidos || []);
  const [totals, setTotals] = useState(snapshot?.totals || buildEmptyTotals());
  const [loading, setLoading] = useState(!snapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(Boolean(snapshot));
  const [lastUpdatedAt, setLastUpdatedAt] = useState(snapshot?.lastUpdatedAt || null);
  const [error, setError] = useState(null);
  const refreshPromiseRef = useRef(null);

  const applyData = useCallback((nextData) => {
    setPacientes(nextData.pacientes);
    setTriagensPendentes(nextData.triagensPendentes);
    setTriagensRealizadas(nextData.triagensRealizadas);
    setConsultasPendentes(nextData.consultasPendentes);
    setConsultasRealizadas(nextData.consultasRealizadas);
    setExamesPendentes(nextData.examesPendentes);
    setExamesConcluidos(nextData.examesConcluidos);
    setTotals(nextData.totals);
  }, []);

  const buildData = useCallback(async () => {
    setError(null);

    const requests = await Promise.allSettled([
      patientService.getAllPatients({ page: 1, per_page: perPage }),
      api.get('/api/solicitacoes-triagem/pendentes', { params: { page: 1, per_page: perPage } }),
      api.get('/api/triagens/concluidas', { params: { page: 1, per_page: perPage } }),
      consultaService.getConsultasPendentes({ per_page: perPage }),
      consultaService.getConsultasRealizadas({ page: 1, per_page: perPage }),
      laboratorioService.getAgendamentosPendentes({ page: 1, per_page: perPage }),
      laboratorioService.getAgendamentos({ status: 'concluida', page: 1, per_page: perPage }),
    ]);

    const unwrap = (index) => requests[index].status === 'fulfilled' ? requests[index].value : null;
    const firstError = requests.find(result => result.status === 'rejected')?.reason;
    if (firstError) setError(firstError);

    const pacientesPayload = unwrap(0);
    const triagensPendentesPayload = unwrap(1)?.data ?? unwrap(1);
    const triagensRealizadasPayload = unwrap(2)?.data ?? unwrap(2);
    const consultasPendentesPayload = unwrap(3);
    const consultasRealizadasPayload = unwrap(4);
    const examesPendentesPayload = unwrap(5);
    const examesConcluidosPayload = unwrap(6);

    const nextPacientes = normalizeApiList(pacientesPayload?.success ? pacientesPayload.data : pacientesPayload).map(normalizarPaciente);
    const nextTriagensPendentes = normalizeApiList(triagensPendentesPayload).map(normalizarTriagem);
    const nextTriagensRealizadas = normalizeApiList(triagensRealizadasPayload).map(normalizarTriagem);
    const nextConsultasPendentes = normalizeApiList(consultasPendentesPayload).map(normalizarConsulta);
    const nextConsultasRealizadas = normalizeApiList(consultasRealizadasPayload).map(normalizarConsulta);
    const nextExamesPendentes = normalizeApiList(examesPendentesPayload);
    const nextExamesConcluidos = normalizeApiList(examesConcluidosPayload);

    return {
      pacientes: nextPacientes,
      triagensPendentes: nextTriagensPendentes,
      triagensRealizadas: nextTriagensRealizadas,
      consultasPendentes: nextConsultasPendentes,
      consultasRealizadas: nextConsultasRealizadas,
      examesPendentes: nextExamesPendentes,
      examesConcluidos: nextExamesConcluidos,
      totals: {
        pacientes: totalFrom(pacientesPayload, nextPacientes),
        triagensPendentes: totalFrom(triagensPendentesPayload, nextTriagensPendentes),
        triagensRealizadas: totalFrom(triagensRealizadasPayload, nextTriagensRealizadas),
        consultasPendentes: totalFrom(consultasPendentesPayload, nextConsultasPendentes),
        consultasRealizadas: totalFrom(consultasRealizadasPayload, nextConsultasRealizadas),
        examesPendentes: totalFrom(examesPendentesPayload, nextExamesPendentes),
        examesConcluidos: totalFrom(examesConcluidosPayload, nextExamesConcluidos),
      },
    };
  }, [perPage]);

  const refresh = useCallback(async (options = {}) => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const silent = options.silent ?? hasSnapshot;
    if (!silent) setLoading(true);
    setRefreshing(true);

    refreshPromiseRef.current = getCachedRequest(`${snapshotKey}:refresh`, buildData, { singleFlight: true })
      .then((nextData) => {
        const stampedData = { ...nextData, lastUpdatedAt: new Date().toISOString() };
        setCachedRequest(snapshotKey, stampedData, { persist: true });
        applyData(stampedData);
        setLastUpdatedAt(stampedData.lastUpdatedAt);
        setHydrated(true);
        return stampedData;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
        setLoading(false);
        setRefreshing(false);
      });

    return refreshPromiseRef.current;
  }, [applyData, buildData, hasSnapshot, snapshotKey]);

  useEffect(() => {
    if (!autoLoad) return undefined;
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return undefined;

    refresh({ silent: hasSnapshot });
    return undefined;
  }, [autoLoad, hasSnapshot, refresh]);

  useEffect(() => {
    if (!autoLoad || typeof window === 'undefined') return undefined;

    const shouldRefresh = (keyPrefix = '') => (
      !keyPrefix ||
      keyPrefix.startsWith('clinical-data:') ||
      keyPrefix.startsWith('consultas:') ||
      keyPrefix.startsWith('laboratorio:') ||
      keyPrefix.startsWith('solicitacoes-exames:') ||
      keyPrefix.startsWith('pacientes:')
    );

    const handleCacheInvalidated = (event) => {
      const keyPrefix = event?.detail?.keyPrefix || '';
      if (shouldRefresh(keyPrefix)) refresh({ silent: true });
    };

    const unsubscribeClinicalEvents = subscribeClinicalEvents((event) => {
      const keyPrefix = event?.payload?.keyPrefix || '';
      if (shouldRefresh(keyPrefix)) refresh({ silent: true });
    });

    window.addEventListener('request-cache-invalidated', handleCacheInvalidated);
    return () => {
      window.removeEventListener('request-cache-invalidated', handleCacheInvalidated);
      unsubscribeClinicalEvents();
    };
  }, [autoLoad, hasSnapshot, refresh]);

  return {
    pacientes,
    triagensPendentes,
    triagensRealizadas,
    consultasPendentes,
    consultasRealizadas,
    examesPendentes,
    examesConcluidos,
    totals,
    loading,
    refreshing,
    hydrated,
    lastUpdatedAt,
    error,
    refresh,
  };
}
