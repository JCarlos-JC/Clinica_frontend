import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import useTriagens from '../../hooks/useTriagens';
import useConfigurations from '../../hooks/useConfigurations';
import { ClinicContext } from '../../context/ClinicContext';
import axios from 'axios';
import triagemService from '../../services/triagemService';
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
  const {
    consultasPendentes,
    setConsultasPendentes,
    // medicos
  } = useContext(ClinicContext);

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
    // ...existing code...
    // setLoadingConcluidas(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      // ...existing code...
      const response = await axios.get('http://127.0.0.1:8005/api/triagens/concluidas', {
        headers,
        params: { page: 1, per_page: 20 }
      });
      
      const data = response.data;
      // ...existing code...
      
      if (Array.isArray(data)) {
        setTriagensConcluidasRaw(data);
        setTotalConcluidas(data.length);
      } else if (data.data && Array.isArray(data.data)) {
        setTriagensConcluidasRaw(data.data);
        setTotalConcluidas(data.meta?.total || data.data.length);
      } else {
        console.warn('⚠️ Estrutura de resposta não reconhecida:', data);
        setTriagensConcluidasRaw([]);
        setTotalConcluidas(0);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar sinais vitais:', error);
      console.error('❌ Detalhes do erro:', error.response?.data || error.message);
      setTriagensConcluidasRaw([]);
      setTotalConcluidas(0);
    } finally {
      // setLoadingConcluidas(false);
      console.log('✅ Busca de sinais vitais finalizada');
    }
  }, []);

  // Carregar sinais vitais ao montar o componente
  useEffect(() => {
    console.log('🎬 Componente montado, iniciando busca de sinais vitais...');
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
    
    console.log('📥 Triagens PENDENTES recebidas do backend:', {
      total: result.length,
      statuses: result.map(t => t.status)
    });
    
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
    
    console.log('📥 SINAIS VITAIS recebidos do backend (triagens concluídas):', {
      total: result.length,
      amostra: result.slice(0, 2).map(sv => ({
        id: sv.id,
        paciente_id: sv.paciente_id,
        triagem_id: sv.triagem_id,
        peso: sv.peso,
        temperatura: sv.temperatura,
        paciente: sv.paciente?.nome
      }))
    });
    
    return result;
  }, [triagensConcluidasRaw]);

  // Normalizar campos vindos do backend (snake_case) para camelCase usados pela UI
  const normalizeTriagem = (t = {}) => ({
    // Ensure a stable `id` exists for table rowKey and local operations
    id: t.id || t.triagem_id || t.paciente_id || (t.paciente && t.paciente.id) || null,
    codigoTriagem: t.triagem_id || t.triagem_id || t.id || null,
    pacienteId: t.paciente_id || (t.paciente && t.paciente.id) || null,
    TriagemId: t.triagem_id || null,
    // patient info may be nested under `paciente`
    nid: t.nid || (t.paciente && t.paciente.nid) || null,
    nome: t.nome || (t.paciente && (t.paciente.nome_completo || t.paciente.nome)) || null,
    apelido: t.apelido || (t.paciente && t.paciente.apelido) || null,
    genero: t.genero || (t.paciente && t.paciente.genero) || null,
    dataNascimento: t.data_nascimento || (t.paciente && t.paciente.data_nascimento) || null,
    enfermeiroId: t.enfermeiro_id || null,
    enfermeiroNome: t.enfermeiro_nome || null,
    dataHoraInicio: t.data_inicio_triagem || t.data_hora_inicio || null,
    dataHoraFim: t.data_conclusao_triagem || t.data_hora_fim || null,
    dataCadastro: t.created_at || t.data_solicitacao || t.data_cadastro || null,
    dataTriagem: t.data_triagem || t.created_at || null,
    // urgencia field from backend maps to estadoUrgencia
    estadoUrgencia: t.urgencia || t.estado_urgencia || null,
    // tipo de utente may be an id on paciente; map to id for now
    tipoUtente: (t.paciente && (t.paciente.tipo_utente || t.paciente.tipo_utente_id)) || t.tipo_utente || null,
    tipoTriagem: t.tipo_triagem || null,
    status: t.status || null,
    consultaId: t.consulta_id || null,
    // derive consultaAgendada from presence of consulta_id or ja_consultado
    consultaAgendada: (typeof t.consulta_agendada !== 'undefined') ? t.consulta_agendada : (t.consulta_id ? true : (t.ja_consultado ? true : false)),
    observacoes: t.observacoes || null,
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
    // fallback to include any other fields
    ...t
  });

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
    // Some endpoints return { data: { sinais_vitais: { ... }, summary: {...} } }
    if (d.sinais_vitais) return d.sinais_vitais;
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
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    (async () => {
      try {
        const res = await axios.get('http://localhost:8002/api/pacientes/tipos-utentes', { headers });
        const data = res.data?.data || res.data || [];
        if (mounted) setPatientServiceTiposUtentes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Não foi possível carregar tipos de utentes do Patient Service:', err?.message || err);
        if (mounted) setPatientServiceTiposUtentes([]);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Normalizar triagens pendentes
  const triagensPendentesNormalized = useMemo(() => 
    triagensPendentesArray.map(normalizeTriagem), 
    [triagensPendentesArray]
  );

  // Normalizar triagens concluídas (dados de TRIAGENS com sinais vitais aninhados)
  const triagensConcluidasNormalized = useMemo(() => 
    triagensConcluidasArray.map(normalizeTriagem), 
    [triagensConcluidasArray]
  );

  const [localTriagensPendentes, setLocalTriagensPendentes] = useState([]);
  const [localTriagensRealizadas, setLocalTriagensRealizadas] = useState([]);

  // Atualizar triagens pendentes quando dados do backend mudarem
  useEffect(() => {
    console.log('📋 Atualizando triagens PENDENTES:', triagensPendentesNormalized.length);
    setLocalTriagensPendentes(triagensPendentesNormalized);
  }, [triagensPendentesNormalized]);

  // Atualizar triagens concluídas quando dados do backend mudarem
  useEffect(() => {
    console.log('📋 Atualizando triagens CONCLUÍDAS:', {
      total: triagensConcluidasNormalized.length,
      dados: triagensConcluidasNormalized.map(t => ({
        id: t.id,
        nid: t.nid,
        nome: t.nome,
        status: t.status,
        peso: t.peso,
        pressaoArterial: t.pressaoArterial
      }))
    });
    setLocalTriagensRealizadas(triagensConcluidasNormalized);
  }, [triagensConcluidasNormalized]);

  const triagensPendentes = localTriagensPendentes;
  const triagensRealizadas = localTriagensRealizadas;

  // Buscar tipos de consulta da API
  useEffect(() => {
    const fetchTiposConsulta = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const response = await triagemService.getTiposConsulta(token);
        
        // Verificar formato da resposta e extrair os dados
        const tipos = response?.data || response || [];
        setTiposConsulta(tipos);
        console.log('✅ Tipos de consulta carregados:', tipos);
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
        console.log('✅ Médicos carregados:', medicosData);
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
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
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

  console.log('📊 Lista de triagens concluídas para exibir na tabela:', {
    total: triagensConcluidasLista.length,
    amostra: triagensConcluidasLista.slice(0, 3).map(t => ({
      id: t.id,
      nid: t.nid,
      nome: t.nome,
      peso: t.peso,
      temperatura: t.temperatura
    }))
  });
  const realizarTriagem = (paciente) => {
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
  const marcarConsulta = (triagem) => {
    // Verificar se o paciente já está na lista de consultas pendentes
    const pacienteJaPendente = consultasPendentes.some(p =>
      p.id === triagem.id || p.id === triagem.pacienteId || p.pacienteId === triagem.pacienteId
    );

    if (pacienteJaPendente) {
      message.warning('Este paciente já está na lista de consultas pendentes.');
      return;
    }

    abrirAgendarConsulta(triagem);
  };
  const handleFinishTriagem = (values) => {
    // Garantir que o IMC está incluído nos valores salvos
    const imcCalculado = calcularIMC(values.peso, values.altura);
    const triagemCompletada = {
      ...pacienteSelecionado,
      ...values,
      imc: imcCalculado,
      classificacaoIMC: getClassificacaoIMC(imcCalculado),
      dataTriagem: new Date().toLocaleString(),
      tipoTriagem: 'inicial',
      id: pacienteSelecionado.triagem_id, // Manter o ID original da triagem
      pacienteId: pacienteSelecionado.pacienteId || pacienteSelecionado.id, // Referência ao paciente original
      status: 'triagem_concluida'
    };

    (async () => {
      const token = localStorage.getItem('token');
      let sinaisPayload = null;
      let headers = null;
      try {
      // Resolve paciente_id from several possible shapes on pacienteSelecionado
      const resolvedPacienteId = pacienteSelecionado?.pacienteId || pacienteSelecionado?.paciente_id || pacienteSelecionado?.paciente?.id || pacienteSelecionado?.id || values.paciente_id || null;
      if (!resolvedPacienteId) console.warn('⚠️ paciente_id não encontrado em pacienteSelecionado; valores disponíveis:', pacienteSelecionado, 'form values:', values);
        // Build payload with snake_case keys expected by the SinaisVitaisController
        const toNumber = v => {
          if (v === null || v === undefined || v === '') return null;
          const n = Number(String(v).replace(',', '.'));
          return Number.isNaN(n) ? null : n;
        };

        sinaisPayload = {
          paciente_id: resolvedPacienteId || triagemCompletada.pacienteId || null,
          triagem_id: triagemCompletada.id || null,
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
          tipo_triagem: triagemCompletada.tipoTriagem || 'inicial'
        };

        // Basic client-side validation: ensure paciente_id exists
        if (!sinaisPayload.paciente_id) {
          message.error('Dados inválidos: faltando paciente_id');
          console.warn('Payload inválido antes de enviar sinais-vitais:', sinaisPayload);
          setLocalTriagensRealizadas(prev => [triagemCompletada, ...prev]);
          setLocalTriagensPendentes(prev => prev.filter(p => p.id !== pacienteSelecionado.id));
          setIsModalVisible(false);
          setActiveTab('2');
          return;
        }

        // IMPORTANTE: Atualizar o status da triagem ANTES de criar/editar sinais vitais
        // O backend valida que apenas triagens concluídas podem ter sinais vitais editados
        const triagemId = pacienteSelecionado.triagem_id || pacienteSelecionado.TriagemId || pacienteSelecionado.codigoTriagem;
        if (triagemId) {
          try {
            console.log('📤 Atualizando status da triagem ANTES de salvar sinais vitais:', triagemId);
            await triagemService.updateTriagemStatus(triagemId, 'triagem_concluida', token);
            console.log('✅ Status da triagem atualizado para triagem_concluida');
          } catch (statusErr) {
            console.error('⚠️ Erro ao atualizar status da triagem:', statusErr);
            // Continuar mesmo se falhar - o backend pode aceitar de qualquer forma
          }
        }

        // Use Sinais Vitais endpoint to store vitals related to triagem
        headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        console.log('📤 Enviando sinaisPayload para /sinais-vitais:', sinaisPayload);
        let created = null;
        let postError = null;
        try {
          const res = await axios.post('http://127.0.0.1:8005/api/sinais-vitais', sinaisPayload, { headers });
          created = extractSinais(res.data);
        } catch (errPost) {
          postError = errPost;
        }

        // Se já existe sinais vitais, tentar atualizar
        if (postError && postError.response?.data?.message && postError.response.data.message.includes('já possui sinais vitais')) {
          // Buscar o id do registro de sinais vitais existente
          let sinaisId = null;
          try {
            const getRes = await axios.get(`http://127.0.0.1:8005/api/sinais-vitais/triagem/${sinaisPayload.triagem_id || triagemCompletada.id}`, { headers });
            const sinaisExistente = extractSinais(getRes.data);
            sinaisId = sinaisExistente?.id || sinaisExistente?.sinais_vitais_id || null;
          } catch (getErr) {
            console.error('Erro ao buscar sinais vitais existentes para update:', getErr);
          }
          if (sinaisId) {
            try {
              const putRes = await axios.put(`http://127.0.0.1:8005/api/sinais-vitais/${sinaisId}`, sinaisPayload, { headers });
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
            id: created.id || created.triagem_id || pacienteSelecionado.id,
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

          setLocalTriagensRealizadas(prev => [normalized, ...prev]);
          setLocalTriagensPendentes(prev => prev.filter(p => p.id !== pacienteSelecionado.id));
          message.success('Triagem realizada e registrada no servidor (Sinais Vitais) com sucesso!');
          
          // refresh triagens from server to keep UI in sync (com pequeno delay para dar tempo do backend processar)
          try { 
            await new Promise(resolve => setTimeout(resolve, 500));
            if (typeof refreshAll === 'function') await refreshAll(); 
          } catch(e){ 
            console.warn('Falha ao dar refresh nas triagens:', e); 
          }
        } else {
          setLocalTriagensRealizadas(prev => [triagemCompletada, ...prev]);
          setLocalTriagensPendentes(prev => prev.filter(p => p.id !== pacienteSelecionado.id));
          message.success('Triagem realizada (registrada localmente).');
        }

        setIsModalVisible(false);
        setActiveTab('2');
      } catch (err) {
        console.error('Erro ao criar triagem no servidor (sinais-vitais):', err);
        console.error('Response status:', err.response?.status, 'data:', err.response?.data || err.message);
        // show validation errors from server if available
        const resp = err.response?.data;

        // If triagem_id was invalid, try to create a triagem record and retry once
        if (resp && resp.errors && resp.errors.triagem_id) {
          try {
            const triagemPayload = {
              paciente_id: sinaisPayload.paciente_id,
              // Prefer any solicitacao_triagem_id we have from sinaisPayload or selected paciente
              triagem_id: sinaisPayload.triagem_id || pacienteSelecionado?.TriagemId || pacienteSelecionado?.triagem_id || null,
              // estado_urgencia is required by the triagem-service validations
              estado_urgencia: sinaisPayload.estado_urgencia || pacienteSelecionado?.estadoUrgencia || pacienteSelecionado?.estado_urgencia || 'normal',
              tipo_triagem: sinaisPayload.tipo_triagem || 'inicial',
              data_triagem: new Date().toISOString(),
              observacoes: sinaisPayload.observacoes || null,
              status: 'triagem_concluida'
            };
            console.log('🔁 triagem_id inválido — criando triagem (assegurando solicitacao):', triagemPayload);

            // Ensure we have a solicitacao_triagem_id — create via Patient Service if missing
            if (!triagemPayload.triagem_id) {
              try {
                const solicitacaoUrl = 'http://127.0.0.1:8002/api/solicitacoes-triagem';
                console.log('🔁 criando solicitacao de triagem no Patient Service:', { paciente_id: triagemPayload.paciente_id, urgencia: triagemPayload.estado_urgencia });
                const solRes = await axios.post(solicitacaoUrl, {
                  paciente_id: triagemPayload.paciente_id,
                  urgencia: triagemPayload.estado_urgencia || 'normal',
                  observacoes: triagemPayload.observacoes || null
                }, { headers });
                console.log('🔁 Resposta solicitacao:', solRes?.data);
                const solicitacaoObj = solRes.data?.solicitacao || solRes.data?.data || solRes.data || null;
                const solicitacaoId = solicitacaoObj?.id || solicitacaoObj?.solicitacao_id || null;
                if (solicitacaoId) {
                  triagemPayload.triagem_id = solicitacaoId;
                  console.log('🔁 Usando solicitacao_triagem_id criada:', solicitacaoId);
                } else {
                  console.warn('🔁 Não foi possível extrair id da solicitacao criada:', solicitacaoObj);
                }
              } catch (solErr) {
                console.error('Falha ao criar solicitacao de triagem:', solErr?.response?.data || solErr.message || solErr);
              }
            }

            const createdTriRes = await triagemService.createTriagem(triagemPayload, token);
            console.log('🔁 Resposta createTriagem:', createdTriRes);
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
              
              // Atualizar status da triagem recém-criada ANTES de criar sinais vitais
              try {
                console.log('🔁 Atualizando status da triagem recém-criada ANTES de criar sinais vitais:', newTriId);
                await triagemService.updateTriagemStatus(newTriId, 'triagem_concluida', token);
                console.log('✅ Status da triagem atualizado para triagem_concluida (retry)');
              } catch (statusErr) {
                console.error('⚠️ Erro ao atualizar status da triagem (retry):', statusErr);
                // Continuar mesmo se falhar
              }
              
              console.log('🔁 Reenviando sinais-vitais com novo triagem_id:', sinaisPayload.triagem_id);
              try {
                const retryRes = await axios.post('http://127.0.0.1:8005/api/sinais-vitais', sinaisPayload, { headers });
                const createdRetry = extractSinais(retryRes.data);
                if (createdRetry) {
                  const normalized = {
                    ...pacienteSelecionado, // Incluir dados do paciente original
                    ...createdRetry,
                    id: createdRetry.id || createdRetry.triagem_id || pacienteSelecionado.id,
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

                  setLocalTriagensRealizadas(prev => [normalized, ...prev]);
                  setLocalTriagensPendentes(prev => prev.filter(p => p.id !== pacienteSelecionado.id));
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
        setLocalTriagensRealizadas(prev => [triagemCompletada, ...prev]);
        setLocalTriagensPendentes(prev => prev.filter(p => p.id !== pacienteSelecionado.id));
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
      const token = localStorage.getItem('token');
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

        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        console.log('📤 Atualizando sinais-vitais:', sinaisUpdate, 'id:', pacienteSelecionado.id);
        const res = await axios.put(`http://127.0.0.1:8005/api/sinais-vitais/${pacienteSelecionado.id}`, sinaisUpdate, { headers });

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

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

    // Payload para enviar ao backend (campos conforme esperado pela API)
    const payload = {
      nid: nid, // Campo obrigatório no backend
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
      console.log('📤 Agendando consulta para paciente NID:', nid, 'payload:', payload);
      
      const response = await axios.post(
        `http://localhost:8005/api/triagens/agendar-consulta`,
        payload,
        { headers }
      );

      console.log('✅ Consulta agendada com sucesso:', response.data);

      // Extrair dados do agendamento retornado pelo backend
      const agendamentoData = response.data?.data?.agendamento || response.data?.agendamento || {};
      const consultaData = response.data?.data?.consulta || response.data?.consulta || {};

      // Usar o ID correto do paciente original, não da triagem
      const consulta = {
        ...pacienteSelecionado,
        ...values,
        id: agendamentoData.paciente_id || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
        pacienteId: agendamentoData.paciente_id || pacienteSelecionado.pacienteId || pacienteSelecionado.id,
        nid: agendamentoData.nid || pacienteSelecionado.nid,
        nome: agendamentoData.nome || pacienteSelecionado.nome,
        apelido: agendamentoData.apelido || pacienteSelecionado.apelido,
        especialidade,
        especialidade_id,
        medico: agendamentoData.medico || medico,
        dataConsulta: agendamentoData.data_consulta || dataConsulta,
        horaConsulta: agendamentoData.hora_consulta || horaConsulta,
        tipoConsulta: agendamentoData.tipo_consulta || values.tipoConsulta,
        motivoConsulta: values.motivoConsulta,
        observacoes: values.observacoes,
        status: agendamentoData.status || 'aguardando_consulta',
        prioridade: agendamentoData.prioridade || null,
        dataAgendamento: new Date().toLocaleString(),
        // IDs do backend
        agendamentoId: agendamentoData.id || null,
        codigoAgendamento: agendamentoData.codigo_agendamento || null,
        consultaId: consultaData.id || null,
        triagemId: agendamentoData.triagem_id || pacienteSelecionado.triagem_id || null,
      };

      setConsultasPendentes([...consultasPendentes, consulta]);

      // Remover da lista de triagens pendentes usando o ID correto
      setLocalTriagensPendentes(triagensPendentes.filter(p => p.id !== pacienteSelecionado.id));

      setIsAgendarModalVisible(false);
      message.success('Consulta agendada com sucesso!');

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
    { title: 'Código Triagem', dataIndex: 'triagem_id', key: 'triagem_id' },
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
            style={{ background: '#faad14' }}
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
                    count={pacientesTriagemPendente.length} 
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
              <Button type="primary" htmlType="submit" icon={<EditOutlined />} style={{ background: '#faad14' }}>
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