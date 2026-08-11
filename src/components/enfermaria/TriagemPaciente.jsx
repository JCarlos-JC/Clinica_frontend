import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useTriagens from '../../hooks/useTriagens';
import useConfigurations from '../../hooks/useConfigurations';
import axios from 'axios';

import triagemService from '../../services/triagemService';
import { API_BASE, normalizeApiList } from '../../services/apiConfig';
import { invalidateCachedRequest } from '../../services/requestCache';
import { CLINICAL_EVENTS, publishClinicalEvent } from '../../services/clinicalRealtime';
import { Table, Button, Modal, Form, Input, message, Tabs, Card, Tag, Space, Row, Col, Input as AntInput, Typography, Badge } from 'antd';
import {
  CheckCircleOutlined,
  UserOutlined,
  
  CheckSquareOutlined,
  EditOutlined,
  CalendarOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';


const { TabPane } = Tabs;
const { Search } = AntInput;
const { Title } = Typography;

const TriagemPaciente = () => {
  // Função para normalizar exames (garantir que sejam sempre strings ou objetos processados)
  // (exames normalization helper removed - not used here)
  // Buscar triagens PENDENTES e CONCLUÍDAS de forma INDEPENDENTE do backend
  // Triagens pendentes: buscar da rota /triagens
  const { 
    triagens: triagensPendentesRaw, 
    // total: totalPendentes,
    refresh: refreshPendentes 
  } = useTriagens({ 
    page: 1, 
    per_page: 100,
    status: 'aguardando_triagem' // Filtrar apenas triagens pendentes
  });

  // Triagens concluídas: buscar DIRETAMENTE da rota /sinais-vitais
  const [triagensConcluidasRaw, setTriagensConcluidasRaw] = useState([]);
  const [totalConcluidas, setTotalConcluidas] = useState(0);
  // const [loadingConcluidas, setLoadingConcluidas] = useState(false);

  const refreshConcluidas = useCallback(async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      const response = await axios.get(`${API_BASE}/triagens/concluidas`, {
        headers,
        params: { page: 1, per_page: 100 }
      });
      
      const data = response.data;
      
      const triagensRaw = normalizeApiList(data);
      const meta = data?.meta || data?.pagination || data?.data?.meta || data?.data?.pagination || data?.data || {};
      setTotalConcluidas(meta.total ?? triagensRaw.length);

      if (!triagensRaw.length) {
        setTriagensConcluidasRaw([]);
        return;
      }
      
      // Enriquecer dados com informações de solicitação de triagem se necessário
      const triagensEnriquecidas = await Promise.all(
        triagensRaw.map(async (triagem) => {
          let enriched = { ...triagem };
          
          // Se não tem NID, tentar buscar da solicitação de triagem
          if (!enriched.nid && enriched.triagem_id) {
            try {
              const solRes = await axios.get(`${API_BASE}/solicitacoes-triagem/${enriched.triagem_id}`, { headers });
              const solicitacao = solRes.data?.data || solRes.data;
              if (solicitacao) {
                enriched = {
                  ...enriched,
                  solicitacao_triagem: solicitacao,
                  nid: enriched.nid || solicitacao.nid || (solicitacao.paciente?.nid),
                  data_nascimento: enriched.data_nascimento || solicitacao.data_nascimento || (solicitacao.paciente?.data_nascimento),
                  nome: enriched.nome || solicitacao.nome || solicitacao.paciente?.nome_completo || solicitacao.paciente?.nome,
                  apelido: enriched.apelido || solicitacao.apelido || solicitacao.paciente?.apelido,
                  genero: enriched.genero || solicitacao.genero || solicitacao.paciente?.genero,
                  paciente_id: enriched.paciente_id || solicitacao.paciente_id || solicitacao.paciente?.id
                };
              }
            } catch (err) {
              console.warn(`Não foi possível buscar solicitação de triagem ${enriched.triagem_id}:`, err?.message);
            }
          }
          
          // Se ainda não tem nid, tentar do paciente nested
          if (!enriched.nid && enriched.paciente) {
            enriched.nid = enriched.paciente.nid;
            enriched.data_nascimento = enriched.data_nascimento || enriched.paciente.data_nascimento;
          }
          
          return enriched;
        })
      );
      
      setTriagensConcluidasRaw(triagensEnriquecidas);
    } catch (error) {
      console.error('❌ Erro ao buscar triagens concluídas:', error);
      console.error('❌ Detalhes do erro:', error.response?.data || error.message);
      setTriagensConcluidasRaw([]);
      setTotalConcluidas(0);
    }
  }, []);

  // Carregar sinais vitais ao montar o componente
  useEffect(() => {
    refreshConcluidas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vazio para executar apenas uma vez ao montar

  // Função para refresh de ambas as listas
  const refreshAll = useCallback(() => {
    refreshPendentes();
    refreshConcluidas();
  }, [refreshPendentes, refreshConcluidas]);

  // Normalizar triagens pendentes
  const triagensPendentesArray = useMemo(() => {
    let result = [];
    if (Array.isArray(triagensPendentesRaw)) {
      result = triagensPendentesRaw;
    } else if (triagensPendentesRaw && Array.isArray(triagensPendentesRaw.data)) {
      result = triagensPendentesRaw.data;
    }
    
    return result;
  }, [triagensPendentesRaw]);

  // Normalizar triagens concluídas vindas de sinais vitais
  const triagensConcluidasArray = useMemo(() => {
    let result = [];
    if (Array.isArray(triagensConcluidasRaw)) {
      result = triagensConcluidasRaw;
    } else if (triagensConcluidasRaw && Array.isArray(triagensConcluidasRaw.data)) {
      result = triagensConcluidasRaw.data;
    }
    
    return result;
  }, [triagensConcluidasRaw]);

  // Normalizar campos vindos do backend (snake_case) para camelCase usados pela UI
  const normalizeTriagem = (t = {}) => {
    const veioDeSolicitacao = Boolean(
      t.data_solicitacao ||
      t.urgencia ||
      t.solicitacao_id ||
      (t.paciente && !t.codigo_triagem && !t.estado_urgencia)
    );

    const localTriagemId = t.localTriagemId || t.local_triagem_id || (veioDeSolicitacao ? t.triagem_id : t.id) || null;
    const solicitacaoTriagemId = t.solicitacaoTriagemId || t.solicitacao_triagem_id || (veioDeSolicitacao ? t.id : t.triagem_id) || null;

    return {
    ...t,
    // id continua a ser a chave visual da tabela; os IDs de integração ficam explícitos abaixo.
    id: localTriagemId || solicitacaoTriagemId || t.paciente_id || (t.paciente && t.paciente.id) || null,
    localTriagemId,
    solicitacaoTriagemId,
    codigoTriagem: t.codigo_triagem || localTriagemId || solicitacaoTriagemId || null,
    pacienteId: t.paciente_id || (t.paciente && t.paciente.id) || null,
    TriagemId: localTriagemId,
    // patient info - tenta múltiplas fontes (paciente direto, nested, ou via solicitacao_triagem)
    nid: t.nid || 
         (t.paciente && t.paciente.nid) || 
         (t.solicitacao_triagem && t.solicitacao_triagem.nid) || 
         (t.solicitacao_triagem && t.solicitacao_triagem.paciente && t.solicitacao_triagem.paciente.nid) || 
         null,
    
    nome: t.nome || 
          (t.paciente && (t.paciente.nome_completo || t.paciente.nome)) || 
          (t.solicitacao_triagem && (t.solicitacao_triagem.nome || (t.solicitacao_triagem.paciente && (t.solicitacao_triagem.paciente.nome_completo || t.solicitacao_triagem.paciente.nome)))) || 
          null,
    
    apelido: t.apelido || 
             (t.paciente && t.paciente.apelido) || 
             (t.solicitacao_triagem && t.solicitacao_triagem.apelido) || 
             (t.solicitacao_triagem && t.solicitacao_triagem.paciente && t.solicitacao_triagem.paciente.apelido) || 
             null,
    
    genero: t.genero || 
            (t.paciente && t.paciente.genero) || 
            (t.solicitacao_triagem && t.solicitacao_triagem.genero) || 
            (t.solicitacao_triagem && t.solicitacao_triagem.paciente && t.solicitacao_triagem.paciente.genero) || 
            null,
    
    dataNascimento: t.data_nascimento || 
                    (t.paciente && t.paciente.data_nascimento) || 
                    (t.solicitacao_triagem && t.solicitacao_triagem.data_nascimento) || 
                    (t.solicitacao_triagem && t.solicitacao_triagem.paciente && t.solicitacao_triagem.paciente.data_nascimento) || 
                    null,
    
    enfermeiroId: t.enfermeiro_id || null,
    enfermeiroNome: t.enfermeiro_nome || null,
    dataHoraInicio: t.data_inicio_triagem || t.data_hora_inicio || null,
    dataHoraFim: t.data_conclusao_triagem || t.data_hora_fim || null,
    dataCadastro: t.created_at || t.data_solicitacao || t.data_cadastro || null,
    dataTriagem: t.data_triagem || t.created_at || null,
    // urgencia field from backend maps to estadoUrgencia
    estadoUrgencia: t.urgencia || t.estado_urgencia || (t.solicitacao_triagem && t.solicitacao_triagem.urgencia) || null,
    // tipo de utente may be an id on paciente; map to id for now
    tipoUtente: (t.paciente && (t.paciente.tipo_utente || t.paciente.tipo_utente_id)) || 
                (t.solicitacao_triagem && t.solicitacao_triagem.paciente && (t.solicitacao_triagem.paciente.tipo_utente || t.solicitacao_triagem.paciente.tipo_utente_id)) || 
                (t.solicitacao_triagem && (t.solicitacao_triagem.tipo_utente || t.solicitacao_triagem.tipo_utente_id)) ||
                t.tipo_utente || 
                null,
    tipoTriagem: t.tipo_triagem || null,
    status: t.status || null,
    consultaId: t.consulta_id || null,
    // derive consultaAgendada from presence of consulta_id or ja_consultado
    consultaAgendada: (typeof t.consulta_agendada !== 'undefined') ? t.consulta_agendada : (t.consulta_id ? true : (t.ja_consultado ? true : false)),
    observacoes: t.observacoes || null,
    origem: veioDeSolicitacao ? 'patient-service' : 'triage-service',
    // Sinais vitais - podem vir diretamente ou nested em sinais_vitais
    peso: t.peso || (t.sinais_vitais && t.sinais_vitais.peso) || null,
    altura: t.altura || (t.sinais_vitais && t.sinais_vitais.altura) || null,
    imc: t.imc || (t.sinais_vitais && t.sinais_vitais.imc) || null,
    classificacaoIMC: t.classificacao_imc || t.classificacaoIMC || (t.sinais_vitais && t.sinais_vitais.classificacao_imc) || null,
    pressaoArterial: t.pressao_arterial || t.pressaoArterial || (t.sinais_vitais && t.sinais_vitais.pressao_arterial) || null,
    frequenciaCardiaca: t.frequencia_cardiaca || t.frequenciaCardiaca || (t.sinais_vitais && t.sinais_vitais.frequencia_cardiaca) || null,
    temperatura: t.temperatura || (t.sinais_vitais && t.sinais_vitais.temperatura) || null,
    oximetria: t.oximetria || (t.sinais_vitais && t.sinais_vitais.oximetria) || null,
    glicemiaCapilar: t.glicemia_capilar || t.glicemiaCapilar || (t.sinais_vitais && t.sinais_vitais.glicemia_capilar) || null,
    };
  };

  // Normalizar campos de SINAIS VITAIS para triagens concluídas
  // const normalizeSinaisVitais = (sv = {}) => ({
  //   // ID do registro de sinais vitais
  //   id: sv.id || sv.sinais_vitais_id || null,
  //   codigoTriagem: sv.triagem_id || null,
  //   pacienteId: sv.paciente_id || (sv.paciente && sv.paciente.id) || null,
  //   TriagemId: sv.triagem_id || null,
  //   // Dados do paciente (podem vir nested)
  //   nid: sv.nid || (sv.paciente && sv.paciente.nid) || null,
  //   nome: sv.nome || (sv.paciente && (sv.paciente.nome_completo || sv.paciente.nome)) || null,
  //   apelido: sv.apelido || (sv.paciente && sv.paciente.apelido) || null,
  //   genero: sv.genero || (sv.paciente && sv.paciente.genero) || null,
  //   dataNascimento: sv.data_nascimento || (sv.paciente && sv.paciente.data_nascimento) || null,
  //   // Data da triagem
  //   dataTriagem: sv.created_at || sv.updated_at || sv.data_triagem || null,
  //   dataCadastro: sv.created_at || null,
  //   // Status sempre concluída para sinais vitais
  //   status: 'triagem_concluida',
  //   tipoTriagem: sv.tipo_triagem || 'inicial',
  //   // Sinais vitais (já vêm direto no objeto)
  //   peso: sv.peso || null,
  //   altura: sv.altura || null,
  //   imc: sv.imc || null,
  //   classificacaoIMC: sv.classificacao_imc || sv.classificacaoIMC || null,
  //   pressaoArterial: sv.pressao_arterial || sv.pressaoArterial || null,
  //   frequenciaCardiaca: sv.frequencia_cardiaca || sv.frequenciaCardiaca || null,
  //   temperatura: sv.temperatura || null,
  //   oximetria: sv.oximetria || null,
  //   glicemiaCapilar: sv.glicemia_capilar || sv.glicemiaCapilar || null,
  //   observacoes: sv.observacoes || null,
  //   // Dados adicionais do paciente
  //   tipoUtente: (sv.paciente && (sv.paciente.tipo_utente || sv.paciente.tipo_utente_id)) || sv.tipo_utente || null,
  //   estadoUrgencia: sv.urgencia || sv.estado_urgencia || null,
  //   // fallback
  //   ...sv
  // });

  // Helper to extract the sinais_vitais resource from various API response shapes
  const extractSinais = (resp) => {
    // resp may be: axios response (with data), or direct data object
    const d = resp?.data || resp || null;
    if (!d) return null;
    // Some endpoints return { data: { sinais_vitais: { ... }, summary: {...}, triagem: {...} } }
    if (d.sinais_vitais) {
      const triagem = d.triagem || d.sinais_vitais.triagem || {};
      const sinais = d.sinais_vitais || {};

      return {
        ...triagem,
        ...sinais,
        id: triagem.id || sinais.triagem_id || sinais.id,
        sinaisVitaisId: sinais.id || null,
        sinais_vitais_id: sinais.id || null,
        localTriagemId: triagem.id || sinais.triagem_id || null,
        solicitacaoTriagemId: triagem.triagem_id || d.solicitacao_triagem_id || null,
        triagem_id: triagem.id || sinais.triagem_id || null,
        solicitacao_triagem_id: triagem.triagem_id || d.solicitacao_triagem_id || null,
        sinais_vitais: sinais,
        triagem
      };
    }
    // Some return the resource directly inside `data` or as top-level
    if (d.id || d.triagem_id || d.paciente_id) return d;
    // Fallback: if there is a `data` field inside, try it
    if (d.data && (d.data.id || d.data.triagem_id || d.data.paciente_id || d.data.sinais_vitais)) {
      return extractSinais(d.data);
    }
    return d;
  };
 
  // Carregar tipos de utentes para mostrar nome em vez de id
  const { tiposUtentes } = useConfigurations();

  // Local state mirrors as lists used by the UI so we can update immediately
  // Preferir os tipos de utente vindos do Patient Service (como em CadastroPaciente)
  const [patientServiceTiposUtentes, setPatientServiceTiposUtentes] = useState([]);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/pacientes/tipos-utentes`, { headers });
        if (mounted) setPatientServiceTiposUtentes(normalizeApiList(res.data));
      } catch (err) {
        console.warn('Não foi possível carregar tipos de utentes do Patient Service:', err?.message || err);
        if (mounted) setPatientServiceTiposUtentes([]);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const isTriagemPendente = useCallback((triagem = {}) => {
    const status = String(triagem.status || triagem.estado || triagem.situacao || '').toLowerCase();
    return ['aguardando_triagem', 'em_triagem', 'pendente'].includes(status) &&
      !triagem.dataHoraFim &&
      !triagem.data_conclusao_triagem &&
      !triagem.sinaisVitaisId &&
      !triagem.sinais_vitais_id &&
      !triagem.sinais_vitais;
  }, []);

  // Normalizar triagens pendentes
  const triagensPendentesNormalized = useMemo(() => 
    triagensPendentesArray
      .map(normalizeTriagem)
      .filter(isTriagemPendente), 
    [triagensPendentesArray, isTriagemPendente]
  );

  // Normalizar triagens concluídas (dados de TRIAGENS com sinais vitais aninhados)
  const triagensConcluidasNormalized = useMemo(() => 
    triagensConcluidasArray.map(normalizeTriagem), 
    [triagensConcluidasArray]
  );

  const [localTriagensPendentes, setLocalTriagensPendentes] = useState([]);
  const [localTriagensRealizadas, setLocalTriagensRealizadas] = useState([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const triagensConcluidasSessaoRef = useRef([]);

  const triagensPendentes = localTriagensPendentes;
  const triagensRealizadas = localTriagensRealizadas;

  const normalizarTextoIdentidade = useCallback((value) => (
    value === null || value === undefined
      ? null
      : String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  ), []);

  const getTriagemIdentity = useCallback((item = {}) => ({
    id: item.id ? String(item.id) : null,
    localTriagemId: item.localTriagemId || item.local_triagem_id || item.TriagemId || null,
    solicitacaoTriagemId: item.solicitacaoTriagemId || item.solicitacao_triagem_id || item.solicitacao_id || null,
    triagemId: item.triagem_id || item.triagemId || null,
    pacienteId: item.pacienteId || item.paciente_id || item.paciente?.id || item.solicitacao_triagem?.paciente_id || null,
    nid: item.nid || item.paciente?.nid || item.solicitacao_triagem?.nid || item.solicitacao_triagem?.paciente?.nid || null,
    nome: normalizarTextoIdentidade(item.nome || item.paciente?.nome || item.paciente?.nome_completo || item.solicitacao_triagem?.nome || item.solicitacao_triagem?.paciente?.nome),
    apelido: normalizarTextoIdentidade(item.apelido || item.paciente?.apelido || item.solicitacao_triagem?.apelido || item.solicitacao_triagem?.paciente?.apelido),
    dataNascimento: item.dataNascimento || item.data_nascimento || item.paciente?.data_nascimento || item.solicitacao_triagem?.data_nascimento || item.solicitacao_triagem?.paciente?.data_nascimento || null,
  }), [normalizarTextoIdentidade]);

  const matchesTriagemPaciente = useCallback((a = {}, b = {}) => {
    const left = getTriagemIdentity(a);
    const right = getTriagemIdentity(b);

    const same = (x, y) => x !== null && x !== undefined && y !== null && y !== undefined && String(x) === String(y);

    const samePersonByName = left.nome && right.nome && left.apelido && right.apelido &&
      left.nome === right.nome &&
      left.apelido === right.apelido &&
      same(left.dataNascimento, right.dataNascimento);

    return (
      same(left.localTriagemId, right.localTriagemId) ||
      same(left.solicitacaoTriagemId, right.solicitacaoTriagemId) ||
      same(left.triagemId, right.localTriagemId) ||
      same(left.localTriagemId, right.triagemId) ||
      same(left.triagemId, right.solicitacaoTriagemId) ||
      same(left.solicitacaoTriagemId, right.triagemId) ||
      same(left.pacienteId, right.pacienteId) ||
      same(left.nid, right.nid) ||
      samePersonByName
    );
  }, [getTriagemIdentity]);

  const removerTriagemPendente = useCallback((lista, triagemConcluida) => (
    lista.filter(item => !matchesTriagemPaciente(item, triagemConcluida))
  ), [matchesTriagemPaciente]);


  const removerTriagensConcluidasDaLista = useCallback((lista, concluidas = []) => (
    concluidas.reduce(
      (resultado, triagemConcluida) => removerTriagemPendente(resultado, triagemConcluida),
      lista
    )
  ), [removerTriagemPendente]);

  const removerTriagensConcluidasDaSessao = useCallback((lista) => (
    removerTriagensConcluidasDaLista(lista, triagensConcluidasSessaoRef.current)
  ), [removerTriagensConcluidasDaLista]);


  const registrarTriagemConcluidaNaUI = useCallback((triagemConcluida) => {
    const normalizada = normalizeTriagem({
      ...triagemConcluida,
      pacienteId: triagemConcluida.pacienteId || triagemConcluida.paciente_id || pacienteSelecionado?.pacienteId || pacienteSelecionado?.paciente_id || pacienteSelecionado?.id,
      paciente_id: triagemConcluida.paciente_id || triagemConcluida.pacienteId || pacienteSelecionado?.paciente_id || pacienteSelecionado?.pacienteId || pacienteSelecionado?.id,
      nid: triagemConcluida.nid || pacienteSelecionado?.nid,
      nome: triagemConcluida.nome || pacienteSelecionado?.nome,
      apelido: triagemConcluida.apelido || pacienteSelecionado?.apelido,
      dataNascimento: triagemConcluida.dataNascimento || triagemConcluida.data_nascimento || pacienteSelecionado?.dataNascimento,
      data_nascimento: triagemConcluida.data_nascimento || triagemConcluida.dataNascimento || pacienteSelecionado?.data_nascimento || pacienteSelecionado?.dataNascimento,
      localTriagemId: triagemConcluida.localTriagemId || pacienteSelecionado?.localTriagemId,
      solicitacaoTriagemId: triagemConcluida.solicitacaoTriagemId || pacienteSelecionado?.solicitacaoTriagemId,
    });
    const jaEstavaConcluida = localTriagensRealizadas.some(item => matchesTriagemPaciente(item, normalizada)) ||
      triagensConcluidasSessaoRef.current.some(item => matchesTriagemPaciente(item, normalizada));

    triagensConcluidasSessaoRef.current = [
      normalizada,
      ...triagensConcluidasSessaoRef.current.filter(item => !matchesTriagemPaciente(item, normalizada))
    ];

    invalidateCachedRequest('clinical-data:');
    invalidateCachedRequest('consultas:');
    publishClinicalEvent(CLINICAL_EVENTS.TRIAGEM_CONCLUIDA, {
      pacienteId: normalizada.pacienteId || normalizada.paciente_id,
      nid: normalizada.nid,
      solicitacaoTriagemId: normalizada.solicitacaoTriagemId || normalizada.solicitacao_triagem_id,
      triagemId: normalizada.localTriagemId || normalizada.triagem_id || normalizada.id,
    });

    setLocalTriagensPendentes(prev => removerTriagemPendente(prev, normalizada));
    setLocalTriagensRealizadas(prev => {
      const semDuplicado = prev.filter(item => !matchesTriagemPaciente(item, normalizada));
      return [normalizada, ...semDuplicado];
    });
    setTotalConcluidas(prev => jaEstavaConcluida ? prev : Math.max(prev, localTriagensRealizadas.length) + 1);

    return normalizada;
  }, [localTriagensRealizadas, matchesTriagemPaciente, pacienteSelecionado, removerTriagemPendente]);

  // Atualizar triagens pendentes quando dados do backend mudarem
  useEffect(() => {
    const pendentesSemConcluidas = removerTriagensConcluidasDaLista(
      removerTriagensConcluidasDaSessao(triagensPendentesNormalized),
      triagensConcluidasNormalized
    ).filter(isTriagemPendente);

    setLocalTriagensPendentes(pendentesSemConcluidas);
  }, [
    triagensPendentesNormalized,
    triagensConcluidasNormalized,
    removerTriagensConcluidasDaLista,
    removerTriagensConcluidasDaSessao,
    isTriagemPendente
  ]);

  // Atualizar triagens concluídas quando dados do backend mudarem
  useEffect(() => {
    setLocalTriagensRealizadas(triagensConcluidasNormalized);
  }, [triagensConcluidasNormalized]);

  // Buscar tipos de consulta da API
  useEffect(() => {
    const fetchTiposConsulta = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const response = await triagemService.getTiposConsulta(token);
        
        // Verificar formato da resposta e extrair os dados
        const tipos = response?.data || response || [];
        setTiposConsulta(tipos);
      } catch (error) {
        console.error('❌ Erro ao buscar tipos de consulta:', error);
        message.error('Falha ao carregar tipos de consulta');
        setTiposConsulta([]);
      }
    };

    fetchTiposConsulta();
  }, []);

  // Buscar médicos da API
  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const response = await triagemService.getMedicos(token);
        
        // Verificar formato da resposta e extrair os dados
        const medicosData = response?.data || response || [];
        setMedicosAPI(medicosData);
      } catch (error) {
        console.error('❌ Erro ao buscar médicos:', error);
        message.error('Falha ao carregar médicos');
        setMedicosAPI([]);
      }
    };

    fetchMedicos();
  }, []);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAgendarModalVisible, setIsAgendarModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [formAgendar] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  // Filtrar apenas médicos de clínica geral para triagem
  // const medicosClinicaGeral = (medicos || []).filter(m =>
  //   m.especialidade === 'Clínico Geral' || m.especialidade === 'Medicina Geral'
  // );
  const [tipoConsultaSelecionado, setTipoConsultaSelecionado] = useState('');
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [medicosAPI, setMedicosAPI] = useState([]);
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState('');
  const [searchPendentes, setSearchPendentes] = useState('');
  const [searchConcluidas, setSearchConcluidas] = useState('');
  const [imc, setImc] = useState(null);
  const [imcEdit, setImcEdit] = useState(null);

  // Extrair especialidades únicas dos médicos da API
  const especialidadesDisponiveis = useMemo(() => {
    const especialidades = medicosAPI
      .map(med => med.cargo)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return especialidades;
  }, [medicosAPI]);

  // Filtrar médicos por especialidade selecionada
  const medicosFiltrados = useMemo(() => {
    if (!especialidadeSelecionada) return medicosAPI;
    return medicosAPI.filter(med => med.cargo === especialidadeSelecionada);
  }, [medicosAPI, especialidadeSelecionada]);

  // Filtrar pacientes para cada categoria
  const pacientesFiltradosTriagem = triagensPendentes.filter(p => !p.tipoTriagem || p.tipoTriagem === 'inicial');

  // Filtrar por busca e ordenar: emergência primeiro, urgentes segundo, depois por data mais recente
  const pacientesTriagemPendente = pacientesFiltradosTriagem
    .filter(p => {
      if (!searchPendentes) return true;
      const searchLower = searchPendentes.toLowerCase();
      return (
        (p.nome?.toLowerCase().includes(searchLower)) ||
        (p.apelido?.toLowerCase().includes(searchLower)) ||
        (p.nid?.toString().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Primeiro critério: prioridade de atendimento (emergência > urgente > normal)
      const getPrioridade = (estado) => {
        if (estado === 'emergencia') return 3;
        if (estado === 'urgente') return 2;
        if (estado === 'normal') return 1;
        return 0; // não definido
      };

      const prioridadeA = getPrioridade(a.estadoUrgencia);
      const prioridadeB = getPrioridade(b.estadoUrgencia);

      if (prioridadeA !== prioridadeB) {
        return prioridadeB - prioridadeA; // ordem decrescente de prioridade
      }

      // Segundo critério: data de cadastro (mais antigo primeiro para respeitar ordem de chegada)
      const dateA = a.dataCadastro ? new Date(a.dataCadastro) : new Date(0);
      const dateB = b.dataCadastro ? new Date(b.dataCadastro) : new Date(0);
      return dateA - dateB; // ordem crescente de data (mais antigo primeiro)
    });

  const triagensConcluidasLista = triagensRealizadas
    .filter(t => !t.tipoTriagem || t.tipoTriagem === 'inicial')
    .filter(t => !t.consultaAgendada && !t.consultaId)
    .filter(t => {
      if (!searchConcluidas) return true;
      const searchLower = searchConcluidas.toLowerCase();
      return (
        (t.nome?.toLowerCase().includes(searchLower)) ||
        (t.apelido?.toLowerCase().includes(searchLower)) ||
        (t.nid?.toString().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Ordenar por data da triagem (mais recente primeiro)
      const dateA = a.dataTriagem ? new Date(a.dataTriagem) : new Date(0);
      const dateB = b.dataTriagem ? new Date(b.dataTriagem) : new Date(0);
      return dateB - dateA;
    });

  const realizarTriagem = (paciente) => {
    console.log('🔍 realizarTriagem - Paciente selecionado:', {
      id: paciente.id,
      solicitacaoTriagemId: paciente.solicitacaoTriagemId,
      pacienteId: paciente.pacienteId,
      paciente_id: paciente.paciente_id,
      nome: paciente.nome,
      nid: paciente.nid,
      dataNascimento: paciente.dataNascimento
    });
    setPacienteSelecionado(paciente);
    form.resetFields();
    setImc(null);
    setIsModalVisible(true);
  };

  // Função para editar triagem
  const editarTriagem = (triagem) => {
    setPacienteSelecionado(triagem);
    formEdit.setFieldsValue({
      pressaoArterial: triagem.pressaoArterial,
      peso: triagem.peso,
      altura: triagem.altura,
      frequenciaCardiaca: triagem.frequenciaCardiaca,
      temperatura: triagem.temperatura,
      oximetria: triagem.oximetria,
      glicemiaCapilar: triagem.glicemiaCapilar
    });

    // Calcular o IMC com os valores existentes
    setImcEdit(calcularIMC(triagem.peso, triagem.altura));

    setIsEditModalVisible(true);
  };

  // Função para abrir modal de agendamento
  const abrirAgendarConsulta = (triagem) => {
    setPacienteSelecionado(triagem);
    setIsAgendarModalVisible(true);
    formAgendar.resetFields();
    setTipoConsultaSelecionado('');
    setEspecialidadeSelecionada('');
  };

  // Função para marcar consulta
  const marcarConsulta = async (triagem) => {
    const nid = triagem?.nid;

    if (!nid) {
      message.error('NID do paciente não encontrado. Atualize a lista de triagens e tente novamente.');
      return;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const response = await axios.get(`${API_BASE}/pacientes/consultorio/agenda/agendamentos`, {
        headers,
        params: { per_page: 1000 }
      });

      const agendamentos = normalizeApiList(response.data);
      const existente = agendamentos.find(item => (
        String(item?.nid || item?.triagem?.nid || item?.paciente?.nid || '') === String(nid) &&
        !['cancelada', 'concluida', 'paciente_faltou', 'finalizada'].includes(String(item?.status || '').toLowerCase())
      ));

      if (existente) {
        setLocalTriagensRealizadas(prev => removerTriagemPendente(prev, triagem));
        message.info('Este paciente já tem uma consulta agendada no backend. Removi da lista de triagens concluídas.');
        return;
      }
    } catch (error) {
      console.warn('Não foi possível validar agendamento existente no backend. A API fará a verificação ao gravar.', error?.message || error);
    }

    abrirAgendarConsulta(triagem);
  };
  const handleFinishTriagem = (values) => {
    // Garantir que o IMC está incluído nos valores salvos
    const imcCalculado = calcularIMC(values.peso, values.altura);
    
    const localTriagemId = pacienteSelecionado?.localTriagemId ||
                           pacienteSelecionado?.TriagemId ||
                           pacienteSelecionado?.triagemLocalId ||
                           pacienteSelecionado?.triagem_id ||
                           null;

    const solicitacaoTriagemId = pacienteSelecionado?.solicitacaoTriagemId ||
                                 pacienteSelecionado?.solicitacao_triagem_id ||
                                 (!localTriagemId ? pacienteSelecionado?.id : null) ||
                                 null;
    
    // ⚠️ IMPORTANTE: paciente_id DEVE vir de pacienteId (o ID real do paciente)
    // Tentar múltiplas fontes para garantir que temos um ID válido
    const pacienteId = pacienteSelecionado?.pacienteId || 
                       pacienteSelecionado?.paciente_id || 
                       pacienteSelecionado?.paciente?.id ||
                       values.paciente_id ||
                       null;
    
    console.log('🔍 handleFinishTriagem - Dados resolvidos:', {
      solicitacaoTriagemId,
      pacienteId,
      peso: values.peso,
      altura: values.altura,
      pressaoArterial: values.pressaoArterial,
      nid: pacienteSelecionado?.nid,
      nome: pacienteSelecionado?.nome
    });
    
    const triagemCompletada = {
      ...pacienteSelecionado,
      ...values,
      imc: imcCalculado,
      classificacaoIMC: getClassificacaoIMC(imcCalculado),
      dataTriagem: new Date().toLocaleString(),
      tipoTriagem: 'inicial',
      pacienteId: pacienteId,
      status: 'triagem_concluida'
    };

    (async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      let sinaisPayload = null;
      let headers = null;
      try {
        // Validação: ensure paciente_id exists
        if (!pacienteId) {
          message.error('Dados inválidos: faltando paciente_id. Não é possível registrar sinais vitais sem identificar o paciente.');
          console.error('❌ Erro crítico - paciente_id não encontrado:', {
            pacienteSelecionado,
            formValues: values
          });
          return;
        }

        if (!localTriagemId && !solicitacaoTriagemId) {
          message.error('Dados inválidos: triagem não identificada. Atualize a lista e tente novamente.');
          console.error('❌ Erro crítico - nenhum identificador de triagem encontrado');
          return;
        }
        
        // Build payload with snake_case keys expected by the SinaisVitaisController
        const toNumber = v => {
          if (v === null || v === undefined || v === '') return null;
          const n = Number(String(v).replace(',', '.'));
          return Number.isNaN(n) ? null : n;
        };

        sinaisPayload = {
          paciente_id: pacienteId,
          triagem_id: localTriagemId || solicitacaoTriagemId,
          solicitacao_triagem_id: solicitacaoTriagemId,
          peso: toNumber(values.peso),
          altura: toNumber(values.altura),
          imc: toNumber(imcCalculado),
          classificacao_imc: getClassificacaoIMC(imcCalculado) || null,
          pressao_arterial: values.pressaoArterial || values.pressao_arterial || null,
          frequencia_cardiaca: toNumber(values.frequenciaCardiaca || values.frequencia_cardiaca),
          temperatura: toNumber(values.temperatura),
          oximetria: toNumber(values.oximetria),
          glicemia_capilar: toNumber(values.glicemiaCapilar || values.glicemia_capilar),
          observacoes: values.observacoes || null,
          tipo_triagem: 'inicial'
        };

        // Use Sinais Vitais endpoint to store vitals related to triagem
        // ✅ NOTA: O backend automaticamente marca a solicitação como concluída ao criar sinais vitais
        headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        let created = null;
        let postError = null;
        try {
          // 🔍 DEBUG: Verificar exatamente o que está sendo enviado
          console.log('🔍 DEBUG - Payload que será enviado ao sinais-vitais:');
          console.log('  - paciente_id:', sinaisPayload.paciente_id, '(tipo:', typeof sinaisPayload.paciente_id, ')');
          console.log('  - triagem_id:', sinaisPayload.triagem_id, '(tipo:', typeof sinaisPayload.triagem_id, ')');
          console.log('  - peso:', sinaisPayload.peso);
          console.log('  - altura:', sinaisPayload.altura);
          console.log('  - pressao_arterial:', sinaisPayload.pressao_arterial);
          console.log('  - Payload completo:', JSON.stringify(sinaisPayload, null, 2));
          
          const res = await axios.post(`${API_BASE}/sinais-vitais/`, sinaisPayload, { headers });
          created = extractSinais(res.data);
          console.log('✅ Sinais vitais criados com sucesso:', created);
        } catch (errPost) {
          postError = errPost;
        }

        // Se já existe sinais vitais, tentar atualizar
        if (postError && postError.response?.data?.message && postError.response.data.message.includes('já possui sinais vitais')) {
          // Buscar o id do registro de sinais vitais existente
          let sinaisId = null;
          try {
            const getRes = await axios.get(`${API_BASE}/sinais-vitais/triagem/${sinaisPayload.triagem_id || triagemCompletada.id}`, { headers });
            const sinaisExistente = extractSinais(getRes.data);
            sinaisId = sinaisExistente?.sinaisVitaisId || sinaisExistente?.sinais_vitais_id || sinaisExistente?.id || null;
          } catch (getErr) {
            console.error('Erro ao buscar sinais vitais existentes para update:', getErr);
          }
          if (sinaisId) {
            try {
              const putRes = await axios.put(`${API_BASE}/sinais-vitais/${sinaisId}`, sinaisPayload, { headers });
              created = extractSinais(putRes.data);
              message.success('Sinais vitais atualizados com sucesso!');
            } catch (putErr) {
              message.error('Falha ao atualizar sinais vitais existentes.');
              throw putErr;
            }
          } else {
            message.error('Sinais vitais já existem, mas não foi possível localizar o registro para atualizar.');
            throw postError;
          }
        } else if (postError) {
          throw postError;
        }

        if (created) {
          const normalized = {
            ...pacienteSelecionado, // Incluir dados do paciente original
            ...created,
            id: created.localTriagemId || created.id || created.triagem_id || pacienteSelecionado.localTriagemId || pacienteSelecionado.id,
            localTriagemId: created.localTriagemId || created.triagem_id || pacienteSelecionado.localTriagemId || localTriagemId || null,
            solicitacaoTriagemId: created.solicitacaoTriagemId || created.solicitacao_triagem_id || solicitacaoTriagemId || null,
            pacienteId: created.paciente_id || created.pacienteId || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
            dataTriagem: created.created_at || created.dataTriagem || new Date().toLocaleString(),
            status: created.status || 'triagem_concluida',
            // Garantir que os sinais vitais estejam mapeados em camelCase
            peso: created.peso || values.peso || null,
            altura: created.altura || values.altura || null,
            imc: created.imc || imcCalculado || null,
            classificacaoIMC: created.classificacao_imc || created.classificacaoIMC || getClassificacaoIMC(imcCalculado) || null,
            pressaoArterial: created.pressao_arterial || created.pressaoArterial || values.pressaoArterial || null,
            frequenciaCardiaca: created.frequencia_cardiaca || created.frequenciaCardiaca || values.frequenciaCardiaca || null,
            temperatura: created.temperatura || values.temperatura || null,
            oximetria: created.oximetria || values.oximetria || null,
            glicemiaCapilar: created.glicemia_capilar || created.glicemiaCapilar || values.glicemiaCapilar || null
          };

          registrarTriagemConcluidaNaUI(normalized);
          message.success('Triagem realizada e registrada no servidor (Sinais Vitais) com sucesso!');
          
          // Atualizar triagens do backend de forma mais agressiva
          try { 
            await new Promise(resolve => setTimeout(resolve, 1000));
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Buscar triagens pendentes e remover a que foi concluída
            try {
              const pendentesData = await triagemService.getTriagens(
                { page: 1, per_page: 100, status: 'aguardando_triagem' },
                token
              );
              const pendentesAtualizadas = normalizeApiList(pendentesData);
              
              // Garantir que removemos a triagem concluída (comparar por múltiplas formas de ID)
              const pendentesFiltered = removerTriagensConcluidasDaSessao(
                removerTriagemPendente(
                  pendentesAtualizadas.map(normalizeTriagem).filter(isTriagemPendente),
                  normalized
                )
              );
              
              console.log('✅ Triagens pendentes atualizado - removida triagem/paciente:', getTriagemIdentity(normalized), 'Restantes:', pendentesFiltered.length);
              setLocalTriagensPendentes(pendentesFiltered);
            } catch(e1) {
              console.warn('Falha ao atualizar triagens pendentes:', e1?.message);
            }
            
            // Buscar triagens concluídas para manter sincronizado
            try {
              const resConcluidas = await axios.get(`${API_BASE}/triagens/concluidas`, {
                headers,
                params: { page: 1, per_page: 100 }
              });
              const concluidasAtualizadas = normalizeApiList(resConcluidas.data);
              
              // Enriquecer com dados de solicitação se necessário
              const concluidasEnriquecidas = await Promise.all(
                concluidasAtualizadas.map(async (tri) => {
                  if (!tri.nid && tri.triagem_id) {
                    try {
                      const sr = await axios.get(`${API_BASE}/solicitacoes-triagem/${tri.triagem_id}`, { headers });
                      const sol = sr.data?.data || sr.data;
                      if (sol) {
                        return {
                          ...tri,
                          nid: tri.nid || sol.nid || sol.paciente?.nid,
                          data_nascimento: tri.data_nascimento || sol.data_nascimento || sol.paciente?.data_nascimento,
                          nome: tri.nome || sol.nome || sol.paciente?.nome_completo
                        };
                      }
                    } catch (err) {
                      // Silencioso
                    }
                  }
                  return tri;
                })
              );
              
              const concluidasNormalizadas = concluidasEnriquecidas.map(normalizeTriagem);
              setLocalTriagensRealizadas(prev => {
                const existeNoBackend = concluidasNormalizadas.some(item => matchesTriagemPaciente(item, normalized));
                return existeNoBackend ? concluidasNormalizadas : [normalized, ...concluidasNormalizadas];
              });
            } catch(e2) {
              console.warn('Falha ao atualizar triagens concluídas:', e2?.message);
            }
          } catch(e){ 
            console.warn('Falha geral ao fazer refresh nas triagens:', e?.message); 
          }
        } else {
          registrarTriagemConcluidaNaUI(triagemCompletada);
          message.success('Triagem realizada (registrada localmente).');
        }

        setIsModalVisible(false);
        setActiveTab('2');
      } catch (err) {
        console.error('Erro ao criar triagem no servidor (sinais-vitais):', err);
        console.error('Response status:', err.response?.status, 'data:', err.response?.data || err.message);
        
        // 🔍 DEBUG para erro 422
        if (err.response?.status === 422) {
          console.error('🔍 DEBUG 422 - Payload que falhou:');
          console.error('  - sinaisPayload:', JSON.stringify(sinaisPayload, null, 2));
          console.error('  - pacienteId:', pacienteId);
          console.error('  - solicitacaoTriagemId:', solicitacaoTriagemId);
          console.error('  - pacienteSelecionado:', JSON.stringify(pacienteSelecionado, null, 2));
          console.error('  - Resposta do backend:', err.response?.data);
        }
        
        // show validation errors from server if available
        const resp = err.response?.data;

        // If backend reports that no pending solicitacao exists for this patient,
        // try creating one and retry the sinais-vitais POST.
        if (resp && resp.message && String(resp.message).includes('Não foi encontrada solicitação de triagem')) {
          try {
            console.log('🔁 Mensagem do backend: solicitacao de triagem não encontrada — criando uma solicitacao e reenviando sinais-vitais');
            const solicitacaoPayload = {
              paciente_id: sinaisPayload.paciente_id,
              urgencia: pacienteSelecionado?.estadoUrgencia || 'normal',
              observacoes: sinaisPayload.observacoes || null
            };

            const solRes = await axios.post(`${API_BASE}/solicitacoes-triagem`, solicitacaoPayload, { headers });
            const solicitacaoObj = solRes.data?.data?.solicitacao || solRes.data?.solicitacao || solRes.data?.data || solRes.data || null;
            const triagemObj = solRes.data?.data?.triagem || solRes.data?.triagem || null;
            const solicitacaoId = solicitacaoObj?.id || solicitacaoObj?.solicitacao_id || null;
            const triagemLocalId = triagemObj?.id || solicitacaoObj?.triagem_id || null;

            if (solicitacaoId) {
              sinaisPayload.triagem_id = Number(triagemLocalId || solicitacaoId);
              sinaisPayload.solicitacao_triagem_id = Number(solicitacaoId);
              try {
                const retryRes = await axios.post(`${API_BASE}/sinais-vitais/`, sinaisPayload, { headers });
                const createdRetry = extractSinais(retryRes.data);
                if (createdRetry) {
                  const normalizedRetry = {
                    ...pacienteSelecionado,
                    ...createdRetry,
                    id: createdRetry.localTriagemId || createdRetry.id || createdRetry.triagem_id || pacienteSelecionado.localTriagemId || pacienteSelecionado.id,
                    localTriagemId: createdRetry.localTriagemId || createdRetry.triagem_id || pacienteSelecionado.localTriagemId || localTriagemId || null,
                    solicitacaoTriagemId: createdRetry.solicitacaoTriagemId || createdRetry.solicitacao_triagem_id || solicitacaoTriagemId || null,
                    pacienteId: createdRetry.paciente_id || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
                    dataTriagem: createdRetry.created_at || new Date().toLocaleString(),
                    status: createdRetry.status || 'triagem_concluida'
                  };
                  registrarTriagemConcluidaNaUI(normalizedRetry);
                  message.success('Triagem registrada com sucesso após criar solicitação de triagem.');
                  setIsModalVisible(false);
                  setActiveTab('2');
                  return;
                }
              } catch (retryErr) {
                console.error('Erro ao reenviar sinais-vitais após criar solicitacao:', retryErr?.response?.data || retryErr.message || retryErr);
              }
            } else {
              console.warn('Solicitação criada, mas não retornou id válido:', solicitacaoObj);
            }
          } catch (solErr) {
            console.error('Falha ao criar solicitacao de triagem:', solErr?.response?.data || solErr.message || solErr);
          }
        }

        // If triagem_id was invalid, try to create a triagem record and retry once
        if (resp && resp.errors && resp.errors.triagem_id) {
          try {
            const triagemPayload = {
              paciente_id: sinaisPayload.paciente_id,
              // Prefer any solicitacao_triagem_id we have from sinaisPayload or selected paciente
              triagem_id: sinaisPayload.triagem_id || pacienteSelecionado?.localTriagemId || pacienteSelecionado?.TriagemId || pacienteSelecionado?.triagem_id || null,
              solicitacao_triagem_id: sinaisPayload.solicitacao_triagem_id || pacienteSelecionado?.solicitacaoTriagemId || pacienteSelecionado?.solicitacao_triagem_id || null,
              // estado_urgencia is required by the triagem-service validations
              estado_urgencia: sinaisPayload.estado_urgencia || pacienteSelecionado?.estadoUrgencia || pacienteSelecionado?.estado_urgencia || 'normal',
              tipo_triagem: sinaisPayload.tipo_triagem || 'inicial',
              data_triagem: new Date().toISOString(),
              observacoes: sinaisPayload.observacoes || null,
              status: 'triagem_concluida'
            };

            // Ensure we have a solicitacao_triagem_id — create via Patient Service if missing
            if (!triagemPayload.triagem_id) {
              try {
                const solicitacaoUrl = `${API_BASE}/solicitacoes-triagem`;
                const solRes = await axios.post(solicitacaoUrl, {
                  paciente_id: triagemPayload.paciente_id,
                  urgencia: triagemPayload.estado_urgencia || 'normal',
                  observacoes: triagemPayload.observacoes || null
                }, { headers });
                const solicitacaoObj = solRes.data?.data?.solicitacao || solRes.data?.solicitacao || solRes.data?.data || solRes.data || null;
                const triagemObj = solRes.data?.data?.triagem || solRes.data?.triagem || null;
                const solicitacaoId = solicitacaoObj?.id || solicitacaoObj?.solicitacao_id || null;
                const triagemLocalId = triagemObj?.id || solicitacaoObj?.triagem_id || null;
                if (solicitacaoId) {
                  triagemPayload.triagem_id = triagemLocalId || solicitacaoId;
                  triagemPayload.solicitacao_triagem_id = solicitacaoId;
                } else {
                  console.warn('🔁 Não foi possível extrair id da solicitacao criada:', solicitacaoObj);
                }
              } catch (solErr) {
                console.error('Falha ao criar solicitacao de triagem:', solErr?.response?.data || solErr.message || solErr);
              }
            }

            const createdTriRes = await triagemService.createTriagem(triagemPayload, token);
            // createdTriRes is already response.data per triagemService implementation
            const createdTri = createdTriRes?.data || createdTriRes || null;
            // try several places for an id
            let newTriId = null;
            if (createdTri) {
              newTriId = createdTri.id || createdTri.triagem_id || createdTri.triagemId || createdTri.data?.id || createdTri.data?.triagem_id || null;
            }
            // Some APIs return the created resource inside createdTriRes.data.data
            if (!newTriId && createdTriRes && createdTriRes.data && createdTriRes.data.id) {
              newTriId = createdTriRes.data.id;
            }

            if (newTriId) {
              // ensure numeric id
              const newTriIdNum = Number(newTriId);
              sinaisPayload.triagem_id = Number.isNaN(newTriIdNum) ? newTriId : newTriIdNum;
              
              try {
                const retryRes = await axios.post(`${API_BASE}/sinais-vitais/`, sinaisPayload, { headers });
                const createdRetry = extractSinais(retryRes.data);
                if (createdRetry) {
                  const normalized = {
                    ...pacienteSelecionado, // Incluir dados do paciente original
                    ...createdRetry,
                    id: createdRetry.localTriagemId || createdRetry.id || createdRetry.triagem_id || pacienteSelecionado.localTriagemId || pacienteSelecionado.id,
                    localTriagemId: createdRetry.localTriagemId || createdRetry.triagem_id || pacienteSelecionado.localTriagemId || localTriagemId || null,
                    solicitacaoTriagemId: createdRetry.solicitacaoTriagemId || createdRetry.solicitacao_triagem_id || solicitacaoTriagemId || null,
                    pacienteId: createdRetry.paciente_id || createdRetry.pacienteId || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
                    dataTriagem: createdRetry.created_at || createdRetry.dataTriagem || new Date().toLocaleString(),
                    status: createdRetry.status || 'triagem_concluida',
                    // Garantir que os sinais vitais estejam mapeados em camelCase
                    peso: createdRetry.peso || sinaisPayload.peso || null,
                    altura: createdRetry.altura || sinaisPayload.altura || null,
                    imc: createdRetry.imc || sinaisPayload.imc || null,
                    classificacaoIMC: createdRetry.classificacao_imc || createdRetry.classificacaoIMC || sinaisPayload.classificacao_imc || null,
                    pressaoArterial: createdRetry.pressao_arterial || createdRetry.pressaoArterial || sinaisPayload.pressao_arterial || null,
                    frequenciaCardiaca: createdRetry.frequencia_cardiaca || createdRetry.frequenciaCardiaca || sinaisPayload.frequencia_cardiaca || null,
                    temperatura: createdRetry.temperatura || sinaisPayload.temperatura || null,
                    oximetria: createdRetry.oximetria || sinaisPayload.oximetria || null,
                    glicemiaCapilar: createdRetry.glicemia_capilar || createdRetry.glicemiaCapilar || sinaisPayload.glicemia_capilar || null
                  };

                  registrarTriagemConcluidaNaUI(normalized);
                  message.success('Triagem realizada e registrada no servidor (após criar triagem) com sucesso!');
                  
                  // refresh triagens from server to keep UI in sync (com pequeno delay)
                  try { 
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (typeof refreshAll === 'function') await refreshAll(); 
                  } catch(e){ 
                    console.warn('Falha ao dar refresh nas triagens:', e); 
                  }
                  setIsModalVisible(false);
                  setActiveTab('2');
                  return; // done
                }
              } catch (retryErr) {
                console.error('Erro no retry de sinais-vitais após criar triagem:', retryErr);
                // fall through to show errors below
              }
            } else {
              // Could not find a created triagem id — surface server response to user
              const errMsg = (createdTriRes && (createdTriRes.message || createdTriRes.msg)) || 'Resposta inesperada ao criar triagem (sem id retornado)';
              console.warn('Não foi possível extrair id da triagem criada:', { createdTriRes, createdTri, errMsg });
              message.error(`Falha ao criar triagem necessária: ${errMsg}`);
            }
          } catch (createErr) {
            console.error('Falha ao criar triagem no triagem-service durante tratamento de erro:', createErr);
            const createResp = createErr?.response?.data;
            if (createResp) {
              const msgs = createResp.errors ? Object.entries(createResp.errors).flatMap(([k, v]) => Array.isArray(v) ? v : [v]) : [createResp.message || JSON.stringify(createResp)];
              message.error(`Falha ao criar triagem: ${msgs.slice(0,3).join('; ')}`);
            } else {
              message.error('Falha ao criar triagem no servidor. Verifique o console para detalhes.');
            }
          }
        }

        if (resp) {
          if (resp.errors && typeof resp.errors === 'object') {
            const msgs = Object.entries(resp.errors).flatMap(([k, v]) => Array.isArray(v) ? v : [v]);
            message.error(`Falha ao registrar: ${msgs.slice(0,3).join('; ')}`);
          } else if (resp.message) {
            message.error(`Falha ao registrar: ${resp.message}`);
          } else {
            message.error(`Falha ao registrar no servidor.`);
          }
        } else {
          message.error('Triagem processada localmente, falha ao registrar no servidor. Sem resposta do servidor.');
        }

        // Aplicar localmente como fallback
        registrarTriagemConcluidaNaUI(triagemCompletada);
        setIsModalVisible(false);
        setActiveTab('2');
      }
    })();
  };
  const handleEditTriagem = (values) => {
    // Garantir que o IMC está incluído nos valores salvos
    const imcCalculado = calcularIMC(values.peso, values.altura);
    const triagemAtualizada = {
      ...pacienteSelecionado,
      ...values,
      imc: imcCalculado,
      classificacaoIMC: getClassificacaoIMC(imcCalculado),
      dataAtualizacao: new Date().toLocaleString()
    };

    (async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      try {
        // Update vitals via Sinais Vitais endpoint
        const sinaisUpdate = {
          peso: values.peso || null,
          altura: values.altura || null,
          imc: imcCalculado || null,
          classificacao_imc: getClassificacaoIMC(imcCalculado) || null,
          pressao_arterial: values.pressaoArterial || values.pressao_arterial || null,
          frequencia_cardiaca: values.frequenciaCardiaca || values.frequencia_cardiaca || null,
          temperatura: values.temperatura || null,
          oximetria: values.oximetria || null,
          glicemia_capilar: values.glicemiaCapilar || values.glicemia_capilar || null,
          observacoes: values.observacoes || null
        };

        const sinaisVitaisId = pacienteSelecionado?.sinaisVitaisId ||
                              pacienteSelecionado?.sinais_vitais_id ||
                              pacienteSelecionado?.sinais_vitais?.id ||
                              pacienteSelecionado?.id;

        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const res = await axios.put(`${API_BASE}/sinais-vitais/${sinaisVitaisId}`, sinaisUpdate, { headers });

        const updated = extractSinais(res.data);

        if (updated) {
          const normalized = {
            ...pacienteSelecionado, // Manter dados originais do paciente
            ...triagemAtualizada,
            id: updated.id || pacienteSelecionado.id,
            pacienteId: updated.paciente_id || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
            dataAtualizacao: updated.updated_at || triagemAtualizada.dataAtualizacao,
            // Garantir que os sinais vitais atualizados estejam mapeados
            peso: updated.peso || values.peso || null,
            altura: updated.altura || values.altura || null,
            imc: updated.imc || imcCalculado || null,
            classificacaoIMC: updated.classificacao_imc || updated.classificacaoIMC || getClassificacaoIMC(imcCalculado) || null,
            pressaoArterial: updated.pressao_arterial || updated.pressaoArterial || values.pressaoArterial || null,
            frequenciaCardiaca: updated.frequencia_cardiaca || updated.frequenciaCardiaca || values.frequenciaCardiaca || null,
            temperatura: updated.temperatura || values.temperatura || null,
            oximetria: updated.oximetria || values.oximetria || null,
            glicemiaCapilar: updated.glicemia_capilar || updated.glicemiaCapilar || values.glicemiaCapilar || null
          };

          const novaListaTriagens = triagensRealizadas.map(t =>
            t.id === pacienteSelecionado.id ? normalized : t
          );

          setLocalTriagensRealizadas(novaListaTriagens);
          message.success('Triagem (Sinais Vitais) atualizada no servidor com sucesso!');
        } else {
          const novaListaTriagens = triagensRealizadas.map(t =>
            t.id === pacienteSelecionado.id ? triagemAtualizada : t
          );
          setLocalTriagensRealizadas(novaListaTriagens);
          message.success('Triagem atualizada localmente.');
        }

        setIsEditModalVisible(false);
        } catch (err) {
        console.error('Erro ao atualizar sinais-vitais no servidor:', err);
        console.error('Response status:', err.response?.status, 'data:', err.response?.data || err.message);
        const novaListaTriagens = triagensRealizadas.map(t =>
          t.id === pacienteSelecionado.id ? triagemAtualizada : t
        );
        setLocalTriagensRealizadas(novaListaTriagens);
        const serverMsg = err.response?.data?.message || err.response?.data || err.message;
        message.error(`Triagem atualizada localmente, falha ao atualizar no servidor: ${serverMsg}`);
        setIsEditModalVisible(false);
      }
    })();
  };

  const handleAgendarConsulta = async (values) => {
    // Usar a especialidade selecionada do formulário
    const especialidade = values.especialidade || especialidadeSelecionada;
    const medico = values.medico;
    
    // Buscar o médico selecionado para obter o ID
    const medicoSelecionado = medicosAPI.find(m => m.nome === medico);
    const especialidade_id = medicoSelecionado?.id || null;
    
    // Corrigir data/hora: usar diretamente se já são strings
    const dataConsulta = typeof values.dataConsulta === 'string' ? values.dataConsulta : (values.dataConsulta?.format ? values.dataConsulta.format('YYYY-MM-DD') : '');
    const horaConsulta = typeof values.horaConsulta === 'string' ? values.horaConsulta : (values.horaConsulta?.format ? values.horaConsulta.format('HH:mm') : '');

    // Obter o NID do paciente (a rota usa NID, não triagem_id)
    const nid = pacienteSelecionado.nid;

    if (!nid) {
      message.error('NID do paciente não encontrado. Não é possível agendar a consulta.');
      return;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

    // Payload para enviar ao backend (campos conforme esperado pela API)
    const payload = {
      nid: nid, // Campo obrigatório no backend
      triagem_id: pacienteSelecionado.localTriagemId || pacienteSelecionado.TriagemId || pacienteSelecionado.triagem_id || pacienteSelecionado.triagemId || null,
      solicitacao_triagem_id: pacienteSelecionado.solicitacaoTriagemId || pacienteSelecionado.solicitacao_triagem_id || null,
      paciente_id: pacienteSelecionado.paciente_id || pacienteSelecionado.pacienteId || null,
      nome: pacienteSelecionado.nome || null,
      apelido: pacienteSelecionado.apelido || null,
      genero: pacienteSelecionado.genero || null,
      data_nascimento: pacienteSelecionado.data_nascimento || pacienteSelecionado.dataNascimento || null,
      medico: medico,
      especialidade: especialidade,
      especialidade_id: especialidade_id,
      data_consulta: dataConsulta,
      hora_consulta: horaConsulta,
      tipo_consulta: values.tipoConsulta,
      motivo_consulta: values.motivoConsulta,
      observacoes: values.observacoes || null,
    };

    try {
      
      const response = await axios.post(
        `${API_BASE}/triagens/agendar-consulta`,
        payload,
        { headers }
      );
      const consultaJaAgendada = response.data?.data?.ja_agendada === true;

      // Remover imediatamente das listas para evitar nova marcação da mesma triagem.
      const triagemAgendada = normalizeTriagem(response.data?.data?.triagem || pacienteSelecionado);
      setLocalTriagensPendentes(prev => removerTriagemPendente(prev, triagemAgendada));
      setLocalTriagensRealizadas(prev => removerTriagemPendente(prev, triagemAgendada));

      setIsAgendarModalVisible(false);
      if (consultaJaAgendada) {
        message.info(response.data?.message || 'Este paciente já tinha uma consulta agendada. Os dados foram atualizados.');
      } else {
        message.success('Consulta agendada com sucesso!');
      }

      // Atualizar listas do backend
      setTimeout(() => {
        if (typeof refreshAll === 'function') refreshAll();
      }, 500);

    } catch (error) {
      console.error('❌ Erro ao agendar consulta:', error);
      console.error('Response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Erro ao agendar consulta no servidor';
      
      message.error(`Falha ao agendar consulta: ${errorMessage}`);
      
      // Em caso de erro, não adicionar à lista local para evitar inconsistências
    }
  };  // Colunas para cada tipo de tabela


  const columnsTriagemPendente = [
    {
      title: 'Ordem',
      key: 'ordem',
      width: 80,
      render: (_, __, index) => (
        <div style={{
          textAlign: 'center',
          fontWeight: 'bold',
          backgroundColor: index < 3 ? '#f6ffed' : 'transparent',
          padding: '5px',
          borderRadius: '4px'
        }}>
          {index + 1}
        </div>
      )
    },
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Código Triagem', dataIndex: 'codigoTriagem', key: 'codigoTriagem' },
    { title: 'Nome Completo', dataIndex: 'nome', key: 'nome' },

    {
      title: 'Triagem Solicitada em',
      dataIndex: 'dataCadastro',
      key: 'dataCadastro',
      render: text => text ? new Date(text).toLocaleString('pt-BR') : 'N/A'
    },
    {
      title: 'Tipo Utente',
      dataIndex: 'tipoUtente',
      key: 'tipoUtente',
      render: (val) => {
        if (!val) return '—';
        // Preferir os tipos vindos do patient-service (como em CadastroPaciente.jsx)
        const source = (patientServiceTiposUtentes && patientServiceTiposUtentes.length) ? patientServiceTiposUtentes : (tiposUtentes || []);
        const found = source.find(t => t.id === val || String(t.id) === String(val) || t.codigo === val || (t.nome && t.nome.toLowerCase() === String(val).toLowerCase()));
        return found ? found.nome : String(val);
      }
    },
    { title: 'Gênero', dataIndex: 'genero', key: 'genero' },
    {
      title: 'Estado do Utente',
      dataIndex: 'estadoUrgencia',
      key: 'estadoUrgencia',
      render: (text) => {
        if (!text) return 'Não definido';

        if (text === 'emergencia') {
          return (
            <Tag color="#b71c1c" style={{ fontWeight: 'bold' }}>
              EMERGÊNCIA
            </Tag>
          );
        } else if (text === 'urgente') {
          return (
            <Tag color="red" style={{ fontWeight: 'bold' }}>
              URGENTE
            </Tag>
          );
        } else {
          return (
            <Tag color="green" style={{ fontWeight: 'bold' }}>
              NORMAL
            </Tag>
          );
        }
      }
    },

    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => realizarTriagem(record)}>
          Realizar Triagem
        </Button>
      )
    }
  ];

  const columnsTriagensConcluidas = [
    { title: 'NID', dataIndex: 'nid' },
    { title: 'Apelido', dataIndex: 'apelido' },
    { title: 'Nome', dataIndex: 'nome' },
    {
      title: 'Idade',
      dataIndex: 'dataNascimento',
      key: 'idade',
      render: (text) => {
        if (!text) return 'N/A';
        let birthDate;
        if (text && typeof text === 'object' && typeof text.getFullYear === 'function') {
          birthDate = text;
        } else if (typeof text === 'string' && !isNaN(Date.parse(text))) {
          birthDate = new Date(text);
        } else if (dayjs.isDayjs && dayjs.isDayjs(text)) {
          birthDate = text.toDate();
        } else {
          return 'N/A';
        }
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        return (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) ? age - 1 : age;
      },
    },
    { title: 'Pressão Arterial', dataIndex: 'pressaoArterial', key: 'pressaoArterial' },
    { title: 'Peso', dataIndex: 'peso', key: 'peso' },
    { title: 'Frequência Cardíaca', dataIndex: 'frequenciaCardiaca', key: 'frequenciaCardiaca' },
    { title: 'Temperatura', dataIndex: 'temperatura', key: 'temperatura' }, {
      title: 'Data da Triagem',
      dataIndex: 'dataTriagem',
      key: 'dataTriagem',
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        const dateA = a.dataTriagem ? new Date(a.dataTriagem) : new Date(0);
        const dateB = b.dataTriagem ? new Date(b.dataTriagem) : new Date(0);
        return dateA - dateB;
      },
      render: (text) => {
        if (!text) return 'N/A';
        // Formatar data para exibição amigável
        const date = new Date(text);
        return date.toLocaleString('pt-BR');
      }
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => editarTriagem(record)}
            style={{ background: '#fa8c16' }}
          >
            Editar
          </Button>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => marcarConsulta(record)}
            style={{ background: '#52c41a' }}
          >
            Marcar Consulta
          </Button>
        </Space>
      )
    }
  ];
  // Função para calcular o IMC
  const calcularIMC = (peso, altura) => {
    if (!peso || !altura) return null;
    // Converter altura de cm para metros
    const alturaMetros = altura / 100;
    const imcValor = peso / (alturaMetros * alturaMetros);
    return imcValor.toFixed(2);
  };

  // Função para obter classificação do IMC
  const getClassificacaoIMC = (imc) => {
    if (!imc) return '';
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidade Grau I';
    if (imc < 40) return 'Obesidade Grau II';
    return 'Obesidade Grau III';
  };

  // Função para atualizar o IMC baseado no peso e altura
  const atualizarIMC = (peso, altura, isEdit = false) => {
    const imcCalculado = calcularIMC(peso, altura);
    if (isEdit) {
      setImcEdit(imcCalculado);
      formEdit.setFieldsValue({
        imc: imcCalculado,
        classificacaoIMC: getClassificacaoIMC(imcCalculado)
      });
    } else {
      setImc(imcCalculado);
      form.setFieldsValue({
        imc: imcCalculado,
        classificacaoIMC: getClassificacaoIMC(imcCalculado)
      });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            style={{ marginBottom: '20px' }}
          >
            {/* Aba 1: Triagens Pendentes */}
            <TabPane
              tab={
                <span>
                  <UserOutlined />
                  Triagens Pendentes
                  <Badge 
                    count={pacientesFiltradosTriagem.length} 
                    style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                    showZero
                  />
                </span>
              }
              key="1"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Pacientes Aguardando Triagem Inicial</Title>
                <Search
                  placeholder="Buscar por nome, apelido ou NID"
                  allowClear
                  onSearch={value => setSearchPendentes(value)}
                  onChange={e => setSearchPendentes(e.target.value)}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
              </div>
              <Table
                columns={columnsTriagemPendente}
                dataSource={pacientesTriagemPendente}
                rowKey="id"
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há pacientes aguardando triagem' }}
              />
            </TabPane>

            {/* Aba 2: Triagens Concluídas */}
            <TabPane
              tab={
                <span>
                  <CheckSquareOutlined />
                  Triagens Concluídas
                  <Badge 
                    count={totalConcluidas} 
                    style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                    showZero
                  />
                </span>
              }
              key="2"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Histórico de Triagens</Title>
                <Search
                  placeholder="Buscar por nome, apelido ou NID"
                  allowClear
                  onSearch={value => setSearchConcluidas(value)}
                  onChange={e => setSearchConcluidas(e.target.value)}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
              </div>
              <Table
                columns={columnsTriagensConcluidas}
                dataSource={triagensConcluidasLista}
                rowKey="id"
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há triagens realizadas' }}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* Modal de Triagem Normal */}
        <Modal
          title={`REALIZAR TRIAGEM`}
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          destroyOnClose
          width={800}
        >
          <Form form={form} layout="vertical" onFinish={handleFinishTriagem}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Nome"
                  name="nome"
                  initialValue={pacienteSelecionado?.nome}
                >
                  <Input placeholder="Nome completo do paciente" disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Pressão Arterial"
                  name="pressaoArterial"
                  rules={[
                    { required: true, message: 'Informe a pressão arterial' },
                    { pattern: /^\d{3}\/\d{2}$/, message: 'Formato: 111/20' }
                  ]}
                >
                  <Input
                    placeholder="111/20"
                    addonAfter="mmHg"
                    maxLength={6}
                    onChange={e => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 3) {
                        value = value.slice(0, 3) + '/' + value.slice(3, 5);
                      }
                      form.setFieldsValue({ pressaoArterial: value });
                    }}
                    value={form.getFieldValue('pressaoArterial')}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Peso"
                  name="peso"
                  rules={[{ required: true, message: 'Informe o peso' }]}
                >
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 70.5"
                    addonAfter="kg"
                    onChange={(e) => {
                      const peso = parseFloat(e.target.value);
                      const altura = form.getFieldValue('altura');
                      atualizarIMC(peso, altura);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Altura"
                  name="altura"
                  rules={[{ required: true, message: 'Informe a altura' }]}
                >
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 170.5"
                    addonAfter="cm"
                    onChange={(e) => {
                      const altura = parseFloat(e.target.value);
                      const peso = form.getFieldValue('peso');
                      atualizarIMC(peso, altura);
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Frequência Cardíaca"
                  name="frequenciaCardiaca"
                  rules={[{ required: true, message: 'Informe a frequência cardíaca' }]}
                >
                  <Input type="number" placeholder="Ex: 75" addonAfter="bpm" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Oximetria"
                  name="oximetria"
                  rules={[{ message: 'Informe a oximetria' }]}
                >
                  <Input type="number" step="1" placeholder="Ex: 98" addonAfter="%" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Temperatura"
                  name="temperatura"
                  rules={[
                    { required: true, message: 'Informe a temperatura' },
                    {
                      validator: (_, value) => {
                        if (value === undefined || value === null || value === '') return Promise.resolve();
                        const n = Number(String(value).replace(',', '.'));
                        return (Number.isNaN(n) || n >= 20) ? Promise.resolve() : Promise.reject(new Error('A temperatura deve ser pelo menos 20°C'));
                      }
                    }
                  ]}
                >
                  <Input type="number" step="0.1" placeholder="Ex: 36.5" addonAfter="°C" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Glicemia Capilar"
                  name="glicemiaCapilar"
                  rules={[{ message: 'Informe a glicemia capilar' }]}
                >
                  <Input type="number" step="1" placeholder="Ex: 100" addonAfter="mg/dL" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="IMC"
                  name="imc"
                  rules={[{ message: 'Informe o IMC' }]}
                  initialValue={imc}
                >
                  <Input
                    placeholder="IMC"
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Classificação do IMC"
                  name="classificacaoIMC"
                  rules={[{ message: 'Informe a classificação do IMC' }]}
                  initialValue={getClassificacaoIMC(imc)}
                >
                  <Input
                    placeholder="Classificação do IMC"
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setIsModalVisible(false)}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                Salvar Triagem
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal de Edição de Triagem */}
        <Modal
          title={`Editar Triagem - ${pacienteSelecionado?.nome}`}
          visible={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          footer={null}
          destroyOnClose
        >
          <Form form={formEdit} layout="vertical" onFinish={handleEditTriagem}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Nome"
                  name="nome"
                  rules={[{ message: 'Informe o nome do paciente' }]}
                  initialValue={pacienteSelecionado?.nome}
                >
                  <Input placeholder="Nome completo do paciente" disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Pressão Arterial"
                  name="pressaoArterial"
                  rules={[
                    { required: true, message: 'Informe a pressão arterial' },
                    { pattern: /^\d{3}\/\d{2}$/, message: 'Formato: 111/20' }
                  ]}
                >
                  <Input
                    placeholder="111/20"
                    addonAfter="mmHg"
                    maxLength={6}
                    onChange={e => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 3) {
                        value = value.slice(0, 3) + '/' + value.slice(3, 5);
                      }
                      formEdit.setFieldsValue({ pressaoArterial: value });
                    }}
                    value={formEdit.getFieldValue('pressaoArterial')}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Peso"
                  name="peso"
                  rules={[{ required: true, message: 'Informe o peso' }]}
                >
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 70.5"
                    addonAfter="kg"
                    onChange={(e) => {
                      const peso = parseFloat(e.target.value);
                      const altura = formEdit.getFieldValue('altura');
                      atualizarIMC(peso, altura, true);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Altura"
                  name="altura"
                  rules={[{ message: 'Informe a altura' }]}
                >
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 170.5"
                    addonAfter="cm"
                    onChange={(e) => {
                      const altura = parseFloat(e.target.value);
                      const peso = formEdit.getFieldValue('peso');
                      atualizarIMC(peso, altura, true);
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Frequência Cardíaca"
                  name="frequenciaCardiaca"
                  rules={[{ required: true, message: 'Informe a frequência cardíaca' }]}
                >
                  <Input type="number" placeholder="Ex: 75" addonAfter="bpm" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Oximetria"
                  name="oximetria"
                  rules={[{ message: 'Informe a oximetria' }]}
                >
                  <Input type="number" step="1" placeholder="Ex: 98" addonAfter="%" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Temperatura"
                  name="temperatura"
                  rules={[
                    { required: true, message: 'Informe a temperatura' },
                    {
                      validator: (_, value) => {
                        if (value === undefined || value === null || value === '') return Promise.resolve();
                        const n = Number(String(value).replace(',', '.'));
                        return (Number.isNaN(n) || n >= 20) ? Promise.resolve() : Promise.reject(new Error('A temperatura deve ser pelo menos 20°C'));
                      }
                    }
                  ]}
                >
                  <Input type="number" step="0.1" placeholder="Ex: 36.5" addonAfter="°C" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Glicemia Capilar"
                  name="glicemiaCapilar"
                  rules={[{ message: 'Informe a glicemia capilar' }]}
                >
                  <Input type="number" step="1" placeholder="Ex: 100" addonAfter="mg/dL" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="IMC"
                  name="imc"
                  rules={[{ message: 'Informe o IMC' }]}
                  initialValue={imcEdit}
                >
                  <Input
                    placeholder="IMC"
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Classificação do IMC"
                  name="classificacaoIMC"
                  rules={[{ message: 'Informe a classificação do IMC' }]}
                  initialValue={getClassificacaoIMC(imcEdit)}
                >
                  <Input
                    placeholder="Classificação do IMC"
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button
                style={{ marginRight: 8 }}
                onClick={() => setIsEditModalVisible(false)}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<EditOutlined />} style={{ background: '#fa8c16' }}>
                Atualizar Triagem
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal de Agendamento de Consulta */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CalendarOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '12px' }} />
              <span>Agendar Consulta - {pacienteSelecionado?.nome}</span>
            </div>
          }
          open={isAgendarModalVisible}
          onCancel={() => setIsAgendarModalVisible(false)}
          footer={null}
          destroyOnClose
          width={700}
          bodyStyle={{ padding: '24px' }}
        >
          <Form
            form={formAgendar}
            layout="vertical"
            onFinish={handleAgendarConsulta}
            requiredMark="optional"
          >
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item
                  label={<span style={{ fontWeight: '500' }}>Tipo de Consulta</span>}
                  name="tipoConsulta"
                  rules={[{ required: true, message: 'Selecione o tipo de consulta' }]}
                >
                  <select
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d9d9d9',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
                      fontSize: '14px'
                    }}
                    value={tipoConsultaSelecionado}
                    onChange={e => {
                      setTipoConsultaSelecionado(e.target.value);
                      formAgendar.setFieldsValue({ tipoConsulta: e.target.value });
                    }}
                  >
                    <option value="">Selecione o tipo</option>
                    {tiposConsulta
                      .sort((a, b) => (a.nivel || a.prioridade || 0) - (b.nivel || b.prioridade || 0))
                      .map(tipo => (
                        <option 
                          key={tipo.id} 
                          value={tipo.nome}
                          style={{ 
                            fontWeight: tipo.nivel === 1 ? 'bold' : 'normal',
                            color: tipo.cor || 'inherit'
                          }}
                        >
                          {tipo.nome} {tipo.nivel ? `(Nível ${tipo.nivel})` : ''}
                        </option>
                      ))
                    }
                  </select>
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Especialidade</span>}
              name="especialidade"
              rules={[{ required: true, message: 'Selecione a especialidade' }]}
            >
              <select
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                  boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
                  fontSize: '14px'
                }}
                value={especialidadeSelecionada}
                onChange={e => {
                  setEspecialidadeSelecionada(e.target.value);
                  formAgendar.setFieldsValue({ 
                    especialidade: e.target.value,
                    medico: '' // Limpar seleção de médico ao mudar especialidade
                  });
                }}
              >
                <option value="">Selecione a especialidade</option>
                {especialidadesDisponiveis.map((esp, index) => (
                  <option key={index} value={esp}>
                    {esp}
                  </option>
                ))}
              </select>
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Médico</span>}
              name="medico"
              rules={[{ required: true, message: 'Selecione o médico' }]}
            >
              <select
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                  boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
                  fontSize: '14px'
                }}
                value={formAgendar.getFieldValue('medico') || ''}
                onChange={e => formAgendar.setFieldsValue({ medico: e.target.value })}
                disabled={!especialidadeSelecionada}
              >
                <option value="">
                  {especialidadeSelecionada ? 'Selecione o médico' : 'Primeiro selecione a especialidade'}
                </option>
                {medicosFiltrados.map(med => (
                  <option key={med.id} value={med.nome}>
                    {med.nome}
                  </option>
                ))}
              </select>
            </Form.Item>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: '500' }}>Data da Consulta</span>}
                  name="dataConsulta"
                  rules={[{ required: true, message: 'Selecione a data' }]}
                >
                  <Input
                    type="date"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: '500' }}>Hora da Consulta</span>}
                  name="horaConsulta"
                  rules={[{ required: true, message: 'Selecione a hora' }]}
                >
                  <Input
                    type="time"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px'
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Motivo da Consulta</span>}
              name="motivoConsulta"
              rules={[{ required: true, message: 'Informe o motivo' }]}
            >
              <Input
                placeholder="Descreva o motivo da consulta"
                style={{
                  padding: '10px',
                  borderRadius: '6px'
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Observações Adicionais</span>}
              name="observacoes"
            >
              <Input.TextArea
                rows={3}
                placeholder="Observações adicionais sobre o estado do paciente"
                style={{
                  borderRadius: '6px'
                }}
              />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '16px' }}>
              <Button
                onClick={() => setIsAgendarModalVisible(false)}
                style={{ marginRight: 8 }}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CalendarOutlined />}
                style={{
                  padding: '0 16px',
                  height: '38px',
                  borderRadius: '6px'
                }}
              >
                Agendar Consulta
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default TriagemPaciente;
