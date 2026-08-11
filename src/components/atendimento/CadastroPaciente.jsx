import React, { useState, useEffect, useCallback } from 'react';
import usePacientes from '../../hooks/usePacientes';
import usePatientReferenceData from '../../hooks/usePatientReferenceData';
import useParentes from '../../hooks/useParentes';
import useUtentesAutonomos from '../../hooks/useUtentesAutonomos';
import useSolicitacaoExames from '../../hooks/useSolicitacaoExames';
import triagemService from '../../services/triagemService';
import { API_BASE } from '../../services/apiConfig';
import { invalidateCachedRequest } from '../../services/requestCache';
import { subscribeClinicalEvents } from '../../services/clinicalRealtime';
import { getWorkflowStatus, isWorkflowActive } from '../../utils/patientWorkflowStatus';
import axios from 'axios';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Select,
  DatePicker,
  Row,
  Col,
  Upload,
  message,
  Steps,
  Card,
  Checkbox,
  Switch,
  Radio,
  Tabs,
  Typography,
  Alert,
  notification,

} from 'antd';
import { PlusOutlined, EditOutlined, SolutionOutlined, UploadOutlined, SearchOutlined, UserOutlined, DeleteOutlined, EyeOutlined, MedicineBoxOutlined, PlusSquareOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const sameId = (left, right) => String(left ?? '') === String(right ?? '');
const getCurrentYear = () => dayjs().year();

const FIELD_LABELS = {
  data_nascimento: 'Data de nascimento',
  nome: 'Nome',
  apelido: 'Apelido',
  genero: 'Gênero',
  celular: 'Celular',
  bilhete_identidade: 'Número do documento',
  nid: 'NID'
};

const translateValidationMessage = (field, messageText) => {
  if (field === 'data_nascimento' && /before today/i.test(messageText)) {
    return 'A data de nascimento deve ser anterior à data de hoje.';
  }

  if (field === 'data_nascimento' && /must be a date/i.test(messageText)) {
    return 'A data de nascimento deve ser uma data válida.';
  }

  if (field === 'nid' && /formato XXXX\/YYYY/i.test(messageText)) {
    return 'Use o formato 0000/AAAA, por exemplo 0030/2026.';
  }

  return messageText;
};

const getNidParts = (nid) => {
  const match = String(nid || '').trim().match(/^(\d{4})\/(\d{4})$/);
  if (!match) return null;
  return {
    numero: Number(match[1]),
    ano: Number(match[2])
  };
};

const getNidYear = (nid) => getNidParts(nid)?.ano || null;

const validateNid = (_, value) => {
  const nid = String(value || '').trim();
  if (!nid) return Promise.resolve();

  const currentYear = getCurrentYear();
  const parts = getNidParts(nid);

  if (!parts) {
    return Promise.reject(new Error(`Use o formato 0000/${currentYear}, por exemplo 0001/${currentYear}.`));
  }

  if (parts.numero <= 0) {
    return Promise.reject(new Error('O número do NID deve ser maior que zero.'));
  }

  if (parts.ano > currentYear) {
    return Promise.reject(new Error(`O ano do NID não pode ser superior a ${currentYear}.`));
  }

  return Promise.resolve();
};

const formatValidationErrors = (errors) => Object.entries(errors)
  .flatMap(([field, messages]) => {
    const label = FIELD_LABELS[field] || field;
    const list = Array.isArray(messages) ? messages : [messages];
    return list.map((messageText) => `${label}: ${translateValidationMessage(field, String(messageText))}`);
  })
  .join(' ');

const getApiErrorDescription = (error, fallback) => {
  const validationErrors = error?.response?.data?.errors || error?.errors;
  if (validationErrors) {
    return formatValidationErrors(validationErrors);
  }

  if (error?.response?.status === 401) return 'A sua sessão expirou. Entre novamente no sistema.';
  if (error?.response?.status === 403) return 'Não tem permissão para executar esta operação.';
  if (!error?.response && error?.message) return error.message || 'Não foi possível comunicar com o servidor. Verifique a ligação e tente novamente.';
  return error?.response?.data?.message || error?.message || fallback;
};

const showApiError = (title, error, fallback = 'Tente novamente.') => {
  notification.error({
    message: title,
    description: getApiErrorDescription(error, fallback),
    placement: 'topRight',
    duration: 6
  });
};

const CadastroPaciente = () => {


  // Hook para carregar pacientes do backend e operações CRUD
  const {
    pacientes: apiPacientes,
    loading: pacientesLoading,
    error: pacientesError,
    pagination: pacientesPagination,
    carregarPacientes,
    criarPaciente,
    atualizarPaciente
  } = usePacientes();


  const {
    utentesAutonomos = [], // Lista de utentes autônomos
    criarUtenteAutonomo,
    atualizarUtenteAutonomo,
    obterProximoNID
    // loading: utenteLoading = false // REMOVIDO: não utilizado
  } = useUtentesAutonomos();

  // ===== ESTADOS LOCAIS TEMPORÁRIOS (substituindo ClinicContext) =====
  const [pacientes, setPacientes] = useState(apiPacientes || []);
  // const [pacientesLocal, setPacientesLocal] = useState(apiPacientes || []); // REMOVIDO: não utilizado
  const [triagensPendentes, setTriagensPendentes] = useState([]);
  const [triagensPendentesCarregadas, setTriagensPendentesCarregadas] = useState(false);
  const [triagensRealizadas, setTriagensRealizadas] = useState([]);
  const [pacientesTransferidosEspecialidade, setPacientesTransferidosEspecialidade] = useState([]);
  const [consultasPendentes, setConsultasPendentes] = useState([]);
  const [consultasRealizadas] = useState([]); // Restaurado: é utilizado em várias partes

  // Dados de exames pendentes vindos da API (patient-service :8002)
  const {
    solicitacoes: examesPendentes,
    fetchSolicitacoes,
    confirmarExames,
    rejeitarSolicitacao,
    processarPagamento,
    agendarColheita,
    // cancelarSolicitacao,
    loading: loadingExamesPendentes,
    // loadingAcao: loadingAcaoExames
  } = useSolicitacaoExames();

  const {
    racas: patientServiceRacas,
    tiposUtentes: patientServiceTiposUtentes,
    unidadesOrganicas: patientServiceUnidadesOrganicas,
    tiposDocumentos: patientServiceTiposDocumentos,
    provincias: patientServiceProvincias,
    distritos: patientServiceDistritos,
    bairros: patientServiceBairros,
    grausParentesco: patientServiceGrausParentesco,
    loading: loadingPatientServiceConfig,
    loadingDistritos,
    loadingBairros,
    error: referenceDataError,
    reload: carregarConfiguracoesPatientService,
    loadDistritos,
    loadBairros
  } = usePatientReferenceData();

  useEffect(() => {
    if (referenceDataError) {
      showApiError(
        'Não foi possível carregar os dados dos formulários',
        referenceDataError,
        'Recarregue os dados e tente novamente.'
      );
    }
  }, [referenceDataError]);

  const getFirstFilled = useCallback((source, fields = []) => {
    for (const field of fields) {
      const value = source?.[field];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }, []);

  const resolveReferenceName = useCallback((items, id, fallback, directName) => {
    if (directName) return directName;
    const item = Array.isArray(items) ? items.find((entry) => sameId(entry.id, id)) : null;
    return item?.nome || item?.name || item?.label || fallback || '-';
  }, []);

  const getRacaNome = useCallback((record) => {
    const racaId = getFirstFilled(record, ['raca_id', 'racaId']);
    return resolveReferenceName(
      patientServiceRacas,
      racaId,
      record?.raca_nome || record?.raca?.nome || record?.raca || racaId,
      record?.raca_nome || record?.raca?.nome
    );
  }, [getFirstFilled, patientServiceRacas, resolveReferenceName]);

  const getTipoUtenteId = useCallback((record) => (
    getFirstFilled(record, ['tipo_utente_id', 'tipoUtenteId']) || record?.tipo_utente?.id
  ), [getFirstFilled]);

  const getTipoUtenteNome = useCallback((recordOrId) => {
    const isObject = typeof recordOrId === 'object' && recordOrId !== null;
    const tipoUtenteId = isObject ? getTipoUtenteId(recordOrId) : recordOrId;
    const directName = isObject
      ? (recordOrId.tipo_utente_nome || recordOrId.tipo_utente?.nome)
      : null;
    const fallback = isObject
      ? (recordOrId.tipoUtente && !sameId(recordOrId.tipoUtente, tipoUtenteId) ? recordOrId.tipoUtente : tipoUtenteId)
      : tipoUtenteId;

    return resolveReferenceName(patientServiceTiposUtentes, tipoUtenteId, fallback, directName);
  }, [getTipoUtenteId, patientServiceTiposUtentes, resolveReferenceName]);

  const getTipoUtenteById = useCallback((tipoUtenteId) => (
    Array.isArray(patientServiceTiposUtentes)
      ? patientServiceTiposUtentes.find((tipo) => sameId(tipo.id, tipoUtenteId))
      : null
  ), [patientServiceTiposUtentes]);

  const matchesPaciente = useCallback((item, paciente) => {
    const pacienteId = paciente?.id;
    const pacienteNid = paciente?.nid;
    const itemPacienteId = getFirstFilled(item, ['paciente_id', 'pacienteId']) || item?.paciente?.id;
    const itemPacienteNid = getFirstFilled(item, ['paciente_nid', 'pacienteNid', 'nid']) || item?.paciente?.nid;

    return (pacienteId && itemPacienteId && sameId(itemPacienteId, pacienteId)) ||
      (pacienteNid && itemPacienteNid && sameId(itemPacienteNid, pacienteNid));
  }, [getFirstFilled]);

  const isActiveWorkflowStatus = (status) => isWorkflowActive(status);

  const showFormValidationError = (errorInfo, title = 'Verifique os campos do formulário') => {
    const fields = errorInfo?.errorFields || [];
    notification.warning({
      message: title,
      description: fields.length
        ? fields.map((field) => field.errors?.[0]).filter(Boolean).join(' ')
        : 'Preencha os campos obrigatórios antes de continuar.',
      placement: 'topRight',
      duration: 6
    });
  };

  // Alias para manter compatibilidade com o código existente
  // Sincronizar estado local com dados da API
  useEffect(() => {
    if (apiPacientes) {
      setPacientes(apiPacientes);
    }
  }, [apiPacientes]);

  const atualizarPacienteLocal = useCallback((pacienteId, patch) => {
    setPacientes(prev => prev.map(p => (
      sameId(p.id, pacienteId) ? { ...p, ...patch } : p
    )));
  }, []);

  // Carregar solicitações de exames ao montar o componente
  useEffect(() => {
    fetchSolicitacoes();
  }, [fetchSolicitacoes]);

  // ===== HANDLERS PARA CARREGAMENTO EM CASCATA =====
  
  /**
   * Handler para mudança de província - carrega distritos automaticamente
   */
  const handleProvinciaChange = useCallback(async (provinciaId, targetForm) => {
    targetForm.setFieldsValue({ distrito: undefined, bairro: undefined });
    try {
      await loadDistritos(provinciaId);
    } catch (error) {
      showApiError('Erro ao carregar distritos', error);
    }
  }, [loadDistritos]);

  /**
   * Handler para mudança de distrito - carrega bairros automaticamente
   */
  const handleDistritoChange = useCallback(async (distritoId, targetForm) => {
    targetForm.setFieldsValue({ bairro: undefined });
    try {
      await loadBairros(distritoId);
    } catch (error) {
      showApiError('Erro ao carregar bairros', error);
    }
  }, [loadBairros]);

  // ❌ REMOVIDO: Sincronização com ClinicContext
  // Agora usa apenas apiPacientes do hook usePacientes que vem direto do backend

  // ✅ Usando dados diretamente do backend via usePacientes
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTriagemModalVisible, setIsTriagemModalVisible] = useState(false);
  const [triagemPaciente, setTriagemPaciente] = useState(null);
  const [criandoSolicitacaoTriagem, setCriandoSolicitacaoTriagem] = useState(false);

  useEffect(() => {
    let mounted = true;

    const carregarTriagensPendentesReais = async () => {
      try {
        const response = await triagemService.getTriagens({ status: 'aguardando_triagem', per_page: 1000 });
        const lista = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response)
              ? response
              : [];

        if (mounted) {
          setTriagensPendentes(lista);
        }
      } catch (error) {
        if (mounted) {
          setTriagensPendentes([]);
        }
      } finally {
        if (mounted) {
          setTriagensPendentesCarregadas(true);
        }
      }
    };

    const shouldRefreshTriagens = (keyPrefix = '') => (
      !keyPrefix ||
      keyPrefix.startsWith('clinical-data:') ||
      keyPrefix.startsWith('pacientes:') ||
      keyPrefix.startsWith('consultas:')
    );

    const handleCacheInvalidated = (event) => {
      const keyPrefix = event?.detail?.keyPrefix || '';
      if (shouldRefreshTriagens(keyPrefix)) {
        carregarTriagensPendentesReais();
      }
    };

    const unsubscribeClinicalEvents = subscribeClinicalEvents((event) => {
      const keyPrefix = event?.payload?.keyPrefix || '';
      if (shouldRefreshTriagens(keyPrefix)) {
        carregarTriagensPendentesReais();
      }
    });

    carregarTriagensPendentesReais();
    window.addEventListener('request-cache-invalidated', handleCacheInvalidated);

    return () => {
      mounted = false;
      window.removeEventListener('request-cache-invalidated', handleCacheInvalidated);
      unsubscribeClinicalEvents();
    };
  }, []);
  const [urgenciaTriagem, setUrgenciaTriagem] = useState(null);
  const [observacoesTriagem, setObservacoesTriagem] = useState('');
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [activeTab, setActiveTab] = useState('1'); // Estado para controlar a aba ativa

  // Estados para Utentes Autônomos
  const [isUtenteAutonomoModalVisible, setIsUtenteAutonomoModalVisible] = useState(false);
  const [editingUtenteAutonomo, setEditingUtenteAutonomo] = useState(null);
  const [utenteAutonomoForm] = Form.useForm();

  // Estado para o modal de seleção de exames
  const [isExameModalVisible, setIsExameModalVisible] = useState(false);
  const [selectedUtente, setSelectedUtente] = useState(null);
  const [exameForm] = Form.useForm();

  // Estados para o modal de pagamento de especialidade
  const [isPagamentoModalVisible, setIsPagamentoModalVisible] = useState(false);
  const [pacientePagamento, setPacientePagamento] = useState(null);
  const [pagamentoForm] = Form.useForm();

  // Estados para o modal de detalhes do paciente
  const [isDetalhesModalVisible, setIsDetalhesModalVisible] = useState(false);
  const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

  // Estados para o modal de pagamento de consulta regular
  const [isPagamentoRegularModalVisible, setIsPagamentoRegularModalVisible] = useState(false);
  const [pacientePagamentoRegular, setPacientePagamentoRegular] = useState(null);
  const [pagamentoRegularForm] = Form.useForm();

  // Estados para configurações de pagamento do backend
  const [metodosPagamento, setMetodosPagamento] = useState([]);
  const [tiposConsulta, setTiposConsulta] = useState([]); // Sempre inicializar como array
  const [loadingPagamentoConfig, setLoadingPagamentoConfig] = useState(false);
  const [tiposExames, setTiposExames] = useState([]);
  const [loadingOpcoesClinicas, setLoadingOpcoesClinicas] = useState(false);

  useEffect(() => {
    const carregarOpcoesClinicas = async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) return;

      setLoadingOpcoesClinicas(true);
      try {
        const response = await axios.get(`${API_BASE}/pacientes/tipos-exame`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        const payload = response.data?.data ?? response.data ?? [];
        setTiposExames(Array.isArray(payload) ? payload : []);
      } catch (error) {
        notification.warning({
          message: 'Tipos de exame não carregados',
          description: getApiErrorDescription(error, 'Tente novamente.')
        });
      }
      setLoadingOpcoesClinicas(false);
    };

    carregarOpcoesClinicas();
  }, []);

  // Estados para o modal de pagamento de exames
  const [isPagamentoExameModalVisible, setIsPagamentoExameModalVisible] = useState(false);
  const [examePagamento, setExamePagamento] = useState(null);
  const [pagamentoExameForm] = Form.useForm();

  // Estados para o modal de marcar exames
  const [isMarcarExamesModalVisible, setIsMarcarExamesModalVisible] = useState(false);
  const [exameParaMarcar, setExameParaMarcar] = useState(null);
  const [examesSelecionados, setExamesSelecionados] = useState([]);
  const [marcarExamesForm] = Form.useForm();
  // Estados para o modal de confirmar disponibilidade e preços
  const [isConfirmarExamesModalVisible, setIsConfirmarExamesModalVisible] = useState(false);
  const [exameParaConfirmar, setExameParaConfirmar] = useState(null);
  const [examesParaConfirmar, setExamesParaConfirmar] = useState([]);
  // Estados para o modal de rejeitar solicitação
  const [isRejeitarExameModalVisible, setIsRejeitarExameModalVisible] = useState(false);
  const [exameParaRejeitar, setExameParaRejeitar] = useState(null);
  const [rejeitarExameForm] = Form.useForm();

  // Estados para o modal de histórico de exames
  const [isHistoricoModalVisible, setIsHistoricoModalVisible] = useState(false);
  const [utenteHistorico, setUtenteHistorico] = useState(null);

  // Estado para forçar re-renderização da tabela
  const [forceUpdate, setForceUpdate] = useState(0);

  // Efeito para forçar atualização quando utentes autônomos mudarem
  React.useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [utentesAutonomos]);

  // Move selectedProvincia to the main component scope
  const [selectedProvincia, setSelectedProvincia] = useState(null);

  // Estado para rastrear consultas já processadas
  const [consultasProcessadas, setConsultasProcessadas] = useState(new Set());

  // Estado para rastrear se o usuário já fez alterações no formulário de edição
  const [userHasChangedFormValues, setUserHasChangedFormValues] = useState(false);

  // 🔍 Função para testar configurações do Configuration Service

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  
  // Função para carregar configurações de pagamento dos endpoints específicos
  const carregarConfiguracoesPagemento = useCallback(async () => {
    if (metodosPagamento.length > 0) {
      return;
    }

    setLoadingPagamentoConfig(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        return;
      }


      const metodosResponse = await fetch(`${API_BASE}/pacientes/metodos-pagamento`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Carregar tipos de consulta
      const tiposResponse = await fetch(`${API_BASE}/pacientes/tipos-consulta`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (metodosResponse.ok) {
        const metodosJson = await metodosResponse.json();
        const metodosData = metodosJson?.data || metodosJson || [];
        const metodosArray = Array.isArray(metodosData) ? metodosData : [];
        setMetodosPagamento(metodosArray);
      } else {
        setMetodosPagamento([]);
      }

      if (tiposResponse.ok) {
        const tiposJson = await tiposResponse.json();
        const tiposData = tiposJson?.data ?? tiposJson ?? [];
        setTiposConsulta(Array.isArray(tiposData) ? tiposData : []);
      } else {
        setTiposConsulta([]);
      }

    } catch (error) {
      setMetodosPagamento([]);
      setTiposConsulta([]);
      showApiError('Erro ao carregar configurações de pagamento', error);
    } finally {
      setLoadingPagamentoConfig(false);
    }
  }, [metodosPagamento.length]);

  // Carregar configurações de pagamento quando o componente monta
  useEffect(() => {
    carregarConfiguracoesPagemento();
  }, [carregarConfiguracoesPagemento]);
  
  // Função auxiliar para buscar valor usando dados já carregados (fallback)
  const buscarValorFallback = useCallback((tipoConsultaId, tipoUtenteId) => {
    // Verificação de segurança: garantir que tiposConsulta seja um array
    if (!Array.isArray(tiposConsulta)) {
      return null;
    }
    
    // Primeiro, verificar se é estudante bolseiro (isento)
    const tipoUtente = getTipoUtenteById(tipoUtenteId);
    if (tipoUtente?.codigo === 'EST-B') {
      return '0';
    }
    
    // Buscar valor nos tipos de consulta já carregados
    const tipoConsulta = tiposConsulta.find(t => 
      t.id === tipoConsultaId || t.codigo === tipoConsultaId
    );
    
    if (tipoConsulta && tipoConsulta.valor_default) {
      return tipoConsulta.valor_default.toString();
    }
    return null; // Não retornar valor fixo, forçar busca no backend
  }, [tiposConsulta, getTipoUtenteById]);

  // Função para buscar valor da consulta com base no tipo de consulta e tipo de utente
  const buscarValorConsulta = useCallback(async (tipoConsultaId, tipoUtenteId) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        return buscarValorFallback(tipoConsultaId, tipoUtenteId);
      }
      const verificarResponse = await fetch(`${API_BASE}/pacientes/verificar-preco-disponivel?tipo_consulta=${tipoConsultaId}&tipo_utente_id=${tipoUtenteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (verificarResponse.ok) {
        const check = await verificarResponse.json();
        if (!check.disponivel) {
          throw new Error(`Preço da consulta não configurado no sistema: ${check.message}`);
        }
        const response = await fetch(`${API_BASE}/pacientes/valor-consulta?tipo_consulta=${tipoConsultaId}&tipo_utente_id=${tipoUtenteId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const resultado = await response.json();
          const valor = resultado.data?.valor || resultado.valor || resultado.valor_consulta;
          if (valor) {
            return valor.toString();
          } else {
            return buscarValorFallback(tipoConsultaId, tipoUtenteId);
          }
        } else {
          return buscarValorFallback(tipoConsultaId, tipoUtenteId);
        }
      } else {
        const response = await fetch(`${API_BASE}/pacientes/valor-consulta?tipo_consulta_id=${tipoConsultaId}&tipo_utente_id=${tipoUtenteId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const resultado = await response.json();
          return resultado.valor || resultado.valor_consulta || buscarValorFallback(tipoConsultaId, tipoUtenteId);
        } else {
          return buscarValorFallback(tipoConsultaId, tipoUtenteId);
        }
      }
    } catch (error) {
      if (error.message.includes('Preço da consulta não configurado')) {
        throw error;
      }
      return buscarValorFallback(tipoConsultaId, tipoUtenteId);
    }
  }, [buscarValorFallback]);

  // Função para verificar se método de pagamento é isenção E se o paciente é estudante bolseiro
  const isMetodoIsencao = useCallback((metodoPagamento, tipoUtenteId = null) => {
    if (!metodoPagamento) return false;
    
    const metodo = metodoPagamento.toLowerCase();
    const isMetodoIsencaoValido = metodo === 'isencao' || metodo === 'isenção' || metodo.includes('isen');
    if (isMetodoIsencaoValido && tipoUtenteId) {
      return tipoUtenteId === 2;
    }
    return false;
  }, []);

  // Função para validar se o valor foi carregado corretamente do backend
  const validarValorBackend = useCallback((valor, tipoConsultaId, tipoUtenteId, metodoPagamento = null) => {
    // Se for isenção E o paciente for estudante bolseiro, não precisa validar valor
    if (metodoPagamento && isMetodoIsencao(metodoPagamento, tipoUtenteId)) {
      return true;
    }
    if (!valor || valor === null || valor === undefined || valor === '') {
      return false;
    }
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      return false;
    }
    return true;
  }, [isMetodoIsencao]);

  // Função para lidar com mudança do método de pagamento
  const handleMetodoPagamentoChange = useCallback(async (metodoPagamento, form, tipoConsulta, tipoUtenteId) => {
    const isEstudanteBolseiro = tipoUtenteId === 2;
    if (isMetodoIsencao(metodoPagamento, tipoUtenteId)) {
      form.setFieldsValue({ valor: '0' });
    } else if (metodoPagamento && metodoPagamento.toLowerCase().includes('isen') && !isEstudanteBolseiro) {
      message.warning('Isenção de pagamento disponível apenas para estudantes bolseiros.');
      form.setFieldsValue({ metodoPagamento: null, valor: '' });
    } else {
      if (tipoConsulta && tipoUtenteId) {
        try {
          const valor = await buscarValorConsulta(tipoConsulta, tipoUtenteId);
          if (valor && valor !== '0') {
            form.setFieldsValue({ valor: valor.toString() });
          } else {
            form.setFieldsValue({ valor: '' });
          }
        } catch (error) {
          form.setFieldsValue({ valor: '' });
        }
      }
    }
  }, [isMetodoIsencao, buscarValorConsulta]);
  

  
  // Carregar pacientes transferidos para especialidade sempre da API
  const carregarPacientesTransferidosEspecialidade = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setPacientesTransferidosEspecialidade([]);
        return;
      }

      const response = await axios.get(`${API_BASE}/pacientes/transferidos-especialidade`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      // Extrair dados da resposta paginada do Laravel
      let transferidosData = [];
      
      if (response.data) {
        // Formato: { status: "success", data: { data: [...] } } (paginação Laravel)
        if (response.data.status === 'success' && response.data.data && response.data.data.data) {
          transferidosData = response.data.data.data;
        }
        // Formato alternativo: { data: { data: [...] } }
        else if (response.data.data && Array.isArray(response.data.data.data)) {
          transferidosData = response.data.data.data;
        }
        // Formato: { data: [...] }
        else if (response.data.data && Array.isArray(response.data.data)) {
          transferidosData = response.data.data;
        }
        // Formato: [...]
        else if (Array.isArray(response.data)) {
          transferidosData = response.data;
        }
      }
      
      // Normalizar dados para o formato esperado pelo frontend
      const transferidosNormalizados = transferidosData.map(consulta => {
        const historico = consulta.transferencia_historico?.[0];
        const especialidadeAnterior = consulta.especialidade_anterior || 
                                       historico?.especialidade_origem || 
                                       'N/A';
        const dataTransferencia = historico?.data_transferencia || 
                                   consulta.created_at;
        return {
          // IDs
          id: consulta.paciente?.id || consulta.paciente_id,
          paciente_id: consulta.paciente_id,
          consulta_id: consulta.id,
          agendamento_id: consulta.agendamento_id,
          triagem_id: consulta.triagem_id,
          
          // Dados do paciente
          nid: consulta.paciente?.nid || consulta.nid,
          nome: consulta.paciente?.nome,
          apelido: consulta.paciente?.apelido,
          genero: consulta.paciente?.genero,
          data_nascimento: consulta.paciente?.data_nascimento,
          telefone: consulta.paciente?.telefone,
          email: consulta.paciente?.email,
          
          // Dados da consulta/transferência
          especialidade: consulta.especialidade,
          especialidade_destino: consulta.especialidade,
          especialidade_anterior: especialidadeAnterior,
          especialidadeAnterior: especialidadeAnterior, // Para compatibilidade com dataIndex
          especialidade_id: consulta.especialidade_id,
          medico: consulta.medico,
          medico_id: consulta.medico_id,
          medico_anterior: consulta.medico_anterior,
          
          // Status e datas
          status: consulta.status,
          status_pagamento: consulta.status_pagamento,
          data_consulta: consulta.data_consulta,
          hora_consulta: consulta.hora_consulta,
          data_transferencia: dataTransferencia,
          dataTransferencia: dataTransferencia, // Para compatibilidade com dataIndex
          prioridade: consulta.prioridade,
          transferido: consulta.transferido,
          
          // Informações adicionais
          motivo_transferencia: consulta.motivo_transferencia,
          motivo_consulta: consulta.motivo_consulta,
          observacoes: consulta.observacoes,
          tipo_consulta: consulta.tipo_consulta,
          tipo_consulta_id: consulta.tipo_consulta_id,
          valor_consulta: consulta.valor_consulta,
          forma_pagamento: consulta.forma_pagamento,
          data_pagamento: consulta.data_pagamento,
          
          // Histórico de transferência
          transferencia_historico: consulta.transferencia_historico,
          
          // Objeto paciente completo para referência
          pacienteCompleto: consulta.paciente
        };
      });
      
      setPacientesTransferidosEspecialidade(transferidosNormalizados);
    } catch (error) {
      setPacientesTransferidosEspecialidade([]);
    }
  }, []);

  // Carregar pacientes transferidos quando o componente monta e a cada 30 segundos

  const openCreateModal = async () => {
    setCurrentStep(0);
    setFormValues({});
    setIsModalVisible(true);
  };
  const [searchText, setSearchText] = useState('');

  // Função para verificar se o paciente pode fazer uma nova consulta
  const podeRealizarNovaConsulta = (paciente) => {
    // Se não tem histórico de consultas, pode fazer
    if (!paciente.ultimoCicloTerminado) {
      return { pode: true, motivo: '' };
    }

    // Encontrar a última consulta finalizada deste paciente
    const ultimaConsultaFinalizada = consultasRealizadas
      .filter(c => (c.id === paciente.id || c.pacienteId === paciente.id) &&
        (c.status === 'alta' || c.status === 'obito' || c.status === 'transferido'))
      .sort((a, b) => new Date(b.dataConsulta) - new Date(a.dataConsulta))[0];

    if (!ultimaConsultaFinalizada) {
      return { pode: true, motivo: '' };
    }

    const agora = new Date();
    const dataUltimaConsulta = new Date(ultimaConsultaFinalizada.dataConsulta);
    const diferencaHoras = (agora - dataUltimaConsulta) / (1000 * 60 * 60);
    const diferencaMinutos = (agora - dataUltimaConsulta) / (1000 * 60);

    // Regras de tempo mínimo entre consultas:
    // - Alta: 2 horas mínimo
    // - Transferido: 1 hora mínimo
    // - Óbito: não permite nova consulta no mesmo dia

    if (ultimaConsultaFinalizada.status === 'obito') {
      return {
        pode: false,
        motivo: 'Paciente com registro de óbito não pode fazer nova consulta.'
      };
    }

    const tempoMinimoHoras = ultimaConsultaFinalizada.status === 'alta' ? 2 : 1;

    if (diferencaHoras < tempoMinimoHoras) {
      const tempoRestante = Math.ceil((tempoMinimoHoras * 60) - diferencaMinutos);
      return {
        pode: false,
        motivo: `Deve aguardar ${tempoRestante} minutos desde a última consulta (${ultimaConsultaFinalizada.status}) para nova consulta.`
      };
    }

    return { pode: true, motivo: '' };
  };

  // Função para verificar se o paciente pode fazer consulta de acompanhamento
  const podeRealizarConsultaAcompanhamento = (paciente) => {
    // Verificar se tem acompanhamento disponível
    if (!paciente.temAcompanhamentoDisponivel) {
      return {
        pode: false,
        motivo: 'Paciente não tem consulta de acompanhamento disponível.'
      };
    }

    // Verificar se ainda está dentro do prazo de 7 dias
    if (paciente.dataLimiteAcompanhamento) {
      const agora = new Date();
      const dataLimite = new Date(paciente.dataLimiteAcompanhamento);
      
      if (agora > dataLimite) {
        return {
          pode: false,
          motivo: 'Prazo para consulta de acompanhamento expirou (máximo 7 dias após alta).'
        };
      }
    }

    // Verificar se já não fez uma consulta de acompanhamento
    const consultaAcompanhamentoJaRealizada = consultasRealizadas.some(c => 
      (c.id === paciente.id || c.pacienteId === paciente.id) && 
      c.tipoConsulta === 'acompanhamento' &&
      c.dataConsulta > paciente.ultimoCicloTerminado
    );

    if (consultaAcompanhamentoJaRealizada) {
      return {
        pode: false,
        motivo: 'Paciente já realizou consulta de acompanhamento para este ciclo.'
      };
    }

    return { pode: true, motivo: '' };
  };

  // Função para verificar o status atual do paciente
  const obterStatusPaciente = (paciente) => {
    // Verificar se está em triagem pendente. Não comparar t.id com paciente.id:
    // t.id é o ID da solicitação de triagem, não o ID do paciente.
    const emTriagem = triagensPendentes.find(t =>
      matchesPaciente(t, paciente) && isActiveWorkflowStatus(t.status || t.estado || t.situacao)
    );

    if (emTriagem) {
      const workflow = getWorkflowStatus(emTriagem);
      return {
        status: workflow.key,
        texto: workflow.label,
        cor: workflow.color,
        desabilitado: true,
        urgencia: emTriagem.estadoUrgencia
      };
    }

    // Verificar se está em consulta pendente
    const emConsulta = consultasPendentes.find(c =>
      matchesPaciente(c, paciente) && isActiveWorkflowStatus(c.status || c.estado || c.situacao || 'em_consulta')
    );

    if (emConsulta) {
      const workflow = getWorkflowStatus(emConsulta);
      return {
        status: workflow.key,
        texto: workflow.label,
        cor: workflow.color,
        desabilitado: true,
        especialidade: emConsulta.especialidade,
        medico: emConsulta.medicoNome || emConsulta.medico
      };
    }

    const workflowPaciente = getWorkflowStatus(paciente);
    const statusPersistido = paciente?.status || paciente?.estadoAtual || paciente?.estado_atual;
    const statusTriagemPersistidoSemFilaReal = ['aguardando_triagem', 'em_triagem'].includes(workflowPaciente.key)
      && triagensPendentesCarregadas
      && !emTriagem;
    const deveRespeitarStatusPersistido = Boolean(statusPersistido)
      && !['ativo', 'disponivel'].includes(workflowPaciente.key)
      && !statusTriagemPersistidoSemFilaReal;

    if (deveRespeitarStatusPersistido) {
      return {
        status: workflowPaciente.key,
        texto: workflowPaciente.label,
        cor: workflowPaciente.color,
        desabilitado: workflowPaciente.active || workflowPaciente.terminal,
        motivo: paciente?.motivo,
        observacao: paciente?.observacoes || paciente?.observacao,
        especialidade: paciente?.especialidade,
        medico: paciente?.medico || paciente?.medicoNome
      };
    }

    // NOVA LÓGICA: Verificar se tem consulta finalizada mas ciclo não terminado
    // (consultas apenas com exames que não terminaram o ciclo)
    const consultaComCicloAberto = consultasRealizadas.find(c => 
      matchesPaciente(c, paciente) &&
      c.deveTerminarCiclo === false && // Ciclo não foi terminado
      c.deveFinalizarConsulta === true // Mas a consulta foi finalizada
    );

    // Verificar se paciente está aguardando exames solicitados
    // CORREÇÃO: Melhorar ainda mais a detecção de pacientes aguardando exames
    const consultaAguardandoExames = consultasPendentes.find(c =>
      matchesPaciente(c, paciente) &&
      (c.aguardandoExames === true || c.statusExames === 'pendente' || c.examesEmAndamento === true)
    );

    // Verificar também nas consultas realizadas com vários status possíveis
    const consultaRealizadaComExamesPendentes = consultasRealizadas.find(c =>
      matchesPaciente(c, paciente) && (
        c.aguardandoExames === true || 
        c.status === 'aguardando_exames' || 
        c.status === 'finalizada_com_exames' ||
        c.statusExames === 'pendente' ||
        c.tipoFinalizacao === 'so_exames' ||
        (c.temExames && !c.temPrescricao)
      )
    );

    // Verificar também nas triagens realizadas se existem exames concluídos
    // que estão retornando para consulta
    const examesConcluidos = triagensRealizadas.find(t =>
      matchesPaciente(t, paciente) && (
        t.status === 'exames_concluidos' &&
        t.resultadosExames && 
        t.retornoConsulta === true &&
        !t.jaConsultado
      )
    );

    // Verificar também no objeto do próprio paciente
    const pacienteComExameFlag = paciente.aguardandoExames === true && 
                                paciente.statusPagamentoConsulta === 'pago';

    // Verificar também se o paciente está em consulta com retorno de exames
    const consultaRetornoExames = consultasPendentes.find(c =>
      matchesPaciente(c, paciente) && 
      c.retornoComExames === true
    );
    
    // CORREÇÃO: Dar prioridade ao status de aguardando exames ou com exames concluídos sobre outros status
    if (consultaAguardandoExames || consultaRealizadaComExamesPendentes || pacienteComExameFlag || examesConcluidos || consultaRetornoExames) {
      // Determinar a referência de consulta a usar (priorizar retorno com exames)
      const consultaRef = consultaRetornoExames || consultaAguardandoExames || consultaRealizadaComExamesPendentes || examesConcluidos || paciente;
      
      // Determinar se o paciente está aguardando exames ou retornando com resultados
      const estaRetornandoComExames = (examesConcluidos && examesConcluidos.resultadosExames) || consultaRetornoExames;
      
      // CORREÇÃO: Verificar se o paciente já está em consulta de retorno com exames
      const jaEstaEmConsultaRetorno = consultaRetornoExames && consultaRetornoExames.retornoComExames === true;
      
      return {
        status: jaEstaEmConsultaRetorno ? 'em_consulta_retorno' : 'em_consulta',
        texto: 'Em Consulta',
        cor: estaRetornandoComExames ? '#52c41a' : '#1890ff', // Verde para retorno, azul para aguardando
        desabilitado: true,
        especialidade: consultaRef.especialidade,
        medico: consultaRef.medico || consultaRef.medicoNome,
        observacao: estaRetornandoComExames ? 'Retornando com resultados de exames' : 'Aguardando resultados de exames'
      };
    }
    
    if (consultaComCicloAberto) {
      return {
        status: 'em_consulta',
        texto: 'Em Consulta',
        cor: '#52c41a',
        desabilitado: true,
        especialidade: consultaComCicloAberto.especialidade,
        medico: consultaComCicloAberto.medico || consultaComCicloAberto.medicoNome,
        observacao: 'Aguardando prescrições após exames'
      };
    }

    if (paciente.statusPagamentoConsulta !== 'pago') {
      const workflow = getWorkflowStatus(paciente, { forceKey: 'pagamento_pendente' });
      return {
        status: workflow.key,
        texto: workflow.label,
        cor: workflow.color,
        desabilitado: false,
      };
    }

    // Verificar se pode fazer nova consulta
    const verificacao = podeRealizarNovaConsulta(paciente);
    if (!verificacao.pode) {
      return {
        status: 'bloqueado',
        texto: 'Aguardar',
        cor: '#ff4d4f',
        desabilitado: true,
        motivo: verificacao.motivo
      };
    }

    // Status normal - pode marcar triagem
    return {
      status: 'disponivel',
      texto: 'Triagem',
      cor: '#52c41a',
      desabilitado: false
    };
  };

  const getTriagemPaciente = (paciente) => (
    triagensPendentes.find((triagem) => matchesPaciente(triagem, paciente)) ||
    null
  );

  const podeGerarBoletimConsulta = (paciente) => {
    const statusPaciente = obterStatusPaciente(paciente);
    const statusAtual = statusPaciente.status;

    if (!statusAtual || ['ativo', 'disponivel', 'inativo'].includes(statusAtual)) {
      return false;
    }

    const triagemAtiva = Boolean(getTriagemPaciente(paciente));
    const consultaAtiva = consultasPendentes.some(c =>
      matchesPaciente(c, paciente) && isActiveWorkflowStatus(c.status || c.estado || c.situacao || 'em_consulta')
    );
    const pagamento = paciente?.ultimoPagamento || paciente?.dados_pagamento || paciente?.pagamento || paciente?.pagamento_consulta || {};
    const statusPagamento = String(
      paciente?.statusPagamentoConsulta ||
      paciente?.status_pagamento ||
      pagamento?.status ||
      pagamento?.estado_pagamento ||
      ''
    ).toLowerCase();
    const temPagamentoConfirmado = ['pago', 'isento'].some(status => statusPagamento.includes(status)) ||
      pagamento?.isencao_aplicada === true ||
      Boolean(pagamento?.numero_recibo || pagamento?.referencia || paciente?.referenciaPagamento);

    const statusComProcesso = [
      'aguardando_triagem',
      'em_triagem',
      'triagem_concluida',
      'aguardando_consulta',
      'em_consulta',
      'em_consulta_retorno',
      'aguardando_prescricao',
      'aguardando_exames',
      'retorno_exames'
    ].includes(statusAtual);

    return triagemAtiva || consultaAtiva || (statusComProcesso && temPagamentoConfirmado);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const gerarBoletimConsulta = (paciente) => {
    const statusPaciente = obterStatusPaciente(paciente);
    const triagem = getTriagemPaciente(paciente);
    const pagamento = paciente?.ultimoPagamento || paciente?.dados_pagamento || paciente?.pagamento || paciente?.pagamento_consulta || {};
    const nomeCompleto = [paciente?.nome, paciente?.apelido].filter(Boolean).join(' ') || 'Utente';
    const nid = paciente?.nid || paciente?.NID || '-';
    const prioridade = triagem?.prioridade
      || triagem?.prioridade_atendimento
      || triagem?.classificacao_risco
      || triagem?.urgencia
      || triagem?.estadoUrgencia
      || triagem?.estado_urgencia
      || statusPaciente?.urgencia
      || paciente?.prioridade
      || paciente?.urgencia
      || '-';
    const estadoUtente = statusPaciente?.texto || getWorkflowStatus(paciente).label || paciente?.status || '-';
    const dataTriagem = triagem?.created_at || triagem?.data_criacao || triagem?.dataTriagem || new Date();
    const dataFormatada = dayjs(dataTriagem).isValid()
      ? dayjs(dataTriagem).format('DD/MM/YYYY HH:mm')
      : dayjs().format('DD/MM/YYYY HH:mm');

    const tipoConsultaId = paciente?.tipoConsultaId || paciente?.tipo_consulta_id || paciente?.tipoConsultaRegular || pagamento?.tipo_consulta_id;
    const tipoConsulta = tiposConsulta.find((tipo) => sameId(tipo.id, tipoConsultaId) || sameId(tipo.codigo, tipoConsultaId));
    const tipoConsultaNome = paciente?.tipoConsultaNome || paciente?.tipo_consulta_nome || tipoConsulta?.nome || tipoConsulta?.descricao || tipoConsultaId || 'Consulta Geral';

    const metodoPagamentoId = paciente?.metodoPagamentoRegular || paciente?.metodo_pagamento_id || pagamento?.metodo_pagamento_id || pagamento?.metodo_pagamento?.id || pagamento?.metodo_pagamento;
    const metodoPagamento = metodosPagamento.find((metodo) => sameId(metodo.id, metodoPagamentoId) || sameId(metodo.codigo, metodoPagamentoId));
    const pagamentoIsento = [
      paciente?.statusPagamentoConsulta,
      paciente?.status_pagamento,
      pagamento?.status,
      pagamento?.estado_pagamento,
      pagamento?.metodo,
      pagamento?.metodo_pagamento_nome,
      pagamento?.metodo_pagamento?.nome,
      metodoPagamento?.nome,
      metodoPagamento?.codigo,
    ].some((value) => String(value || '').toLowerCase().includes('isen')) || pagamento?.isencao_aplicada === true;

    const metodoPagamentoNome = pagamentoIsento
      ? 'Isento'
      : (paciente?.metodoPagamentoNome
        || pagamento?.metodo_pagamento_nome
        || pagamento?.metodo
        || pagamento?.metodo_pagamento?.nome
        || metodoPagamento?.nome
        || metodoPagamentoId
        || '-');

    const valorPago = paciente?.valorConsultaRegular ?? paciente?.valor_consulta ?? pagamento?.valor ?? pagamento?.valor_pago ?? pagamento?.valor_consulta ?? 0;
    const referenciaPagamento = paciente?.referenciaPagamento
      || pagamento?.numero_recibo
      || pagamento?.referencia
      || pagamento?.referencia_pagamento
      || pagamento?.numero_referencia
      || pagamento?.codigo_pagamento
      || '-';
    const dataPagamento = paciente?.dataPagamentoConsulta
      || paciente?.data_pagamento
      || pagamento?.data_pagamento
      || pagamento?.data_pagamento_formatada
      || pagamento?.created_at
      || paciente?.updated_at;
    const dataPagamentoFormatada = dataPagamento && dayjs(dataPagamento, ['YYYY-MM-DD HH:mm:ss', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm'], true).isValid()
      ? dayjs(dataPagamento, ['YYYY-MM-DD HH:mm:ss', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm']).format('DD/MM/YYYY HH:mm')
      : (dataPagamento && dayjs(dataPagamento).isValid() ? dayjs(dataPagamento).format('DD/MM/YYYY HH:mm') : '-');
    const estadoPagamento = pagamentoIsento ? 'Isento' : (paciente?.statusPagamentoConsulta || paciente?.status_pagamento || pagamento?.estado_pagamento || pagamento?.status || 'Pago');

    const janela = window.open('', '_blank', 'width=900,height=1000');
    if (!janela) {
      notification.warning({
        message: 'Não foi possível abrir o boletim',
        description: 'Autorize pop-ups para esta página e tente novamente.'
      });
      return;
    }

    const renderVia = (tituloVia) => `
      <section class="copy">
        <div class="header">
          <img class="logo" src="/assets/images/UEM.png" alt="Logo UEM" />
          <div class="clinic-block">
            <h1>BOLETIM DE CONSULTA</h1>
            <p>Universidade Eduardo Mondlane - Faculdade de Medicina</p>
            <p>Clínica Universitária</p>
            <p>Av. Salvador Allende, 702, Maputo - Moçambique</p>
            <p>Tel: +258 21 428076 | E-mail: clinica@medicina.uem.mz</p>
          </div>
          <div class="copy-badge">${escapeHtml(tituloVia)}</div>
        </div>

        <div class="section-title">Dados do Utente</div>
        <div class="grid">
          <div class="field"><span>NID</span><strong>${escapeHtml(nid)}</strong></div>
          <div class="field"><span>Utente</span><strong>${escapeHtml(nomeCompleto)}</strong></div>
          <div class="field"><span>Tipo de Utente</span><strong>${escapeHtml(getTipoUtenteNome(paciente) || '-')}</strong></div>
          <div class="field"><span>Estado do Utente</span><strong>${escapeHtml(estadoUtente)}</strong></div>
        </div>

        <div class="section-title">Consulta e Triagem</div>
        <div class="grid">
          <div class="field"><span>Tipo de Consulta</span><strong>${escapeHtml(tipoConsultaNome)}</strong></div>
          <div class="field"><span>Prioridade</span><strong>${escapeHtml(prioridade)}</strong></div>
          <div class="field"><span>Data/Hora da Triagem</span><strong>${escapeHtml(dataFormatada)}</strong></div>
          <div class="field"><span>Observações</span><strong>${escapeHtml(triagem?.observacoes || 'Sem observações registadas.')}</strong></div>
        </div>

        <div class="section-title">Informações de Pagamento</div>
        <div class="grid">
          <div class="field"><span>Estado do Pagamento</span><strong>${escapeHtml(estadoPagamento)}</strong></div>
          <div class="field"><span>Método de Pagamento</span><strong>${escapeHtml(metodoPagamentoNome)}</strong></div>
          <div class="field"><span>Valor Pago</span><strong>MT ${escapeHtml(valorPago)}</strong></div>
          <div class="field"><span>Referência</span><strong>${escapeHtml(referenciaPagamento)}</strong></div>
          <div class="field"><span>Data/Hora do Pagamento</span><strong>${escapeHtml(dataPagamentoFormatada)}</strong></div>
          <div class="field"><span>Emitido em</span><strong>${escapeHtml(dayjs().format('DD/MM/YYYY HH:mm'))}</strong></div>
        </div>

        <div class="signature-grid">
          <div><div class="line"></div><strong>Recepção</strong></div>
          <div><div class="line"></div><strong>Enfermagem / Triagem</strong></div>
        </div>
      </section>
    `;

    janela.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Boletim de Consulta - ${escapeHtml(nid)}</title>
          <style>
            @page { size: A4 landscape; margin: 7mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; line-height: 1.18; font-size: 10px; }
            .toolbar { text-align: right; margin-bottom: 5px; }
            .toolbar button { padding: 6px 12px; border: 0; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
            .sheet { width: 100%; height: 196mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
            .copy { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; height: 196mm; overflow: hidden; }
            .copy + .copy { border-left: 2px dashed #9ca3af; }
            .header { display: flex; align-items: center; border-bottom: 1.5px solid #333; padding-bottom: 5px; margin-bottom: 5px; gap: 8px; }
            .logo { width: 48px; height: 48px; object-fit: contain; }
            .clinic-block { flex: 1; text-align: center; }
            .clinic-block h1 { font-size: 13px; margin: 0 0 2px; color: #111827; }
            .clinic-block p { margin: 0; font-size: 8.5px; color: #444; }
            .copy-badge { border: 1px solid #2563eb; color: #2563eb; font-weight: 700; border-radius: 999px; padding: 3px 7px; font-size: 10px; }
            .section-title { margin: 5px 0 3px; padding: 3px 6px; background: #f3f4f6; border-left: 3px solid #1890ff; font-weight: 700; font-size: 9px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
            .field { border: 1px solid #e5e7eb; border-radius: 4px; padding: 4px 5px; min-height: 25px; overflow: hidden; }
            .field span { display: block; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 1px; }
            .field strong { font-size: 9.3px; color: #111827; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center; margin-top: 9px; font-size: 9px; }
            .line { height: 20px; border-bottom: 1px solid #333; margin-bottom: 3px; }
            @media print {
              body { padding: 0; }
              .toolbar { display: none; }
              .sheet, .copy { break-inside: avoid; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
          <main class="sheet">
            ${renderVia('Original')}
            ${renderVia('Cópia')}
          </main>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
  };

  // Função para resetar paciente ao estado inicial após ciclo terminado
  const resetarPacienteEstadoInicial = (pacienteId, dataFinalizacao = null, consultaFinalizada = null) => {

    
    // CORREÇÃO: Log de debug mais detalhado para diagnóstico
    if (consultaFinalizada) {
    }
    
    // CORREÇÃO: Log específico para consultas de retorno com exames
    if (consultaFinalizada && consultaFinalizada.retornoComExames === true) {
      
      if (consultaFinalizada.temPrescricao === true) {
      }
    }

    // CORREÇÃO: Verificar se paciente tem exames pendentes antes de resetar
    const temExamesPendentes = consultaFinalizada && consultaFinalizada.aguardandoExames;
    
    // CORREÇÃO: Buscar paciente pelo NID primeiro se disponível
    const nidConsulta = consultaFinalizada && consultaFinalizada.nid;
    
    // Verificar também se tem resultados de exames recém-concluídos que precisam ser consultados
    const temExamesConcluidos = triagensRealizadas.some(t => 
      // Tentar identificar por NID primeiro, depois por IDs numéricos
      (nidConsulta && t.nid === nidConsulta) ||
      ((t.id === pacienteId || t.pacienteId === pacienteId) &&
      t.status === 'exames_concluidos' && 
      t.resultadosExames &&
      !t.jaConsultado)
    );

    // CORREÇÃO: Determinar se este é um retorno com exames que deve finalizar o ciclo
    const isRetornoComExamesEPrescricao = consultaFinalizada && 
                                        consultaFinalizada.retornoComExames === true &&
                                        consultaFinalizada.temPrescricao === true;
                                        
    // CORREÇÃO 2: Verificar também o campo deveTerminarCiclo, que tem precedência
    const deveFinalizarCicloExplicitamente = consultaFinalizada && 
                                            consultaFinalizada.deveTerminarCiclo === true;
    
    // Decidir se finalizamos o ciclo baseado nas duas condições
    if (isRetornoComExamesEPrescricao || deveFinalizarCicloExplicitamente) {
      
      // Atualizar os exames para que sejam marcados como consultados
      if (temExamesConcluidos) {
        setTriagensRealizadas(prev => prev.map(t => {
          // CORREÇÃO: Identificar por NID se disponível, depois por IDs
          const matchByNid = nidConsulta && t.nid === nidConsulta;
          const matchById = (t.id === pacienteId) || (t.pacienteId === pacienteId);
          
          if ((matchByNid || matchById) && t.status === 'exames_concluidos' && !t.jaConsultado) {
            return { ...t, jaConsultado: true };
          }
          return t;
        }));
      }
    } 
    // Se tem exames pendentes/concluídos e não deveria terminar o ciclo, não resetar o paciente
    else if (temExamesPendentes || temExamesConcluidos ||
        (consultaFinalizada && consultaFinalizada.deveTerminarCiclo === false && !isRetornoComExamesEPrescricao)) {
      return; // Sair sem resetar
    }

    // CORREÇÃO: Já temos o nidConsulta definido acima, então não precisamos redeclará-lo
    
    const updatedPacientes = pacientes.map(p => {
      // CORREÇÃO: Primeiro tentar identificar por NID se disponível, depois por IDs numéricos
      if ((nidConsulta && p.nid === nidConsulta) || (p.id === pacienteId) || (p.pacienteId === pacienteId)) {
        
        // Verificar se a consulta teve prescrição para habilitar acompanhamento
        const temPrescricao = consultaFinalizada && consultaFinalizada.temPrescricao;
        const dataLimiteAcompanhamento = consultaFinalizada && consultaFinalizada.dataLimiteAcompanhamento;
        
        const pacienteResetado = {
          ...p,
          // Resetar para estado inicial - precisa pagar nova consulta
          estadoAtual: 'aguardando_pagamento',
          statusPagamentoConsulta: undefined, // Volta a mostrar "Pagar Consulta"
          dataPagamentoConsulta: undefined,
          valorConsultaRegular: undefined,
          metodoPagamentoRegular: undefined,
          // Limpar dados específicos de ciclos anteriores
          especialidade: undefined,
          medico: undefined,
          medicoId: undefined,
          especialidadeAnterior: undefined,
          medicoAnterior: undefined,
          dataTransferencia: undefined,
          motivoTransferencia: undefined,
          observacoesTransferencia: undefined,
          aguardandoExames: undefined,
          statusExames: undefined,
          // Marcar como ciclo terminado para controle com data específica
          ultimoCicloTerminado: dataFinalizacao || new Date().toLocaleString(),
          // Dados para consulta de acompanhamento (se houve prescrição)
          temAcompanhamentoDisponivel: temPrescricao || false,
          dataLimiteAcompanhamento: dataLimiteAcompanhamento || null,
          ultimaConsultaComPrescricao: temPrescricao ? (consultaFinalizada || null) : null,
          // Adicionar histórico de consultas finalizadas
          historicoConsultas: [
            ...(p.historicoConsultas || []),
            {
              dataFinalizacao: dataFinalizacao || new Date().toLocaleString(),
              cicloId: Date.now(),
              temPrescricao: temPrescricao || false
            }
          ]
        };
        
        // CORREÇÃO: Verificar explicitamente se o ciclo foi finalizado para João Silva (debugging)
        if (pacienteResetado.nome === 'João Silva') {

        }

        return pacienteResetado;
      }
      return p; // CORREÇÃO: sempre retornar o paciente (original ou modificado)
    });
    setPacientes(updatedPacientes);
    
    // CORREÇÃO: Debug para João Silva após atualizar o estado
    
    // CORREÇÃO: Verificar explicitamente João Silva no array de pacientes atualizados
    const joaoNoEstado = updatedPacientes.find(p => p.nome === 'João Silva' || p.nid === '0001/2023');
    if (joaoNoEstado) {
    }

    // Remover o paciente da lista de triagens pendentes
    const updatedTriagens = triagensPendentes.filter(t => {
      const shouldRemove = t.id === pacienteId || t.pacienteId === pacienteId;
      if (shouldRemove) {
      }
      return !shouldRemove;
    });
    setTriagensPendentes(updatedTriagens);

    // Remover o paciente da lista de consultas pendentes
    const updatedConsultasPendentes = consultasPendentes.filter(c => {
      const shouldRemove = c.id === pacienteId || c.pacienteId === pacienteId;
      if (shouldRemove) {
      }
      return !shouldRemove;
    });
    setConsultasPendentes(updatedConsultasPendentes);
  };


  const openEditModal = async (paciente) => {
    setEditingPaciente(paciente);
    // Garantir que os campos de data sejam dayjs ou null
    const pacienteProcessado = {
      ...paciente,
      dataNascimento: getDayjsOrNull(paciente.dataNascimento),
      dataValidade: getDayjsOrNull(paciente.dataValidade)
    };

    setCurrentPaciente(pacienteProcessado);
    setAcompanhanteStep(0);
    setAcompanhanteFormValues({});
    setUserHasChangedFormValues(false); // Resetar estado de alterações
    setIsEditModalVisible(true);
    
    // Garantir que as opções estejam carregadas antes de preencher o formulário
    if (patientServiceRacas.length === 0) {
      carregarConfiguracoesPatientService();
    }

    const provinciaId = paciente.provincia_id ?? paciente.provinciaId;
    const distritoId = paciente.distrito_id ?? paciente.distritoId;
    try {
      if (provinciaId) await loadDistritos(provinciaId);
      if (distritoId) await loadBairros(distritoId);
    } catch (error) {
      showApiError('Erro ao carregar a localização do paciente', error);
    }
  };
  
  const handleCreate = async (values) => {
    try {
      if (loadingPatientServiceConfig) {
        notification.info({
          message: 'Dados do formulário ainda estão a carregar',
          description: 'Aguarde alguns instantes antes de concluir o cadastro.'
        });
        return;
      }

      const configBackend = {
        racas: patientServiceRacas,
        tipos_utentes: patientServiceTiposUtentes,
        unidades_organicas: patientServiceUnidadesOrganicas,
        tipos_documentos: patientServiceTiposDocumentos,
        provincias: patientServiceProvincias,
        graus_parentesco: patientServiceGrausParentesco
      };
      const tipoUtenteId = values.tipoUtente === undefined
        ? null
        : Number(values.tipoUtente);

      if (configBackend.racas.length === 0) {
        notification.error({
          message: 'Não é possível concluir o cadastro',
          description: 'A lista de raças não foi carregada. Atualize os dados do formulário e tente novamente.'
        });
        return;
      }
      
      // 🔥 IMPORTANTE: Criar um objeto COMPLETAMENTE NOVO para evitar misturar camelCase e snake_case
      // Não usar spread operator que pode trazer campos desnecessários
      const dadosPaciente = {};
      
      // ==================== INFORMAÇÕES PESSOAIS ====================
      // NID (opcional) - Se fornecido, usar o valor do usuário; senão, backend auto-gera
      if (values.nid?.trim()) {
        const nidNormalizado = values.nid.trim();
        const anoNid = getNidYear(nidNormalizado);

        const anoAtual = getCurrentYear();
        if (anoNid && anoNid > anoAtual) {
          notification.warning({
            message: 'Ano do NID inválido',
            description: `O ano do NID não pode ser superior a ${anoAtual}. Corrija o NID ou deixe o campo vazio para geração automática.`
          });
          return;
        }

        dadosPaciente.nid = nidNormalizado;
        console.log('✅ NID fornecido manualmente:', dadosPaciente.nid);
      } else {
        console.log('ℹ️ NID não fornecido - será gerado automaticamente pelo backend');
      }
      
      if (values.nome?.trim()) dadosPaciente.nome = values.nome.trim();
      if (values.apelido?.trim()) dadosPaciente.apelido = values.apelido.trim();
      
      // Número de documento (BI) - EXATAMENTE IGUAL AOS UTENTES AUTÔNOMOS
      if (values.bilheteIdentidade) {
        // Debug específico para números alfanuméricos (como passaportes com P)
        console.log('🆔 DEBUG BILHETE IDENTIDADE:', {
          valor: values.bilheteIdentidade,
          tipo: typeof values.bilheteIdentidade,
          length: values.bilheteIdentidade.length,
          temLetras: /[A-Za-z]/.test(values.bilheteIdentidade),
          temNumeros: /[0-9]/.test(values.bilheteIdentidade),
          valorTrim: values.bilheteIdentidade.trim()
        });
        
        dadosPaciente.bilhete_identidade = values.bilheteIdentidade.trim();
        console.log('✅ BILHETE MAPEADO:', dadosPaciente.bilhete_identidade);
      }
      
      // Data de nascimento - SEMPRE em snake_case - VALIDAÇÃO ROBUSTA
      console.log('🔍 DEBUG data_nascimento DETALHADO:', {
        'values.dataNascimento': values.dataNascimento,
        'typeof': typeof values.dataNascimento,
        'isDayjs': dayjs.isDayjs(values.dataNascimento),
        'isString': typeof values.dataNascimento === 'string',
        'isDate': values.dataNascimento instanceof Date,
        'valorTruncado': String(values.dataNascimento).substring(0, 50)
      });

      if (values.dataNascimento) {
        try {
          let dataFormatada = null;
          
          if (dayjs.isDayjs(values.dataNascimento)) {
            // Se é um objeto dayjs
            dataFormatada = values.dataNascimento.format('YYYY-MM-DD');
            console.log('✅ Processada como dayjs:', dataFormatada);
          } else if (values.dataNascimento instanceof Date) {
            // Se é um objeto Date nativo
            dataFormatada = dayjs(values.dataNascimento).format('YYYY-MM-DD');
            console.log('✅ Processada como Date nativo:', dataFormatada);
          } else if (typeof values.dataNascimento === 'string') {
            // Se é string, tentar converter
            const dayjsObj = dayjs(values.dataNascimento);
            if (dayjsObj.isValid()) {
              dataFormatada = dayjsObj.format('YYYY-MM-DD');
              console.log('✅ Processada como string válida:', dataFormatada);
            } else {
              throw new Error(`String de data inválida: ${values.dataNascimento}`);
            }
          } else {
            // Tentar conversão geral
            const dayjsObj = dayjs(values.dataNascimento);
            if (dayjsObj.isValid()) {
              dataFormatada = dayjsObj.format('YYYY-MM-DD');
              console.log('✅ Processada por conversão geral:', dataFormatada);
            } else {
              throw new Error(`Formato de data não reconhecido: ${typeof values.dataNascimento}`);
            }
          }
          
          if (dataFormatada && dataFormatada !== 'Invalid date') {
            if (!dayjs(dataFormatada).isBefore(dayjs().startOf('day'), 'day')) {
              message.error('A data de nascimento deve ser anterior à data de hoje.');
              return;
            }

            dadosPaciente.data_nascimento = dataFormatada;
            console.log('✅ data_nascimento CONFIRMADA:', dadosPaciente.data_nascimento);
          } else {
            throw new Error('Data formatada é inválida');
          }
        } catch (error) {
          console.error('❌ Erro ao processar data_nascimento:', error);
          console.error('❌ Valor problemático:', values.dataNascimento);
          message.error(`Erro: Data de nascimento inválida (${error.message}). Selecione uma data válida.`);
          return;
        }
      } else {
        console.error('❌ CAMPO OBRIGATÓRIO: values.dataNascimento não foi fornecido');
        console.error('❌ Todos os campos do form:', Object.keys(values));
        message.error('Erro: Campo "Data de Nascimento" é obrigatório. Por favor, selecione uma data.');
        return;
      }
      
      // Outros campos obrigatórios
      if (values.genero) dadosPaciente.genero = values.genero;
      
      // Campos opcionais
      if (values.estadoCivil) dadosPaciente.estado_civil = values.estadoCivil;
      if (values.nacionalidade) dadosPaciente.nacionalidade = values.nacionalidade;
      
      // ==================== CONFIGURAÇÕES DO BACKEND ====================
      // Usar configurações diretas do backend
      const racasValidasBackend = configBackend?.racas || [];
      const tiposUtentesValidosBackend = configBackend?.tipos_utentes || [];
      const unidadesOrganicasValidasBackend = configBackend?.unidades_organicas || [];
      const tiposDocumentoValidosBackend = configBackend?.tipos_documentos || [];
      
      console.log('🔧 Configurações carregadas do backend (porta 8002):', {
        racas: racasValidasBackend.length,
        tipos_utentes: tiposUtentesValidosBackend.length,
        unidades_organicas: unidadesOrganicasValidasBackend.length,
        tipos_documento: tiposDocumentoValidosBackend.length
      });
      
      // VALIDAÇÃO CRÍTICA: Verificar se configurações foram carregadas
      if (racasValidasBackend.length === 0) {
        console.error('❌ ERRO CRÍTICO: Nenhuma raça foi carregada do backend');
        message.error('Erro: Configurações de raças não disponíveis. Por favor, recarregue a página ou contate o suporte.');
        return;
      }
      
      console.log('✅ Configurações do backend validadas:', {
        primeiraRaca: racasValidasBackend[0],
        ultimaRaca: racasValidasBackend[racasValidasBackend.length - 1],
        todasRacas: racasValidasBackend.map(r => `${r.id}: ${r.nome}`)
      });
      
      if (racasValidasBackend.length === 0) {
        console.error('❌ ERRO: Configurações de raças não disponíveis no backend');
        message.error('Erro: Configurações de raças não disponíveis. Tente novamente.');
        return;
      }
      
      // ==================== VALIDAÇÃO DE RAÇA COM DADOS DO BACKEND ====================
      console.log('🎨 Debug detalhado de raças:', {
        valorRecebido: values.raca,
        tipoValor: typeof values.raca,
        racasDisponiveisBackend: racasValidasBackend?.map(r => ({id: r.id, nome: r.nome})) || []
      });
      
      // � NOVA ABORDAGEM: Usar configurações já carregadas do Configuration Service (porta 8004)
      
      // Usar dados já carregados do Configuration Service
      // REMOVIDO: Usar configurações do frontend, agora usando do backend
      
      // Log já feito acima com as configurações do backend
      
      // ==================== VALIDAÇÃO DE RAÇA (OBRIGATÓRIA E CRÍTICA) ====================
      
      // Verificar se raça foi fornecida
      if (!values.raca) {
        console.error('❌ ERRO: Campo raça não foi fornecido');
        message.error('Erro: O campo Raça é obrigatório. Por favor, selecione uma raça.');
        return;
      }
      
      // Validar e processar raça
      if (!isNaN(values.raca)) {
        const racaId = parseInt(values.raca);
        
        // Buscar raça exata no backend
        const racaExiste = racasValidasBackend?.find(r => sameId(r.id, racaId));
        
        
        if (racaExiste) {
          dadosPaciente.raca_id = racaId;
        } else {
          // Se não encontrou por ID, mostrar erro detalhado
          console.error('❌ RAÇA INVÁLIDA - ID não encontrado no backend');
          console.error('❌ ID procurado:', racaId);
          console.error('❌ IDs disponíveis:', racasValidasBackend?.map(r => r.id));
          
          notification.warning({
            message: 'Raça inválida',
            description: 'Selecione uma raça disponível na lista do formulário.'
          });
          return; // BLOQUEAR criação se raça for inválida
        }
      } else {
        // Se não é número, tentar buscar por nome
        
        const racaPorNome = racasValidasBackend?.find(r => 
          r.nome?.toLowerCase() === String(values.raca).toLowerCase() ||
          r.codigo?.toLowerCase() === String(values.raca).toLowerCase()
        );
        
        if (racaPorNome) {
          dadosPaciente.raca_id = racaPorNome.id;
        } else {
          console.error('❌ RAÇA INVÁLIDA - Não encontrada por nome');
          console.error('❌ Nome procurado:', values.raca);
          console.error('❌ Nomes disponíveis:', racasValidasBackend?.map(r => r.nome));
          
          notification.warning({
            message: 'Raça inválida',
            description: 'Selecione uma raça disponível na lista do formulário.'
          });
          return; // BLOQUEAR criação se raça for inválida
        }
      }
      
      // ==================== VALIDAÇÃO DE TIPO UTENTE COM DADOS DO BACKEND ====================

      
      if (tipoUtenteId && !isNaN(tipoUtenteId)) {
        const tipoUtenteExiste = tiposUtentesValidosBackend?.find(t => sameId(t.id, tipoUtenteId));
        if (tipoUtenteExiste) {
          dadosPaciente.tipo_utente_id = parseInt(tipoUtenteId);
        } else {
          notification.warning({
            message: 'Tipo de utente inválido',
            description: 'Selecione novamente o tipo de utente.'
          });
          return;
        }
      } else {
        console.warn('⚠️ TIPO UTENTE NÃO FORNECIDO - campo vazio ou inválido');
        console.warn('⚠️ Campo será deixado como null (pode causar erro de validação no backend)');
        // Não adicionar tipo_utente_id se não foi fornecido
      }
      
      // ==================== VALIDAÇÃO DE UNIDADE ORGÂNICA COM DADOS DO BACKEND ====================
      if (values.unidadeOrganica && !isNaN(values.unidadeOrganica)) {
        const unidadeExiste = unidadesOrganicasValidasBackend?.find(u => sameId(u.id, values.unidadeOrganica));
        if (unidadeExiste) {
          dadosPaciente.unidade_organica_id = parseInt(values.unidadeOrganica);
        } else {
          notification.warning({
            message: 'Unidade orgânica inválida',
            description: 'Selecione novamente a unidade orgânica.'
          });
          return;
        }
      }
      
      // ==================== VALIDAÇÃO DE TIPO DOCUMENTO COM DADOS DO BACKEND ====================
      if (values.tipoDocumento && !isNaN(values.tipoDocumento)) {
        const tipoDocExiste = tiposDocumentoValidosBackend?.find(d => d.id === parseInt(values.tipoDocumento));
        if (tipoDocExiste) {
          dadosPaciente.tipo_documento_id = parseInt(values.tipoDocumento);
        } else {
          console.warn('⚠️ TIPO DOCUMENTO não encontrado, ignorando campo');
          // Não adicionar tipo_documento_id se não for válido
        }
      }

      
      // ==================== INFORMAÇÕES DE CONTATO ====================
      // Celular é obrigatório
      if (values.celular?.replace(/\D/g, '')) dadosPaciente.celular = values.celular.replace(/\D/g, '');
      
      // Contatos opcionais
      const celularAlternativo = (values.celularAlternativo || values.celularalternativo)?.replace(/\D/g, '');
      if (celularAlternativo) dadosPaciente.celular_alternativo = celularAlternativo;
      
      if (values.email?.trim()) dadosPaciente.email = values.email.trim().toLowerCase();
      if (values.whatsApp?.replace(/\D/g, '')) dadosPaciente.whatsapp = values.whatsApp.replace(/\D/g, '');
      
      // ==================== ENDEREÇO ====================
      // Província pode ser string ou ID
      if (values.provincia) {
        if (!isNaN(values.provincia)) {
          dadosPaciente.provincia_id = parseInt(values.provincia);
        } else {
          // Se for string, enviar como está para o backend processar
          dadosPaciente.provincia = values.provincia;
        }
      }
      
      
      if (values.distrito && !isNaN(values.distrito)) {
        dadosPaciente.distrito_id = parseInt(values.distrito);
      } else {
        console.warn('⚠️ Distrito NÃO foi configurado:', values.distrito);
      }
      
      if (values.bairro && !isNaN(values.bairro)) {
        dadosPaciente.bairro_id = parseInt(values.bairro);
      } else {
        console.warn('⚠️ Bairro NÃO foi configurado:', values.bairro);
      }
      
      if (values.avenidaRuaCelula?.trim()) dadosPaciente.avenida_rua_celula = values.avenidaRuaCelula.trim();
      if (values.numeroCasa?.trim()) dadosPaciente.numero_casa = values.numeroCasa.trim();
      if (values.quarteirao?.trim()) dadosPaciente.quarteirao = values.quarteirao.trim();
      
      // ==================== INFORMAÇÕES DE FAMILIAR ====================
      if (values.nomeFamiliar?.trim()) dadosPaciente.nome_familiar = values.nomeFamiliar.trim();
      if (values.unidadeOrganicaFamiliar && !isNaN(values.unidadeOrganicaFamiliar)) {
        dadosPaciente.unidade_organica_familiar_id = parseInt(values.unidadeOrganicaFamiliar);
      }
      
      // ==================== UNIDADES ORGÂNICAS ADICIONAIS (DOCENTE) ====================
      if (values.unidadeOrganicaDocente && Array.isArray(values.unidadeOrganicaDocente)) {
        dadosPaciente.unidades_organicas_docente = values.unidadeOrganicaDocente.map(id => parseInt(id));
      }
      
      // ==================== DOCUMENTO ====================
      if (values.documentoPath) dadosPaciente.documento_path = values.documentoPath;
      
      // ==================== STATUS ====================
      // Sempre definir status para novos pacientes
      dadosPaciente.status = 'ativo';
      
      // ==================== OBSERVAÇÕES ====================
      if (values.observacoes?.trim()) dadosPaciente.observacoes = values.observacoes.trim();
      
      // Não é necessário adicionar campos em camelCase - apenas snake_case para o Laravel
      // Status padrão já está definido acima
      




      // Testar conectividade com o backend
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        message.error('Token de autenticação não encontrado. Faça login novamente.');
        return;
      }
      
      // Validar campos obrigatórios antes de enviar
      const camposFaltando = [];
      if (!dadosPaciente.nome?.trim()) camposFaltando.push('Nome');
      if (!dadosPaciente.apelido?.trim()) camposFaltando.push('Apelido');  
      if (!dadosPaciente.data_nascimento) {
        console.error('❌ CAMPO OBRIGATÓRIO FALTANDO: data_nascimento não foi processada corretamente');
        console.error('❌ Valor original de dataNascimento:', values.dataNascimento);
        console.error('❌ Todos os values recebidos:', Object.keys(values));
        camposFaltando.push('Data de Nascimento');
      }
      if (!dadosPaciente.genero) camposFaltando.push('Gênero');
      if (!dadosPaciente.celular) camposFaltando.push('Celular');

      if (camposFaltando.length > 0) {
        const mensagem = `Por favor, preencha os seguintes campos obrigatórios: ${camposFaltando.join(', ')}`;
        console.error('❌ Campos obrigatórios faltando:', camposFaltando);
        message.error(mensagem);
        console.error('❌ Validação falhou. Campos faltando:', camposFaltando);
        return;
      }

      
      
      // bilhete_identidade mapeado seguindo a mesma lógica dos utentes autônomos
      
      // Usar o hook para criar o paciente (hook fará conversão para snake_case)
      const resultado = await criarPaciente(dadosPaciente);
      
      if (resultado) {
        // 🆔 Exibir o NID gerado pelo backend
        const nidGerado = resultado.nid || resultado.NID || 'N/A';
        console.log('✅ SUCESSO: Paciente criado com NID:', nidGerado);

        
        message.success({
          content: (
            <div>
              <div>✅ Paciente cadastrado com sucesso!</div>
              <div style={{ marginTop: 8, fontSize: '13px', color: '#1890ff' }}>
                <strong>NID gerado:</strong> {nidGerado}
              </div>
            </div>
          ),
          duration: 5
        });
        
        // Fechar modal e resetar formulário
        setIsModalVisible(false);
        form.resetFields(); // Reseta o formulário do wizard
        setCurrentStep(0);  // Volta para o primeiro step
        setFormValues({});  // Limpa os valores acumulados
      }
      
    } catch (error) {
      const duplicatePaciente = error?.response?.data?.duplicate_paciente;
      const duplicateNid = error?.response?.data?.duplicate_nid;
      if (error?.response?.status === 409 && duplicatePaciente) {
        const duplicateMessage = `Já existe um utente cadastrado com este nome, apelido e data de nascimento${duplicatePaciente.nid ? ` (NID: ${duplicatePaciente.nid})` : ''}.`;
        setCurrentStep(0);
        form.setFields([
          { name: 'nome', errors: [duplicateMessage] },
          { name: 'apelido', errors: ['Confirme se este utente já não está cadastrado.'] },
          { name: 'dataNascimento', errors: ['A combinação de nome, apelido e data de nascimento já existe.'] },
        ]);
      }

      if (error?.response?.status === 409 && duplicateNid) {
        setCurrentStep(0);
        form.setFields([
          { name: 'nid', errors: [`O NID ${duplicateNid.nid} já está cadastrado${duplicateNid.nome_completo ? ` para ${duplicateNid.nome_completo}` : ''}.`] },
        ]);
      }

      showApiError(
        'Não foi possível cadastrar o paciente',
        error,
        'Revise os campos informados e tente novamente.'
      );
    }
  };
  

  // Função para abrir o modal de pagamento da consulta de especialidade
  const handlePagarConsultaEspecialidade = (paciente) => {
    // Converter tipoUtenteId para tipoUtente (string) se necessário
    let pacienteComTipoUtente = { ...paciente };
    
    if (paciente.tipoUtenteId && !paciente.tipoUtente) {
      // Buscar tipo de utente nos dados do Patient Service
      const tipoUtenteObj = patientServiceTiposUtentes?.find(tipo => sameId(tipo.id, paciente.tipoUtenteId));
      
      if (tipoUtenteObj) {
        // Mapear código do backend para string interna
        const codigoParaTipoUtente = {
          'EST-B': 'estudanteBolseiro',
          'EST-NB': 'estudanteNaoBolseiro',
          'DOC': 'docente',
          'FUNC': 'funcionario',
          'COM': 'comunidade',
          'FAM-DOC': 'familiardocente',
          'FAM-FUNC': 'familiarfuncionario',
          'EST-M': 'estudanteMestrado',
          'EST-D': 'estudanteDoutoramento'
        };
        
        pacienteComTipoUtente.tipoUtente = codigoParaTipoUtente[tipoUtenteObj.codigo] || tipoUtenteObj.nome;
      } else {
        notification.warning({
          message: 'Tipo de utente não encontrado',
          description: 'Atualize os dados do paciente antes de processar o pagamento.'
        });
        return;
      }
    }
    
    setPacientePagamento(pacienteComTipoUtente);
    setIsPagamentoModalVisible(true);
    pagamentoForm.resetFields();
  };

  // Função para abrir o modal de detalhes do paciente
  const handleVerDetalhes = (paciente) => {
    setPacienteDetalhes(paciente);
    setIsDetalhesModalVisible(true);
  };
  
  // Função para abrir diagnóstico de erro 500
  
  // Função auxiliar para obter código do tipo de utente por ID
  const obterTipoUtenteCodigoPorId = (tipoUtenteId) => {
    if (!tipoUtenteId) return null;
    
    // Buscar nos dados do Patient Service primeiro
    const tipoUtente = getTipoUtenteById(tipoUtenteId);
    return tipoUtente?.codigo || null;
  };

  // Função para sincronizar paciente faltando com o backend


  // Função para abrir o modal de pagamento da consulta regular
  const handlePagarConsultaRegular = async (paciente) => {
    try {
      // Validação inicial: garantir que os arrays estejam inicializados
      if (!Array.isArray(tiposConsulta)) {
        console.error('❌ tiposConsulta não é array:', tiposConsulta);
        setTiposConsulta([]);
      }
      if (!Array.isArray(metodosPagamento)) {
        console.error('❌ metodosPagamento não é array:', metodosPagamento);
        setMetodosPagamento([]);
      }
      

      
      // Carregar dados de pagamento do backend
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        console.error('❌ Token não encontrado no localStorage');
        message.error('Token de autenticação não encontrado');
        return;
      }

      // Extrair número e ano do NID do paciente
      let numero, ano;
      if (paciente.nid && paciente.nid.includes('/')) {
        const nidParts = paciente.nid.split('/');
        numero = nidParts[0];
        ano = nidParts[1];
      } else {
        console.error('❌ NID inválido ou não encontrado:', paciente.nid);
        throw new Error('NID do paciente é obrigatório para carregar dados de pagamento');
      }
      
      const url = `${API_BASE}/pacientes/nid/${numero}/${ano}/dados-pagamento`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (!response.ok) {
        // Tentar obter mais detalhes do erro
        let errorDetails = '';
        try {
          const errorData = await response.text();
          console.error('📝 Detalhes do erro do servidor:', errorData);
          errorDetails = errorData;
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta de erro:', parseError);
        }
        
        throw new Error(`Erro ao carregar dados de pagamento: ${response.status} - ${response.statusText}${errorDetails ? '\nDetalhes: ' + errorDetails : ''}`);
      }

      const dadosPagamento = await response.json();

      // Configurar dados do paciente com informações do backend
      const pacienteComDadosPagamento = {
        ...paciente,
        ...dadosPagamento.dados_paciente,
        // Priorizar dados do backend, mas usar dados locais como fallback
        tipoUtente: dadosPagamento.dados_paciente?.tipo_utente?.codigo || 
                   obterTipoUtenteCodigoPorId(paciente.tipoUtenteId) || 
                   'comunidade',
        tipoUtenteId: dadosPagamento.dados_paciente?.tipo_utente?.id || paciente.tipoUtenteId,
        valorConsultaDefault: dadosPagamento.configuracao?.valor_consulta_default,
        metodosDisponíveis: dadosPagamento.configuracao?.metodos_pagamento || [],
        tiposConsulta: dadosPagamento.configuracao?.tipos_consulta || []
      };

      setPacientePagamentoRegular(pacienteComDadosPagamento);

      // Definir valores iniciais do formulário baseado nos dados do backend
      const isEstudanteBolseiro = dadosPagamento.dados_paciente?.tipo_utente?.codigo === 'EST-B';
      const tipoConsultaDefault = dadosPagamento.configuracao?.tipos_consulta?.[0]?.id || 
                                dadosPagamento.configuracao?.tipos_consulta?.[0]?.codigo || 
                                'Selecione um tipo de consulta';
      const tipoUtenteId = dadosPagamento.dados_paciente?.tipo_utente?.id || paciente.tipoUtenteId;
      

      
      // Definir método padrão baseado no tipo de utente
      const metodoPagamentoDefault = isEstudanteBolseiro ? 'isencao' : (metodosPagamento.length > 0 ? null : null);
      
      // Definir valores iniciais do formulário (método de pagamento vem ANTES do valor)
      const valoresIniciais = {
        tipoConsulta: tipoConsultaDefault,
        metodoPagamento: metodoPagamentoDefault
      };
      
      if (isEstudanteBolseiro) {
        // Estudante bolseiro: isenção automática com valor 0
        valoresIniciais.valor = '0';
        pagamentoRegularForm.setFieldsValue(valoresIniciais);
      } else {
        // Outros utentes: definir método primeiro, depois buscar valor
        pagamentoRegularForm.setFieldsValue(valoresIniciais);
        
        // Buscar valor específico para o tipo de consulta e utente
        try {
          const valorInicial = await buscarValorConsulta(tipoConsultaDefault, tipoUtenteId);
        
          // Validar se o valor foi carregado corretamente
          if (validarValorBackend(valorInicial, tipoConsultaDefault, tipoUtenteId, metodoPagamentoDefault)) {
            pagamentoRegularForm.setFieldsValue({
              ...valoresIniciais,
              valor: valorInicial
            });
          } else {
            console.error('❌ ERRO: Não foi possível carregar valor da consulta do backend');
            
            // Buscar nome do tipo de utente para mensagem mais específica
            const tipoUtente = getTipoUtenteById(tipoUtenteId);
            const nomeUtente = tipoUtente?.nome || tipoUtente?.codigo || `ID: ${tipoUtenteId}`;
            
            message.error({
              content: (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    ⚠️ Preço da consulta não configurado
                  </div>
                  <div>Tipo de utente: <strong>{nomeUtente}</strong></div>
                  <div>Tipo de consulta: <strong>{tipoConsultaDefault}</strong></div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    Entre em contato com o administrador para configurar os preços no sistema.
                  </div>
                </div>
              ),
              duration: 8
            });
            
            // Ainda assim abrir o modal para permitir seleção de método de pagamento
            pagamentoRegularForm.setFieldsValue({
              ...valoresIniciais,
              valor: '' // Deixar vazio para o usuário escolher método primeiro
            });
          }
        } catch (valorError) {
          console.error('❌ Erro específico na busca de valor:', valorError);
          
          // Buscar nome do tipo de utente para mensagem mais específica
          const tipoUtente = getTipoUtenteById(tipoUtenteId);
          const nomeUtente = tipoUtente?.nome || tipoUtente?.codigo || `ID: ${tipoUtenteId}`;
          
          message.error({
            content: (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  ⚠️ Erro ao carregar preço da consulta
                </div>
                <div>Tipo de utente: <strong>{nomeUtente}</strong></div>
                <div>Tipo de consulta: <strong>{tipoConsultaDefault}</strong></div>
                <div style={{ marginTop: '8px', color: '#d32f2f' }}>
                  {valorError.message || 'Erro desconhecido ao buscar preço'}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  Entre em contato com o administrador para resolver este problema.
                </div>
              </div>
            ),
            duration: 10
          });
          
          // Ainda assim abrir o modal permitindo seleção manual
          pagamentoRegularForm.setFieldsValue({
            ...valoresIniciais,
            valor: ''
          });
        }
      }

      setIsPagamentoRegularModalVisible(true);
      
    } catch (error) {
      console.error('❌ Erro detalhado ao carregar dados de pagamento:', {
        message: error.message,
        stack: error.stack,
        pacienteId: paciente.id,
        url: `${API_BASE}/pacientes/${paciente.id}/dados-pagamento`
      });
      

      // Fallback melhorado para a lógica anterior em caso de erro
      const pacienteComTipoUtente = { ...paciente };
      
      // Configurar dados padrão para fallback
      pacienteComTipoUtente.valorConsultaDefault = null; // Valor deve vir do backend
      pacienteComTipoUtente.metodosDisponíveis = metodosPagamento || [];
      pacienteComTipoUtente.tiposConsulta = tiposConsulta || [];
      
      if (paciente.tipoUtenteId && !paciente.tipoUtente) {
        const tipoUtenteObj = getTipoUtenteById(paciente.tipoUtenteId);
        
        if (tipoUtenteObj) {
          const codigoParaTipoUtente = {
            'EST-B': 'estudanteBolseiro',
            'EST-NB': 'estudanteNaoBolseiro',
            'DOC': 'docente',
            'FUNC': 'funcionario',
            'COM': 'comunidade',
            'FAM-DOC': 'familiardocente',
            'FAM-FUNC': 'familiarfuncionario',
            'EST-M': 'estudanteMestrado',
            'EST-D': 'estudanteDoutoramento'
          };
          
          pacienteComTipoUtente.tipoUtente = codigoParaTipoUtente[tipoUtenteObj.codigo] || tipoUtenteObj.nome || 'comunidade';

        } else {
          console.warn('⚠️ Tipo de utente não encontrado no Patient Service (fallback):', paciente.tipoUtenteId);
          pacienteComTipoUtente.tipoUtente = 'comunidade'; // Valor padrão
        }
      }
      
      // Definir valores iniciais do formulário no fallback
      const isEstudanteBolseiro = pacienteComTipoUtente.tipoUtente === 'estudanteBolseiro';
      const tipoConsultaDefault = Array.isArray(tiposConsulta) && tiposConsulta.length > 0 ? tiposConsulta[0].id || tiposConsulta[0].codigo : 'consulta_geral';
      
      setPacientePagamentoRegular(pacienteComTipoUtente);
      
      // Aguardar um tick para garantir que o modal foi aberto
      setTimeout(async () => {
        // Definir método padrão baseado no tipo de utente
        const metodoPagamentoDefault = isEstudanteBolseiro ? 'isencao' : null;
        
        if (isEstudanteBolseiro) {
          pagamentoRegularForm.setFieldsValue({
            tipoConsulta: tipoConsultaDefault,
            metodoPagamento: 'isencao',
            valor: '0'
          });
        } else {
          // Definir valores iniciais com método primeiro
          const valoresIniciais = {
            tipoConsulta: tipoConsultaDefault,
            metodoPagamento: metodoPagamentoDefault
          };
          
          // Buscar valor específico mesmo no fallback
          let valorInicial = pacienteComTipoUtente.valorConsultaDefault;
          
          if (tipoConsultaDefault && paciente.tipoUtenteId) {
            try {
              valorInicial = await buscarValorConsulta(tipoConsultaDefault, paciente.tipoUtenteId);
            } catch (error) {
              console.warn('⚠️ Erro ao calcular valor no fallback:', error.message);
              
              // Tentar fallback local
              valorInicial = buscarValorFallback(tipoConsultaDefault, paciente.tipoUtenteId);
            }
          }
          
          if (!valorInicial || valorInicial === null) {
            console.error('❌ Não foi possível obter valor da consulta');
            
            // Buscar nome do tipo de utente para mensagem mais específica
            const tipoUtente = getTipoUtenteById(paciente.tipoUtenteId);
            const nomeUtente = tipoUtente?.nome || tipoUtente?.codigo || `ID: ${paciente.tipoUtenteId}`;
            
            message.warning({
              content: (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    ⚠️ Valor de consulta não disponível (Fallback)
                  </div>
                  <div>Tipo de utente: <strong>{nomeUtente}</strong></div>
                  <div>Tipo de consulta: <strong>{tipoConsultaDefault}</strong></div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    Selecione o método de pagamento primeiro. Se for isenção, o valor será definido automaticamente.
                  </div>
                </div>
              ),
              duration: 8
            });
            
            // Ainda assim abrir o modal permitindo seleção de método
            pagamentoRegularForm.setFieldsValue({
              ...valoresIniciais,
              valor: '' // Deixar vazio para seleção baseada no método
            });
          } else {
            pagamentoRegularForm.setFieldsValue({
              ...valoresIniciais,
              valor: valorInicial
            });
          }
        }
      }, 100);
      
      setIsPagamentoRegularModalVisible(true);
    }
  };

  // Função para processar o pagamento da consulta regular
  const processarPagamentoRegular = async (values) => {
    try {
      
      // Validar dados do paciente primeiro
      if (!pacientePagamentoRegular?.tipoUtenteId) {
        console.error('❌ Paciente não tem tipo de utente definido:', pacientePagamentoRegular);
        message.error('Erro: O paciente selecionado não tem tipo de utente definido. Por favor, atualize os dados do paciente.');
        return;
      }
      
      // Verificar se pode realizar nova consulta
      const verificacao = podeRealizarNovaConsulta(pacientePagamentoRegular);
      if (!verificacao.pode) {
        message.warning(verificacao.motivo);
        return;
      }

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        message.error('Token de autenticação não encontrado');
        return;
      }

      // Obter tipo de utente do paciente
      const tipoUtenteId = obterTipoUtenteCodigoPorId(pacientePagamentoRegular?.tipoUtenteId);


      // Validar se o tipo de utente foi encontrado
      if (!tipoUtenteId) {
        console.error('❌ Tipo de utente não encontrado para o paciente');
        message.error('Erro: Tipo de utente do paciente não foi encontrado. Verifique os dados do paciente.');
        return;
      }

      // Preparar dados para envio ao backend
      const metodoPagamentoIsencao = isMetodoIsencao(values.metodoPagamento, pacientePagamentoRegular?.tipoUtenteId);
      

      // Encontrar o ID do método de pagamento selecionado
      let metodoPagamentoId = null;
      
      if (values.metodoPagamento) {
        const metodoPagamentoObj = metodosPagamento.find(metodo => 
          metodo.codigo === values.metodoPagamento || metodo.id === values.metodoPagamento
        );
        
        if (metodoPagamentoObj) {
          metodoPagamentoId = metodoPagamentoObj.id;
        } else {
          // Se não encontrar, tentar converter diretamente para inteiro
          const valorNumerico = parseInt(values.metodoPagamento);
          if (!isNaN(valorNumerico)) {
            metodoPagamentoId = valorNumerico;
          }
        }
      }
      
      if (!metodoPagamentoId) {
        notification.warning({
          message: 'Método de pagamento inválido',
          description: 'Selecione um método de pagamento disponibilizado pelo servidor.'
        });
        return;
      }
      

      
      // Encontrar o ID do tipo de consulta
      let tipoConsultaId = null;
      
      if (values.tipoConsulta) {
        const tipoConsultaObj = tiposConsulta.find(tipo => 
          tipo.codigo === values.tipoConsulta || tipo.id === values.tipoConsulta
        );
        
        if (tipoConsultaObj) {
          tipoConsultaId = tipoConsultaObj.id;
        } else {
          // Se não encontrar o tipo de consulta, usar o valor diretamente se for número
          const valorNumerico = parseInt(values.tipoConsulta);
          if (!isNaN(valorNumerico)) {
            tipoConsultaId = valorNumerico;
          }
        }
      }
      
      if (!tipoConsultaId) {
        notification.warning({
          message: 'Tipo de consulta inválido',
          description: 'Selecione um tipo de consulta disponibilizado pelo servidor.'
        });
        return;
      }
      
      
      const dadosPagamento = {
        tipo_consulta_id: parseInt(tipoConsultaId) || null,
        tipo_utente_id: pacientePagamentoRegular?.tipoUtenteId,
        valor: metodoPagamentoIsencao ? 0 : (parseFloat(values.valor) || 0),
        metodo_pagamento_id: parseInt(metodoPagamentoId) || null,
        observacoes: values.observacoes || '',
        isencao: metodoPagamentoIsencao
      };

      // Validar campos obrigatórios antes de enviar
      const errosValidacao = [];
      
      if (!dadosPagamento.tipo_consulta_id) {
        errosValidacao.push('Tipo de consulta é obrigatório');
      }
      
      if (!dadosPagamento.metodo_pagamento_id) {
        errosValidacao.push('Método de pagamento é obrigatório');
      }
      
      if (!pacientePagamentoRegular.id) {
        errosValidacao.push('ID do paciente é obrigatório');
      }
      
      if (!pacientePagamentoRegular.nid) {
        errosValidacao.push('NID do paciente é obrigatório');
      }
      
      if (errosValidacao.length > 0) {
        const mensagemErro = `Dados inválidos para pagamento:\n${errosValidacao.join('\n')}`;
        console.error('❌ Validação falhou:', errosValidacao);
        throw new Error(mensagemErro);
      }

      console.log('📤 Enviando dados de pagamento:', dadosPagamento);
      

      // Preparar dados completos para a rota de pagamento
      const dadosPagamentoCompletos = {
        ...dadosPagamento,
        nid: pacientePagamentoRegular.nid,
        paciente_id: pacientePagamentoRegular.id
      };


      const url = `${API_BASE}/pacientes/processar-pagamento`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosPagamentoCompletos)
      });

      if (!response.ok) {
        let errorMessage = `Erro no pagamento: ${response.status} - ${response.statusText}`;
        let errorDetails = null;
        
        try {
          // Tentar ler como JSON primeiro
          const responseText = await response.text();
          
          // Verificar se é JSON válido
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            const errorData = JSON.parse(responseText);
            console.error('📋 Dados completos do erro:', {
              status: response.status,
              statusText: response.statusText,
              errorData: errorData,
              dadosEnviados: response.status === 405 ? dadosPagamentoCompletos : dadosPagamento
            });
            
            errorDetails = errorData;
            
            if (response.status === 422) {
              // Erro de validação - mostrar detalhes específicos
              if (errorData.errors) {
                const camposComErro = Object.entries(errorData.errors)
                  .map(([campo, erros]) => `${campo}: ${erros.join(', ')}`)
                  .join('\n');
                errorMessage = `Erro de validação:\n${camposComErro}`;
              } else if (errorData.message) {
                errorMessage = `Erro de validação: ${errorData.message}`;
              }
            } else if (response.status === 405) {
              errorMessage = 'Método não permitido na rota de pagamento.';
              console.warn('⚠️ Método não permitido - verificar se a rota aceita POST');
            } else if (response.status === 500) {
              errorMessage = 'Erro interno do servidor no processamento do pagamento.';
              console.error('🚨 Erro 500 - detalhes para debug:', {
                'Payload enviado': dadosPagamentoCompletos,
                'URL': response.url,
                'Status': response.status,
                'Possíveis causas': [
                  'Validação de campos no backend',
                  'Problema de conexão com BD',
                  'Erro na lógica de negócio'
                ]
              });
            } else {
              errorMessage = errorData.message || errorMessage;
            }
          } else {
            // É HTML ou texto simples
            console.error('📝 Resposta não-JSON do servidor:', responseText.substring(0, 500));
            
            if (responseText.includes('<!DOCTYPE')) {
              errorMessage = `Erro do servidor: Página de erro retornada em vez de JSON. Status: ${response.status}`;
            } else {
              errorMessage = `Erro do servidor: ${responseText.substring(0, 200)}`;
            }
          }
        } catch (parseError) {
          console.error('❌ Erro ao processar resposta de erro:', parseError);
          errorMessage = `Erro ${response.status}: Não foi possível processar resposta do servidor`;
        }
        
        // Log adicional para debugging
        console.error('🚨 Erro completo no pagamento:', {
          status: response.status,
          url: response.url,
          dadosEnviados: dadosPagamento,
          errorMessage,
          errorDetails
        });
        
        throw new Error(errorMessage);
      }

      let resultadoPagamento;
      try {
        resultadoPagamento = await response.json();
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON da resposta:', jsonError);
        const responseText = await response.text();
        console.error('📝 Resposta recebida (não é JSON):', responseText.substring(0, 500));
        
        if (responseText.includes('<!DOCTYPE')) {
          throw new Error('Servidor retornou página HTML em vez de dados JSON. Verifique se o endpoint está correto.');
        } else {
          throw new Error('Resposta do servidor não é um JSON válido');
        }
      }
      console.log('✅ Pagamento processado:', resultadoPagamento);

      // Atualizar dados locais com resposta do backend
      const tipoConsultaSelecionado = tiposConsulta.find(tipo =>
        sameId(tipo.id, values.tipoConsulta) || sameId(tipo.codigo, values.tipoConsulta)
      );
      const metodoPagamentoSelecionado = metodosPagamento.find(metodo =>
        sameId(metodo.id, values.metodoPagamento) || sameId(metodo.codigo, values.metodoPagamento)
      );

      const pagamentoBackend = resultadoPagamento?.data?.pagamento || resultadoPagamento?.pagamento || resultadoPagamento?.dados_pagamento || {};
      const pacienteBackend = resultadoPagamento?.data?.paciente || resultadoPagamento?.paciente_atualizado || {};

      const pacienteAtualizado = {
        ...pacientePagamentoRegular,
        ...pacienteBackend,
        statusPagamentoConsulta: pacienteBackend.status_pagamento || pagamentoBackend.status || (pagamentoBackend.isencao_aplicada ? 'isento' : 'pago'),
        tipoConsultaId: tipoConsultaId,
        tipoConsultaRegular: values.tipoConsulta,
        tipoConsultaNome: tipoConsultaSelecionado?.nome || tipoConsultaSelecionado?.descricao || values.tipoConsulta,
        valorConsultaRegular: metodoPagamentoIsencao ? 0 : (parseFloat(values.valor) || 0),
        metodoPagamentoRegular: metodoPagamentoId,
        metodoPagamentoNome: pagamentoBackend.isencao_aplicada ? 'Isento' : (pagamentoBackend.metodo_pagamento_nome || pagamentoBackend.metodo || metodoPagamentoSelecionado?.nome || values.metodoPagamento),
        referenciaPagamento: pagamentoBackend.numero_recibo || pagamentoBackend.referencia || pagamentoBackend.referencia_pagamento || pagamentoBackend.numero_referencia || values.referencia || null,
        dataPagamentoConsulta: pagamentoBackend.data_pagamento || pagamentoBackend.data_pagamento_formatada || new Date().toLocaleString(),
        ultimoPagamento: pagamentoBackend
      };

      atualizarPacienteLocal(pacientePagamentoRegular.id, pacienteAtualizado);
      
      // Fechar o modal de pagamento
      setIsPagamentoRegularModalVisible(false);
      
      // Mensagem de sucesso baseada na resposta do backend
      const isIsencao = resultadoPagamento.dados_pagamento?.metodo_pagamento === 'isencao';
      
      if (isIsencao) {
        message.success({
          content: resultadoPagamento.message || 'Isenção de pagamento aplicada! Paciente sendo encaminhado para triagem.',
          duration: 4
        });
      } else {
        message.success({
          content: resultadoPagamento.message || `Pagamento de MT ${values.valor} processado! Paciente sendo encaminhado para triagem.`,
          duration: 4
        });
      }
      
      // Marcar triagem imediatamente após pagamento/isenção
      marcarTriagem(pacienteAtualizado);
      
      setPacientePagamentoRegular(null);
      pagamentoRegularForm.resetFields();
      
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      message.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
    }
  };

  // Função para aceitar/confirmar solicitação de exame
  // Abre modal para confirmar disponibilidade e definir preços por exame
  const aceitarSolicitacaoExame = (exame) => {
    // Cada linha da API é UM exame individual
    const lista = [{
      tipo_exame: exame.nome_exame || exame.examesSolicitados || exame.tipo_exame || '',
      disponivel: true,
      preco: '',
    }];
    setExamesParaConfirmar(lista);
    setExameParaConfirmar(exame);
    setIsConfirmarExamesModalVisible(true);
  };

  // Atualiza um campo de um exame na lista de confirmar
  const updateExameParaConfirmar = (idx, field, value) => {
    setExamesParaConfirmar(prev =>
      prev.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    );
  };

  // Envia confirmação com disponibilidade e preços — PUT /api/solicitacoes-exames/{id}/confirmar
  const processarConfirmacaoExames = async () => {
    const algumDisponivel = examesParaConfirmar.some(e => e.disponivel);
    if (!algumDisponivel) {
      message.warning('Seleccione pelo menos um exame disponível.');
      return;
    }
    try {
      const payload = {
        exames_confirmados: examesParaConfirmar.map(e => ({
          tipo_exame: e.tipo_exame,
          disponivel: e.disponivel,
          preco: e.disponivel ? (parseFloat(e.preco) || 0) : 0,
        })),
        observacoes: 'Confirmado pela receção',
      };
      await confirmarExames(exameParaConfirmar.id, payload, () => {
        fetchSolicitacoes();
        setIsConfirmarExamesModalVisible(false);
        setExameParaConfirmar(null);
        setExamesParaConfirmar([]);
      });
    } catch (err) {
      console.error('❌ Erro ao confirmar exames:', err);
    }
  };

  // Abre modal para rejeitar solicitação com motivo
  const rejeitarSolicitacaoExame = (exame) => {
    setExameParaRejeitar(exame);
    rejeitarExameForm.resetFields();
    setIsRejeitarExameModalVisible(true);
  };

  // Envia rejeição — POST /api/solicitacoes-exames/{id}/rejeitar
  const processarRejeicaoExame = async (values) => {
    try {
      await rejeitarSolicitacao(exameParaRejeitar.id, values.motivo, () => {
        fetchSolicitacoes();
        setIsRejeitarExameModalVisible(false);
        setExameParaRejeitar(null);
        rejeitarExameForm.resetFields();
      });
    } catch (err) {
      console.error('❌ Erro ao rejeitar exame:', err);
    }
  };

  // Função para abrir modal de pagamento de exame
  const handlePagarExame = (exame) => {
    setExamePagamento(exame);
    setIsPagamentoExameModalVisible(true);
    pagamentoExameForm.resetFields();
  };

  // Função para processar pagamento de exame
  const processarPagamentoExame = async (values) => {
    try {
      const payload = {
        valor_pago: parseFloat(values.valor),
        metodo_pagamento: values.metodoPagamento,
        referencia_pagamento: values.referencia || 'N/A',
        observacoes: values.observacoes || 'Pagamento processado'
      };

      await processarPagamento(examePagamento.id, payload, () => {
        fetchSolicitacoes(); // Recarregar lista
        setIsPagamentoExameModalVisible(false);
        setExamePagamento(null);
        pagamentoExameForm.resetFields();
      });
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
    }
  };

  // Função para abrir modal de marcar exames
  const handleMarcarExames = (exame) => {
    setExameParaMarcar(exame);

    // Converter string de exames em array se necessário
    let listaExames = [];
    if (typeof exame.examesSolicitados === 'string') {
      listaExames = exame.examesSolicitados.split(',').map(e => e.trim());
    } else if (Array.isArray(exame.examesSolicitados)) {
      listaExames = exame.examesSolicitados;
    }

    // Inicializar todos os exames como selecionados por padrão
    setExamesSelecionados(listaExames);
    setIsMarcarExamesModalVisible(true);
    marcarExamesForm.resetFields();
  };

  // Função para processar a marcação de exames e agendar colheita
  const processarMarcacaoExames = async () => {
    if (examesSelecionados.length === 0) {
      message.warning('Por favor, selecione pelo menos um exame para realizar.');
      return;
    }

    try {
      // Calcular exames não realizáveis
      let todosExames = [];
      if (typeof exameParaMarcar.examesSolicitados === 'string') {
        todosExames = exameParaMarcar.examesSolicitados.split(',').map(e => e.trim());
      } else if (Array.isArray(exameParaMarcar.examesSolicitados)) {
        todosExames = exameParaMarcar.examesSolicitados;
      }

      const examesNaoRealizaveis = todosExames.filter(exame => !examesSelecionados.includes(exame));

      // Agendar colheita para amanhã às 9h por padrão
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      
      const payload = {
        data_colheita: amanha.toISOString().split('T')[0],
        hora_colheita: '09:00',
        observacoes: `Exames agendados: ${examesSelecionados.join(', ')}${examesNaoRealizaveis.length > 0 ? `. Não realizáveis: ${examesNaoRealizaveis.join(', ')}` : ''}`,
      };

      await agendarColheita(exameParaMarcar.id, payload, () => {
        fetchSolicitacoes(); // Recarregar lista
        
        // Mensagem de sucesso detalhada
        let mensagem = `${examesSelecionados.length} exame(s) agendado(s) para colheita!`;
        if (examesNaoRealizaveis.length > 0) {
          mensagem += ` ${examesNaoRealizaveis.length} exame(s) não realizável(is) na clínica.`;
        }

        message.success({
          content: (
            <div>
              <div>{mensagem}</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                <b>Agendados:</b> {examesSelecionados.join(', ')}
              </div>
              {examesNaoRealizaveis.length > 0 && (
                <div style={{ fontSize: '12px', color: '#fa8c16' }}>
                  <b>Não realizáveis:</b> {examesNaoRealizaveis.join(', ')}
                </div>
              )}
            </div>
          ),
          duration: 6
        });

        setIsMarcarExamesModalVisible(false);
        setExameParaMarcar(null);
        setExamesSelecionados([]);
      });
    } catch (error) {
      console.error('❌ Erro ao agendar colheita:', error);
    }
  };

  // Função para processar o pagamento após confirmação no modal
  const processarPagamentoEspecialidade = async (values) => {
    try {
      // Verificar se pode realizar nova consulta
      const verificacao = podeRealizarNovaConsulta(pacientePagamento);
      if (!verificacao.pode) {
        message.warning(verificacao.motivo);
        return;
      }

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        message.error('Token de autenticação não encontrado');
        return;
      }

 

      // Payload conforme documentação - POST /api/pacientes/pagamento-especialidade (Patient Service - 8002)
      const payload = {
        paciente_id: pacientePagamento.paciente_id,
        consulta_id: pacientePagamento.consulta_id,
        agendamento_id: pacientePagamento.agendamento_id,
        nid: pacientePagamento.nid,
        especialidade_destino: pacientePagamento.especialidade_destino || pacientePagamento.especialidade,
        medico_destino_id: pacientePagamento.medico_id,
        valor_consulta: parseFloat(values.valor),
        metodo_pagamento_id: parseInt(values.metodoPagamento),
        observacoes: values.observacoes || null
      };


      const response = await axios.post(
        `${API_BASE}/services/pagamento-especialidade`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Resposta do pagamento:', response.data);

      message.success({
        content: `Pagamento de MT ${values.valor} processado com sucesso! Agendamento criado para ${pacientePagamento.especialidade}.`,
        duration: 5
      });

      setIsPagamentoModalVisible(false);

      invalidateCachedRequest('pacientes:transferidos-especialidade');
      await carregarPacientesTransferidosEspecialidade({ force: true });
      setPacientePagamento(null);
      pagamentoForm.resetFields();

    } catch (error) {
      console.error('❌ Erro ao processar pagamento de especialidade:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error ||
                       error.message || 
                       'Erro ao processar pagamento';
      
      message.error(`Erro no pagamento: ${errorMsg}`);
    }
  };

  const handleEdit = async (values) => {
    try {

      
      // Convertendo o objeto dayjs para Date antes de salvar
      const processedValues = { ...values };
      if (processedValues.dataNascimento && processedValues.dataNascimento.toDate) {
        processedValues.dataNascimento = processedValues.dataNascimento.toDate();
      }

      // Converter nomes de campos do formulário para o formato esperado (convertendo para número quando necessário)
      const camposConvertidos = {};
      
      // Número de documento (BI) - IGUAL AOS UTENTES AUTÔNOMOS
      if (processedValues.bilheteIdentidade) {

        
        camposConvertidos.bilhete_identidade = processedValues.bilheteIdentidade.trim();
      }
      
      // ==================== VALIDAÇÃO ROBUSTA TIPO UTENTE (MESMO PADRÃO DO HANDLECREATE) ====================

      
      if (processedValues.tipoUtente !== undefined) {
        const tipoUtenteId = processedValues.tipoUtente;
        
        // Validar se existe no backend (mesmo padrão do handleCreate)
        if (tipoUtenteId && !isNaN(tipoUtenteId)) {
          const tipoUtenteExiste = patientServiceTiposUtentes?.find(t => sameId(t.id, tipoUtenteId));
          if (tipoUtenteExiste) {
            camposConvertidos.tipo_utente_id = parseInt(tipoUtenteId, 10);
          } else {
            notification.warning({
              message: 'Tipo de utente inválido',
              description: 'Selecione novamente o tipo de utente.'
            });
            return;
          }
        }
      }
      if (processedValues.unidadeOrganica !== undefined) {
        const unidadeOrganicaId = parseInt(processedValues.unidadeOrganica, 10);
        camposConvertidos.unidade_organica_id = unidadeOrganicaId;
        camposConvertidos.unidadeOrganicaId = unidadeOrganicaId;
      }
      if (processedValues.provincia !== undefined) {
        const provinciaId = parseInt(processedValues.provincia, 10);
        camposConvertidos.provincia_id = provinciaId;
        camposConvertidos.provinciaId = provinciaId;
      }
      if (processedValues.distrito !== undefined) {
        const distritoId = parseInt(processedValues.distrito, 10);
        camposConvertidos.distrito_id = distritoId;
        camposConvertidos.distritoId = distritoId;
      }
      if (processedValues.bairro !== undefined) {
        const bairroId = parseInt(processedValues.bairro, 10);
        camposConvertidos.bairro_id = bairroId;
        camposConvertidos.bairroId = bairroId;
      }
      if (processedValues.tipoDocumento !== undefined) {
        const tipoDocumentoId = parseInt(processedValues.tipoDocumento, 10);
        camposConvertidos.tipo_documento_id = tipoDocumentoId;
        camposConvertidos.tipoDocumentoId = tipoDocumentoId;
      }
      if (processedValues.raca !== undefined) {
        const racaId = parseInt(processedValues.raca, 10);
        camposConvertidos.raca_id = racaId;
        camposConvertidos.racaId = racaId;
      }
      if (processedValues.telefone !== undefined) camposConvertidos.celular = processedValues.telefone;
      if (processedValues.whatsApp !== undefined) camposConvertidos.whatsapp = processedValues.whatsApp;

      // Mesclar dados existentes com valores processados e convertidos
      const dadosMesclados = { ...editingPaciente, ...processedValues, ...camposConvertidos };






      // Atualiza no backend
      await atualizarPaciente(editingPaciente.id, dadosMesclados);
      
      // 🔄 FORÇAR ATUALIZAÇÃO: Fechar modal e aguardar recarregamento
      setIsEditModalVisible(false);
      
      // ✅ Aguardar um momento para garantir que a lista foi recarregada
      setTimeout(() => {
        message.success('Paciente atualizado com sucesso! A lista será atualizada.');
      }, 500);
      
      // message.success já é chamado dentro de atualizarPaciente
    } catch (error) {
      console.error('❌ Erro ao atualizar paciente:', error);
      // message.error já é chamado dentro de atualizarPaciente
    }
  };
  const marcarTriagem = (paciente) => {
    // Verificar o status atual do paciente
    const statusPaciente = obterStatusPaciente(paciente);

    if (statusPaciente.desabilitado) {
      let mensagem = `Não é possível marcar triagem: ${statusPaciente.texto}`;
      if (statusPaciente.motivo) {
        mensagem += `\n${statusPaciente.motivo}`;
      }
      notification.warning({
        message: 'Marcação bloqueada',
        description: mensagem
      });
      return;
    }

    // Verificar se já existe triagem pendente (verificação adicional)
    if (triagensPendentes.find(p => matchesPaciente(p, paciente) && isActiveWorkflowStatus(p.status || p.estado || p.situacao))) {
      notification.warning({
        message: 'Triagem já marcada',
        description: 'Este paciente já tem uma solicitação de triagem pendente ou em atendimento.'
      });
      return;
    }

    if (consultasPendentes.find(c => matchesPaciente(c, paciente) && isActiveWorkflowStatus(c.status || c.estado || c.situacao || 'em_consulta'))) {
      notification.warning({
        message: 'Paciente em consulta',
        description: 'Não é possível marcar nova triagem enquanto o paciente estiver em consulta.'
      });
      return;
    }

    // Em vez de adicionar diretamente, abre o modal para selecionar urgência
    setTriagemPaciente(paciente);
    setUrgenciaTriagem(null); // Reseta a seleção de urgência
    setObservacoesTriagem('');
    setIsTriagemModalVisible(true);
  };

  // Função para confirmar a triagem após selecionar a urgência
  const confirmarTriagem = () => {
    if (criandoSolicitacaoTriagem) return;

    if (!urgenciaTriagem) {
      notification.warning({
        message: 'Selecione a urgência',
        description: 'Informe o estado de urgência antes de confirmar a triagem.'
      });
      return;
    }

    const statusPaciente = obterStatusPaciente(triagemPaciente || {});
    if (statusPaciente.desabilitado) {
      notification.warning({
        message: 'Marcação bloqueada',
        description: statusPaciente.motivo || `O paciente está com status: ${statusPaciente.texto}.`
      });
      return;
    }

    if (!triagemPaciente?.id) {
      message.error('Erro: ID do paciente não encontrado. Tente novamente.');
      console.error('❌ Paciente selecionado sem ID:', triagemPaciente);
      return;
    }

    // Envia solicitação de triagem ao backend
    (async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        message.error('Token de autenticação não encontrado. Não foi possível enviar solicitação de triagem.');
        return;
      }

      const payload = {
        paciente_id: triagemPaciente.id,
        urgencia: urgenciaTriagem,
        observacoes: observacoesTriagem || null
      };

      // Validação adicional do payload
      if (!payload.paciente_id || typeof payload.paciente_id !== 'number') {
        console.error('❌ paciente_id inválido:', payload.paciente_id);
        message.error('Erro: ID do paciente inválido. Verifique se o paciente foi salvo corretamente.');
        return;
      }

      if (!['emergencia', 'urgente', 'normal'].includes(payload.urgencia)) {
        console.error('❌ urgencia inválida:', payload.urgencia);
        message.error('Erro: Nível de urgência inválido.');
        return;
      }

      try {
        setCriandoSolicitacaoTriagem(true);
        const url = `${API_BASE}/pacientes/solicitacoes-triagem`;
        console.log('📨 Enviando solicitação de triagem:');

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('❌ Erro ao criar solicitação de triagem:', res.status);
          console.error('❌ Payload enviado:', payload);
          console.error('❌ Resposta do servidor:', text);
          
          // Tentar parsear a resposta como JSON para ver mensagens de validação
          let errorDetails = text;
          try {
            const errorJson = JSON.parse(text);
            console.error('❌ Detalhes do erro:', errorJson);
            if (errorJson.errors) {
              console.error('❌ Erros de validação:', errorJson.errors);
              const errorMessages = Object.entries(errorJson.errors)
                .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                .join('; ');
              message.error(`Erro de validação: ${errorMessages}`);
              return;
            }
            if (errorJson.message) {
              errorDetails = errorJson.message;
            }
          } catch (e) {
            // Não é JSON, usar texto original
          }

          if (res.status === 409) {
            const errorJson = JSON.parse(text || '{}');
            const solicitacaoExistente = errorJson?.data?.solicitacao || errorJson?.solicitacao || null;
            const normalizedSolicitacao = {
              ...(solicitacaoExistente || {}),
              pacienteId: solicitacaoExistente?.paciente_id || solicitacaoExistente?.pacienteId || triagemPaciente.id,
              paciente_id: solicitacaoExistente?.paciente_id || solicitacaoExistente?.pacienteId || triagemPaciente.id,
              id: solicitacaoExistente?.id || triagemPaciente.triagem_id || `pendente-${triagemPaciente.id}`,
              estadoUrgencia: solicitacaoExistente?.urgencia || solicitacaoExistente?.estadoUrgencia || urgenciaTriagem,
              urgencia: solicitacaoExistente?.urgencia || urgenciaTriagem,
              observacoes: solicitacaoExistente?.observacoes ?? observacoesTriagem ?? null,
              dataTriagem: solicitacaoExistente?.created_at || solicitacaoExistente?.data_solicitacao || new Date().toLocaleString(),
              status: solicitacaoExistente?.status || 'aguardando_triagem'
            };

            setTriagensPendentes(prev => {
              const exists = prev.some(item => matchesPaciente(item, triagemPaciente));
              return exists
                ? prev.map(item => matchesPaciente(item, triagemPaciente) ? { ...item, ...normalizedSolicitacao } : item)
                : [normalizedSolicitacao, ...prev];
            });

            atualizarPacienteLocal(triagemPaciente.id, {
              status: normalizedSolicitacao.status,
              estadoAtual: normalizedSolicitacao.status,
              triagem_id: normalizedSolicitacao.id,
              statusSolicitacaoTriagem: normalizedSolicitacao.status,
              ultimaSolicitacaoTriagem: normalizedSolicitacao
            });

            await carregarPacientes({
              page: pacientesPagination.current || 1,
              pageSize: pacientesPagination.pageSize || 10,
              search: searchText.trim(),
              force: true
            });

            notification.info({
              message: 'Utente já está encaminhado para triagem',
              description: 'Este utente já tem uma triagem pendente. Atualizamos a tabela para refletir o estado correto.',
              placement: 'topRight',
              duration: 7
            });

            setIsTriagemModalVisible(false);
            setTriagemPaciente(null);
            return;
          }

          notification.error({
            message: 'Não foi possível marcar a triagem',
            description: errorDetails || 'Tente novamente dentro de instantes.',
            placement: 'topRight',
            duration: 6
          });
          return;
        }

        const data = await res.json();

        // O backend pode devolver a solicitação em diferentes formatos.
        const solicitacao = data?.data?.solicitacao || data?.solicitacao || data?.data || data || null;

        if (!solicitacao) {
          console.warn('⚠️ Resposta de criação de triagem sem objeto esperado:', data);
          message.success('Solicitação de triagem enviada (resposta inesperada do servidor).');
        } else {
          // Normalizar objeto de solicitação para uso local (compatibilidade camel/snake)
          const normalizedSolicitacao = {
            ...solicitacao,
            pacienteId: solicitacao.paciente_id || solicitacao.pacienteId || triagemPaciente.id,
            id: solicitacao.id || solicitacao.solicitacao_id || Date.now(),
            estadoUrgencia: solicitacao.urgencia || solicitacao.estadoUrgencia || urgenciaTriagem,
            dataTriagem: solicitacao.created_at || solicitacao.data_criacao || new Date().toLocaleString(),
            status: solicitacao.status || 'aguardando_triagem'
          };

          // Atualiza lista de triagens pendentes com o objeto normalizado
          setTriagensPendentes(prev => [normalizedSolicitacao, ...prev]);

          // Atualiza o paciente na lista principal para refletir o estado da solicitação
          atualizarPacienteLocal(solicitacao.paciente_id || triagemPaciente.id, {
            // Campos que podem ser usados por obterStatusPaciente
            status: normalizedSolicitacao.status,
            estadoAtual: normalizedSolicitacao.status,
            triagem_id: normalizedSolicitacao.id,
            statusSolicitacaoTriagem: normalizedSolicitacao.status,
            ultimaSolicitacaoTriagem: normalizedSolicitacao
          });

          await carregarPacientes({
            page: pacientesPagination.current || 1,
            pageSize: pacientesPagination.pageSize || 10,
            search: searchText.trim(),
            force: true
          });

          message.success(`Solicitação de triagem criada com sucesso (urgência: ${urgenciaTriagem}).`);
        }

        // Fecha o modal e limpa os estados
        setIsTriagemModalVisible(false);
        setTriagemPaciente(null);

      } catch (err) {
        console.error('❌ Erro ao enviar solicitação de triagem:', err);
        showApiError('Erro ao enviar solicitação de triagem', err, 'Verifique a ligação e tente novamente.');
      } finally {
        setCriandoSolicitacaoTriagem(false);
      }
    })();
  };

  // Pesquisa automática conforme digita
  const handleSearchInput = (e) => {
    setSearchText(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarPacientes({
        page: 1,
        pageSize: pacientesPagination.pageSize,
        search: searchText.trim()
      });
    }, 350);

    return () => clearTimeout(timer);
    // carregarPacientes muda com a paginação interna do hook; aqui queremos reagir apenas à pesquisa e ao tamanho da página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, pacientesPagination.pageSize]);

  // ✅ USANDO DADOS DO BACKEND: apiPacientes em vez de pacientes do ClinicContext
  const filteredPacientes = [...(pacientes || [])]
    .sort((a, b) => {
      // Sort by dataCadastro in descending order (most recent first)
      const dateA = a.dataCadastro ? new Date(a.dataCadastro) : new Date(0);
      const dateB = b.dataCadastro ? new Date(b.dataCadastro) : new Date(0);
      return dateB - dateA;
    });

  // Table columns definition
  const columns = [{ title: 'NID', dataIndex: 'nid', key: 'nid' },
  { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
  { title: 'Nome', dataIndex: 'nome', key: 'nome' },
  // {
  //   title: 'Data de Cadastro',
  //   dataIndex: 'dataCadastro',
  //   key: 'dataCadastro',
  //   render: (text) => {
  //     if (!text) return 'N/A';
  //     const date = new Date(text);
  //     return date.toLocaleDateString('pt-BR');
  //   },
  // },
  {
    title: 'Faixa Etária',
    dataIndex: 'dataNascimento',
    key: 'idade',
    render: (text, record) => {
      if (!text) return 'N/A';
      const birthDate = text.isDayjs ? text.toDate() : new Date(text);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const monthDiff = new Date().getMonth() - birthDate.getMonth();
      const adjustedAge = (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) ? age - 1 : age;

      // Definir faixa etária com base na idade
      if (adjustedAge < 14) {
        return 'Pediatria';
      } else if (adjustedAge < 60) {
        return record.genero === 'feminino' ? 'Adulta' : 'Adulto';
      } else {
        return record.genero === 'feminino' ? 'Idosa' : 'Idoso';
      }
    },
  },
  { title: 'Gênero', dataIndex: 'genero', key: 'genero' },
  {
    title: 'Tipo de Utente', 
    dataIndex: 'tipoUtenteId', 
    key: 'tipoUtente',
    render: (_, record) => getTipoUtenteNome(record) || 'N/A',
  },
  {
    title: 'Raça',
    key: 'raca',
    render: (_, record) => getRacaNome(record) || 'N/A',
  },
  // { title: 'Estado', dataIndex: 'estado', key: 'estado',
  //   render: (text) => {
  //     const estados = {
  //       ligeiro: 'Ligeiro',
  //       grave: 'Grave'
  //     };
  //     return estados[text] || text;
  //   },
  // },
  { title: 'Celular', dataIndex: 'celular', key: 'celular' },
  {
    title: 'Status',
    key: 'statusAtual',
    render: (_, record) => {
      const statusPaciente = obterStatusPaciente(record);
      const detalhes = [
        statusPaciente.urgencia ? `Urgência: ${statusPaciente.urgencia}` : null,
        statusPaciente.especialidade ? `Especialidade: ${statusPaciente.especialidade}` : null,
        statusPaciente.medico ? `Médico: ${statusPaciente.medico}` : null,
        statusPaciente.motivo || statusPaciente.observacao || null,
      ].filter(Boolean).join('\n');

      return (
        <span
          style={{
            color: statusPaciente.cor,
            fontWeight: 'bold',
            cursor: detalhes ? 'help' : 'default'
          }}
          title={detalhes}
        >
          {statusPaciente.texto}
        </span>
      );
    }
  },
  {
    title: 'Dados',
    key: 'configuracoes',
    render: (_, record) => (
      <Button
        type="default"
        onClick={() => openAcompanhanteModal(record)}
        style={{ backgroundColor: '#008CBA', color: 'white', borderColor: '#008CBA' }} icon={<PlusSquareOutlined />}
      >
      </Button>
    )
  },
  {
    title: 'Ações',
    key: 'acoes',
    render: (_, record) => {
      const statusPaciente = obterStatusPaciente(record);
      const mostrarBoletimConsulta = podeGerarBoletimConsulta(record);
      const statusAtual = statusPaciente.status || getWorkflowStatus(record).key;

      const botaoPagarConsulta = (
        <Button
          type="default"
          style={{ backgroundColor: '#fa8c16', color: 'white', borderColor: '#fa8c16' }}
          icon={<MedicineBoxOutlined />}
          onClick={() => handlePagarConsultaRegular(record)}
        >
          Pagar
        </Button>
      );

      const botaoMarcarTriagem = (
        <Button
          type="default"
          style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
          icon={<SolutionOutlined />}
          onClick={() => marcarTriagem(record)}
        >
          Triagem
        </Button>
      );

      const acoesPorStatus = {
        pagamento_pendente: botaoPagarConsulta,
        disponivel: botaoMarcarTriagem,
      };

      return (
        <Space wrap>
          <Button
            type="default"
            style={{ backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d' }}
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />

          {mostrarBoletimConsulta && (
            <Button
              type="default"
              title="Gerar boletim da consulta"
              style={{ backgroundColor: '#28a745', color: 'white', borderColor: '#28a745' }}
              icon={<FileTextOutlined />}
              onClick={() => gerarBoletimConsulta(record)}
            >
              Boletim
            </Button>
          )}

          {acoesPorStatus[statusAtual] || (
            !statusPaciente.desabilitado
              ? (record.statusPagamentoConsulta === 'pago' ? botaoMarcarTriagem : botaoPagarConsulta)
              : null
          )}
        </Space>
      );
    }
  }
  ];

  // Estado para gerenciar acompanhantes
  const [currentPaciente, setCurrentPaciente] = useState(null);
  const [isAcompanhanteModalVisible, setIsAcompanhanteModalVisible] = useState(false);
  const [acompanhanteForm] = Form.useForm();
  const [editingAcompanhante, setEditingAcompanhante] = useState(null);
  
  // Hook para gerenciar parentes do paciente atual
  const {
    // parentes: parentesBackend, // TODO: Usar na tabela de acompanhantes
    // loading: parentesLoading,   // TODO: Usar no loading da tabela
    carregarParentes,
    criarParente,
    atualizarParente,
    deletarParente
  } = useParentes(currentPaciente?.nid);
  
  // Carregar parentes quando abrir o modal
  useEffect(() => {
    if (isAcompanhanteModalVisible && currentPaciente?.nid) {
      carregarParentes(currentPaciente.nid);
    }
  }, [isAcompanhanteModalVisible, currentPaciente?.nid, carregarParentes]);
  
  // Função para abrir o modal de acompanhantes
  const openAcompanhanteModal = (paciente) => {

    
    // Garantir que os campos de data sejam dayjs ou null
    const pacienteProcessado = {
      ...paciente,
      dataNascimento: getDayjsOrNull(paciente.dataNascimento || paciente.data_nascimento),
      dataValidade: getDayjsOrNull(paciente.dataValidade || paciente.data_validade)
    };

    setCurrentPaciente(pacienteProcessado);
    setIsAcompanhanteModalVisible(true);
    setEditingAcompanhante(null);
    acompanhanteForm.resetFields();
  };


  // Funções para gerenciar Utentes Autônomos
  const openUtenteAutonomoModal = () => {
    setEditingUtenteAutonomo(null);
    utenteAutonomoForm.resetFields();
    setIsUtenteAutonomoModalVisible(true);
  };

  const openEditUtenteAutonomoModal = (utente) => {
    
    setEditingUtenteAutonomo(utente);
    
    // Mapear campos do backend (snake_case) para o formulário (camelCase)
    const formValues = {
      apelido: utente.apelido,
      nome: utente.nome,
      hospitalProveniencia: utente.hospital_proveniencia,
      dataNascimento: (utente.data_nascimento || utente.dataNascimento) ? 
        dayjs(utente.data_nascimento || utente.dataNascimento) : null,
      genero: utente.genero,
      tipoDocumento: utente.tipo_documento_id || utente.tipoDocumento,
      bilheteIdentidade: utente.bilhete_identidade || utente.bilheteIdentidade,
      celular: utente.celular,
      celularalternativo: utente.celular_alternativo || utente.celularalternativo
    };
    
    
    utenteAutonomoForm.setFieldsValue(formValues);
    setIsUtenteAutonomoModalVisible(true);
  };

  const handleUtenteAutonomoSubmit = async (values) => {
    // Obter NID do backend apenas para novos utentes
    let nid = editingUtenteAutonomo ? editingUtenteAutonomo.nid : null;
    
    if (!editingUtenteAutonomo) {
      try {
        nid = await obterProximoNID();
      } catch (error) {
        console.error('Erro ao obter próximo NID:', error);
        message.error('Erro ao gerar NID do utente');
        return;
      }
    }

    // Mapear campos do formulário para o formato snake_case esperado pelo backend
    const formattedValues = {
      apelido: values.apelido,
      nome: values.nome,
      hospital_proveniencia: values.hospitalProveniencia,
      data_nascimento: values.dataNascimento ? values.dataNascimento.format('YYYY-MM-DD') : null,
      genero: values.genero,
      tipo_documento_id: values.tipoDocumento,
      bilhete_identidade: values.bilheteIdentidade,
      celular: values.celular,
      celular_alternativo: values.celularalternativo,
      nid: nid
    };

    try {
      if (editingUtenteAutonomo) {
        // Editar utente existente usando função do hook
        await atualizarUtenteAutonomo(editingUtenteAutonomo.id, formattedValues);
      } else {
        // Adicionar novo utente usando função do hook
        await criarUtenteAutonomo(formattedValues);
      }
    } catch (error) {
      console.error('Erro ao salvar utente autônomo:', error);
      return;
    }

    setIsUtenteAutonomoModalVisible(false);
    utenteAutonomoForm.resetFields();
  };

  const marcarExameLaboratorio = (utente) => {
    // Verificar se o utente já tem exames solicitados mas ainda não pagos
    if (utente.examesSolicitados && utente.statusPagamento !== 'pago') {
      // Se já tem exames solicitados, abrir modal de pagamento
      setSelectedUtente(utente);
      setIsPagamentoExameModalVisible(true);
      pagamentoExameForm.resetFields();
    } else {
      // Se não tem exames, abrir modal para selecionar exames
      setSelectedUtente(utente);
      setIsExameModalVisible(true);
      exameForm.resetFields();
    }
  };

  const confirmarExame = async (values) => {
    const valorExames = calcularValorExames(values.tipoExame);
    if (valorExames === null) {
      notification.warning({
        message: 'Preço de exame indisponível',
        description: 'Um ou mais exames não possuem preço configurado no servidor.'
      });
      return;
    }

    // Criar um utente com os exames solicitados e status pendente de pagamento
    const utenteComExames = {
      ...selectedUtente,
      examesSolicitados: values.tipoExame, // Array de exames selecionados
      observacoes: values.observacoes || '',
      statusPagamento: 'pendente', // Status pendente para pagamento
      dataSolicitacao: new Date().toLocaleString(),
      valorExames
    };

    // Atualizar usando hook (substituir o utente existente)
    try {
      await atualizarUtenteAutonomo(selectedUtente.id, utenteComExames);
    } catch (error) {
      console.error('Erro ao atualizar utente com exames:', error);
      return;
    }

    // Mostrar mensagem de sucesso
    const examesNomes = values.tipoExame
      .map(exameId => tiposExames.find(exame => sameId(exame.id, exameId))?.nome)
      .filter(Boolean)
      .join(', ');

    message.success({
      content: (
        <div>
          <div>Exame(s) solicitado(s) para {selectedUtente.nome} {selectedUtente.apelido}!</div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>
            <b>Exames:</b> {examesNomes}
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#d89614' }}>
            Agora clique em "Pagar Exame" para processar o pagamento.
          </div>
        </div>
      ),
      duration: 5
    });

    setIsExameModalVisible(false);
    exameForm.resetFields();
  };

  // Função para calcular o valor dos exames
  const calcularValorExames = (exames) => {
    let total = 0;
    for (const exameId of exames) {
      const exame = tiposExames.find(item => sameId(item.id, exameId));
      const preco = exame?.preco ?? exame?.valor ?? exame?.valor_default;
      if (preco === undefined || preco === null || Number.isNaN(Number(preco))) return null;
      total += Number(preco);
    }
    return total;
  };

  // Função para abrir o modal de histórico de exames
  const abrirHistoricoExames = (utente) => {
    setUtenteHistorico(utente);
    setIsHistoricoModalVisible(true);
  };

  // Função para processar o pagamento de exames de utente autônomo
  const processarPagamentoExameUtente = async (values) => {
    const utenteAtualizado = {
      ...selectedUtente,
      status: 'pago_laboratorio', // Adicionar status do utente
      statusPagamento: 'pago',
      dataPagamento: new Date().toLocaleString(),
      metodoPagamento: values.metodoPagamento,
      valorPago: values.valor
    };

    // Atualizar o utente usando hook
    try {
      await atualizarUtenteAutonomo(selectedUtente.id, utenteAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar pagamento do utente:', error);
      return;
    }

    notification.success({
      message: 'Pagamento registado',
      description: `Pagamento de MT ${values.valor} processado com sucesso.`,
      duration: 5
    });

    setIsPagamentoExameModalVisible(false);
    setSelectedUtente(null);
    pagamentoExameForm.resetFields();
  };

  // Colunas para a tabela de Utentes Autônomos
  const utentesAutonomosColumns = [
    {
      title: 'NID',
      dataIndex: 'nid',
      key: 'nid',
      render: (text) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: '#1890ff',
          backgroundColor: '#f0f9ff',
          padding: '4px 8px !important',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {text || 'Não gerado'}
        </span>
      )
    },
    {
      title: 'Nome Completo',
      key: 'nomeCompleto',
      render: (_, record) => record.nome_completo || `${record.nome || ''} ${record.apelido || ''}`.trim()
    },
    { 
      title: 'Hospital de Proveniência', 
      dataIndex: 'hospital_proveniencia', 
      key: 'hospital_proveniencia',
      render: (text) => text || '-'
    },
    {
      title: 'Data de Nascimento',
      dataIndex: 'data_nascimento',
      key: 'data_nascimento',
      render: (text) => {
        if (!text) return '-';
        try {
          return dayjs(text).isValid() ? dayjs(text).format('DD/MM/YYYY') : text;
        } catch (error) {
          return text || '-';
        }
      }
    },
    {
      title: 'Data de Cadastro',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => {
        if (!text) return '-';
        try {
          return dayjs(text).isValid() ? dayjs(text).format('DD/MM/YYYY HH:mm') : text;
        } catch (error) {
          return text || '-';
        }
      }
    },
    {
      title: 'Gênero', 
      dataIndex: 'genero', 
      key: 'genero',
      render: (text) => {
        if (!text) return '-';
        const generoMap = {
          'masculino': 'Masculino',
          'feminino': 'Feminino',
          'outro': 'Outro',
          'M': 'Masculino',
          'F': 'Feminino',
          'male': 'Masculino',
          'female': 'Feminino'
        };
        return generoMap[text?.toLowerCase()] || text;
      }
    },
    {
      title: 'Documento',
      key: 'documento',
      render: (_, record) => {
        const tipoDocId = record.tipo_documento_id;
        const numDoc = record.bilhete_identidade;
        
        if (!tipoDocId && !numDoc) return '-';
        
        let tipoDocNome = '';
        if (tipoDocId && Array.isArray(patientServiceTiposDocumentos)) {
          const tipoDoc = patientServiceTiposDocumentos.find(t => sameId(t.id, tipoDocId));
          tipoDocNome = tipoDoc?.nome || tipoDoc?.codigo || `Tipo ${tipoDocId}`;
        }
        
        if (tipoDocNome && numDoc) {
          return (
            <div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                {tipoDocNome}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'normal' }}>
                {numDoc}
              </div>
            </div>
          );
        }
        
        return numDoc || tipoDocNome || '-';
      }
    },
    { 
      title: 'Celular', 
      dataIndex: 'celular', 
      key: 'celular',
      render: (text) => {
        if (!text) return '-';
        // Formatar celular moçambicano
        if (text.startsWith('258')) {
          return `+${text}`;
        } else if (text.length === 9 && text.startsWith('8')) {
          return `+258${text}`;
        }
        return text;
      }
    },
    {
      title: 'Status dos Exames',
      key: 'statusExames',
      render: (_, record) => {
        // Análise precisa do estado do utente
        const temExamesAtivos = record.examesSolicitados && 
                               record.examesSolicitados !== null && 
                               Array.isArray(record.examesSolicitados) && 
                               record.examesSolicitados.length > 0;

        const statusPagamento = record.statusPagamento;
        const statusExame = record.status;

        // Se tem exames ativos
        if (temExamesAtivos) {
          // Determinar o status baseado no pagamento e status do exame
          let config;
          
          if (statusPagamento !== 'pago') {
            // Ainda não pagou
            config = { color: '#f39c12', bg: '#fef9e7', text: 'Aguardando Pagamento' };
          } else if (statusPagamento === 'pago' && statusExame === 'pago_laboratorio') {
            // Pagou e está no laboratório
            config = { color: '#1890ff', bg: '#e6f7ff', text: 'No Laboratório' };
          } else {
            // Outro status
            config = { color: '#52c41a', bg: '#f6ffed', text: 'Concluído' };
          }
          
          return (
            <div style={{ 
              backgroundColor: config.bg, 
              color: config.color, 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {config.text}
            </div>
          );
        }
        
        // Se tem histórico mas não tem exames ativos (foi resetado)
        if (record.ultimoExame || record.resultadosExames) {
          return (
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              color: '#1890ff', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Disponível
            </div>
          );
        }
        
        // Estado inicial
        return (
          <div style={{ 
            backgroundColor: '#f9f9f9', 
            color: '#666', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Novo
          </div>
        );
      }
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space>
          <Button type="default" style={{ backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d' }} icon={<EditOutlined />} onClick={() => openEditUtenteAutonomoModal(record)}>Editar</Button>
          
          {/* Botão para ver histórico se existir */}
          {(() => {
            // Verificar se tem histórico de exames (SEM LOGS)
            const temHistoricoExames = record.historicoExames && Array.isArray(record.historicoExames) && record.historicoExames.length > 0;
            const temUltimoExame = record.ultimoExame && typeof record.ultimoExame === 'object' && record.ultimoExame !== null;
            const temResultadosAntigos = record.resultadosExames && typeof record.resultadosExames === 'object' && record.resultadosExames !== null && Object.keys(record.resultadosExames).length > 0;
            
            const temHistorico = temHistoricoExames || temUltimoExame || temResultadosAntigos;
            
            if (temHistorico) {
              return (
                <Button 
                  type="default" 
                  style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }} 
                  icon={<SolutionOutlined />} 
                  onClick={() => abrirHistoricoExames(record)}
                >
                  Ver
                </Button>
              );
            }
            return null;
          })()}
          
          {/* Botão condicional baseado no status do utente */}
          {(() => {
            // Análise precisa do estado do utente (SEM LOGS)
            const temExamesAtivos = record.examesSolicitados && 
                                   record.examesSolicitados !== null && 
                                   Array.isArray(record.examesSolicitados) && 
                                   record.examesSolicitados.length > 0;

            const statusPagamento = record.statusPagamento;
            const statusExame = record.status;
            
            // Estado 1: Inicial ou após reset (sem exames ativos)
            if (!temExamesAtivos) {
              return (
                <Button 
                  type="default" 
                  style={{ backgroundColor: '#007BFF', color: 'white', borderColor: '#007BFF' }} 
                  icon={<SolutionOutlined />} 
                  onClick={() => marcarExameLaboratorio(record)}
                >
                  Exame
                </Button>
              );
            }

            // Estado 2: Tem exames mas ainda não pagou
            if (temExamesAtivos && statusPagamento !== 'pago') {
              return (
                <Button 
                  type="default" 
                  style={{ backgroundColor: '#f39c12', color: 'white', borderColor: '#f39c12' }} 
                  icon={<SolutionOutlined />} 
                  onClick={() => marcarExameLaboratorio(record)}
                >
                  Pagar Exame
                </Button>
              );
            }

            // Estado 3: Pagou e está no laboratório
            if (temExamesAtivos && 
                statusPagamento === 'pago' && 
                statusExame === 'pago_laboratorio') {
              return (
                <Button 
                  type="default" 
                  style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }} 
                  disabled
                >
                  No Laboratório
                </Button>
              );
            }

            // Estado 4: Fallback - retornar ao estado inicial
            return (
              <Button 
                type="default" 
                style={{ backgroundColor: '#007BFF', color: 'white', borderColor: '#007BFF' }} 
                icon={<SolutionOutlined />} 
                onClick={() => marcarExameLaboratorio(record)}
              >
                Exame
              </Button>
            );
          })()}
        </Space>
      )
    }
  ];

  // Colunas para pacientes transferidos para especialidades
  const pacientesEspecialidadeColumns = [
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
    {
      title: 'Especialidade Anterior',
      dataIndex: 'especialidadeAnterior',
      key: 'especialidadeAnterior',
      render: (text) => text || 'N/A'
    },
    {
      title: 'Nova Especialidade',
      dataIndex: 'especialidade',
      key: 'especialidade',
      render: (text) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
    },
    {
      title: 'Médico',
      dataIndex: 'medico',
      key: 'medico',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>
    },
    {
      title: 'Status Pagamento',
      dataIndex: 'status_pagamento',
      key: 'status_pagamento',
      render: (status) => {
        const color = status === 'pago' ? 'green' : 'orange';
        const text = status === 'pago' ? 'Pago' : 'Pendente';
        return <span style={{ color, fontWeight: 'bold' }}>{text}</span>;
      }
    },
    {
      title: 'Data Pagamento',
      dataIndex: 'data_pagamento',
      key: 'data_pagamento',
      render: (data, record) => {
        if (record.status_pagamento === 'pago' && data) {
          return <span style={{ color: 'green', fontSize: '12px' }}>{new Date(data).toLocaleString('pt-BR')}</span>;
        }
        return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
      }
    },
    {
      title: 'Data Transferência',
      dataIndex: 'dataTransferencia',
      key: 'dataTransferencia',
      render: (data) => data ? new Date(data).toLocaleString('pt-BR') : 'N/A'
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleVerDetalhes(record)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >

          </Button>
          {record.status_pagamento !== 'pago' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handlePagarConsultaEspecialidade(record)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Pagar Consulta
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Colunas para solicitações de exames
  // Helpers de extracção baseados na estrutura REAL da API:
  // { id, paciente_nid, paciente_nome, medico_nome, nome_exame, data_solicitacao, status }

  const extrairNomePaciente = (record) =>
    record.paciente_nome ||
    record.nome_paciente ||
    record.nome ||
    (record.paciente_primeiro_nome
      ? `${record.paciente_primeiro_nome} ${record.paciente_ultimo_nome || ''}`.trim()
      : '') ||
    record.paciente?.nome ||
    '';

  const extrairMedico = (record) =>
    record.medico_nome ||
    record.medico_solicitante ||
    record.solicitado_por ||
    record.nome_medico ||
    record.medico?.nome ||
    '';

  // Cada linha da API é UM exame — nome_exame é campo directo
  const extrairExames = (record) =>
    record.nome_exame ||
    record.examesSolicitados ||
    record.tipo_exame ||
    record.descricao ||
    '';

  const solicitacoesExamesColumns = [
    {
      title: 'NID',
      key: 'nid',
      width: 120,
      render: (_, record) => {
        const val = record.paciente_nid || record.nid || record.paciente?.nid;
        return val || <span style={{ color: '#ccc' }}>N/A</span>;
      }
    },
    {
      title: 'Nome do Paciente',
      key: 'nome',
      render: (_, record) => {
        const val = extrairNomePaciente(record);
        return val || <span style={{ color: '#ccc' }}>N/A</span>;
      }
    },
    {
      title: 'Médico Solicitante',
      key: 'medico_solicitante',
      render: (_, record) => {
        const val = extrairMedico(record);
        return val || <span style={{ color: '#ccc' }}>N/A</span>;
      }
    },
    {
      title: 'Exames Solicitados',
      key: 'examesSolicitados',
      render: (_, record) => {
        const texto = extrairExames(record);
        if (!texto) return <span style={{ color: '#ccc' }}>N/A</span>;
        return (
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {texto}
          </span>
        );
      }
    },
    {
      title: 'Data da Solicitação',
      key: 'dataSolicitacao',
      render: (_, record) => {
        const data = record.dataSolicitacao || record.data_solicitacao || record.created_at;
        return data ? new Date(data).toLocaleDateString('pt-BR') : 'N/A';
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = record.status;
        const statusConfig = {
          // Status real devolvido pela API
          'solicitado':       { color: '#fa8c16', text: 'Pendente Aprovação' },
          // Valores canónicos (após normalização)
          'pending':          { color: '#fa8c16', text: 'Pendente Aprovação' },
          'confirmada':       { color: '#1890ff', text: 'Confirmada - Aguard. Pagamento' },
          'paga':             { color: '#52c41a', text: 'Paga - Agendar Colheita' },
          'agendada':         { color: '#722ed1', text: 'Colheita Agendada' },
          'concluida':        { color: '#52c41a', text: 'Concluída' },
          'cancelada':        { color: '#ff4d4f', text: 'Cancelada' },
          // Aliases
          'pendente':         { color: '#fa8c16', text: 'Pendente Aprovação' },
          'confirmado':       { color: '#1890ff', text: 'Confirmado - Aguard. Pagamento' },
          'aceito':           { color: '#1890ff', text: 'Aceito - Aguard. Pagamento' },
          'pago':             { color: '#52c41a', text: 'Pago - Agendar Colheita' },
          'pago_laboratorio': { color: '#52c41a', text: 'Liberado para Laboratório' },
          'concluido':        { color: '#52c41a', text: 'Concluída' },
          'cancelado':        { color: '#ff4d4f', text: 'Cancelada' },
          'rejeitado':        { color: '#ff4d4f', text: 'Rejeitada' },
        };
        const config = statusConfig[status] || { color: '#999', text: status || 'Desconhecido' };
        return <span style={{ color: config.color, fontWeight: 'bold' }}>{config.text}</span>;
      }
    },
    {
      title: 'Status Pagamento',
      key: 'statusPagamento',
      render: (_, record) => {
        const status = record.statusPagamento || record.status_pagamento || 'pendente';
        if (record.status === 'pending' || record.status === 'pendente') {
          return <span style={{ color: '#999', fontSize: '12px' }}>-</span>;
        }
        const color = status === 'pago' ? 'green' : 'orange';
        const text = status === 'pago' ? 'Pago' : 'Pendente';
        return <span style={{ color, fontWeight: 'bold', fontSize: '12px' }}>{text}</span>;
      }
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 200,
      render: (_, record) => {
        const s = record.status;

        // pending / solicitado → Aceitar / Rejeitar
        if (s === 'pending' || s === 'solicitado' || s === 'pendente') {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={() => aceitarSolicitacaoExame(record)}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Aceitar
              </Button>
              <Button
                danger
                size="small"
                onClick={() => rejeitarSolicitacaoExame(record)}
              >
                Rejeitar
              </Button>
            </Space>
          );
        }
        // confirmada → Pagar Exame (se ainda não foi pago)
        if (s === 'confirmada' && record.statusPagamento !== 'pago') {
          return (
            <Space>
              <Button
                type="default"
                size="small"
                onClick={() => handlePagarExame(record)}
                style={{ background: '#fa8c16', color: 'white', borderColor: '#fa8c16' }}
              >
                Pagar Exame
              </Button>
            </Space>
          );
        }
        // paga → Agendar Colheita
        if (s === 'paga') {
          return (
            <Space>
              <Button
                type="default"
                size="small"
                onClick={() => handleMarcarExames(record)}
                style={{ background: '#1890ff', color: 'white', borderColor: '#1890ff' }}
              >
                Agendar Colheita
              </Button>
            </Space>
          );
        }
        // agendada / concluida / pago_laboratorio → processado
        if (s === 'agendada' || s === 'concluida' || s === 'pago_laboratorio') {
          return <span style={{ color: '#52c41a', fontSize: '13px', fontWeight: 'bold' }}>✓ Processado</span>;
        }
        // cancelada / rejeitada
        if (s === 'cancelada') {
          return <span style={{ color: '#ff4d4f', fontSize: '13px' }}>✗ Cancelada</span>;
        }
        // fallback: status desconhecido — mostra botões de pending por defeito
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={() => aceitarSolicitacaoExame(record)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Aceitar
            </Button>
            <Button
              danger
              size="small"
              onClick={() => rejeitarSolicitacaoExame(record)}
            >
              Rejeitar
            </Button>
          </Space>
        );
      }
    }
  ];

  // Filtro para Utentes Autônomos
  const filteredUtentesAutonomos = utentesAutonomos
    .filter(utente =>
      (utente.nome && utente.nome.toLowerCase().includes(searchText.toLowerCase())) ||
      (utente.apelido && utente.apelido.toLowerCase().includes(searchText.toLowerCase())) ||
      (utente.nome_completo && utente.nome_completo.toLowerCase().includes(searchText.toLowerCase())) ||
      (utente.hospital_proveniencia && utente.hospital_proveniencia.toLowerCase().includes(searchText.toLowerCase())) ||
      (utente.bilhete_identidade && utente.bilhete_identidade.includes(searchText)) ||
      (utente.nid && utente.nid.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort((a, b) => new Date(b.created_at || b.dataCadastro) - new Date(a.created_at || a.dataCadastro))
    .map(utente => ({ ...utente, key: utente.id })); // Forçar re-renderização com key única

  // Filtro para Pacientes Transferidos para Especialidades
  const filteredPacientesEspecialidade = pacientesTransferidosEspecialidade
    .filter(paciente =>
      (paciente.nome && paciente.nome.toLowerCase().includes(searchText.toLowerCase())) ||
      (paciente.apelido && paciente.apelido.toLowerCase().includes(searchText.toLowerCase())) ||
      (paciente.nid && paciente.nid.includes(searchText)) ||
      (paciente.especialidade && paciente.especialidade.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort((a, b) => new Date(b.dataTransferencia) - new Date(a.dataTransferencia));

  // Filtro para Solicitações de Exames
  const filteredSolicitacoesExames = examesPendentes
    .filter(exame =>
      !searchText ||
      (exame.nome && exame.nome.toLowerCase().includes(searchText.toLowerCase())) ||
      (exame.apelido && exame.apelido.toLowerCase().includes(searchText.toLowerCase())) ||
      (exame.nid && String(exame.nid).toLowerCase().includes(searchText.toLowerCase())) ||
      (exame.examesSolicitados && String(exame.examesSolicitados).toLowerCase().includes(searchText.toLowerCase())) ||
      (exame.medico_solicitante && exame.medico_solicitante.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort((a, b) => new Date(b.dataSolicitacao || b.data_solicitacao) - new Date(a.dataSolicitacao || a.data_solicitacao));

  // Renderizar o formulário de Utente Autônomo
  const renderUtenteAutonomoForm = () => {
    return (
      <Form
        form={utenteAutonomoForm}
        layout="vertical"
        onFinish={handleUtenteAutonomoSubmit}
        initialValues={editingUtenteAutonomo || {}}
      >
        {/* Mostrar NID apenas na edição */}
        {editingUtenteAutonomo && editingUtenteAutonomo.nid && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="NID (Gerado automaticamente)">
                <Input 
                  value={editingUtenteAutonomo.nid} 
                  disabled 
                  style={{ 
                    fontWeight: 'bold', 
                    color: '#1890ff',
                    backgroundColor: '#f0f9ff'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
        
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="apelido" label="Apelido" rules={[{ required: true, message: 'Por favor, insira o apelido' }]}>
              <Input placeholder="Apelido" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Por favor, insira o nome' }]}>
              <Input placeholder="Nome" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="hospitalProveniencia" label="Hospital de Proveniência" rules={[{ required: true, message: 'Por favor, informe o hospital de proveniência' }]}>
              <Input placeholder="Hospital de Proveniência" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="dataNascimento" label="Data de Nascimento" rules={[{ required: true, message: 'Por favor, selecione a data de nascimento' }]}>
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                disabledDate={current => current && !current.isBefore(dayjs().startOf('day'), 'day')}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="genero" label="Gênero" rules={[{ required: true, message: 'Por favor, selecione o gênero' }]}>
              <Select placeholder="Selecione o gênero">
                <Option value="Masculino">Masculino</Option>
                <Option value="Feminino">Feminino</Option>
                <Option value="outro">Outro</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true, message: 'Por favor, selecione o tipo de documento' }]}>
              <Select placeholder="Selecione o tipo de documento" loading={loadingPatientServiceConfig}>
                {Array.isArray(patientServiceTiposDocumentos) && patientServiceTiposDocumentos.length > 0 ? (
                  patientServiceTiposDocumentos.map(doc => (
                    <Option key={doc.id} value={doc.id}>{doc.nome}</Option>
                  ))
                ) : (
                  loadingPatientServiceConfig ? (
                    <Option disabled>Carregando tipos de documento...</Option>
                  ) : (
                    <Option disabled>Nenhum tipo de documento disponível</Option>
                  )
                )}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item name="bilheteIdentidade" label="Número do Documento" rules={[{ required: true, message: 'Por favor, insira o número do documento' }]}>
              <Input placeholder="Número do documento" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item
              name="celular"
              label="Celular"
              rules={[
                { required: true, message: "O número do celular é obrigatório" },
                {
                  pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                  message: "Número inválido"
                }
              ]}
            >
              <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <Form.Item
              name="celularalternativo"
              label="Celular Alternativo"
              rules={[
                {
                  pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                  message: "Número inválido"
                }
              ]}
            >
              <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {editingUtenteAutonomo ? 'Atualizar' : 'Cadastrar'}
            </Button>
            <Button onClick={() => setIsUtenteAutonomoModalVisible(false)}>Cancelar</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  // Modal para acompanhantes - será renderizado no retorno do componente principal
  // Novo Modal multi-step para Info do Utente (substitui o antigo de acompanhantes)
  const [acompanhanteStep, setAcompanhanteStep] = useState(0);
  const [acompanhanteFormValues, setAcompanhanteFormValues] = useState({});
  const [acompanhanteFormRef] = Form.useForm();

  // Transformar dados do backend para o formato esperado pelo Select
  const tiposDocumento = Array.isArray(patientServiceTiposDocumentos) ? patientServiceTiposDocumentos.map(tipo => ({
    value: tipo.id,
    label: tipo.nome
  })) : [];
  
  // provincias vem do hook useConfigurations - removido hardcoded

   // ];  // Helper para saber se o campo já foi preenchido no cadastro
  const isFieldFilledAndLocked = (field) => {
    // Se estiver no modo de edição, não bloqueia nenhum campo
    if (isEditModalVisible) return false;

    if (!currentPaciente) return false;
    
    // Mapear campo para suas variantes possíveis
    const fieldVariants = {
      apelido: ['apelido'],
      nome: ['nome'],
      dataNascimento: ['data_nascimento', 'dataNascimento'],
      genero: ['genero'],
      estadoCivil: ['estado_civil', 'estadoCivil'],
      raca: ['raca_id', 'racaId'],
      nacionalidade: ['nacionalidade_id', 'nacionalidadeId', 'nacionalidade'],
      provincia: ['provincia_id', 'provinciaId'],
      distrito: ['distrito_id', 'distritoId'],
      bairro: ['bairro_id', 'bairroId'],
      avenidaRuaCelula: ['avenida_rua_celula', 'avenidaRuaCelula'],
      numeroCasa: ['numero_casa', 'numeroCasa'],
      quarteirao: ['quarteirao'],
      bilheteIdentidade: ['bilhete_identidade', 'bilheteIdentidade'],
      celular: ['celular', 'telefone'],
      celularalternativo: ['celular_alternativo', 'celularAlternativo', 'celularalternativo'],
      whatsApp: ['whatsapp', 'whatsApp', 'whats_app'],
      email: ['email'],
      tipoUtente: ['tipo_utente_id', 'tipoUtenteId', 'tipoUtente'],
      unidadeOrganica: ['unidade_organica_id', 'unidadeOrganicaId', 'unidadeOrganica'],
      tipoDocumento: ['tipo_documento_id', 'tipoDocumentoId', 'tipoDocumento']
    };
    
    // Verificação específica para bilheteIdentidade - nunca bloquear se estiver vazio
    if (field === 'bilheteIdentidade') {
      const bilheteValue = currentPaciente.bilheteIdentidade || currentPaciente.bilhete_identidade;
      return bilheteValue !== undefined && bilheteValue !== '' && bilheteValue !== null;
    }
    
    // Verificar o campo principal primeiro
    if (currentPaciente[field] !== undefined && currentPaciente[field] !== '' && currentPaciente[field] !== null) {
      return true;
    }
    
    // Verificar variantes se existirem
    if (fieldVariants[field]) {
      for (const variant of fieldVariants[field]) {
        if (currentPaciente[variant] !== undefined && currentPaciente[variant] !== '' && currentPaciente[variant] !== null) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Helper para pegar o valor do campo já preenchido - REMOVIDO: não utilizado
  // const getFieldValueFromPaciente = (field) => {
  //   if (!currentPaciente) return undefined;
  //   return currentPaciente[field];
  // };
  // Função utilitária para garantir dayjs ou null para campos de data
  const getDayjsOrNull = (val) => {
    if (!val) return null;

    // Se for string ou Date, converte para dayjs
    if (typeof val === 'string' || val instanceof Date) {
      const d = dayjs(val);
      return d.isValid() ? d : null;
    }

    // Se já for um objeto dayjs
    if (typeof val === 'object') {
      // Verifica se é um objeto dayjs válido (tem a função isValid)
      if (val.isValid && typeof val.isValid === 'function') {
        return val.isValid() ? val : null;
      }

      // Se tem propriedade $d, provavelmente é um objeto dayjs
      if (val.$d) {
        const d = dayjs(val.$d);
        return d.isValid() ? d : null;
      }
    }

    return null;
  };  // Preenche e bloqueia campos já cadastrados ao abrir o modal
  React.useEffect(() => {
    if ((isAcompanhanteModalVisible || isEditModalVisible) && currentPaciente) {
      console.log('🔍 useEffect disparado - Preenchendo formulário de dados adicionais:', {
        modalVisivel: isAcompanhanteModalVisible ? 'acompanhante' : 'editar',
        pacienteId: currentPaciente.id,
        timestamp: new Date().toISOString(),
        camposDoPaciente: Object.keys(currentPaciente),
        dadosDoPaciente: currentPaciente,
        userHasChangedFormValues: userHasChangedFormValues,
        tipoUtenteAtual: {
          tipo_utente_id: currentPaciente.tipo_utente_id,
          tipoUtenteId: currentPaciente.tipoUtenteId,
          tipo_utente: currentPaciente.tipo_utente,
          tipoUtente: currentPaciente.tipoUtente
        }
      });

      // Se o usuário já fez alterações, não forçar valores iniciais
      if (isEditModalVisible && userHasChangedFormValues) {
        console.log('⚠️ Usuário já fez alterações - pulando preenchimento automático');
        return;
      }

      // Verificar se já existem valores no formulário antes de sobrescrever
      const valoresAtuaisFormulario = acompanhanteFormRef.getFieldsValue();
      console.log('⚠️ Valores que já estão no formulário (serão sobrescritos?):', {
        tipoUtenteAtual: valoresAtuaisFormulario.tipoUtente,
        todosOsCampos: Object.keys(valoresAtuaisFormulario).filter(k => valoresAtuaisFormulario[k] !== undefined)
      });
      
      // bilheteIdentidade será mapeado conforme necessário
      
      // Preenche apenas os campos que existem no paciente
      const initialValues = {};
      
      // Mapeamento de campos do formulário para campos do backend
      // Prioriza snake_case primeiro pois é o que vem do backend
      // NOTA: bilheteIdentidade removido - será tratado como campo simples igual aos utentes autônomos
      const fieldMapping = {
        tipoDocumento: ['tipo_documento_id', 'tipoDocumentoId'],
        dataNascimento: ['data_nascimento', 'dataNascimento'],
        estadoCivil: ['estado_civil', 'estadoCivil'],
        raca: ['raca_id', 'racaId'],
        nacionalidade: ['nacionalidade_id', 'nacionalidadeId', 'nacionalidade'],
        provincia: ['provincia_id', 'provinciaId'],
        distrito: ['distrito_id', 'distritoId'],
        bairro: ['bairro_id', 'bairroId'],
        avenidaRuaCelula: ['avenida_rua_celula', 'avenidaRuaCelula'],
        numeroCasa: ['numero_casa', 'numeroCasa'],
        celular: ['celular', 'telefone'],
        celularalternativo: ['celular_alternativo', 'celularAlternativo', 'celular_alternativo'],
        whatsApp: ['whatsapp', 'whatsApp', 'whats_app'],
        email: ['email', 'email_address'],
        tipoUtente: ['tipo_utente_id', 'tipoUtenteId'],
        unidadeOrganica: ['unidade_organica_id', 'unidadeOrganicaId', 'unidade_organica'],
        nomeFamiliarResponsavel: ['nome_familiar_responsavel', 'nomeFamiliarResponsavel'],
        unidadeOrganicaFamiliar: ['unidade_organica_familiar_id', 'unidadeOrganicaFamiliar'],
        bilheteIdentidade: ['bilhete_identidade', 'bilheteIdentidade']
      };
      
      acompanhanteSteps.forEach(step => {
        console.log(`📋 Processando step "${step.title}":`, step.fields);
        step.fields.forEach(field => {
          let value = currentPaciente[field];
          
          console.log(`🔎 Tentando campo "${field}":`, {
            valorDireto: value,
            temMapeamento: !!fieldMapping[field],
            camposAlternativos: fieldMapping[field]
          });
          
          // Debug específico para tipoUtente
          if (field === 'tipoUtente') {
            console.log('🏷️ Debug tipoUtente - valores disponíveis no paciente:', {
              tipo_utente_id: currentPaciente.tipo_utente_id,
              tipoUtenteId: currentPaciente.tipoUtenteId,
              tipo_utente: currentPaciente.tipo_utente,
              tipoUtente: currentPaciente.tipoUtente,
              allKeys: Object.keys(currentPaciente).filter(k => k.toLowerCase().includes('utente')),
              patientServiceTiposUtentesCount: patientServiceTiposUtentes?.length,
              patientServiceTiposUtentesFirst: patientServiceTiposUtentes?.[0],
              formFieldMappings: fieldMapping[field]
            });
            
            // CORREÇÃO: Forçar uso do valor numérico correto do backend
            const tipoUtenteIdCorreto = currentPaciente.tipo_utente_id || currentPaciente.tipoUtenteId;
            if (tipoUtenteIdCorreto) {
              value = tipoUtenteIdCorreto;
            }
          }
          
          // SEMPRE tentar mapeamento alternativo, mesmo que o valor direto exista
          if (fieldMapping[field]) {
            let foundValue = value; // Começar com o valor direto
            
            // Percorrer todos os campos alternativos
            for (const alternativeField of fieldMapping[field]) {
              const alternativeValue = currentPaciente[alternativeField];
              
              // Lógica padrão para todos os campos
              if (alternativeValue !== undefined && alternativeValue !== null && alternativeValue !== '') {
                foundValue = alternativeValue;
                break; // Usar o primeiro valor encontrado
              }
            }
            
            value = foundValue; // Usar o valor encontrado (pode ser o original ou alternativo)
          }
          
          // Só preenche se o valor não for undefined, null ou string vazia
          if (value !== undefined && value !== null && value !== '') {
            // Processamento especial para campos de data
            if (field === 'dataNascimento' || field === 'dataValidade') {
              initialValues[field] = getDayjsOrNull(value);
            } else {
              initialValues[field] = value;
            }
            console.log(`  ✅ Campo "${field}" será preenchido com:`, initialValues[field]);
          } else {
            console.log(`  ❌ Campo "${field}" NÃO encontrado no paciente (valor: ${value})`);
          }
        });
      });
      
      console.log('📝 Valores iniciais a serem preenchidos:', initialValues);
      console.log('🏷️ Debug específico - valor inicial do tipoUtente:', {
        'initialValues.tipoUtente': initialValues.tipoUtente,
        'typeof': typeof initialValues.tipoUtente,
        'isNumber': !isNaN(initialValues.tipoUtente),
        'parseInt': parseInt(initialValues.tipoUtente),
        'tipoUtenteObjFromService': getTipoUtenteById(initialValues.tipoUtente)
      });
      acompanhanteFormRef.setFieldsValue(initialValues);
      
      // SISTEMA AVANÇADO DE PRESERVAÇÃO DE VALORES
      let finalInitialValues = { ...initialValues };
      
      // Preservar valores acumulados de navegação
      if (acompanhanteFormValues && Object.keys(acompanhanteFormValues).length > 0) {
        console.log('🔄 INTEGRANDO VALORES ACUMULADOS:', {
          initialFields: Object.keys(initialValues).length,
          accumulatedFields: Object.keys(acompanhanteFormValues).length,
          accumulatedValues: acompanhanteFormValues
        });
        
        finalInitialValues = {
          ...initialValues,
          ...acompanhanteFormValues
        };
      }
      
      // Validar integridade dos valores finais
      const missingCriticalFields = [];
      const criticalFields = ['nome', 'apelido', 'genero', 'celular'];
      
      criticalFields.forEach(field => {
        if (!finalInitialValues[field]) {
          missingCriticalFields.push(field);
        }
      });
      
      if (missingCriticalFields.length > 0) {
        console.warn('⚠️ CAMPOS CRÍTICOS FALTANDO:', missingCriticalFields);
      }
      
      console.log('📝 VALORES FINAIS PARA INICIALIZAÇÃO:', {
        totalFields: Object.keys(finalInitialValues).length,
        criticalFieldsPresent: criticalFields.filter(field => finalInitialValues[field]).length,
        missingCriticalFields: missingCriticalFields,
        finalValues: finalInitialValues
      });
      
      // Debug: verificar se os valores foram definidos corretamente
      setTimeout(() => {
        const valoresAposSetFields = acompanhanteFormRef.getFieldsValue();
        console.log('✅ Valores verificados no formulário APÓS setFieldsValue:', {
          tipoUtente: valoresAposSetFields.tipoUtente,
          todosOsValores: valoresAposSetFields,
          initialTipoUtente: initialValues.tipoUtente,
          acompanhanteFormValuesTipoUtente: acompanhanteFormValues?.tipoUtente
        });
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAcompanhanteModalVisible, isEditModalVisible, currentPaciente, userHasChangedFormValues, patientServiceRacas, patientServiceDistritos, patientServiceBairros]);

  // Formulario de configuracao do utente apos a criacao dos dados de emergencia
  const acompanhanteSteps = [
    {
      title: 'Info. do Utente',
      fields: [
        'apelido', 'nome', 'tipoDocumento', 'bilheteIdentidade', 'dataNascimento', 'estadoCivil', 'genero', 'raca', 'nacionalidade', 'tipoUtente', 'unidadeOrganica', 'provincia', 'distrito',
        'bairro', 'avenidaRuaCelula', 'numeroCasa', 'quarteirao'
      ],
      content: (
        <>
          {/* Card para exibir dados já preenchidos - apenas no modal de acompanhante */}
          {!isEditModalVisible && currentPaciente && (
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f0f7ff' }}
              title={<span style={{ fontSize: 14, fontWeight: 'bold' }}>Dados já preenchidos:</span>}
            >
              <Row gutter={16}>
                {currentPaciente.apelido && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Apelido:</b> {currentPaciente.apelido}</Col>
                )}
                {currentPaciente.nome && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Nome:</b> {currentPaciente.nome}</Col>
                )}
                {(currentPaciente.tipoDocumentoId || currentPaciente.tipo_documento_id || currentPaciente.tipo_documento_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Tipo de Documento:</b> {
                    // Priorizar nome do backend
                    currentPaciente.tipo_documento_nome ||
                    patientServiceTiposDocumentos.find(t => sameId(t.id, (currentPaciente.tipoDocumentoId || currentPaciente.tipo_documento_id)))?.nome || 
                    tiposDocumento.find(t => t.value === (currentPaciente.tipoDocumentoId || currentPaciente.tipo_documento_id))?.label || 
                    (currentPaciente.tipoDocumentoId || currentPaciente.tipo_documento_id)
                  }</Col>
                )}
                {((currentPaciente.bilheteIdentidade && currentPaciente.bilheteIdentidade !== '' && currentPaciente.bilheteIdentidade !== null) || (currentPaciente.bilhete_identidade && currentPaciente.bilhete_identidade !== '' && currentPaciente.bilhete_identidade !== null)) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Nº Documento:</b> {currentPaciente.bilheteIdentidade || currentPaciente.bilhete_identidade}</Col>
                )}
                {currentPaciente.dataNascimento && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Data Nascimento:</b> {
                    dayjs(currentPaciente.dataNascimento).format('DD/MM/YYYY')
                  }</Col>
                )}
                {(currentPaciente.estadoCivil || currentPaciente.estado_civil_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Estado Civil:</b> {
                    // Priorizar nome do backend
                    currentPaciente.estado_civil_nome || 
                    ({
                      'solteiro': 'Solteiro',
                      'casado': 'Casado',
                      'divorciado': 'Divorciado',
                      'viuvo': 'Viúvo'
                    }[currentPaciente.estadoCivil] || currentPaciente.estadoCivil)
                  }</Col>
                )}
                {currentPaciente.genero && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Gênero:</b> {
                    {
                      'masculino': 'Masculino',
                      'feminino': 'Feminino',
                      'outro': 'Outro'
                    }[currentPaciente.genero] || currentPaciente.genero
                  }</Col>
                )}
                {(currentPaciente.racaId || currentPaciente.raca_id || currentPaciente.raca_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Raça:</b> {
                    // Priorizar nome do backend
                    currentPaciente.raca_nome ||
                    (() => {
                      const racaId = currentPaciente.racaId || currentPaciente.raca_id;
                      if (Array.isArray(patientServiceRacas)) {
                        const raca = patientServiceRacas.find(r => sameId(r.id, racaId));
                        return raca?.nome || 'Não informado';
                      }
                      return racaId;
                    })()
                  }</Col>
                )}
                {(currentPaciente.nacionalidade || currentPaciente.nacionalidade_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Nacionalidade:</b> {currentPaciente.nacionalidade_nome || currentPaciente.nacionalidade}</Col>
                )}
                {(currentPaciente.provinciaId || currentPaciente.provincia_id || currentPaciente.provincia_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Província de Residência/Proveniência:</b> {
                    // Priorizar nome do backend, depois buscar no serviço, depois mostrar ID
                    currentPaciente.provincia_nome ||
                    (() => {
                      const provinciaId = currentPaciente.provinciaId || currentPaciente.provincia_id;
                      if (Array.isArray(patientServiceProvincias)) {
                        const provincia = patientServiceProvincias.find(p => sameId(p.id, provinciaId));
                        return provincia?.nome || 'Não informado';
                      }
                      return provinciaId;
                    })()
                  }</Col>
                )}
                {(currentPaciente.distritoId || currentPaciente.distrito_id || currentPaciente.distrito_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Distrito:</b> {
                    // Priorizar nome do backend, depois buscar no serviço, depois mostrar ID
                    currentPaciente.distrito_nome ||
                    (() => {
                      const distritoId = currentPaciente.distritoId || currentPaciente.distrito_id;
                      console.log('🏙️ Buscando distrito:', { distritoId, distrito_nome: currentPaciente.distrito_nome });
                      
                      if (Array.isArray(patientServiceDistritos) && patientServiceDistritos.length > 0) {
                        const distrito = patientServiceDistritos.find(d => sameId(d.id, distritoId));
                        return distrito?.nome || 'Não informado';
                      }
                      
                      return 'Não informado';
                    })()
                  }</Col>
                )}
                {(currentPaciente.bairroId || currentPaciente.bairro_id || currentPaciente.bairro_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Bairro:</b> {
                    // Priorizar nome do backend, depois buscar no serviço, depois mostrar ID
                    currentPaciente.bairro_nome ||
                    (() => {
                      const bairroId = currentPaciente.bairroId || currentPaciente.bairro_id;
                      console.log('🏠 Buscando bairro:', { bairroId, bairro_nome: currentPaciente.bairro_nome });
                      
                      if (Array.isArray(patientServiceBairros) && patientServiceBairros.length > 0) {
                        const bairro = patientServiceBairros.find(b => sameId(b.id, bairroId));
                        return bairro?.nome || 'Não informado';
                      }
                      
                      return 'Não informado';
                    })()
                  }</Col>
                )}
                {currentPaciente.avenidaRuaCelula && (
                  <Col span={8}><b>Av/Rua/Célula:</b> {currentPaciente.avenidaRuaCelula}</Col>
                )}
                {currentPaciente.quarteirao && (
                  <Col span={8}><b>Quarteirão:</b> {currentPaciente.quarteirao}</Col>
                )}
                {currentPaciente.numeroCasa && (
                  <Col span={8}><b>Nº Casa:</b> {currentPaciente.numeroCasa}</Col>
                )}
              </Row>
            </Card>
          )}
          <Row gutter={8}>
            {!isFieldFilledAndLocked('apelido') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="apelido" label="Apelido" rules={[{ required: true }]}>
                  <Input placeholder="Apelido" disabled={isFieldFilledAndLocked('apelido')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('nome') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="nome" label="Outro Nome" rules={[{ required: true }]}>
                  <Input placeholder="Nome" disabled={isFieldFilledAndLocked('nome')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('tipoDocumento') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="tipoDocumento" label="Tipo de Documento" rules={[{ required: true }]}>
                  <Select placeholder="Selecione o tipo de documento" disabled={isFieldFilledAndLocked('tipoDocumento')}>
                    {tiposDocumento.map(doc => (
                      <Option key={doc.value} value={doc.value}>{doc.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('bilheteIdentidade') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="bilheteIdentidade" label="Número do Documento" rules={[{ required: true }]}>
                  <Input placeholder="Número do documento" disabled={isFieldFilledAndLocked('bilheteIdentidade')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('dataNascimento') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="dataNascimento" label="Data de Nascimento" rules={[{ required: true }]}>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    placeholder="Selecione a data de nascimento"
                    disabled={isFieldFilledAndLocked('dataNascimento')}
                    disabledDate={current => current && !current.isBefore(dayjs().startOf('day'), 'day')}
                  />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('estadoCivil') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="estadoCivil" label="Estado Civil" rules={[{ required: true }]}>
                  <Select placeholder="Selecione o estado civil" disabled={isFieldFilledAndLocked('estadoCivil')} optionLabelProp="label">
                    <Option value="solteiro" label="Solteiro">Solteiro</Option>
                    <Option value="casado" label="Casado">Casado</Option>
                    <Option value="divorciado" label="Divorciado">Divorciado</Option>
                    <Option value="viuvo" label="Viúvo">Viúvo</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('genero') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="genero" label="Gênero" rules={[{ required: true }]}>
                  <Select placeholder="Selecione o gênero" disabled={isFieldFilledAndLocked('genero')}>
                    <Option value="masculino">Masculino</Option>
                    <Option value="feminino">Feminino</Option>
                    <Option value="outro">Outro</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('raca') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="raca" label="Raça" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Selecione a raça"
                    loading={loadingPatientServiceConfig}
                    disabled={isFieldFilledAndLocked('raca')}
                    showSearch
                    optionFilterProp="children"
                  >
                    {Array.isArray(patientServiceRacas) && patientServiceRacas.map(raca => (
                      <Option key={raca.id} value={raca.id} label={raca.nome}>
                        {raca.nome}
                      </Option>
                    ))}
                    {patientServiceRacas?.length === 0 && loadingPatientServiceConfig && (
                      <Option disabled>Carregando raças...</Option>
                    )}
                    {patientServiceRacas?.length === 0 && !loadingPatientServiceConfig && (
                      <Option disabled>Nenhuma raça encontrada</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('nacionalidade') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="nacionalidade" label="Nacionalidade" rules={[{ required: true }]}>
                  <Input placeholder="Nacionalidade" disabled={isFieldFilledAndLocked('nacionalidade')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('provincia') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="provincia" label="Província de Residência/Proveniência" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Selecione a província"
                    onChange={(value) => handleProvinciaChange(value, form)}
                    loading={loadingPatientServiceConfig}
                    disabled={isFieldFilledAndLocked('provincia')}
                    optionLabelProp="label"
                  >
                    {Array.isArray(patientServiceProvincias) && patientServiceProvincias.map(prov => (
                      <Option key={prov.id || prov} value={prov.id || prov} label={prov.nome || prov}>
                        {prov.nome || prov}
                      </Option>
                    ))}
                    {(!Array.isArray(patientServiceProvincias) || patientServiceProvincias.length === 0) && loadingPatientServiceConfig && (
                      <Option disabled>Carregando províncias...</Option>
                    )}
                    {(!Array.isArray(patientServiceProvincias) || patientServiceProvincias.length === 0) && !loadingPatientServiceConfig && (
                      <Option disabled>Nenhuma província encontrada</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('distrito') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="distrito" label="Distrito" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Selecione o distrito"
                    onChange={(value) => handleDistritoChange(value, form)}
                    loading={loadingDistritos}
                    disabled={isFieldFilledAndLocked('distrito') || (patientServiceDistritos.length === 0 && !loadingDistritos)}
                    showSearch
                    optionFilterProp="children"
                  >
                    {Array.isArray(patientServiceDistritos) && patientServiceDistritos.map(dist => (
                      <Option key={dist.id || dist} value={dist.id || dist} label={dist.nome || dist}>
                        {dist.nome || dist}
                      </Option>
                    ))}
                    {patientServiceDistritos.length === 0 && !loadingDistritos && (
                      <Option disabled>Selecione primeiro uma província</Option>
                    )}
                    {loadingDistritos && (
                      <Option disabled>Carregando distritos...</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('bairro') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="bairro" label="Bairro" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Selecione o bairro"
                    loading={loadingBairros}
                    disabled={isFieldFilledAndLocked('bairro') || (patientServiceBairros.length === 0 && !loadingBairros)}
                    showSearch
                    optionFilterProp="children"
                  >
                    {Array.isArray(patientServiceBairros) && patientServiceBairros.map(bairro => (
                      <Option key={bairro.id || bairro} value={bairro.id || bairro} label={bairro.nome || bairro}>
                        {bairro.nome || bairro}
                      </Option>
                    ))}
                    {patientServiceBairros.length === 0 && !loadingBairros && (
                      <Option disabled>Selecione primeiro um distrito</Option>
                    )}
                    {loadingBairros && (
                      <Option disabled>Carregando bairros...</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('avenidaRuaCelula') && (
              <Col span={12}>
                <Form.Item name="avenidaRuaCelula" label="Av/Rua/Célula" rules={[{ required: true, message: 'Por favor, insira a avenida/rua/célula' }]}>
                  <Input placeholder="Av/Rua/Célula" disabled={isFieldFilledAndLocked('avenidaRuaCelula')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('quarteirao') && (
              <Col span={12}>
                <Form.Item name="quarteirao" label="Quarteirão" rules={[{ required: true }]}>
                  <Input placeholder="Quarteirão" disabled={isFieldFilledAndLocked('quarteirao')} />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('numeroCasa') && (
              <Col span={12}>
                <Form.Item name="numeroCasa" label="Número da Casa" rules={[{ required: true }]}>
                  <Input placeholder="Número da casa" disabled={isFieldFilledAndLocked('numeroCasa')} />
                </Form.Item>
              </Col>
            )}

            {(!currentPaciente?.documento || isEditModalVisible) && (
              <Col span={12}>
                <Form.Item name="documento" label="Documento (Anexo)">
                  <Upload>
                    <Button icon={<UploadOutlined />}>Anexar Documento</Button>
                  </Upload>
                </Form.Item>
              </Col>
            )}
          </Row>
        </>
      )
    },
    {
      title: 'Contato',
      fields: ['celular', 'celularalternativo', 'email', 'whatsApp'],
      content: (
        <>

          {!isEditModalVisible && currentPaciente && (
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f0f7ff' }}
              title={<span style={{ fontSize: 14, fontWeight: 'bold' }}>Dados já preenchidos:</span>}
            >
              <Row gutter={16}>
                {currentPaciente.celular && (
                  <Col xs={24} sm={12} md={12} lg={12} xl={12}><b>Celular:</b> {currentPaciente.celular}</Col>
                )}
                {(currentPaciente.celularalternativo || currentPaciente.celular_alternativo || currentPaciente.celularAlternativo) && (
                  <Col xs={24} sm={12} md={12} lg={12} xl={12}><b>Celular Alternativo:</b> {currentPaciente.celularalternativo || currentPaciente.celular_alternativo || currentPaciente.celularAlternativo}</Col>
                )}
                {currentPaciente.email && (
                  <Col xs={24} sm={12} md={12} lg={12} xl={12}><b>Email:</b> {currentPaciente.email}</Col>
                )}
                {(currentPaciente.whatsApp || currentPaciente.whatsapp || currentPaciente.whats_app) && (
                  <Col xs={24} sm={12} md={12} lg={12} xl={12}><b>WhatsApp:</b> {currentPaciente.whatsApp || currentPaciente.whatsapp || currentPaciente.whats_app}</Col>
                )}
              </Row>
            </Card>
          )}
          <Row gutter={8}>
            {!isFieldFilledAndLocked('celular') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item
                  name="celular"
                  label="Celular"
                  rules={[
                    { required: true, message: "O número do celular é obrigatório" },
                    {
                      pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                      message: "Número inválido"
                    }
                  ]}
                >
                  <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('celularalternativo') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item
                  name="celularalternativo"
                  label="Celular Alternativo"
                  rules={[
                    {
                      pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                      message: "Número inválido"
                    }
                  ]}
                >
                  <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('email') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    {
                      type: 'email',
                      message: 'Por favor insira um email válido!',
                    }
                  ]}
                >
                  <Input placeholder="Email" />
                </Form.Item>
              </Col>
            )}
            {!isFieldFilledAndLocked('whatsApp') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item
                  name="whatsApp"
                  label="WhatsApp"
                  rules={[
                    {
                      pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                      message: "Número inválido"
                    }
                  ]}
                >
                  <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
                </Form.Item>
              </Col>
            )}
          </Row>
        </>
      )
    },
    {
      title: 'Perfil do Utente',
      fields: ['tipoUtente', 'unidadeOrganica', 'nomeFamiliarResponsavel', 'unidadeOrganicaFamiliar'],
      content: (
        <>
          {!isEditModalVisible && currentPaciente && (
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f0f7ff' }}
              title={<span style={{ fontSize: 14, fontWeight: 'bold' }}>Dados já preenchidos:</span>}
            >
              <Row gutter={16}>
                {(currentPaciente.tipoUtenteId || currentPaciente.tipo_utente_id || currentPaciente.tipoUtente || currentPaciente.tipo_utente_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Tipo de Utente:</b> {
                    // Priorizar nome do backend
                    currentPaciente.tipo_utente_nome ||
                    (() => {
                      const tipoUtenteId = currentPaciente.tipoUtenteId || currentPaciente.tipo_utente_id;
                      const tipoUtenteNome = currentPaciente.tipoUtente;
                      
                      if (tipoUtenteId && Array.isArray(patientServiceTiposUtentes)) {
                        const tipoUtente = getTipoUtenteById(tipoUtenteId);
                        return tipoUtente?.nome || `Tipo ${tipoUtenteId}`;
                      }
                      
                      if (Array.isArray(tipoUtenteNome)) {
                        return tipoUtenteNome.map(tipo => ({
                          'estudanteNaoBolseiro': 'Estudante Não Bolseiro',
                          'estudanteBolseiro': 'Estudante Bolseiro',
                          'estudanteMestrado': 'Estudante Mestrado',
                          'estudanteDoutoramento': 'Estudante Doutoramento',
                          'docente': 'Docente',
                          'funcionario': 'Funcionário',
                          'comunidade': 'Comunidade'
                        }[tipo] || tipo)).join(', ');
                      }
                      
                      return ({
                        'estudanteNaoBolseiro': 'Estudante Não Bolseiro',
                        'estudanteBolseiro': 'Estudante Bolseiro',
                        'estudanteMestrado': 'Estudante Mestrado',
                        'estudanteDoutoramento': 'Estudante Doutoramento',
                        'docente': 'Docente',
                        'funcionario': 'Funcionário',
                        'comunidade': 'Comunidade'
                      }[tipoUtenteNome] || tipoUtenteNome || tipoUtenteId);
                    })()
                  }</Col>
                )}
                {(currentPaciente.profissao || currentPaciente.profissao_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Profissão:</b> {currentPaciente.profissao_nome || currentPaciente.profissao}</Col>
                )}
                {currentPaciente.localTrabalho && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Local de Trabalho:</b> {currentPaciente.localTrabalho}</Col>
                )}
                {(currentPaciente.unidadeOrganicaId || currentPaciente.unidade_organica_id || currentPaciente.unidadeOrganica || currentPaciente.unidade_organica_nome) && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Unidade Orgânica:</b> {
                    // Priorizar nome do backend
                    currentPaciente.unidade_organica_nome ||
                    (() => {
                      const unidadeId = currentPaciente.unidadeOrganicaId || currentPaciente.unidade_organica_id;
                      if (unidadeId && Array.isArray(patientServiceUnidadesOrganicas)) {
                        const unidade = patientServiceUnidadesOrganicas.find(u => sameId(u.id, unidadeId));
                        return unidade?.nome || `Unidade ${unidadeId}`;
                      }
                      return currentPaciente.unidadeOrganica || unidadeId;
                    })()
                  }</Col>
                )}
                {currentPaciente.unidadeOrganicaDocente && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Unidade Orgânica Docente:</b> {currentPaciente.unidadeOrganicaDocente}</Col>
                )}                              
                {currentPaciente.sectorTrabalho && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Setor de Trabalho:</b> {currentPaciente.sectorTrabalho}</Col>
                )}
                {currentPaciente.profissaoComunidade && (
                  <Col xs={24} sm={12} md={8} lg={8} xl={8}><b>Profissão:</b> {currentPaciente.profissaoComunidade}</Col>
                )}
              </Row>
            </Card>
          )}
          <Row gutter={8}>
            {!isFieldFilledAndLocked('tipoUtente') && (
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Por favor, selecione o tipo de utente' }]}>
                  <Select 
                    placeholder="Selecione o tipo de utente"
                    loading={loadingPatientServiceConfig}
                    onChange={(value) => {
                      console.log('🔄 Usuário alterou tipoUtente para:', value);
                      setUserHasChangedFormValues(true);
                    }}
                  >
                    {Array.isArray(patientServiceTiposUtentes) && patientServiceTiposUtentes.map(tipo => (
                      <Option key={tipo.id} value={tipo.id}>{tipo.nome}</Option>
                    ))}
                    {patientServiceTiposUtentes.length === 0 && loadingPatientServiceConfig && (
                      <Option disabled>Carregando tipos de utentes...</Option>
                    )}
                    {patientServiceTiposUtentes.length === 0 && !loadingPatientServiceConfig && (
                      <Option disabled>Nenhum tipo de utente encontrado</Option>
                    )}
                  </Select>
                </Form.Item>
              </Col>
            )}

            {/* Campo para unidade orgânica para Estudante/Funcionário/Investigador */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
              prevValues.tipoUtente !== currentValues.tipoUtente
            }>
              {({ getFieldValue }) => {
                const tipoUtenteIdSelecionado = getFieldValue('tipoUtente');
                console.log("Tipo de utente selecionado:", tipoUtenteIdSelecionado);
                
                // Buscar o tipo de utente pelo ID para verificar o código
                const tipoUtenteSelecionado = getTipoUtenteById(tipoUtenteIdSelecionado);
                const codigoTipo = tipoUtenteSelecionado?.codigo;
                
                // Verificar se precisa unidade orgânica (por código ou ID)
                const tiposQueNeedUnidadeOrganica = ['EST-NB', 'EST-B', 'EST-M', 'EST-D', 'FUNC', 'INV', 'DOC'];
                const precisaUnidadeOrganica = tiposQueNeedUnidadeOrganica.includes(codigoTipo);
                
                console.log("Precisa unidade orgânica:", precisaUnidadeOrganica, "código:", codigoTipo);

                return !isFieldFilledAndLocked('unidadeOrganica') && precisaUnidadeOrganica ? (
                  <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <Form.Item
                      name="unidadeOrganica"
                      label="Unidade Orgânica (Faculdade)"
                      rules={[{ required: true, message: 'Por favor, selecione a faculdade' }]}
                    >
                      <Select 
                        placeholder="Selecione a faculdade"
                        loading={loadingPatientServiceConfig}
                        onChange={(value) => {
                          console.log('🏢 Usuário alterou unidadeOrganica para:', value);
                          setUserHasChangedFormValues(true);
                        }}
                      >
                        {patientServiceUnidadesOrganicas.length > 0 ? (
                          patientServiceUnidadesOrganicas.map(unidade => (
                            <Option key={unidade.id} value={unidade.id}>{unidade.nome}</Option>
                          ))
                        ) : (
                          loadingPatientServiceConfig ? (
                            <Option disabled>Carregando unidades orgânicas...</Option>
                          ) : (
                            <Option disabled>Nenhuma unidade orgânica encontrada</Option>
                          )
                        )}
                      </Select>
                    </Form.Item>
                  </Col>
                ) : null;
              }}
            </Form.Item>

            {/* Campo para familiar responsável quando é selecionado familiar */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
              prevValues.tipoUtente !== currentValues.tipoUtente
            }>
              {({ getFieldValue }) => {
                const tipoUtenteIdSelecionado = getFieldValue('tipoUtente');
                
                // Buscar o tipo de utente pelo ID para verificar o código
                const tipoUtenteSelecionado = getTipoUtenteById(tipoUtenteIdSelecionado);
                const codigoTipo = tipoUtenteSelecionado?.codigo;
                
                // Verificar se é familiar (FAM-DOC, FAM-FUNC, FAM-INV)
                const tiposFamiliares = ['FAM-DOC', 'FAM-FUNC', 'FAM-INV'];
                const isFamiliar = tiposFamiliares.includes(codigoTipo);
                
                console.log('🔍 Verificação Familiar:', {
                  tipoUtenteId: tipoUtenteIdSelecionado,
                  codigo: codigoTipo,
                  nome: tipoUtenteSelecionado?.nome,
                  isFamiliar
                });
                
                if (isFamiliar) {
                  return <>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                      <Form.Item
                        name="nomeFamiliarResponsavel"
                        label="Nome Completo do Familiar Responsável"
                        rules={[{ required: true, message: 'Por favor, digite o nome do familiar responsável' }]}
                      >
                        <Input 
                          placeholder="Digite o nome completo do familiar responsável" 
                          onChange={(e) => {
                            console.log('👨‍👩‍👧‍👦 Usuário alterou nomeFamiliarResponsavel para:', e.target.value);
                            setUserHasChangedFormValues(true);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                      <Form.Item
                        name="unidadeOrganicaFamiliar"
                        label="Unidade Orgânica do Familiar Responsável"
                        rules={[{ required: true, message: 'Por favor, selecione a unidade orgânica do familiar responsável' }]}
                      >
                        <Select 
                          placeholder="Selecione a unidade orgânica do familiar responsável"
                          onChange={(value) => {
                            console.log('🏢 Usuário alterou unidadeOrganicaFamiliar para:', value);
                            setUserHasChangedFormValues(true);
                          }}
                        >
                          {patientServiceUnidadesOrganicas.map(unidade => (
                            <Option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </Option>
                          ))}
                          {patientServiceUnidadesOrganicas.length === 0 && (
                            <Option disabled>Nenhuma unidade orgânica disponível</Option>
                          )}
                        </Select>
                      </Form.Item>
                    </Col>
                  </>;
                }
                return null;
              }}
            </Form.Item>

            {/* Campo para unidade orgânica quando docente é selecionado */}
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
              prevValues.tipoUtente !== currentValues.tipoUtente
            }>
              {({ getFieldValue }) => {
                const tipoUtente = getFieldValue('tipoUtente');
                const tipoSelecionado = patientServiceTiposUtentes.find(tipo => sameId(tipo.id, tipoUtente));
                const isDocente = tipoSelecionado?.codigo === 'DOC';

                return !isFieldFilledAndLocked('unidadeOrganicaDocente') && isDocente ? (
                  <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <Form.Item
                      name="unidadeOrganicaDocente"
                      label="Unidades Orgânicas onde Leciona"
                      rules={[{ required: true, message: 'Por favor, selecione as faculdades onde leciona' }]}
                    >
                      <Select mode="multiple" placeholder="Selecione as faculdades onde leciona">
                        {patientServiceUnidadesOrganicas.map(unidade => (
                          <Option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </Option>
                        ))}
                        {patientServiceUnidadesOrganicas.length === 0 && (
                          <Option disabled>Nenhuma unidade orgânica disponível</Option>
                        )}
                      </Select>
                    </Form.Item>
                  </Col>
                ) : null;
              }}
            </Form.Item>

            {/* Campo para funcionário removido conforme solicitado */}                          {/* Campo para comunidade removido conforme solicitado */}
          </Row>
        </>
      )
    },
    {
      title: 'Parentes',
      fields: ['parentes'],
      content: (
        <div>
          {/* Card para exibir dados já preenchidos - apenas no modal de acompanhante */}
          {!isEditModalVisible && currentPaciente && currentPaciente.parentes && currentPaciente.parentes.length > 0 && (
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f0f7ff' }}
              title={<span style={{ fontSize: 14, fontWeight: 'bold' }}>Parentes já cadastrados:</span>}
            >
              {currentPaciente.parentes.map((parente, index) => (
                <Row gutter={16} key={index} style={{ marginBottom: index < currentPaciente.parentes.length - 1 ? 8 : 0 }}>
                  <Col xs={24} sm={8} md={8} lg={8} xl={8}><b>Nome:</b> {parente.nome}</Col>
                  <Col xs={24} sm={8} md={8} lg={8} xl={8}><b>Grau:</b> {
                    patientServiceGrausParentesco.find(grau => grau.codigo === parente.grauParentesco)?.nome || parente.grauParentesco
                  }</Col>
                  <Col xs={24} sm={8} md={8} lg={8} xl={8}><b>Celular:</b> {parente.celular}</Col>
                </Row>
              ))}
            </Card>
          )}

          <Form.List name="parentes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 16, border: '1px solid #f0f0f0', padding: 16, borderRadius: 8, background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 'bold' }}>Parente #{name + 1}</div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                    </div>
                    <Row gutter={16}>
                      <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'nome']}
                          label="Nome do Parente"
                          rules={[{ required: true, message: 'Por favor, insira o nome do parente' }]}
                        >
                          <Input placeholder="Nome completo" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'grauParentesco']}
                          label="Grau de Parentesco"
                          rules={[{ required: true, message: 'Por favor, selecione o grau de parentesco' }]}
                        >
                          <Select 
                            placeholder="Selecione o grau de parentesco"
                            loading={loadingPatientServiceConfig}
                            notFoundContent={loadingPatientServiceConfig ? 'Carregando...' : 'Nenhum grau encontrado'}
                          >
                            {Array.isArray(patientServiceGrausParentesco) && patientServiceGrausParentesco.map(grau => (
                              <Option key={grau.id} value={grau.codigo}>
                                {grau.nome}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'celular']}
                          label="Celular Emergência"
                          rules={[
                            { required: true, message: "O número do celular é obrigatório" },
                            {
                              pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                              message: "Número inválido"
                            }
                          ]}
                        >
                          <Input placeholder="Digite o 8XXXXXXXX" addonBefore="+258" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6} lg={6} xl={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'celular']}
                          label="Celular Alternativo"
                          rules={[
                            { required: true, message: "O número do celular é obrigatório" },
                            {
                              pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                              message: "Número inválido"
                            }
                          ]}
                        >
                          <Input placeholder="Digite o 8XXXXXXXX" addonBefore="+258" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 16 }}
                  >
                    Adicionar Parente
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </div>
      )
    }
  ];

  const handleAcompanhanteNext = async () => {
    try {
      const currentStepTitle = acompanhanteSteps[acompanhanteStep].title;
      const currentStepFields = acompanhanteSteps[acompanhanteStep].fields;
      
      console.log(`📋 Step "${currentStepTitle}" - Validando campos:`, currentStepFields);
      
      const values = await acompanhanteFormRef.validateFields(currentStepFields);
      
      console.log(`✅ Valores coletados no step "${currentStepTitle}":`, values);
      
      // Debug específico para bilheteIdentidade
      if (values.bilheteIdentidade !== undefined) {
        console.log('🎯 bilheteIdentidade coletado no step:', values.bilheteIdentidade);
      } else if (currentStepFields.includes('bilheteIdentidade')) {
        console.log('⚠️ bilheteIdentidade estava na lista mas não foi coletado');
      }
      
      // Verificar especificamente distrito e bairro
      if (values.distrito !== undefined) {
        console.log('🎯 DISTRITO coletado:', values.distrito, typeof values.distrito);
      }
      if (values.bairro !== undefined) {
        console.log('🎯 BAIRRO coletado:', values.bairro, typeof values.bairro);
      }

      // Processa campos de data para garantir que são objetos dayjs válidos
      const processedValues = { ...values };
      if (processedValues.dataNascimento) {
        processedValues.dataNascimento = getDayjsOrNull(processedValues.dataNascimento);
      }
      if (processedValues.dataValidade) {
        processedValues.dataValidade = getDayjsOrNull(processedValues.dataValidade);
      }

      // ACUMULAÇÃO INTELIGENTE DE VALORES
      const updatedFormValues = { ...acompanhanteFormValues, ...processedValues };

      
      console.log('📊 ACUMULAÇÃO DE VALORES:', {
        stepTitle: currentStep.title,
        previouslyAccumulated: Object.keys(acompanhanteFormValues || {}).length,
        newFromThisStep: Object.keys(processedValues).length,
        totalAccumulated: Object.keys(updatedFormValues).length,
        newValues: processedValues,
        allAccumulated: updatedFormValues
      });
      
      // PROTEÇÃO ESPECÍFICA PARA CAMPOS CRÍTICOS
      const camposCriticos = ['tipoUtente', 'bilheteIdentidade', 'provincia', 'distrito'];
      
      camposCriticos.forEach(campo => {
        if (processedValues[campo] !== undefined) {
          updatedFormValues[campo] = processedValues[campo];
          console.log(`🛡️ CAMPO CRÍTICO PRESERVADO - ${campo}:`, processedValues[campo]);
        }
      });
      
      // DETECÇÃO DE MUDANÇAS DO USUÁRIO
      const camposComMudanca = Object.keys(processedValues).filter(campo => {
        const valorOriginal = editingPaciente?.[campo] || 
                             editingPaciente?.[campo.replace(/([A-Z])/g, '_$1').toLowerCase()];
        return processedValues[campo] !== valorOriginal;
      });
      
      if (camposComMudanca.length > 0) {
        setUserHasChangedFormValues(true);
        console.log('👤 USUÁRIO FEZ ALTERAÇÕES:', camposComMudanca);
      }
      
      // ATUALIZAR ESTADOS
      setAcompanhanteFormValues(updatedFormValues);
      setAcompanhanteStep(acompanhanteStep + 1);
      
      console.log('✅ NAVEGAÇÃO CONCLUÍDA:', {
        novoStep: acompanhanteStep + 2,
        totalValoresAcumulados: Object.keys(updatedFormValues).length
      });
    } catch (err) { 
      console.error('❌ Erro na validação do step:', err);
    }
  };

  const handleAcompanhantePrev = () => {
    // Debug para navegação reversa
    console.log('⬅️ Voltando do step', acompanhanteStep, 'para', acompanhanteStep - 1);
    console.log('📊 Estado atual acompanhanteFormValues.tipoUtente:', acompanhanteFormValues?.tipoUtente);
    
    setAcompanhanteStep(acompanhanteStep - 1);
  }; 

  const renderAcompanhanteModal = (isEdit = false) => {
    // Determine which modal is being rendered (edit or configure)
    // const isVisible = isEdit ? isEditModalVisible : isAcompanhanteModalVisible; // REMOVIDO: não utilizado
    // const modalTitle = isEdit ? "Editar Utente" : "Info. do Utente"; // REMOVIDO: não utilizado  
    // const patientData = isEdit ? editingPaciente : currentPaciente; // REMOVIDO: não utilizado

    const handleCancel = () => {
      if (isEdit) {
        setIsEditModalVisible(false);
      } else {
        setIsAcompanhanteModalVisible(false);
      }
      setAcompanhanteStep(0);
      setAcompanhanteFormValues({});
      setUserHasChangedFormValues(false);
      acompanhanteFormRef.resetFields();
    };

    const handleFinish = async () => {
      try {
        console.log('🏁 INICIANDO FINALIZAÇÃO - Validação completa de todas as steps');
        
        // 🔥 CAPTURAR VALORES ATUAIS DO FORMULÁRIO ANTES DA VALIDAÇÃO
        const valoresAtuaisCompletos = acompanhanteFormRef.getFieldsValue(true);
        console.log('🎯 VALORES ATUAIS DO FORMULÁRIO (ANTES DA VALIDAÇÃO):', {
          tipoUtente: valoresAtuaisCompletos.tipoUtente,
          todosOsCampos: valoresAtuaisCompletos,
          tipoTipoUtente: typeof valoresAtuaisCompletos.tipoUtente
        });
        
        // SNAPSHOT INICIAL: Capturar todos os estados
        console.log('📸 SNAPSHOT INICIAL:', {
          acompanhanteStep,
          totalSteps: acompanhanteSteps.length,
          acompanhanteFormValuesKeys: Object.keys(acompanhanteFormValues || {}),
          userHasChangedFormValues,
          editingPacienteId: editingPaciente?.id,
          tipoUtenteNoFormulario: valoresAtuaisCompletos.tipoUtente,
          tipoUtenteAcumulado: acompanhanteFormValues?.tipoUtente
        });

        // VALIDAÇÃO COMPLETA: Validar TODAS as steps, não apenas a atual
        const allFormValues = {};
        const validationErrors = [];
        
        console.log('🔍 VALIDANDO TODAS AS STEPS:');
        
        for (let stepIndex = 0; stepIndex < acompanhanteSteps.length; stepIndex++) {
          const step = acompanhanteSteps[stepIndex];
          console.log(`📋 Validando Step ${stepIndex + 1}: "${step.title}" - Campos:`, step.fields);
          
          try {
            // Validar campos específicos da step
            const stepValues = await acompanhanteFormRef.validateFields(step.fields);
            
            // 🔥 CORREÇÃO CRÍTICA: Se for Step 1 e tipoUtente não vier na validação, usar valor atual do form
            if (stepIndex === 0 && !stepValues.tipoUtente && valoresAtuaisCompletos.tipoUtente) {
              stepValues.tipoUtente = valoresAtuaisCompletos.tipoUtente;
              console.log('🔧 CORREÇÃO: tipoUtente adicionado do formulário atual:', stepValues.tipoUtente);
            }
            
            // Mesclar valores da step
            Object.assign(allFormValues, stepValues);
            
            console.log(`✅ Step ${stepIndex + 1} VÁLIDA:`, {
              stepTitle: step.title,
              validatedFields: Object.keys(stepValues),
              stepValues: stepValues,
              tipoUtenteNestestep: stepValues.tipoUtente
            });
            
          } catch (stepError) {
            console.error(`❌ Step ${stepIndex + 1} INVÁLIDA:`, {
              stepTitle: step.title,
              fields: step.fields,
              error: stepError
            });
            
            validationErrors.push({
              step: stepIndex + 1,
              title: step.title,
              error: stepError
            });
          }
        }
        
        // Se houver erros de validação, parar execução
        if (validationErrors.length > 0) {
          console.error('❌ VALIDAÇÃO FALHOU - Erros encontrados:', validationErrors);
          message.error(`Erro de validação nas steps: ${validationErrors.map(e => e.title).join(', ')}`);
          
          // Navegar para a primeira step com erro
          const firstErrorStep = validationErrors[0].step - 1;
          setAcompanhanteStep(firstErrorStep);
          return;
        }
        
        console.log('✅ TODAS AS STEPS VÁLIDAS - Valores coletados:', {
          totalFields: Object.keys(allFormValues).length,
          allFormValues: allFormValues
        });
        
        // INTEGRAÇÃO COM VALORES ACUMULADOS
        const finalValues = {
          ...acompanhanteFormValues, // Valores acumulados das navegações
          ...allFormValues           // Valores validados de todas as steps
        };
        
        console.log('🔗 VALORES FINAIS INTEGRADOS:', {
          fromAccumulated: Object.keys(acompanhanteFormValues || {}).length,
          fromValidation: Object.keys(allFormValues).length,
          finalTotal: Object.keys(finalValues).length,
          finalValues: finalValues
        });
        
        // Debug: verificar valores atuais no formulário
        const currentFormValues = acompanhanteFormRef.getFieldsValue();
        console.log('🔍 Valores atuais no formulário ANTES da validação:', {
          todosOsValores: currentFormValues,
          tipoUtente: currentFormValues.tipoUtente,
          tipoTipoUtente: typeof currentFormValues.tipoUtente,
          fieldsComUtente: Object.keys(currentFormValues).filter(k => k.toLowerCase().includes('utente'))
        });
        
        // Debug: verificar se o valor do tipoUtente mudou comparado com o inicial
        const valorInicialTipoUtente = editingPaciente?.tipoUtenteId || editingPaciente?.tipo_utente_id;
        console.log('🔄 Comparação tipoUtente:', {
          valorInicial: valorInicialTipoUtente,
          valorAtualFormulario: currentFormValues.tipoUtente,
          mudou: valorInicialTipoUtente !== currentFormValues.tipoUtente,
          patientServiceTiposUtentes: patientServiceTiposUtentes?.length,
          tipoUtenteObjAtual: getTipoUtenteById(currentFormValues.tipoUtente)
        });
        
        const values = await acompanhanteFormRef.validateFields(acompanhanteSteps[acompanhanteStep].fields);
        console.log('✅ Valores do step final APÓS validação:', {
          values,
          tipoUtente: values.tipoUtente,
          tipoTipoUtente: typeof values.tipoUtente,
          camposValidados: acompanhanteSteps[acompanhanteStep].fields
        });

        // Processa campos de data para garantir que são objetos dayjs válidos
        const processedValues = { ...values };
        if (processedValues.dataNascimento) {
          processedValues.dataNascimento = getDayjsOrNull(processedValues.dataNascimento);
        }
        if (processedValues.dataValidade) {
          processedValues.dataValidade = getDayjsOrNull(processedValues.dataValidade);
        }

        const allValues = { ...acompanhanteFormValues, ...processedValues };
        console.log('📦 TODOS os valores coletados:', allValues);
        
        // Debug específico para tipoUtente nos valores finais
        console.log('🏷️ DEBUG tipoUtente nos valores finais:', {
          'allValues.tipoUtente': allValues.tipoUtente,
          'processedValues.tipoUtente': processedValues.tipoUtente,
          'acompanhanteFormValues.tipoUtente': acompanhanteFormValues.tipoUtente,
          'typeof allValues.tipoUtente': typeof allValues.tipoUtente,
          'editingPaciente.tipoUtenteId': editingPaciente?.tipoUtenteId,
          'editingPaciente.tipo_utente_id': editingPaciente?.tipo_utente_id
        });
        
        // CORREÇÃO CRÍTICA: Garantir que tipoUtente mantenha o valor correto do step 3
        // Prioridade: 1) valores acumulados, 2) formulário completo, 3) valor original do paciente
        if (!allValues.tipoUtente || allValues.tipoUtente === undefined) {
          console.log('⚠️ tipoUtente está undefined no step final - iniciando recuperação...');
          
          // 1ª Prioridade: Buscar nos valores acumulados dos steps anteriores
          if (acompanhanteFormValues.tipoUtente !== undefined) {
            allValues.tipoUtente = acompanhanteFormValues.tipoUtente;
            console.log('🔧 CORREÇÃO 1: tipoUtente recuperado dos valores acumulados:', allValues.tipoUtente);
          } 
          // 2ª Prioridade: Buscar no formulário completo atual
          else {
            const currentFormValues = acompanhanteFormRef.getFieldsValue();
            if (currentFormValues.tipoUtente !== undefined) {
              allValues.tipoUtente = currentFormValues.tipoUtente;
              console.log('🔧 CORREÇÃO 2: tipoUtente recuperado do formulário completo:', allValues.tipoUtente);
            } 
            // 3ª Prioridade: Como último recurso, manter o valor original do paciente
            else {
              const valorOriginal = editingPaciente?.tipo_utente_id || editingPaciente?.tipoUtenteId;
              if (valorOriginal) {
                allValues.tipoUtente = valorOriginal;
                console.log('🔧 CORREÇÃO 3: tipoUtente mantido do valor original:', allValues.tipoUtente);
              } else {
                console.log('❌ ERRO: Não foi possível recuperar tipoUtente de nenhuma fonte!');
              }
            }
          }
        } else {
          console.log('✅ tipoUtente já está presente nos valores finais:', allValues.tipoUtente);
        }
        
        // Verificar especificamente distrito e bairro nos valores finais
        console.log('🔍 Análise distrito/bairro:', {
          distrito: allValues.distrito,
          bairro: allValues.bairro,
          distritoTipo: typeof allValues.distrito,
          bairroTipo: typeof allValues.bairro
        });

        // Converte objetos dayjs para Date antes de salvar
        const finalEditValues = { ...allValues };
        if (finalEditValues.dataNascimento && finalEditValues.dataNascimento.toDate) {
          finalEditValues.dataNascimento = finalEditValues.dataNascimento.toDate();
        }
        if (finalEditValues.dataValidade && finalEditValues.dataValidade.toDate) {
          finalEditValues.dataValidade = finalEditValues.dataValidade.toDate();
        }

        // Converter nomes de campos do formulário para o formato esperado pelo backend
        const camposConvertidos = {};
        
        
        // Mapear bilheteIdentidade diretamente - IGUAL AOS UTENTES AUTÔNOMOS
        if (finalEditValues.bilheteIdentidade) {
   
          camposConvertidos.bilhete_identidade = finalEditValues.bilheteIdentidade.trim();
        }
        
        // ==================== VALIDAÇÃO ROBUSTA TIPO UTENTE (MESMO PADRÃO DO HANDLECREATE E HANDLEEDIT) ====================

        if (finalEditValues.tipoUtente !== undefined && finalEditValues.tipoUtente !== null && finalEditValues.tipoUtente !== '') {
          const tipoUtenteId = finalEditValues.tipoUtente;
          
          // Validar se existe no backend (mesmo padrão do handleCreate)
          if (tipoUtenteId && !isNaN(tipoUtenteId)) {
            const tipoUtenteExiste = patientServiceTiposUtentes?.find(t => sameId(t.id, tipoUtenteId));
            if (tipoUtenteExiste) {
              camposConvertidos.tipo_utente_id = parseInt(tipoUtenteId, 10);
            } else {
              notification.warning({
                message: 'Tipo de utente inválido',
                description: 'Selecione novamente o tipo de utente.'
              });
              return;
            }
          }
        }
        if (finalEditValues.unidadeOrganica !== undefined && finalEditValues.unidadeOrganica !== null && finalEditValues.unidadeOrganica !== '') {
          camposConvertidos.unidade_organica_id = parseInt(finalEditValues.unidadeOrganica, 10);
        }
        if (finalEditValues.provincia !== undefined && finalEditValues.provincia !== null && finalEditValues.provincia !== '') {
          camposConvertidos.provincia_id = parseInt(finalEditValues.provincia, 10);
        }
        if (finalEditValues.distrito !== undefined && finalEditValues.distrito !== null && finalEditValues.distrito !== '') {
          const distritoId = parseInt(finalEditValues.distrito, 10);
          camposConvertidos.distrito_id = distritoId;
          

        } else {
        }
        if (finalEditValues.bairro !== undefined && finalEditValues.bairro !== null && finalEditValues.bairro !== '') {
          const bairroId = parseInt(finalEditValues.bairro, 10);
          camposConvertidos.bairro_id = bairroId;
          
          // Buscar nome do bairro para log
          const bairroNome = Array.isArray(patientServiceBairros) 
            ? patientServiceBairros.find(b => sameId(b.id, bairroId))?.nome 
            : 'Desconhecido';
            
          console.log('🎯 BAIRRO mapeado:', finalEditValues.bairro, '→', camposConvertidos.bairro_id, `(${bairroNome})`);
        } else {
          console.log('❌ BAIRRO NÃO mapeado - valor:', finalEditValues.bairro);
        }
        if (finalEditValues.tipoDocumento !== undefined && finalEditValues.tipoDocumento !== null && finalEditValues.tipoDocumento !== '') {
          camposConvertidos.tipo_documento_id = parseInt(finalEditValues.tipoDocumento, 10);
        }
        if (finalEditValues.raca !== undefined && finalEditValues.raca !== null && finalEditValues.raca !== '') {
          camposConvertidos.raca_id = parseInt(finalEditValues.raca, 10);
        }
        
        // Mapear campos de celular e whatsApp
        if (finalEditValues.celular !== undefined && finalEditValues.celular !== null && finalEditValues.celular !== '') {
          camposConvertidos.celular = finalEditValues.celular;
        }
        if (finalEditValues.celularalternativo !== undefined && finalEditValues.celularalternativo !== null && finalEditValues.celularalternativo !== '') {
          camposConvertidos.celular_alternativo = finalEditValues.celularalternativo;
        }
        if (finalEditValues.telefone !== undefined && finalEditValues.telefone !== null && finalEditValues.telefone !== '') {
          camposConvertidos.celular = finalEditValues.telefone;
        }
        if (finalEditValues.whatsApp !== undefined && finalEditValues.whatsApp !== null && finalEditValues.whatsApp !== '') {
          camposConvertidos.whatsapp = finalEditValues.whatsApp;
        }
        
        // Mapeamento direto do bilhete_identidade - mesma lógica dos utentes autônomos
        
        // Mapear outros campos importantes para snake_case
        if (finalEditValues.dataNascimento !== undefined && finalEditValues.dataNascimento !== null) {
          camposConvertidos.data_nascimento = finalEditValues.dataNascimento;
        }
        if (finalEditValues.estadoCivil !== undefined && finalEditValues.estadoCivil !== null && finalEditValues.estadoCivil !== '') {
          camposConvertidos.estado_civil = finalEditValues.estadoCivil;
        }
        if (finalEditValues.avenidaRuaCelula !== undefined && finalEditValues.avenidaRuaCelula !== null && finalEditValues.avenidaRuaCelula !== '') {
          camposConvertidos.avenida_rua_celula = finalEditValues.avenidaRuaCelula;
        }
        if (finalEditValues.numeroCasa !== undefined && finalEditValues.numeroCasa !== null && finalEditValues.numeroCasa !== '') {
          camposConvertidos.numero_casa = finalEditValues.numeroCasa;
        }
        
        
        // Mesclar campos convertidos com finalEditValues
        const valoresFinais = { ...finalEditValues, ...camposConvertidos };
        
        if (isEdit) {
          // Modo de edição - mesclar dados existentes com novos valores
          const dadosMesclados = { ...editingPaciente, ...valoresFinais };

          await atualizarPaciente(editingPaciente.id, dadosMesclados);
          
          // message.success já é chamado dentro de atualizarPaciente
        } else {
          // Modo de configuração (novo cadastro) - mesclar dados existentes com novos valores
          const dadosMesclados = { ...currentPaciente, ...valoresFinais };

          
          await atualizarPaciente(currentPaciente.id, dadosMesclados);
          
          message.success('Dados do utente salvos com sucesso!');
        }

        // Fecha o modal e reseta o formulário
        handleCancel();
      } catch (err) {
        console.error('Erro ao salvar dados do utente:', err);
        message.error('Erro ao salvar dados. Verifique os campos do formulário.');
      }
    };

    return (
      <div>
        <Steps current={acompanhanteStep} style={{ marginBottom: 24 }}>
          {acompanhanteSteps.map(item => (
            <Steps.Step key={item.title} title={item.title} />
          ))}
        </Steps>
        <Form
          form={acompanhanteFormRef}
          layout="vertical"
          onValuesChange={(changedValues) => {
            // Garantir que os campos de data sempre estejam em formato correto
            if ('dataNascimento' in changedValues) {
              acompanhanteFormRef.setFieldValue('dataNascimento', getDayjsOrNull(changedValues.dataNascimento));
            }
            if ('dataValidade' in changedValues) {
              acompanhanteFormRef.setFieldValue('dataValidade', getDayjsOrNull(changedValues.dataValidade));
            }
          }}
        >
          {acompanhanteSteps[acompanhanteStep].content}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            {acompanhanteStep > 0 && (
              <Button type="default" style={{ backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d' }} onClick={handleAcompanhantePrev}>Anterior</Button>
            )}
            {acompanhanteStep < acompanhanteSteps.length - 1 && (
              <Button type="default" style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }} onClick={handleAcompanhanteNext}>Próximo</Button>
            )}
            {acompanhanteStep === acompanhanteSteps.length - 1 && (
              <Button type="primary" onClick={handleFinish}>{isEdit ? 'Atualizar' : 'Salvar'}</Button>
            )}
          </div>
        </Form>
      </div>
    );
  };

  const renderFormContent = (isEdit = false, selectedProvincia, setSelectedProvincia) => {
    const formRef = isEdit ? editForm : form;
    // Transformar dados do backend para o formato esperado pelo Select
    const tiposDocumento = patientServiceTiposDocumentos.map(tipo => ({
      value: tipo.id,
      label: tipo.nome
    }));
    
    // Fallback se backend não estiver disponível
    if (tiposDocumento.length === 0) {
      tiposDocumento.push(
        { value: 1, label: 'Bilhete de Identidade' },
        { value: 2, label: 'Passaporte' },
        { value: 3, label: 'Cartão de Residência' },
        { value: 4, label: 'Outro' }
      );
    }

    // Lista de províncias de Moçambique
    // const provincias = [
    //   'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala', 'Manica',
    //   'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'
    // ];

    // // Passos do formulário principal: separados em steps lógicos
    // // Mapas de distritos e bairros por província para cascade
    // const distritosPorProvincia = {
    //   'Maputo Cidade': [
    //     'KaMpfumu', 'Nlhamankulu', 'KaMaxakeni', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka'
    //   ],
    //   'Maputo Província': [
    //     'Matola', 'Boane', 'Marracuene', 'Manhiça', 'Magude', 'Moamba', 'Namaacha', 'Matutuíne'
    //   ],
    //   'Gaza': [
    //     'Xai-Xai', 'Bilene', 'Chibuto', 'Chicualacuala', 'Chigubo', 'Chókwè', 'Guijá', 'Limpopo', 'Mabalane', 'Manjacaze', 'Massagena', 'Massingir', 'Xai-Xai'
    //   ]
    // };

    // const bairrosPorProvincia = {
    //   'Maputo Cidade': [
    //     'Central', 'Polana Cimento A', 'Polana Cimento B', 'Sommerschield', 'Malhangalene', 'Alto Maé', 'Bairro Central', 'Museu', 'Chamanculo', 'Xipamanine', 'Maxaquene', 'Mafalala', 'Costa do Sol', 'Zimpeto', 'Magoanine', 'Hulene', 'Laulane', 'Bairro Ferroviário', 'Bairro Militar', 'Bairro Aeroporto', 'Bairro 25 de Junho', 'Bairro Urbanização', 'Bairro Triunfo', 'Bairro Coop', 'Bairro Jardim', 'Bairro Benfica', 'Bairro Malhazine', 'Bairro Mavalane', 'Bairro Chamanculo', 'Bairro Hulene', 'Bairro Xiquelene'
    //   ],
    //   'Matola': [
    //     'Matola A', 'Matola B', 'Matola C', 'Matola D', 'Matola E', 'Matola F', 'Matola G', 'Matola H', 'Matola J', 'Matola K', 'Matola L', 'Matola M', 'Matola N', 'Matola O', 'Matola P', 'Matola Q', 'Matola R', 'Matola S', 'Matola T'
    //   ],
    //   'Beira': [
    //     'Ponta-Gêa', 'Macuti', 'Munhava', 'Estoril', 'Chaimite', 'Maraza', 'Chamba', 'Inhamízua', 'Nhaconjo', 'Matacuane', 'Mascarenhas', 'Munhava Central', 'Munhava Matope'
    //   ],
    //   // Adicione outros bairros para outras cidades/distritos conforme necessário
    // };

    // Helper para pegar distritos e bairros da província selecionada - REMOVIDO: não utilizado
    // const distritosOptions = distritosPorProvincia[selectedProvincia] || [];
    // const bairrosOptions = bairrosPorProvincia[selectedProvincia] || [];


    const next = async () => {
      try {
        // Recupera o passo atual
        const currentFieldsList = steps[currentStep].fields;

        // Verifica se o passo atual tem campos a serem validados
        if (currentFieldsList.length > 0) {
          // Filtra campos opcionais com base na lógica condicional
          let fieldsToValidate = [...currentFieldsList];

          // Se não é familiar, remove os campos de familiar da validação
          // Se é familiar, remove o campo tipoUtente da validação
          const eFamiliar = formRef.getFieldValue('eFamiliar');
          if (currentStep === 0) {
            if (!eFamiliar) {
              fieldsToValidate = fieldsToValidate.filter(field =>
                !['nomeFamiliar', 'tipoUtenteFamiliar', 'unidadeOrganicaFamiliar', 'localTrabalhoFamiliar'].includes(field)
              );
            } else {
              fieldsToValidate = fieldsToValidate.filter(field =>
                field !== 'tipoUtente'
              );
            }
          }

          // Valida apenas os campos necessários
          const values = await formRef.validateFields(fieldsToValidate);

          // Processa as datas para garantir que serão objetos dayjs válidos
          const processedValues = { ...values };
          if (processedValues.dataNascimento) {
            processedValues.dataNascimento = getDayjsOrNull(processedValues.dataNascimento);
          }

          setFormValues({ ...formValues, ...processedValues });
          setCurrentStep(currentStep + 1);
        } else {
          // Se não houver campos para validar, apenas avança
          setCurrentStep(currentStep + 1);
        }
      } catch (errorInfo) {
        showFormValidationError(errorInfo);
      }
    };

    const prev = () => {
      setCurrentStep(currentStep - 1);
    };

    const handleFinishWizard = async () => {
      try {
        // Recupera o passo atual
        const currentFieldsList = steps[currentStep].fields;

        // Filtra campos opcionais com base na lógica condicional
        let fieldsToValidate = [...currentFieldsList];

        // Se não é familiar, remove os campos de familiar da validação
        // Se é familiar, remove o campo tipoUtente da validação
        const eFamiliar = formRef.getFieldValue('eFamiliar');
        if (currentStep === 0) {
          if (!eFamiliar) {
            fieldsToValidate = fieldsToValidate.filter(field =>
              !['nomeFamiliar', 'tipoUtenteFamiliar', 'unidadeOrganicaFamiliar', 'localTrabalhoFamiliar'].includes(field)
            );
          } else {
            fieldsToValidate = fieldsToValidate.filter(field =>
              field !== 'tipoUtente'
            );
          }
        }

        // Valida apenas os campos necessários do último passo
        const values = await formRef.validateFields(fieldsToValidate);

        // 🔥 CORREÇÃO: Acumular TODOS os valores de TODOS os steps
        const allFormValues = { ...formValues, ...values };
        
        // Processamento seguro das datas antes de passar para create/edit
        const processedValues = { ...allFormValues };


        // Chama a função apropriada (handleEdit ou handleCreate)
        if (isEdit) {
          handleEdit(processedValues);
        } else {
          handleCreate(processedValues);
        }
      } catch (errorInfo) {
        console.error('❌ Erro na validação do wizard:', errorInfo);
        showFormValidationError(errorInfo);
      }
    };

    // Defina os steps do formulário aqui
    const steps = [
      {
        title: 'Info. do Utente',
        fields: [
          'nid', 'apelido', 'nome', 'dataNascimento', 'genero', 'raca', 'nacionalidade', 'provincia', 'distrito', 'bairro', 'avenidaRuaCelula', 'numeroCasa', 'quarteirao', 'tipoUtente', 'unidadeOrganica', 'nomeFamiliar', 'unidadeOrganicaFamiliar'
        ],
        content: (

          <Row gutter={6}>
            <Col span={12}>
              <Form.Item 
                name="nid" 
                label="NID (Número de Identificação)" 
                rules={[{ validator: validateNid }]}
                validateTrigger={['onChange', 'onBlur']}
                tooltip="Opcional. Se não for fornecido, será gerado automaticamente. Formato: 0000/2025"
              > 
                <Input 
                  placeholder="0000/2026 (opcional)" 
                  maxLength={9}
                  onInput={(e) => {
                    // Remove tudo que não é dígito
                    let value = e.target.value.replace(/\D/g, '');
                    
                    // Formata: 0000/2026
                    if (value.length >= 4) {
                      value = value.slice(0, 4) + '/' + value.slice(4, 8);
                    }
                    
                    // Atualiza o valor do input diretamente
                    e.target.value = value;
                    
                    // Atualiza o formulário
                    formRef.setFieldsValue({ nid: value });
                  }}
                />
              </Form.Item>
              <Form.Item name="apelido" label="Apelido" rules={[{ required: true, message: 'Por favor, insira o apelido' }]}> 
                <Input placeholder="Apelido" />
              </Form.Item>
              <Form.Item name="dataNascimento" label="Data de Nascimento" rules={[{ required: true, message: 'Por favor, selecione a data de nascimento' }]}> 
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Selecione a data de nascimento"
                  disabledDate={current => current && !current.isBefore(dayjs().startOf('day'), 'day')}
                />
              </Form.Item>
              <Form.Item name="raca" label="Raça" rules={[{ required: true, message: 'Por favor, selecione a raça' }]}> 
                <Select placeholder="Selecione a raça" loading={loadingPatientServiceConfig}>
                  {Array.isArray(patientServiceRacas) && patientServiceRacas.length > 0 ? (
                    patientServiceRacas.map(raca => (
                      <Option key={raca.id} value={raca.id}>{raca.nome}</Option>
                    ))
                  ) : (
                    loadingPatientServiceConfig ? (
                      <Option disabled>Carregando raças...</Option>
                    ) : (
                      <Option disabled>Nenhuma raça disponível</Option>
                    )
                  )}
                </Select>
              </Form.Item>
                            {/* Campo para unidade orgânica para Estudante/Funcionário/Investigador */}
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
                prevValues.tipoUtente !== currentValues.tipoUtente
              }>
                {({ getFieldValue }) => {
                  const tipoUtenteIdSelecionado = getFieldValue('tipoUtente');
                  
                  // Buscar o tipo de utente pelo ID para verificar o código
                  const tipoUtenteSelecionado = getTipoUtenteById(tipoUtenteIdSelecionado);
                  const codigoTipo = tipoUtenteSelecionado?.codigo;
                  
                  // Tipos que precisam de unidade orgânica (baseado nos códigos do backend)
                  const tiposQueNeedUnidadeOrganica = [
                    'EST-NB',   // Estudante Não Bolseiro
                    'EST-B',    // Estudante Bolseiro
                    'EST-M',    // Estudante Mestrado
                    'EST-D',    // Estudante Doutoramento
                    'INV',      // Investigador
                    'DOC',      // Docente
                    'FUNC'      // Funcionário
                  ];
                  
                  const precisaUnidadeOrganica = tiposQueNeedUnidadeOrganica.includes(codigoTipo);
                  
                  
                  if (precisaUnidadeOrganica) {
                    return (
                      <Form.Item
                        name="unidadeOrganica"
                        label="Unidade Orgânica"
                        rules={[{ required: true, message: 'Por favor, selecione a unidade orgânica' }]}
                      >
                        <Select placeholder="Selecione a unidade orgânica">
                          {patientServiceUnidadesOrganicas.map(unidade => (
                            <Option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </Option>
                          ))}
                          {patientServiceUnidadesOrganicas.length === 0 && (
                            <Option disabled>Nenhuma unidade orgânica disponível</Option>
                          )}
                        </Select>
                      </Form.Item>
                    );
                  }
                  return null;
                }}
              </Form.Item>

            </Col>
            <Col span={12}>
              <Form.Item name="nome" label="Outro Nome" rules={[{ required: true, message: 'Por favor, insira o nome' }]}>
                <Input placeholder="Nome" />
              </Form.Item>
              <Form.Item name="genero" label="Gênero" rules={[{ required: true, message: 'Por favor, selecione o gênero' }]}>
                <Select placeholder="Selecione o gênero">
                  <Option value="masculino">Masculino</Option>
                  <Option value="feminino">Feminino</Option>
                  <Option value="outro">Outro</Option>
                </Select>
              </Form.Item>
              <Form.Item name="nacionalidade" label="Nacionalidade" rules={[{ required: true, message: 'Por favor, informe a nacionalidade' }]}>
                <Input placeholder="Nacionalidade" />
              </Form.Item>

                            {/* Select de tipo de utente */}
              <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Por favor, selecione o tipo de utente' }]}> 
                <Select placeholder="Selecione o tipo de utente" loading={loadingPatientServiceConfig}>
                  {Array.isArray(patientServiceTiposUtentes) && patientServiceTiposUtentes.length > 0 ? (
                    patientServiceTiposUtentes.map(tipo => (
                      <Option key={tipo.id} value={tipo.id}>{tipo.nome}</Option>
                    ))
                  ) : (
                    loadingPatientServiceConfig ? (
                      <Option disabled>Carregando tipos de utente...</Option>
                    ) : (
                      <Option disabled>Nenhum tipo de utente disponível</Option>
                    )
                  )}
                </Select>
              </Form.Item>



              {/* Campos condicionais para familiar, baseados apenas no tipoUtente */}
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
                prevValues.tipoUtente !== currentValues.tipoUtente
              }>
                {({ getFieldValue }) => {
                  const tipoUtenteIdSelecionado = getFieldValue('tipoUtente');
                  
                  // Buscar o tipo de utente pelo ID para verificar o código
                  const tipoUtenteSelecionado = getTipoUtenteById(tipoUtenteIdSelecionado);
                  const codigoTipo = tipoUtenteSelecionado?.codigo;
                  
                  // Verificar se é familiar (FAM-DOC, FAM-FUNC, FAM-INV)
                  const tiposFamiliares = ['FAM-DOC', 'FAM-FUNC', 'FAM-INV'];
                  const isFamiliar = tiposFamiliares.includes(codigoTipo);
                  

                  if (isFamiliar) {
                    return <>
                      <Form.Item
                        name="nomeFamiliar"
                        label="Nome Completo do Familiar Responsável"
                        rules={[{ required: true, message: 'Por favor, insira o nome completo do familiar responsável' }]}
                      >
                        <Input placeholder="Nome completo do familiar responsável" />
                      </Form.Item>
                      <Form.Item
                        name="unidadeOrganicaFamiliar"
                        label="Unidade Orgânica do Familiar Responsável"
                        rules={[{ required: true, message: 'Por favor, selecione a unidade orgânica do familiar responsável' }]}
                      >
                        <Select placeholder="Selecione a unidade orgânica">
                          {patientServiceUnidadesOrganicas.map(unidade => (
                            <Option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </Option>
                          ))}
                          {patientServiceUnidadesOrganicas.length === 0 && (
                            <Option disabled>Nenhuma unidade orgânica disponível</Option>
                          )}
                        </Select>
                      </Form.Item>
                    </>;
                  }
                  return null;
                }}
              </Form.Item>

              {/* Campo para unidade orgânica quando docente é selecionado */}
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
                prevValues.tipoUtente !== currentValues.tipoUtente
              }>
              {({ getFieldValue }) => {
                const tipoUtente = getFieldValue('tipoUtente') || '';
                const tipoSelecionado = patientServiceTiposUtentes.find(tipo => sameId(tipo.id, tipoUtente));
                const isDocente = tipoSelecionado?.codigo === 'DOC';

                  return isDocente ? (
                    <Form.Item
                      name="unidadeOrganicaDocente"
                      label="Unidades Orgânicas onde Leciona"
                      rules={[{ required: true, message: 'Por favor, selecione as faculdades onde leciona' }]}
                    >
                      <Select mode="multiple" placeholder="Selecione as faculdades onde leciona">
                        {patientServiceUnidadesOrganicas.map(unidade => (
                          <Option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </Option>
                        ))}
                        {patientServiceUnidadesOrganicas.length === 0 && (
                          <Option disabled>Nenhuma unidade orgânica disponível</Option>
                        )}
                      </Select>
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>

              {/* Campo para sector de trabalho quando funcionário é selecionado */}
              {/* Campo para funcionário removido conforme solicitado */}      {/* Campo para profissão quando tipo utente é comunidade */}
              {/* Campo de profissão removido conforme solicitado */}


            </Col>
          </Row>
        ),
      },

      {
        title: 'Endereço',
        fields: ['provincia', 'distrito', 'bairro', 'avenidaRuaCelula', 'numeroCasa', 'quarteirao', 'celular', 'celularAlternativo'],
        content: (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="provincia" label="Província de Residência/Proveniência" rules={[{ required: true, message: 'Por favor, selecione a província' }]}>
                <Select
                  placeholder="Selecione a província"
                  onChange={(value) => {
                    handleProvinciaChange(value, formRef);
                  }}
                  loading={loadingPatientServiceConfig}
                >
                  {Array.isArray(patientServiceProvincias) && patientServiceProvincias.map(prov => (
                    <Option key={prov.id} value={prov.id}>
                      {prov.nome}
                    </Option>
                  ))}
                  {(!Array.isArray(patientServiceProvincias) || patientServiceProvincias.length === 0) && loadingPatientServiceConfig && (
                    <Option disabled>Carregando províncias...</Option>
                  )}
                  {(!Array.isArray(patientServiceProvincias) || patientServiceProvincias.length === 0) && !loadingPatientServiceConfig && (
                    <Option disabled>Nenhuma província encontrada</Option>
                  )}
                </Select>
              </Form.Item>
              <Form.Item name="bairro" label="Bairro" rules={[{ required: true, message: 'Por favor, selecione o bairro' }]}>
                <Select
                  placeholder="Selecione o bairro"
                  loading={loadingBairros}
                  disabled={patientServiceBairros.length === 0 && !loadingBairros}
                >
                  {Array.isArray(patientServiceBairros) && patientServiceBairros.map(bairro => (
                    <Option key={bairro.id} value={bairro.id}>
                      {bairro.nome}
                    </Option>
                  ))}
                  {patientServiceBairros.length === 0 && !loadingBairros && (
                    <Option disabled>Selecione primeiro um distrito</Option>
                  )}
                  {loadingBairros && (
                    <Option disabled>Carregando bairros...</Option>
                  )}
                </Select>
              </Form.Item>
              <Form.Item name="avenidaRuaCelula" label="Avenida/Rua/Célula" >
                <Input placeholder="Avenida/Rua/Célula" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="distrito" label="Distrito" rules={[{ required: true, message: 'Por favor, selecione o distrito' }]}>
                <Select
                  placeholder="Selecione o distrito"
                  onChange={(value) => handleDistritoChange(value, formRef)}
                  loading={loadingDistritos}
                  disabled={patientServiceDistritos.length === 0 && !loadingDistritos}
                >
                  {Array.isArray(patientServiceDistritos) && patientServiceDistritos.map(dist => (
                    <Option key={dist.id} value={dist.id}>
                      {dist.nome}
                    </Option>
                  ))}
                  {patientServiceDistritos.length === 0 && !loadingDistritos && (
                    <Option disabled>Selecione primeiro uma província</Option>
                  )}
                  {loadingDistritos && (
                    <Option disabled>Carregando distritos...</Option>
                  )}
                </Select>
              </Form.Item>
              <Form.Item name="numeroCasa" label="Número de Casa" rules={[{ required: true, message: 'Por favor, insira o número da casa' }]}>
                <Input placeholder="Número da casa" />
              </Form.Item>

              <Form.Item name="quarteirao" label="Quarteirão" rules={[{ required: true, message: 'Por favor, insira o quarteirão' }]}>
                <Input placeholder="Quarteirão" />
              </Form.Item>
            </Col>
          </Row>
        ),
      },

      {
        title: 'Contacto',
        fields: ['celular', 'celularAlternativo'],
        content: (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="celular"
                label="Celular"
                rules={[
                  { required: true, message: "O número do celular é obrigatório" },
                  {
                    pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                    message: "Número inválido"
                  }
                ]}
              >
                <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="celularalternativo"
                label="Celular Alternativo"
                rules={[
                  {
                    pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                    message: "Número inválido"
                  }
                ]}
              >
                <Input placeholder="Digite o seu 8XXXXXXXX" addonBefore="+258" />
              </Form.Item>
            </Col>
          </Row>
        ),
      },

      {
        title: 'Parentes',
        fields: ['parentes'],
        content: (
          <div>
            <Form.List name="parentes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} style={{ marginBottom: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8 }}>
                      <Row gutter={16} align="middle">
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'nome']}
                            label="Nome do Parente"
                            rules={[{ required: true, message: 'Por favor, insira o nome do parente' }]}
                          >
                            <Input placeholder="Nome completo" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'grauParentesco']}
                            label="Grau de Parentesco"
                            rules={[{ required: true, message: 'Por favor, selecione o grau de parentesco' }]}
                          >
                            <Select placeholder="Selecione o grau" loading={loadingPatientServiceConfig}>
                              {patientServiceGrausParentesco.map(grau => (
                                <Option key={grau.id} value={grau.codigo || grau.id}>
                                  {grau.nome}
                                </Option>
                              ))}
                              {patientServiceGrausParentesco.length === 0 && (
                                <Option disabled>Nenhum grau de parentesco disponível</Option>
                              )}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'celular']}
                            label="Celular"
                            rules={[
                              { required: true, message: "O número do celular é obrigatório" },
                              {
                                pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                                message: "Número inválido"
                              }
                            ]}
                          >
                            <Input placeholder="8XXXXXXXX" addonBefore="+258" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'celular alternativo']}
                            label="Celular Alternativo"
                            rules={[
                              { required: true, message: "O número do celular alternativo é obrigatório" },
                              {
                                pattern: /^(\+258)?(8[2-7][0-9]{7})$/,
                                message: "Número inválido"
                              }
                            ]}
                          >
                            <Input placeholder="8XXXXXXXX" addonBefore="+258" />
                          </Form.Item>
                        </Col>
                        <Col span={3} style={{ textAlign: 'center', marginTop: 30 }}>
                          <Button
                            type="danger"
                            shape="circle"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}

                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 8 }}
                    >
                      Adicionar Parente
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>
        ),
      }
    ];

    return (
      <>
        <Steps current={currentStep} style={{ marginBottom: 20 }}>
          {steps.map(item => (
            <Steps.Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <Form form={formRef} layout="vertical">
          <div className="steps-content">
            {steps[currentStep].content}
          </div>


          <div className="steps-action" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {currentStep > 0 && (
              <Button type="default" style={{ backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d', marginRight: 8 }} onClick={prev}>
                Anterior
              </Button>
            )}

            <div className="steps-action" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {currentStep < steps.length - 1 && (
                <Button type="default" style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }} onClick={next}>
                  Próximo
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button type="primary" onClick={handleFinishWizard}>
                  {isEdit ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </>
    );
  };

  // Função para renderizar o modal de seleção de exames
  const renderExameModal = () => {
    return (
      <Modal
        title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>
          Solicitar Exames para {selectedUtente?.nome} {selectedUtente?.apelido}
        </span>}
        open={isExameModalVisible}
        onCancel={() => setIsExameModalVisible(false)}
        footer={null}
        width={700}
        style={{ top: 40 }}
        bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
      >
        <div style={{
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <UserOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 16 }} />
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
              {selectedUtente?.nome} {selectedUtente?.apelido}
            </span>
          </div>
          <div style={{ marginLeft: 24, color: '#555' }}>
            <div><strong>Hospital de Proveniência:</strong> {selectedUtente?.hospitalProveniencia}</div>
            <div><strong>Documento:</strong> {selectedUtente?.tipoDocumento?.toUpperCase()}: {selectedUtente?.bilheteIdentidade}</div>
            <div><strong>Celular:</strong> {selectedUtente?.celular}</div>
          </div>
        </div>

        <Form
          form={exameForm}
          layout="vertical"
          onFinish={confirmarExame}
        >
          <Form.Item
            name="tipoExame"
            label={<span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>Selecione os Exames a Solicitar</span>}
            rules={[{ required: true, message: 'Por favor, selecione pelo menos um tipo de exame' }]}
          >
            <Select
              placeholder="Selecione um ou múltiplos exames"
              mode="multiple"
              style={{ width: '100%' }}
              size="large"
              showArrow
              allowClear
              loading={loadingOpcoesClinicas}
            >
              {tiposExames.map(exame => {
                const preco = exame.preco ?? exame.valor ?? exame.valor_default;
                return (
                  <Option key={exame.id} value={exame.id}>
                    {exame.nome}{preco !== undefined && preco !== null ? ` - MT ${preco}` : ''}
                  </Option>
                );
              })}
              {tiposExames.length === 0 && (
                <Option disabled>Nenhum exame disponível</Option>
              )}
            </Select>
          </Form.Item>

          <Form.Item name="observacoes" label="Observações (opcional)">
            <Input.TextArea 
              rows={3} 
              placeholder="Adicione observações ou instruções especiais para o laboratório..." 
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button onClick={() => setIsExameModalVisible(false)} size="large">
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                style={{
                  background: '#1890ff',
                  borderColor: '#1890ff'
                }}
              >
                Solicitar Exames
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  return (

    <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
        {/* Alert de erro ao carregar pacientes */}
        {pacientesError && (
          <Alert
            message="Erro ao carregar pacientes"
            description={`Não foi possível carregar os pacientes do servidor: ${pacientesError}. Verifique se o backend está rodando em ${process.env.REACT_APP_PATIENT_SERVICE_URL || 'http://localhost:8002/api'}`}
            type="error"
            closable
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        
        {/* Alert de loading */}
        {pacientesLoading && (
          <Alert
            message="Carregando pacientes..."
            description="Aguarde enquanto buscamos os dados do servidor"
            type="info"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        
        <Card
          style={{
            boxShadow: '0 2px 8px #f0f1f2',
            borderRadius: 8,
            background: '#fff',
            margin: '0 auto'
          }}
        >
          {/* Header com Ícone */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
              <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                Lista de Utentes
              </h2>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={activeTab === '1' ? openCreateModal : openUtenteAutonomoModal}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
              }}
            >
              {activeTab === '1' ? 'Novo Utente' : 'Novo Utente Autônomo'}
            </Button>
          </div>

          {/* Área de Tabs e Pesquisa */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  // Atualizar lista quando mudar para tab "Para Especialidades"
                  if (key === '3') {
                    carregarPacientesTransferidosEspecialidade();
                  }
                  // Atualizar lista quando mudar para tab "Solicitações de Exames"
                  if (key === '4') {
                    fetchSolicitacoes();
                  }
                }}
                type="card"
                style={{ marginBottom: 0 }}
                items={[
                  {
                    key: '1',
                    label: 'Utentes Regulares'
                  },
                  {
                    key: '2',
                    label: 'Utentes Autônomos'
                  },
                  {
                    key: '3',
                    label: 'Para Especialidades'
                  },
                  {
                    key: '4',
                    label: 'Solicitações de Exames'
                  }
                ]}
              />
            </div>
            <div>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Pesquisar..."
                value={searchText}
                onChange={handleSearchInput}
                allowClear
                style={{
                  width: 320,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  padding: '8px 12px',
                }}
              />
            </div>
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === '1' ? (
            <Table
              columns={columns}
              dataSource={filteredPacientes}
              rowKey={(record) => record.id || record.nid}
              loading={pacientesLoading}
              pagination={{
                current: pacientesPagination.current || 1,
                pageSize: pacientesPagination.pageSize || 10,
                total: pacientesPagination.total || filteredPacientes.length,
                showSizeChanger: true,
                hideOnSinglePage: false,
                pageSizeOptions: ['5', '10', '20', '50'],
                position: ['bottomRight'],
                showTotal: (total, range) => total > 0
                  ? `${range[0]}-${range[1]} de ${total} utentes`
                  : '0 utentes',
                style: { marginTop: 12, marginBottom: 0 },
              }}
              onChange={(tablePagination) => {
                carregarPacientes({
                  page: tablePagination.current || 1,
                  pageSize: tablePagination.pageSize || pacientesPagination.pageSize || 10,
                  search: searchText.trim()
                });
              }}
              scroll={{ x: 'max-content' }}
              bordered
              style={{ borderRadius: 10 }}
              rowClassName={(record) => {
                if (record.status === 'alta' || record.status === 'obito' || record.status === 'transferencia' || record.status === 'transferido_especialidade') {
                  return 'linha-terminal';
                }
                return (filteredPacientes.indexOf(record) % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark');
              }}
            />
          ) : activeTab === '2' ? (
            <Table
              key={`utentes-autonomos-${forceUpdate}`}
              columns={utentesAutonomosColumns}
              dataSource={filteredUtentesAutonomos}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record) => {
                if (record.status === 'alta' || record.status === 'obito' || record.status === 'transferencia' || record.status === 'transferido_especialidade') {
                  return 'linha-terminal';
                }
                return (filteredUtentesAutonomos.indexOf(record) % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark');
              }}
            />
          ) : activeTab === '3' ? (
            <Table
              columns={pacientesEspecialidadeColumns}
              dataSource={filteredPacientesEspecialidade}
              rowKey="id"
              pagination={{
                pageSize: 3,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(_, idx) => (idx % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark')}
            />
          ) : (
            <>

              <Table
                columns={solicitacoesExamesColumns}
                dataSource={filteredSolicitacoesExames}
                rowKey="id"
                loading={loadingExamesPendentes}
                pagination={{
                  pageSize: 3,
                  showSizeChanger: false,
                  style: { marginTop: 5 },
                }}
                bordered
                style={{ borderRadius: 10, overflow: 'hidden' }}
                locale={{ emptyText: 'Nenhuma solicitação de exame pendente' }}
                rowClassName={(record) => {
                  const statusColors = {
                    'pendente': 'ant-table-row-warning',
                    'aceito': 'ant-table-row-info',
                    'pago': 'ant-table-row-success',
                    'pago_laboratorio': 'ant-table-row-success'
                  };
                  return statusColors[record.status] || (filteredSolicitacoesExames.indexOf(record) % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark');
                }}
              />
            </>
          )}

          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>🧍‍♂️ Novo Utente</span>}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={700}
            centered
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10, overflow: 'visible', maxHeight: 'none' }}
          >
            {renderFormContent(false, selectedProvincia, setSelectedProvincia)}
          </Modal>

          {/* Modal: Editar Utente */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>✏️ Editar Paciente</span>}
            open={isEditModalVisible}
            onCancel={() => setIsEditModalVisible(false)}
            footer={null}
            width={600}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {renderAcompanhanteModal(true)}
          </Modal>

          {/* Modal de Utente Autônomo */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>
              {editingUtenteAutonomo ? 'Editar Utente Autônomo' : 'Novo Utente Autônomo'}
            </span>}
            open={isUtenteAutonomoModalVisible}
            onCancel={() => setIsUtenteAutonomoModalVisible(false)}
            footer={null}
            width={800}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {renderUtenteAutonomoForm()}
          </Modal>

          {/* Modal de Acompanhante (condicional) */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>Info. do Utente</span>}
            open={isAcompanhanteModalVisible}
            onCancel={() => setIsAcompanhanteModalVisible(false)}
            footer={null}
            width={800}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {renderAcompanhanteModal(false)}
          </Modal>

          {/* Modal de seleção de exames */}
          {renderExameModal()}

          {/* Modal de Triagem para selecionar o estado de urgência */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>Estado de Utente</span>}
            open={isTriagemModalVisible}
            onCancel={() => {
              if (!criandoSolicitacaoTriagem) setIsTriagemModalVisible(false);
            }}
            footer={[
              <Button key="cancel" disabled={criandoSolicitacaoTriagem} onClick={() => setIsTriagemModalVisible(false)}>
                Cancelar
              </Button>,
              <Button key="submit" type="primary" loading={criandoSolicitacaoTriagem} onClick={confirmarTriagem}>
                Confirmar
              </Button>
            ]}
            width={500}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            <div style={{ padding: '20px 10px' }}>
              <h3 style={{ marginBottom: 20, color: '#444' }}>
                Selecione o estado de urgência do Utente:
              </h3>

                      <Radio.Group
                        value={urgenciaTriagem}
                        onChange={(e) => setUrgenciaTriagem(e.target.value)}
                        style={{ width: '100%' }}
                      >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio.Button
                    value="emergencia"
                    style={{
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      backgroundColor: urgenciaTriagem === 'emergencia' ? '#b71c1c15' : undefined,
                      borderColor: urgenciaTriagem === 'emergencia' ? '#b71c1c' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#b71c1c',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>!!</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 16 }}>EMERGÊNCIA</div>
                        <div style={{ fontSize: 13, color: '#666' }}>Necessita atendimento imediato</div>
                      </div>
                    </div>
                  </Radio.Button>

                  <Radio.Button
                    value="urgente"
                    style={{
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      backgroundColor: urgenciaTriagem === 'urgente' ? '#ffebee' : undefined,
                      borderColor: urgenciaTriagem === 'urgente' ? '#f44336' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#f44336',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>!</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 16 }}>URGENTE</div>
                        <div style={{ fontSize: 13, color: '#666' }}>Requer atenção médica prioritária</div>
                      </div>
                    </div>
                  </Radio.Button>

                  <Radio.Button
                    value="normal"
                    style={{
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      backgroundColor: urgenciaTriagem === 'normal' ? '#e8f5e9' : undefined,
                      borderColor: urgenciaTriagem === 'normal' ? '#4caf50' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: '#4caf50',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12
                      }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>✓</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 16 }}>NORMAL</div>
                        <div style={{ fontSize: 13, color: '#666' }}>Pode aguardar atendimento normal</div>
                      </div>
                    </div>
                  </Radio.Button>
                </Space>
              </Radio.Group>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#444' }}>Observações (opcional)</label>
                <Input.TextArea
                  value={observacoesTriagem}
                  onChange={(e) => setObservacoesTriagem(e.target.value)}
                  placeholder="Observações sobre a triagem (sintomas, notas do operador)"
                  rows={4}
                />
              </div>
            </div>
          </Modal>

          {/* Modal de Pagamento de Consulta de Especialidade */}
          <Modal
            title="Pagamento da Consulta de Especialidade"
            open={isPagamentoModalVisible}
            onCancel={() => {
              setIsPagamentoModalVisible(false);
              setPacientePagamento(null);
              pagamentoForm.resetFields();
            }}
            footer={null}
            width={500}
          >
            <Form
              form={pagamentoForm}
              layout="vertical"
              onFinish={processarPagamentoEspecialidade}
            >
              <div style={{ marginBottom: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
                <p><strong>Paciente:</strong> {pacientePagamento?.nome} {pacientePagamento?.apelido}</p>
                <p><strong>Especialidade:</strong> {pacientePagamento?.especialidade}</p>
                <p><strong>Médico:</strong> {pacientePagamento?.medico}</p>
              </div>

              <Form.Item
                label="Valor da Consulta (MT)"
                name="valor"
                rules={[
                  { required: true, message: 'Por favor, insira o valor da consulta' },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: 'Insira um valor válido (ex: 500 ou 500.00)' }
                ]}
              >
                <Input
                  placeholder="Ex: 500"
                  prefix="MT"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </Form.Item>

              <Form.Item
                label="Método de Pagamento"
                name="metodoPagamento"
                rules={[{ required: true, message: 'Por favor, selecione o método de pagamento' }]}
              >
                <Select placeholder="Selecione o método de pagamento">
                  {metodosPagamento.map(metodo => (
                    <Option key={metodo.id} value={metodo.id}>
                      {metodo.nome}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsPagamentoModalVisible(false);
                    setPacientePagamento(null);
                    pagamentoForm.resetFields();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Processar Pagamento
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Detalhes do Paciente */}
          <Modal
            title="Detalhes do Paciente"
            open={isDetalhesModalVisible}
            onCancel={() => {
              setIsDetalhesModalVisible(false);
              setPacienteDetalhes(null);
            }}
            footer={[
              <Button key="close" onClick={() => {
                setIsDetalhesModalVisible(false);
                setPacienteDetalhes(null);
              }}>
                Fechar
              </Button>
            ]}
            width={800}
          >
            {pacienteDetalhes && (
              <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={24}>
                    <Card size="small" title="Informações Básicas" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={8}><strong>NID:</strong> {pacienteDetalhes.nid || 'N/A'}</Col>
                        <Col span={8}><strong>Nome:</strong> {pacienteDetalhes.nome || 'N/A'}</Col>
                        <Col span={8}><strong>Apelido:</strong> {pacienteDetalhes.apelido || 'N/A'}</Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={8}><strong>Gênero:</strong> {
                          pacienteDetalhes.genero ? ({
                            'masculino': 'Masculino',
                            'feminino': 'Feminino',
                            'outro': 'Outro'
                          }[pacienteDetalhes.genero] || pacienteDetalhes.genero) : 'N/A'
                        }</Col>
                        <Col span={8}><strong>Data de Nascimento:</strong> {
                          pacienteDetalhes.dataNascimento ? dayjs(pacienteDetalhes.dataNascimento).format('DD/MM/YYYY') : 'N/A'
                        }</Col>
                        <Col span={8}><strong>Estado Civil:</strong> {
                          pacienteDetalhes.estadoCivil ? ({
                            'solteiro': 'Solteiro',
                            'casado': 'Casado',
                            'divorciado': 'Divorciado',
                            'viuvo': 'Viúvo'
                          }[pacienteDetalhes.estadoCivil] || pacienteDetalhes.estadoCivil) : 'N/A'
                        }</Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card size="small" title="Transferência">
                      <p><strong>Especialidade Anterior:</strong> {pacienteDetalhes.especialidadeAnterior || 'N/A'}</p>
                      <p><strong>Nova Especialidade:</strong> {pacienteDetalhes.especialidade || 'N/A'}</p>
                      <p><strong>Médico:</strong> {pacienteDetalhes.medico || 'N/A'}</p>
                      <p><strong>Data da Transferência:</strong> {
                        pacienteDetalhes.dataTransferencia ?
                          new Date(pacienteDetalhes.dataTransferencia).toLocaleString('pt-BR') : 'N/A'
                      }</p>
                      {pacienteDetalhes.motivo && (
                        <p><strong>Motivo:</strong> {pacienteDetalhes.motivo}</p>
                      )}
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="Pagamento">
                      <p><strong>Status:</strong> <span style={{
                        color: pacienteDetalhes.statusPagamento === 'pago' ? 'green' : 'orange',
                        fontWeight: 'bold'
                      }}>
                        {pacienteDetalhes.statusPagamento === 'pago' ? 'Pago' : 'Pendente'}
                      </span></p>
                      {pacienteDetalhes.valorConsulta && (
                        <p><strong>Valor:</strong> MT {pacienteDetalhes.valorConsulta}</p>
                      )}
                      {pacienteDetalhes.metodoPagamento && (
                        <p><strong>Método de Pagamento:</strong> {
                          ({
                            'dinheiro': 'Dinheiro',
                            'mpesa': 'M-Pesa',
                            'emola': 'E-mola',
                            'cartao': 'Cartão de Crédito/Débito',
                            'transferencia': 'Transferência Bancária',
                            'cheque': 'Cheque'
                          }[pacienteDetalhes.metodoPagamento] || pacienteDetalhes.metodoPagamento)
                        }</p>
                      )}
                      {pacienteDetalhes.dataPagamento && (
                        <p><strong>Data do Pagamento:</strong> {pacienteDetalhes.dataPagamento}</p>
                      )}
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={24}>
                    <Card size="small" title="Contato">
                      <Row gutter={16}>
                        <Col span={8}><strong>Celular:</strong> {pacienteDetalhes.celular || 'N/A'}</Col>
                        <Col span={8}><strong>Celular Alternativo:</strong> {pacienteDetalhes.celularalternativo || 'N/A'}</Col>
                        <Col span={8}><strong>Email:</strong> {pacienteDetalhes.email || 'N/A'}</Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={8}><strong>WhatsApp:</strong> {pacienteDetalhes.whatsApp || 'N/A'}</Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>

              </div>
            )}
          </Modal>



          {/* Modal de Pagamento de Consulta Regular */}
          <Modal
            title="Pagamento da Consulta"
            open={isPagamentoRegularModalVisible}
            onCancel={() => {
              setIsPagamentoRegularModalVisible(false);
              setPacientePagamentoRegular(null);
              pagamentoRegularForm.resetFields();
            }}
            footer={null}
            width={500}
          >
            <Form
              form={pagamentoRegularForm}
              layout="vertical"
              onFinish={processarPagamentoRegular}
            >
              <div style={{ marginBottom: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
                <p><strong>Paciente:</strong> {pacientePagamentoRegular?.nome} {pacientePagamentoRegular?.apelido}</p>
                <p><strong>NID:</strong> {pacientePagamentoRegular?.nid}</p>
                
                {/* Exibir informação sobre tipo de utente */}
                <p><strong>Tipo de Utente:</strong> {
                  pacientePagamentoRegular?.tipoUtente === 'estudanteBolseiro' || pacientePagamentoRegular?.tipo_utente?.codigo === 'EST-B' ? (
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Estudante Bolseiro (Isento de Pagamento)</span>
                  ) : (
                    pacientePagamentoRegular?.tipo_utente?.nome || 
                    pacientePagamentoRegular?.tipoUtente || 
                    'N/A'
                  )
                }</p>
                
                {/* Mostrar valor padrão da consulta */}
                {pacientePagamentoRegular?.valorConsultaDefault && (
                  <p><strong>Valor Padrão:</strong> MT {pacientePagamentoRegular.valorConsultaDefault}</p>
                )}
              </div>

              {/* Tipo de Consulta */}
              <Form.Item
                label="Tipo de Consulta"
                name="tipoConsulta"
                rules={[{ required: true, message: 'Por favor, selecione o tipo de consulta' }]}
              >
                <Select 
                  placeholder="Selecione o tipo de consulta"
                  loading={loadingPagamentoConfig}
                  onChange={async (tipoConsultaId) => {
                    
                    // Atualizar valor automaticamente quando tipo de consulta muda
                    const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                    
                    if (tipoUtenteId) {
                      message.loading('Carregando valor da consulta...', 1);
                      const novoValor = await buscarValorConsulta(tipoConsultaId, tipoUtenteId);
                      
                      // Validar se o valor foi carregado corretamente
                      if (validarValorBackend(novoValor, tipoConsultaId, tipoUtenteId)) {
                        pagamentoRegularForm.setFieldsValue({ valor: novoValor });
                        message.success(`Valor atualizado para MT ${novoValor}`, 2);
                      } else {
                        message.error('Erro: Valor da consulta não configurado no sistema. Contate o administrador.');
                        pagamentoRegularForm.setFieldsValue({ valor: '' });
                      }
                    } else {
                      console.warn('⚠️ Tipo de utente não encontrado para calcular valor');
                      
                      // Usar valor padrão do tipo de consulta selecionado se disponível
                      if (!Array.isArray(tiposConsulta)) {
                        console.error('❌ tiposConsulta não é um array:', tiposConsulta);
                        message.error('Erro: Configurações de tipo de consulta não carregadas corretamente.');
                        pagamentoRegularForm.setFieldsValue({ valor: '' });
                        return;
                      }
                      
                      const tipoConsulta = tiposConsulta.find(t => t.id === tipoConsultaId || t.codigo === tipoConsultaId);
                      if (tipoConsulta && tipoConsulta.valor_default) {
                        pagamentoRegularForm.setFieldsValue({ valor: tipoConsulta.valor_default.toString() });
                        message.info(`Valor padrão aplicado: MT ${tipoConsulta.valor_default}`, 2);
                      } else {
                        console.error('❌ Valor da consulta não encontrado no backend');
                        message.error('Erro: Não foi possível determinar o valor da consulta. Verifique se o tipo de consulta está configurado na tabela preco_consultas.');
                        pagamentoRegularForm.setFieldsValue({ valor: '' });
                      }
                    }
                  }}
                >
                  {tiposConsulta.length > 0 ? (
                    tiposConsulta.map(tipo => (
                      <Option key={tipo.codigo || tipo.id} value={tipo.codigo || tipo.id}>
                        {tipo.nome}{tipo.valor_default ? ` - MT ${tipo.valor_default}` : ''}
                      </Option>
                    ))
                  ) : (
                    <Option disabled>Nenhum tipo de consulta disponível</Option>
                  )}
                </Select>
              </Form.Item>

              {/* Método de Pagamento - PRIMEIRO CAMPO */}
              <Form.Item
                label="Método de Pagamento"
                name="metodoPagamento"
                rules={[{ required: true, message: 'Por favor, selecione o método de pagamento' }]}
              >
                <Select 
                  placeholder="Selecione o método de pagamento"
                  loading={loadingPagamentoConfig}
                  onChange={async (metodoPagamento) => {
                    const tipoConsulta = pagamentoRegularForm.getFieldValue('tipoConsulta');
                    const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                    
                    await handleMetodoPagamentoChange(metodoPagamento, pagamentoRegularForm, tipoConsulta, tipoUtenteId);
                  }}
                >
                  {metodosPagamento.length > 0 ? (
                    metodosPagamento
                      .filter(metodo => {
                        // Se é método de isenção, só mostrar para estudantes bolseiros
                        const isMetodoIsencaoValido = metodo.codigo === 'isencao' || metodo.nome?.toLowerCase().includes('isen');
                        if (isMetodoIsencaoValido) {
                          return pacientePagamentoRegular?.tipoUtenteId === 2; // Apenas estudantes bolseiros
                        }
                        return true; // Outros métodos sempre disponíveis
                      })
                      .map(metodo => (
                      <Option key={metodo.codigo || metodo.id} value={metodo.codigo || metodo.id}>
                        {metodo.nome}
                        {(metodo.codigo === 'isencao' || metodo.nome?.toLowerCase().includes('isen')) && 
                          <span style={{ color: '#52c41a', marginLeft: '8px' }}>(Valor 0)</span>
                        }
                      </Option>
                    ))
                  ) : (
                    <Option disabled>Nenhum método de pagamento disponível</Option>
                  )}
                </Select>
              </Form.Item>

              {/* Valor da Consulta - SEGUNDO CAMPO (calculado automaticamente baseado no método) */}
              <Form.Item
                label={
                  <span>
                    Valor da Consulta (MT)
                    <span style={{ fontSize: '12px', color: '#52c41a', marginLeft: '8px' }}>
                      ✨ Calculado automaticamente
                    </span>
                  </span>
                }
                name="valor"
                rules={[
                  { 
                    required: true, 
                    message: 'Valor da consulta é obrigatório' 
                  },
                  {
                    validator: (_, value) => {
                      const metodoPagamento = pagamentoRegularForm.getFieldValue('metodoPagamento');
                      const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                      
                      // Se for isenção E for estudante bolseiro, valor deve ser 0
                      if (isMetodoIsencao(metodoPagamento, tipoUtenteId)) {
                        if (value !== '0' && value !== 0) {
                          return Promise.reject(new Error('Para isenção, o valor deve ser 0'));
                        }
                        return Promise.resolve();
                      }
                      
                      // Para outros métodos, validar valor numérico positivo
                      const numero = parseFloat(value);
                      if (isNaN(numero) || numero <= 0) {
                        return Promise.reject(new Error('Insira um valor válido maior que 0'));
                      }
                      
                      return Promise.resolve();
                    }
                  }
                ]}
                help={(() => {
                  const metodoPagamento = pagamentoRegularForm.getFieldValue('metodoPagamento');
                  const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                  
                  if (isMetodoIsencao(metodoPagamento, tipoUtenteId)) {
                    return "Isenção aplicada para estudante bolseiro - valor automaticamente definido como 0";
                  }
                  
                  if (tipoUtenteId === 2) {
                    return "Estudante Bolseiro - selecione 'Isenção' como método de pagamento para valor 0";
                  }
                  
                  return "Valor calculado automaticamente baseado no tipo de consulta e utente. Pode ser alterado se necessário.";
                })()}
              >
                <Input
                  placeholder={(() => {
                    const metodoPagamento = pagamentoRegularForm.getFieldValue('metodoPagamento');
                    const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                    return isMetodoIsencao(metodoPagamento, tipoUtenteId) ? '0' : 'Valor será calculado automaticamente...';
                  })()}
                  prefix="MT"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={(() => {
                    const metodoPagamento = pagamentoRegularForm.getFieldValue('metodoPagamento');
                    const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                    return isMetodoIsencao(metodoPagamento, tipoUtenteId);
                  })()}
                  style={(() => {
                    const metodoPagamento = pagamentoRegularForm.getFieldValue('metodoPagamento');
                    const tipoUtenteId = pacientePagamentoRegular?.tipoUtenteId || pacientePagamentoRegular?.tipo_utente?.id;
                    const isIsencao = isMetodoIsencao(metodoPagamento, tipoUtenteId);
                    
                    return {
                      borderColor: isIsencao ? '#52c41a' : '#d9d9d9',
                      boxShadow: isIsencao ? '0 0 0 2px rgba(82, 196, 26, 0.1)' : 'none',
                      backgroundColor: isIsencao ? '#f6ffed' : 'white'
                    };
                  })()}
                />
              </Form.Item>
                  
                  {/* Campo para observações */}
                  <Form.Item
                    label="Observações (Opcional)"
                    name="observacoes"
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Observações sobre o pagamento..."
                      maxLength={500}
                    />
                  </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsPagamentoRegularModalVisible(false);
                    setPacientePagamentoRegular(null);
                    pagamentoRegularForm.resetFields();
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    style={
                      pacientePagamentoRegular?.tipoUtente === 'estudanteBolseiro' || pacientePagamentoRegular?.tipo_utente?.codigo === 'EST-B' ? 
                      { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}
                    }
                  >
                    {pacientePagamentoRegular?.tipoUtente === 'estudanteBolseiro' || pacientePagamentoRegular?.tipo_utente?.codigo === 'EST-B' ? 'Aplicar Isenção' : 'Processar Pagamento'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Pagamento de Exame - Utentes Autônomos */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>Pagamento de Exames - Utente Autônomo</span>}
            open={isPagamentoExameModalVisible && selectedUtente}
            onCancel={() => {
              setIsPagamentoExameModalVisible(false);
              setSelectedUtente(null);
              pagamentoExameForm.resetFields();
            }}
            footer={null}
            width={700}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            <Form
              form={pagamentoExameForm}
              layout="vertical"
              onFinish={processarPagamentoExameUtente}
              style={{ marginTop: 20 }}
              initialValues={{
                valor: selectedUtente?.valorExames || 0
              }}
            >
              {/* Informações do Utente */}
              <div style={{
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <UserOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 18 }} />
                  <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 16 }}>
                    {selectedUtente?.nome} {selectedUtente?.apelido}
                  </span>
                </div>
                <div style={{ marginLeft: 26, color: '#555' }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Documento:</strong> {selectedUtente?.tipoDocumento?.toUpperCase()}: {selectedUtente?.bilheteIdentidade}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Celular:</strong> {selectedUtente?.celular}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Hospital de Proveniência:</strong> {selectedUtente?.hospitalProveniencia}
                  </div>
                  <div>
                    <strong>Data da Solicitação:</strong> {selectedUtente?.dataSolicitacao}
                  </div>
                </div>
              </div>

              {/* Detalhes dos Exames */}
              <div style={{
                background: '#fff2e8',
                border: '1px solid #ffb366',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ fontWeight: 'bold', color: '#d4621b', marginBottom: 12, fontSize: 15 }}>
                  Exames Solicitados:
                </div>
                <div style={{ marginLeft: 16 }}>
                  {selectedUtente?.examesSolicitados?.map((exame, index) => {
                    const tipoExame = tiposExames.find(item => sameId(item.id, exame));
                    const exameNome = tipoExame?.nome || 'Exame não encontrado';
                    const preco = tipoExame?.preco ?? tipoExame?.valor ?? tipoExame?.valor_default;
                    
                    return (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: 8,
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: 4,
                        border: '1px solid #e8e8e8'
                      }}>
                        <span style={{ color: '#333', fontSize: 14 }}>{exameNome}</span>
                        <span style={{ color: '#d4621b', fontWeight: 'bold', fontSize: 14 }}>
                          {preco !== undefined && preco !== null ? `MT ${preco}` : 'Preço não configurado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ 
                  borderTop: '2px solid #d4621b', 
                  marginTop: 12, 
                  paddingTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#d4621b', fontSize: 16 }}>Total a Pagar:</span>
                  <span style={{ fontWeight: 'bold', color: '#d4621b', fontSize: 18 }}>MT {selectedUtente?.valorExames}</span>
                </div>
              </div>

              <Form.Item
                label="Valor dos Exames (MT)"
                name="valor"
                rules={[
                  { required: true, message: 'Por favor, confirme o valor dos exames' },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: 'Insira um valor válido (ex: 300 ou 300.00)' }
                ]}
              >
                <Input
                  placeholder="Valor confirmado automaticamente"
                  prefix="MT"
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedUtente?.valorExames}
                  readOnly
                  style={{ 
                    background: '#f0f0f0',
                    color: '#333',
                    fontWeight: 'bold'
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Método de Pagamento"
                name="metodoPagamento"
                rules={[{ required: true, message: 'Por favor, selecione o método de pagamento' }]}
              >
                <Select placeholder="Selecione o método de pagamento" size="large" loading={loadingPagamentoConfig}>
                  {metodosPagamento.map(metodo => (
                    <Option key={metodo.id} value={metodo.codigo || metodo.id}>
                      {metodo.nome}
                    </Option>
                  ))}
                  {metodosPagamento.length === 0 && (
                    <Option disabled>Nenhum método de pagamento disponível</Option>
                  )}
                </Select>
              </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsPagamentoExameModalVisible(false);
                    setSelectedUtente(null);
                    pagamentoExameForm.resetFields();
                  }} size="large">
                    Cancelar
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large"
                    style={{
                      background: '#52c41a',
                      borderColor: '#52c41a'
                    }}
                  >
                    Processar Pagamento (MT {selectedUtente?.valorExames})
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Pagamento de Exame - Solicitações */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>Pagamento de Exames - Solicitação</span>}
            open={isPagamentoExameModalVisible && examePagamento}
            onCancel={() => {
              setIsPagamentoExameModalVisible(false);
              setExamePagamento(null);
              pagamentoExameForm.resetFields();
            }}
            footer={null}
            width={700}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            <Form
              form={pagamentoExameForm}
              layout="vertical"
              onFinish={processarPagamentoExame}
              style={{ marginTop: 20 }}
            >
              {/* Informações do Paciente */}
              <div style={{
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <UserOutlined style={{ color: '#1890ff', marginRight: 8, fontSize: 18 }} />
                  <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 16 }}>
                    {examePagamento?.nome} {examePagamento?.apelido}
                  </span>
                </div>
                <div style={{ marginLeft: 26, color: '#555' }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>NID:</strong> {examePagamento?.nid}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Celular:</strong> {examePagamento?.celular || 'N/A'}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Solicitado por:</strong> {examePagamento?.solicitadoPor || 'Médico'}
                  </div>
                  <div>
                    <strong>Data da Solicitação:</strong> {examePagamento?.dataSolicitacao}
                  </div>
                </div>
              </div>

              {/* Detalhes dos Exames */}
              <div style={{
                background: '#fff2e8',
                border: '1px solid #ffb366',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ fontWeight: 'bold', color: '#d4621b', marginBottom: 12, fontSize: 15 }}>
                  Exames Solicitados:
                </div>
                <div style={{ marginLeft: 16 }}>
                  {(Array.isArray(examePagamento?.examesSolicitados) ? 
                    examePagamento.examesSolicitados : 
                    (typeof examePagamento?.examesSolicitados === 'string' ? 
                      examePagamento.examesSolicitados.split(',').map(e => e.trim()) : 
                      []
                    )
                  ).map((exame, index) => {
                    const exameNome = {
                      'hemograma': 'Hemograma Completo',
                      'glicemia': 'Glicemia',
                      'colesterol': 'Perfil Lipídico (Colesterol)',
                      'urina': 'Exame de Urina',
                      'fezes': 'Exame de Fezes',
                      'hepatite': 'Marcadores de Hepatite',
                      'hiv': 'Teste de HIV',
                      'pcr': 'PCR',
                      'ureia': 'Ureia e Creatinina',
                      'tsh': 'TSH e Hormônios Tireoidianos',
                      'outro': 'Outro'
                    }[exame.toLowerCase()] || exame;
                    
                    return (
                      <div key={index} style={{ 
                        marginBottom: 8,
                        padding: '8px 12px',
                        background: '#fff',
                        borderRadius: 4,
                        border: '1px solid #e8e8e8'
                      }}>
                        <span style={{ color: '#333', fontSize: 14 }}>• {exameNome}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Form.Item
                label="Valor dos Exames (MT)"
                name="valor"
                rules={[
                  { required: true, message: 'Por favor, insira o valor dos exames' },
                  { pattern: /^\d+(\.\d{1,2})?$/, message: 'Insira um valor válido (ex: 300 ou 300.00)' }
                ]}
              >
                <Input
                  placeholder="Insira o valor total dos exames"
                  prefix="MT"
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ 
                    fontSize: '14px'
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Método de Pagamento"
                name="metodoPagamento"
                rules={[{ required: true, message: 'Por favor, selecione o método de pagamento' }]}
              >
                <Select placeholder="Selecione o método de pagamento" size="large" loading={loadingPagamentoConfig}>
                  {metodosPagamento.map(metodo => (
                    <Option key={metodo.id} value={metodo.codigo || metodo.id}>
                      {metodo.nome}
                    </Option>
                  ))}
                  {metodosPagamento.length === 0 && (
                    <Option disabled>Nenhum método de pagamento disponível</Option>
                  )}
                </Select>
              </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsPagamentoExameModalVisible(false);
                    setExamePagamento(null);
                    pagamentoExameForm.resetFields();
                  }} size="large">
                    Cancelar
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large"
                    style={{
                      background: '#52c41a',
                      borderColor: '#52c41a'
                    }}
                  >
                    Processar Pagamento
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Marcar Exames */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>Marcar Exames Realizáveis</span>}
            open={isMarcarExamesModalVisible}
            onCancel={() => {
              setIsMarcarExamesModalVisible(false);
              setExameParaMarcar(null);
              setExamesSelecionados([]);
              marcarExamesForm.resetFields();
            }}
            footer={null}
            width={700}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            <Form
              form={marcarExamesForm}
              layout="vertical"
              onFinish={processarMarcacaoExames}
              style={{ marginTop: 20 }}
            >
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <UserOutlined style={{ color: '#d63031', marginRight: 8, fontSize: 16 }} />
                  <span style={{ fontWeight: 'bold', color: '#d63031' }}>
                    {exameParaMarcar?.nome} {exameParaMarcar?.apelido}
                  </span>
                </div>
                <div style={{ marginLeft: 24, color: '#555' }}>
                  <div><strong>NID:</strong> {exameParaMarcar?.nid}</div>
                  <div><strong>Status:</strong> <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Pago</span></div>
                  <div><strong>Data do Pagamento:</strong> {exameParaMarcar?.dataPagamento}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#2d3a4a', marginBottom: 15, fontSize: 16 }}>
                  📋 Selecione os exames que podem ser realizados na clínica:
                </h4>

                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 15
                }}>
                  <div style={{ fontWeight: 'bold', color: '#0284c7', marginBottom: 10 }}>
                    Exames Solicitados:
                  </div>
                  <div>
                    {exameParaMarcar && (
                      typeof exameParaMarcar.examesSolicitados === 'string' ?
                        exameParaMarcar.examesSolicitados.split(',').map((exame, index) => (
                          <div key={index} style={{ marginBottom: 8 }}>
                            <Checkbox
                              checked={examesSelecionados.includes(exame.trim())}
                              onChange={(e) => {
                                const exameNome = exame.trim();
                                if (e.target.checked) {
                                  setExamesSelecionados([...examesSelecionados, exameNome]);
                                } else {
                                  setExamesSelecionados(examesSelecionados.filter(ex => ex !== exameNome));
                                }
                              }}
                              style={{ marginRight: 8 }}
                            />
                            <span style={{ fontSize: 14, color: '#374151' }}>{exame.trim()}</span>
                          </div>
                        )) :
                        Array.isArray(exameParaMarcar.examesSolicitados) ?
                          exameParaMarcar.examesSolicitados.map((exame, index) => (
                            <div key={index} style={{ marginBottom: 8 }}>
                              <Checkbox
                                checked={examesSelecionados.includes(exame)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExamesSelecionados([...examesSelecionados, exame]);
                                  } else {
                                    setExamesSelecionados(examesSelecionados.filter(ex => ex !== exame));
                                  }
                                }}
                                style={{ marginRight: 8 }}
                              />
                              <span style={{ fontSize: 14, color: '#374151' }}>{exame}</span>
                            </div>
                          )) : null
                    )}
                  </div>
                </div>

                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                  color: '#92400e'
                }}>
                  <strong>Nota:</strong> Selecione apenas os exames que a clínica tem capacidade de realizar.
                  Os exames não selecionados serão marcados como "não realizáveis" e não serão enviados ao laboratório.
                </div>
              </div>

              <div style={{
                background: '#f3f4f6',
                borderRadius: 8,
                padding: 15,
                marginBottom: 20,
                border: '1px solid #d1d5db'
              }}>
                <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: 8 }}>
                  📊 Resumo da Seleção:
                </div>
                <div style={{ fontSize: 14 }}>
                  <span style={{ color: '#059669' }}>✓ Exames selecionados: {examesSelecionados.length}</span>
                </div>
                {exameParaMarcar && (
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    <span style={{ color: '#dc2626' }}>
                      ✗ Exames não realizáveis: {
                        (typeof exameParaMarcar.examesSolicitados === 'string' ?
                          exameParaMarcar.examesSolicitados.split(',').length :
                          Array.isArray(exameParaMarcar.examesSolicitados) ?
                            exameParaMarcar.examesSolicitados.length : 0) - examesSelecionados.length
                      }
                    </span>
                  </div>
                )}
              </div>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsMarcarExamesModalVisible(false);
                    setExameParaMarcar(null);
                    setExamesSelecionados([]);
                    marcarExamesForm.resetFields();
                  }}>
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    onClick={processarMarcacaoExames}
                    disabled={examesSelecionados.length === 0}
                    style={{
                      background: examesSelecionados.length === 0 ? '#d1d5db' : '#059669',
                      borderColor: examesSelecionados.length === 0 ? '#d1d5db' : '#059669'
                    }}
                  >
                    Aprovar e Enviar para Laboratório ({examesSelecionados.length} exames)
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Confirmar Disponibilidade e Preços dos Exames */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>✅ Confirmar Disponibilidade e Preços</span>}
            open={isConfirmarExamesModalVisible}
            onCancel={() => {
              setIsConfirmarExamesModalVisible(false);
              setExameParaConfirmar(null);
              setExamesParaConfirmar([]);
            }}
            footer={null}
            width={680}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {/* Info do paciente */}
            <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 15, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 6 }} />
                {exameParaConfirmar?.nome}
              </div>
              <div style={{ color: '#555', fontSize: 13 }}>
                <strong>NID:</strong> {exameParaConfirmar?.nid} &nbsp;|&nbsp;
                <strong>Médico:</strong> {exameParaConfirmar?.medico_solicitante || 'N/A'}
              </div>
            </div>

            {/* Lista de exames com toggle e preço */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: 12 }}>Exames Solicitados:</div>
              {examesParaConfirmar.map((exame, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 6, padding: '10px 14px', marginBottom: 8
                }}>
                  <Switch
                    checked={exame.disponivel}
                    onChange={v => updateExameParaConfirmar(idx, 'disponivel', v)}
                    checkedChildren="Disponível"
                    unCheckedChildren="Indisponível"
                    style={{ minWidth: 110 }}
                  />
                  <span style={{ flex: 1, fontWeight: 500, color: exame.disponivel ? '#111' : '#9ca3af' }}>
                    {exame.tipo_exame}
                  </span>
                  {exame.disponivel && (
                    <InputNumber
                      min={0}
                      step={50}
                      value={exame.preco}
                      onChange={v => updateExameParaConfirmar(idx, 'preco', v)}
                      placeholder="Preço (MT)"
                      prefix="MT"
                      style={{ width: 140 }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsConfirmarExamesModalVisible(false);
                  setExameParaConfirmar(null);
                  setExamesParaConfirmar([]);
                }}>Cancelar</Button>
                <Button
                  type="primary"
                  onClick={processarConfirmacaoExames}
                  disabled={!examesParaConfirmar.some(e => e.disponivel)}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Confirmar e Enviar
                </Button>
              </Space>
            </div>
          </Modal>

          {/* Modal de Rejeitar Solicitação de Exame */}
          <Modal
            title={<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>❌ Rejeitar Solicitação de Exame</span>}
            open={isRejeitarExameModalVisible}
            onCancel={() => {
              setIsRejeitarExameModalVisible(false);
              setExameParaRejeitar(null);
              rejeitarExameForm.resetFields();
            }}
            footer={null}
            width={500}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {/* Info do paciente */}
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', color: '#ff4d4f', fontSize: 15, marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 6 }} />
                {exameParaRejeitar?.nome}
              </div>
              <div style={{ color: '#555', fontSize: 13 }}>
                <strong>NID:</strong> {exameParaRejeitar?.nid} &nbsp;|&nbsp;
                <strong>Exames:</strong> {exameParaRejeitar?.examesSolicitados}
              </div>
            </div>

            <Form form={rejeitarExameForm} layout="vertical" onFinish={processarRejeicaoExame}>
              <Form.Item
                label="Motivo da Rejeição"
                name="motivo"
                rules={[{ required: true, message: 'Por favor, indique o motivo da rejeição.' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Ex: Equipamento indisponível, exame não realizado na clínica..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => {
                    setIsRejeitarExameModalVisible(false);
                    setExameParaRejeitar(null);
                    rejeitarExameForm.resetFields();
                  }}>Cancelar</Button>
                  <Button type="primary" danger htmlType="submit">
                    Confirmar Rejeição
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* Modal de Histórico de Exames */}
          <Modal
            title={<span style={{ color: '#2d3a4a', fontWeight: 'bold' }}>
              📋 Histórico de Exames - {utenteHistorico?.nome} {utenteHistorico?.apelido}
            </span>}
            open={isHistoricoModalVisible}
            onCancel={() => {
              setIsHistoricoModalVisible(false);
              setUtenteHistorico(null);
            }}
            footer={[
              <Button key="close" onClick={() => {
                setIsHistoricoModalVisible(false);
                setUtenteHistorico(null);
              }}>
                Fechar
              </Button>
            ]}
            width={900}
            style={{ top: 40 }}
            bodyStyle={{ background: '#f7f9fa', borderRadius: 10 }}
          >
            {utenteHistorico && (
              <div>
                {/* Informações do Utente */}
                <div style={{
                  background: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 20
                }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <strong>Nome Completo:</strong> {utenteHistorico.nome} {utenteHistorico.apelido}
                    </Col>
                    <Col span={8}>
                      <strong>Documento:</strong> {utenteHistorico.tipoDocumento?.toUpperCase()}: {utenteHistorico.bilheteIdentidade}
                    </Col>
                    <Col span={8}>
                      <strong>Celular:</strong> {utenteHistorico.celular}
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <strong>Hospital de Proveniência:</strong> {utenteHistorico.hospitalProveniencia}
                    </Col>
                    <Col span={12}>
                      <strong>Total de Sessões:</strong> {utenteHistorico.historicoExames ? utenteHistorico.historicoExames.length : (utenteHistorico.resultadosExames ? 1 : 0)} sessão(ões)
                    </Col>
                  </Row>
                </div>

                {/* Histórico de Exames */}
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ color: '#2d3a4a', marginBottom: 15 }}>📊 Histórico Detalhado de Exames</h3>
                  
                  {/* Histórico mais recente (estruturado) */}
                  {utenteHistorico.historicoExames && utenteHistorico.historicoExames.length > 0 ? (
                    <div>
                      {utenteHistorico.historicoExames.map((sessao, index) => (
                        <Card
                          key={index}
                          size="small"
                          style={{ marginBottom: 16 }}
                          title={
                            <span style={{ color: '#1890ff' }}>
                              🧪 Sessão {utenteHistorico.historicoExames.length - index} - {sessao.dataExames}
                            </span>
                          }
                        >
                          <Row gutter={16}>
                            <Col span={24}>
                              <div style={{ marginBottom: 12 }}>
                                <strong style={{ color: '#52c41a' }}>Exames Realizados:</strong>
                                <div style={{ marginTop: 4 }}>
                                  {sessao.examesRealizados && sessao.examesRealizados.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                                      {sessao.examesRealizados.map((exame, idx) => {
                                        const exameNome = {
                                          'hemograma': 'Hemograma Completo',
                                          'glicemia': 'Glicemia',
                                          'colesterol': 'Perfil Lipídico',
                                          'urina': 'Exame de Urina',
                                          'fezes': 'Exame de Fezes',
                                          'hepatite': 'Marcadores de Hepatite',
                                          'hiv': 'Teste de HIV',
                                          'pcr': 'PCR',
                                          'ureia': 'Ureia e Creatinina',
                                          'tsh': 'TSH e Hormônios Tireoidianos',
                                          'outro': 'Outro'
                                        }[exame] || exame;
                                        return <li key={idx}>{exameNome}</li>;
                                      })}
                                    </ul>
                                  ) : (
                                    <span style={{ color: '#999', fontStyle: 'italic' }}>Nenhum exame especificado</span>
                                  )}
                                </div>
                              </div>
                            </Col>
                          </Row>
                          {sessao.observacoes && (
                            <div style={{ marginTop: 8, padding: 8, background: '#f0f9ff', borderRadius: 4 }}>
                              <strong>Observações:</strong> {sessao.observacoes}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : utenteHistorico.resultadosExames ? (
                    // Histórico antigo (formato legacy)
                    <Card
                      size="small"
                      style={{ marginBottom: 16 }}
                      title={
                        <span style={{ color: '#1890ff' }}>
                          🧪 Sessão Anterior - {utenteHistorico.dataExames || 'Data não registrada'}
                        </span>
                      }
                    >
                      <Row gutter={16}>
                        <Col span={24}>
                          <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: '#52c41a' }}>Exames Realizados:</strong>
                            <div style={{ marginTop: 4 }}>
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {Object.keys(utenteHistorico.resultadosExames).map((exame, idx) => (
                                  <li key={idx}>{exame}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: 40,
                      background: '#fafafa',
                      borderRadius: 8,
                      color: '#999'
                    }}>
                      <span style={{ fontSize: 48 }}>📋</span>
                      <p style={{ marginTop: 16, fontSize: 16 }}>Nenhum histórico de exames encontrado</p>
                    </div>
                  )}
                </div>

                {/* Resumo Estatístico */}
                {((utenteHistorico.historicoExames && utenteHistorico.historicoExames.length > 0) || utenteHistorico.resultadosExames) && (
                  <div style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 8,
                    padding: 16
                  }}>
                    <h4 style={{ color: '#52c41a', marginBottom: 12 }}>📈 Resumo</h4>
                    <Row gutter={16}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                            {utenteHistorico.historicoExames ? utenteHistorico.historicoExames.length : 1}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>Total de Sessões</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                            {utenteHistorico.historicoExames ? 
                              utenteHistorico.historicoExames.reduce((total, sessao) => 
                                total + (sessao.examesRealizados ? sessao.examesRealizados.length : 0), 0
                              ) : 
                              (utenteHistorico.resultadosExames ? Object.keys(utenteHistorico.resultadosExames).length : 0)
                            }
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>Exames Realizados</div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                            {utenteHistorico.ultimoExame?.dataExames || utenteHistorico.dataExames || 'N/A'}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>Última Sessão</div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* Estilos personalizados */}
          {/* <style>{`
    .ant-table-thead > tr > th {
      background: #e8eefc !important;
      color: #2d3a4a !important;
      font-weight: 600;
      font-size: 15px;
    }
    .ant-table-row-light {
      background: #ffffff;
    }
    .ant-table-row-dark {
      background: #f6f8fa;
    }
    .ant-table-tbody > tr:hover > td {
      background: #e0f2fe !important;
    }
    .ant-btn-primary {
      background: #3b82f6 !important;
      border-color: #3b82f6 !important;
    }
    .ant-modal-content {
      border-radius: 10px !important;
    }
  `}</style> */}
  <style>{`
  .ant-table-thead > tr > th {
    background: #e8eefc !important;
    color: #2d3a4a !important;
    font-weight: 600;
    font-size: 15px;
    padding: 8px 12px !important;
  }

  .ant-table-tbody > tr > td {
    padding: 6px 12px !important;
    font-size: 13px;
  }

  .ant-table-row-light {
    background: #ffffff;
  }

  .ant-table-row-dark {
    background: #f6f8fa;
  }

  .ant-table-tbody > tr:hover > td {
    background: #e0f2fe !important;
  }

  .ant-btn-primary {
    background: #3b82f6 !important;
    border-color: #3b82f6 !important;
  }

  .ant-modal-content {
    border-radius: 10px !important;
  }
`}</style>
        </Card>
        
      </div>
    </div>

  );
};

export default CadastroPaciente;
