
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tabs, Table, Button, Tag, Select, Modal, Form, Input, InputNumber, Radio, message } from 'antd';
import { UserOutlined, FileTextOutlined, FileOutlined, MedicineBoxOutlined, AppstoreAddOutlined, PlusOutlined, SearchOutlined, BankOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

// Dados mock para especialidades
const especialidadesMock = [
  { id: 1, nome: 'Cardiologia', descricao: 'Doenças do coração' },
  { id: 2, nome: 'Pediatria', descricao: 'Saúde infantil' },
];

// Dados mock para tratamentos
const tratamentosMock = [
  { id: 1, nome: 'Consulta', descricao: 'Consulta médica geral' },
  { id: 2, nome: 'Vacinação', descricao: 'Aplicação de vacinas' },
];

// Dados mock para tipos de utente
const tiposUtenteMock = [
  { id: 1, nome: 'Estudante', descricao: 'Aluno da instituição' },
  { id: 2, nome: 'Funcionário', descricao: 'Funcionário da instituição' },
  { id: 3, nome: 'Docente', descricao: 'Professor da instituição' },
];

// Dados mock para tipos de consulta
const tiposConsultaMock = [
  { id: 1, nome: 'Primeira Consulta', descricao: 'Primeira vez do paciente' },
  { id: 2, nome: 'Reconsulta', descricao: 'Retorno do paciente' },
];

// Dados mock para tipos de exame
const tiposExameMock = [
  { id: 1, nome: 'Raio-X', descricao: 'Exame de imagem' },
  { id: 2, nome: 'Hemograma', descricao: 'Exame de sangue' },
];

// Dados mock para exames
const examesMock = [
  { id: 1, tipoExame: 1, tipoUtente: 1, valor: 1200, estado: 'Ativo' },
  { id: 2, tipoExame: 2, tipoUtente: 2, valor: 600, estado: 'Inativo' },
];

// Dados mock para consultas
const consultasMock = [
  { id: 1, tipoConsulta: 1, tipoUtente: 1, valor: 800, estado: 'Ativo' },
  { id: 2, tipoConsulta: 2, tipoUtente: 2, valor: 400, estado: 'Inativo' },
];

// Dados mock para províncias
const provinciasMock = [
  { id: 1, nome: 'Maputo', descricao: 'Capital de Moçambique' },
  { id: 2, nome: 'Nampula', descricao: 'Província do norte de Moçambique' },
  { id: 3, nome: 'Sofala', descricao: 'Província central de Moçambique' },
];

// Dados mock para bairros
const bairrosMock = [
  { id: 1, nome: 'Alto Maé', provincia: 1, descricao: 'Bairro em Maputo' },
  { id: 2, nome: 'Sommerschield', provincia: 1, descricao: 'Bairro nobre de Maputo' },
  { id: 3, nome: 'Nacala', provincia: 2, descricao: 'Bairro em Nampula' },
  { id: 4, nome: 'Beira Central', provincia: 3, descricao: 'Bairro na Beira, Sofala' },
];

// Dados mock para distritos
const distritosMock = [
  { id: 1, nome: 'KaMpfumu', codigo: 'KMP', provincia_id: 1, ativo: true },
  { id: 2, nome: 'KaMaxakeni', codigo: 'KMX', provincia_id: 1, ativo: true },
];

// Dados mock para unidades orgânicas
const unidadesOrganicasMock = [
  { id: 1, nome: 'Departamento de Pediatria', descricao: 'Unidade responsável pelos cuidados infantis' },
  { id: 2, nome: 'Departamento de Cardiologia', descricao: 'Unidade especializada em doenças cardíacas' },
];

// Dados mock para serviços
const servicosMock = [
  { id: 1, especialidade: 1, tratamento: 1, tipoUtente: 1, valor: 1000, estado: 'Ativo' },
  { id: 2, especialidade: 2, tratamento: 2, tipoUtente: 2, valor: 500, estado: 'Inativo' },
];

// Dados mock para raças
const racasMock = [
  { id: 1, nome: 'Negra', codigo: 'NEG', descricao: 'Raça negra', ativo: true },
  { id: 2, nome: 'Branca', codigo: 'BRA', descricao: 'Raça branca', ativo: true },
];

// Dados mock para medicamentos
const medicamentosMock = [
  { id: 1, nome: 'Paracetamol', principio_ativo: 'Paracetamol', codigo: 'MED001', forma_id: 1, via_administracao_id: 1, dosagem: '500', unidade_dosagem: 'mg', generico: true, controlado: false, ativo: true },
  { id: 2, nome: 'Ibuprofeno', principio_ativo: 'Ibuprofeno', codigo: 'MED002', forma_id: 1, via_administracao_id: 1, dosagem: '400', unidade_dosagem: 'mg', generico: true, controlado: false, ativo: true },
];

// Dados mock para formas de medicamento
const formasMedicamentoMock = [
  { id: 1, nome: 'Comprimido', codigo: 'COMP', descricao: 'Medicamento em forma de comprimido', ativo: true },
  { id: 2, nome: 'Cápsula', codigo: 'CAPS', descricao: 'Medicamento em forma de cápsula', ativo: true },
];

// Dados mock para vias de administração
const viasAdministracaoMock = [
  { id: 1, nome: 'Oral', codigo: 'OR', descricao: 'Via de administração oral', ativo: true },
  { id: 2, nome: 'Intravenosa', codigo: 'IV', descricao: 'Via de administração intravenosa', ativo: true },
];

// Dados mock para tipos de documento
const tiposDocumentoMock = [
  { id: 1, nome: 'Bilhete de Identidade', codigo: 'BI', descricao: 'Bilhete de Identidade Nacional', formato_validacao: '/^[0-9]{12}[A-Z]$/', ativo: true },
  { id: 2, nome: 'Passaporte', codigo: 'PASS', descricao: 'Passaporte', formato_validacao: '/^[A-Z]{2}[0-9]{7}$/', ativo: true },
];

// Dados mock para graus de parentesco
const grausParentescoMock = [
  { id: 1, nome: 'Pai', codigo: 'PAI', descricao: 'Pai/Genitor', ativo: true },
  { id: 2, nome: 'Mãe', codigo: 'MAE', descricao: 'Mãe/Genitora', ativo: true },
];

// Dados mock para métodos de pagamento
const metodosPagamentoMock = [
  { id: 1, nome: 'Dinheiro', codigo: 'CASH', descricao: 'Pagamento em dinheiro', requer_comprovante: false, requer_confirmacao: false, ativo: true },
  { id: 2, nome: 'Cartão de Crédito/Débito', codigo: 'CARD', descricao: 'Pagamento com cartão', requer_comprovante: true, requer_confirmacao: false, ativo: true },
];

// Dados mock para funções de especialidade
const funcoesEspecialidadeMock = [
  { id: 1, nome: 'Médico', codigo: 'MED', descricao: 'Médico', pode_prescrever: true, pode_solicitar_exames: true, pode_criar_prontuario: true, ativo: true },
  { id: 2, nome: 'Enfermeiro', codigo: 'ENF', descricao: 'Enfermeiro', pode_prescrever: false, pode_solicitar_exames: false, pode_criar_prontuario: false, ativo: true },
];

// Dados mock para usuários
const usuariosMock = [
  { id: 1, nome: 'Dr. João Silva', email: 'joao.silva@clinica.com', cargo: 'Médico Cardiologista', ativo: true, perfis: [] },
  { id: 2, nome: 'Enf. Maria Santos', email: 'maria.santos@clinica.com', cargo: 'Enfermeira', ativo: true, perfis: [] },
];

// Dados mock para perfis
const perfisMock = [
  { id: 1, nome: 'Administrador', codigo: 'admin', descricao: 'Administrador do sistema com acesso total', ativo: true, permissoes: [] },
  { id: 2, nome: 'Médico', codigo: 'medico', descricao: 'Perfil para médicos', ativo: true, permissoes: [] },
];

const Parametrizacao = () => {
  const [view, setView] = useState('cards');
  const [especialidades, setEspecialidades] = useState([]);
  const [tratamentos, setTratamentos] = useState(tratamentosMock);
  const [servicos, setServicos] = useState([]);
  const [tiposUtente, setTiposUtente] = useState(tiposUtenteMock);
  const [tiposConsulta, setTiposConsulta] = useState(tiposConsultaMock);
  const [consultas, setConsultas] = useState(consultasMock);
  const [precosConsultas, setPrecosConsultas] = useState(consultasMock);
  const [tiposExame, setTiposExame] = useState(tiposExameMock);
  const [exames, setExames] = useState(examesMock);
  const [provincias, setProvincias] = useState(provinciasMock);
  const [bairros, setBairros] = useState(bairrosMock);
  const [distritos, setDistritos] = useState(distritosMock);
  const [unidadesOrganicas, setUnidadesOrganicas] = useState(unidadesOrganicasMock);
  const [racas, setRacas] = useState(racasMock);
  const [medicamentos, setMedicamentos] = useState(medicamentosMock);
  const [formasFarmaceuticas, setFormasFarmaceuticas] = useState([]);
  const [viasAdministracao, setViasAdministracao] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState(tiposDocumentoMock);
  const [grausParentesco, setGrausParentesco] = useState(grausParentescoMock);
  const [metodosPagamento, setMetodosPagamento] = useState(metodosPagamentoMock);
  const [funcoesEspecialidade, setFuncoesEspecialidade] = useState(funcoesEspecialidadeMock);
  const [usuarios, setUsuarios] = useState(usuariosMock);
  const [perfis, setPerfis] = useState(perfisMock);
  const [activeTab, setActiveTab] = useState('1');
  const [searchText, setSearchText] = useState('');
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);
  const [loadingTiposUtente, setLoadingTiposUtente] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingBairros, setLoadingBairros] = useState(false);
  const [loadingUnidadesOrganicas, setLoadingUnidadesOrganicas] = useState(false);
  const [loadingRacas, setLoadingRacas] = useState(false);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [loadingFormasMedicamento, setLoadingFormasMedicamento] = useState(false);
  const [loadingViasAdministracao, setLoadingViasAdministracao] = useState(false);
  const [loadingTiposDocumento, setLoadingTiposDocumento] = useState(false);
  const [loadingGrausParentesco, setLoadingGrausParentesco] = useState(false);
  const [loadingMetodosPagamento, setLoadingMetodosPagamento] = useState(false);
  const [loadingTiposConsulta, setLoadingTiposConsulta] = useState(false);
  const [loadingFuncoesEspecialidade, setLoadingFuncoesEspecialidade] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingPerfis, setLoadingPerfis] = useState(false);
  const [loadingPrecosConsultas, setLoadingPrecosConsultas] = useState(false);
  const [loadingTiposExame, setLoadingTiposExame] = useState(false);
  const [loadingExames, setLoadingExames] = useState(false);

  // Buscar especialidades da API ao montar o componente
  useEffect(() => {
    // Executar todas as requisições em paralelo para acelerar o carregamento
    Promise.all([
      fetchEspecialidades(),
      fetchTiposUtente(),
      fetchDistritos(),
      fetchProvincias(),
      fetchBairros(),
      fetchUnidadesOrganicas(),
      fetchRacas(),
      fetchMedicamentos(),
      fetchFormasFarmaceuticas(),
      fetchViasAdministracao(),
      fetchTiposDocumento(),
      fetchGrausParentesco(),
      fetchMetodosPagamento(),
      fetchTiposConsulta(),
      fetchFuncoesEspecialidade(),
      fetchUsuarios(),
      fetchPerfis(),
      fetchPrecosConsultas(),
      fetchServicos(),
      fetchTiposExame(),
      fetchExames()
    ]).catch(error => {
      console.error('❌ Erro ao carregar dados iniciais:', error);
    });
  }, []);

  // Função para buscar especialidades (reutilizável)
  const fetchEspecialidades = async () => {
    setLoadingEspecialidades(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/especialidades/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const especialidadesData = response?.data?.data || response?.data || [];
      setEspecialidades(especialidadesData);
      console.log('✅ Especialidades carregadas:', especialidadesData);
    } catch (error) {
      console.error('❌ Erro ao buscar especialidades:', error);
      message.error('Erro ao carregar especialidades');
      setEspecialidades(especialidadesMock); // Fallback para dados mock
    } finally {
      setLoadingEspecialidades(false);
    }
  };

  // Função para buscar tipos de utente (reutilizável)
  const fetchTiposUtente = async () => {
    setLoadingTiposUtente(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/tipos-utente/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const tiposUtenteData = response?.data?.data || response?.data || [];
      setTiposUtente(tiposUtenteData);
      console.log('✅ Tipos de Utente carregados:', tiposUtenteData);
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de utente:', error);
      message.error('Erro ao carregar tipos de utente');
      setTiposUtente(tiposUtenteMock); // Fallback para dados mock
    } finally {
      setLoadingTiposUtente(false);
    }
  };

  // Função para buscar serviços da API (preços de especialidades)
  const fetchServicos = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await axios.get('http://196.3.100.216/api/precos-especialidades/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('📦 Resposta completa da API:', response.data);
      
      // Laravel retorna: { status: 'success', data: { data: [...], current_page: 1, ... } }
      const servicosData = response.data?.data?.data || response.data?.data || response.data || [];
      console.log('📊 Dados extraídos:', servicosData);
      
      // Garantir que servicosData é sempre um array
      const servicosArray = Array.isArray(servicosData) ? servicosData : [];
      console.log('✅ Array final de serviços:', servicosArray.length, servicosArray);
      
      setServicos(servicosArray);
    } catch (error) {
      console.error('❌ Erro ao carregar serviços:', error);
      setServicos([]); // Sempre definir como array vazio em caso de erro
      if (error.response?.status === 404) {
        console.warn('⚠️ Endpoint de serviços não implementado ainda');
      } else if (error.response?.status !== 401) {
        // Não mostrar erro se for 401 (não autorizado)
        const errorMsg = error.response?.data?.message || error.message || 'Erro ao carregar serviços';
        message.error(String(errorMsg));
      }
    }
  };

  // Função para buscar distritos (reutilizável)
  const fetchDistritos = async () => {
    setLoadingDistritos(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/distritos/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const distritosData = response?.data?.data || response?.data || [];
      setDistritos(distritosData);
      console.log('✅ Distritos carregados:', distritosData);
    } catch (error) {
      console.error('❌ Erro ao buscar distritos:', error);
      message.error('Erro ao carregar distritos');
      setDistritos(distritosMock); // Fallback para dados mock
    } finally {
      setLoadingDistritos(false);
    }
  };

  // Função para buscar províncias (reutilizável)
  const fetchProvincias = async () => {
    setLoadingProvincias(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/provincias/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const provinciasData = response?.data?.data || response?.data || [];
      setProvincias(provinciasData);
      console.log('✅ Províncias carregadas:', provinciasData);
    } catch (error) {
      console.error('❌ Erro ao buscar províncias:', error);
      message.error('Erro ao carregar províncias');
      setProvincias(provinciasMock); // Fallback para dados mock
    } finally {
      setLoadingProvincias(false);
    }
  };

  // Função para buscar bairros (reutilizável)
  const fetchBairros = async () => {
    setLoadingBairros(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/bairros/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const bairrosData = response?.data?.data || response?.data || [];
      setBairros(bairrosData);
      console.log('✅ Bairros carregados:', bairrosData);
    } catch (error) {
      console.error('❌ Erro ao buscar bairros:', error);
      message.error('Erro ao carregar bairros');
      setBairros(bairrosMock); // Fallback para dados mock
    } finally {
      setLoadingBairros(false);
    }
  };

  // Função para buscar unidades orgânicas (reutilizável)
  const fetchUnidadesOrganicas = async () => {
    setLoadingUnidadesOrganicas(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/unidades-organicas/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const unidadesData = response?.data?.data || response?.data || [];
      setUnidadesOrganicas(unidadesData);
      console.log('✅ Unidades Orgânicas carregadas:', unidadesData);
    } catch (error) {
      console.error('❌ Erro ao buscar unidades orgânicas:', error);
      message.error('Erro ao carregar unidades orgânicas');
      setUnidadesOrganicas(unidadesOrganicasMock); // Fallback para dados mock
    } finally {
      setLoadingUnidadesOrganicas(false);
    }
  };

  // Função para buscar raças (reutilizável)
  const fetchRacas = async () => {
    setLoadingRacas(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/racas/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const racasData = response?.data?.data || response?.data || [];
      setRacas(racasData);
      console.log('✅ Raças carregadas:', racasData);
    } catch (error) {
      console.error('❌ Erro ao buscar raças:', error);
      message.error('Erro ao carregar raças');
      setRacas(racasMock); // Fallback para dados mock
    } finally {
      setLoadingRacas(false);
    }
  };

  // Função para buscar medicamentos (reutilizável)
  const fetchMedicamentos = async () => {
    setLoadingMedicamentos(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/medicamentos/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Extrair dados da resposta (suporta diferentes formatos)
      const medicamentosData = response?.data?.data || response?.data || [];
      setMedicamentos(medicamentosData);
      console.log('✅ Medicamentos carregados:', medicamentosData);
    } catch (error) {
      console.error('❌ Erro ao buscar medicamentos:', error);
      message.error('Erro ao carregar medicamentos');
      setMedicamentos(medicamentosMock); // Fallback para dados mock
    } finally {
      setLoadingMedicamentos(false);
    }
  };

  // Função para buscar formas farmacêuticas
  const fetchFormasFarmaceuticas = async () => {
    setLoadingFormasMedicamento(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/formas-medicamento/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const formasData = response?.data?.data || response?.data || [];
      setFormasFarmaceuticas(formasData);
      console.log('✅ Formas farmacêuticas carregadas:', formasData);
    } catch (error) {
      console.error('❌ Erro ao buscar formas farmacêuticas:', error);
      message.error('Erro ao carregar formas de medicamento');
      setFormasFarmaceuticas(formasMedicamentoMock);
    } finally {
      setLoadingFormasMedicamento(false);
    }
  };

  // Função para buscar vias de administração
  const fetchViasAdministracao = async () => {
    setLoadingViasAdministracao(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/vias-administracao/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const viasData = response?.data?.data || response?.data || [];
      setViasAdministracao(viasData);
      console.log('✅ Vias de administração carregadas:', viasData);
    } catch (error) {
      console.error('❌ Erro ao buscar vias de administração:', error);
      message.error('Erro ao carregar vias de administração');
      setViasAdministracao(viasAdministracaoMock);
    } finally {
      setLoadingViasAdministracao(false);
    }
  };

  // Função para buscar tipos de documento
  const fetchTiposDocumento = async () => {
    setLoadingTiposDocumento(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/tipos-documento/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const tiposData = response?.data?.data || response?.data || [];
      setTiposDocumento(tiposData);
      console.log('✅ Tipos de documento carregados:', tiposData);
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de documento:', error);
      message.error('Erro ao carregar tipos de documento');
      setTiposDocumento(tiposDocumentoMock);
    } finally {
      setLoadingTiposDocumento(false);
    }
  };

  // Função para buscar graus de parentesco
  const fetchGrausParentesco = async () => {
    setLoadingGrausParentesco(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/graus-parentesco/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const grausData = response?.data?.data || response?.data || [];
      setGrausParentesco(grausData);
      console.log('✅ Graus de parentesco carregados:', grausData);
    } catch (error) {
      console.error('❌ Erro ao buscar graus de parentesco:', error);
      message.error('Erro ao carregar graus de parentesco');
      setGrausParentesco(grausParentescoMock);
    } finally {
      setLoadingGrausParentesco(false);
    }
  };

  // Função para buscar métodos de pagamento
  const fetchMetodosPagamento = async () => {
    setLoadingMetodosPagamento(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/metodos-pagamento/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const metodosData = response?.data?.data || response?.data || [];
      setMetodosPagamento(metodosData);
      console.log('✅ Métodos de pagamento carregados:', metodosData);
    } catch (error) {
      console.error('❌ Erro ao buscar métodos de pagamento:', error);
      message.error('Erro ao carregar métodos de pagamento');
      setMetodosPagamento(metodosPagamentoMock);
    } finally {
      setLoadingMetodosPagamento(false);
    }
  };

  // Função para buscar tipos de consulta
  const fetchTiposConsulta = async () => {
    setLoadingTiposConsulta(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/tipos-consulta/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const tiposData = response?.data?.data || response?.data || [];
      setTiposConsulta(tiposData);
      console.log('✅ Tipos de consulta carregados:', tiposData);
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de consulta:', error);
      message.error('Erro ao carregar tipos de consulta');
      setTiposConsulta(tiposConsultaMock);
    } finally {
      setLoadingTiposConsulta(false);
    }
  };

  // Função para buscar tipos de exame
  const fetchTiposExame = async () => {
    setLoadingTiposExame(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/tipos-exame/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const tiposExameData = response?.data?.data || response?.data || [];
      setTiposExame(tiposExameData);
      console.log('✅ Tipos de exame carregados:', tiposExameData);
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de exame:', error);
      message.error('Erro ao carregar tipos de exame');
      setTiposExame(tiposExameMock);
    } finally {
      setLoadingTiposExame(false);
    }
  };

  // Função para buscar exames
  const fetchExames = async () => {
    setLoadingExames(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/exames/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const examesData = response?.data?.data || response?.data || [];
      setExames(examesData);
      console.log('✅ Exames carregados:', examesData);
    } catch (error) {
      console.error('❌ Erro ao buscar exames:', error);
      message.error('Erro ao carregar exames');
      setExames(examesMock);
    } finally {
      setLoadingExames(false);
    }
  };

  // Função para buscar funções de especialidade
  const fetchFuncoesEspecialidade = async () => {
    setLoadingFuncoesEspecialidade(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/funcoes-especialidade/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const funcoesData = response?.data?.data || response?.data || [];
      setFuncoesEspecialidade(funcoesData);
      console.log('✅ Funções de especialidade carregadas:', funcoesData);
    } catch (error) {
      console.error('❌ Erro ao buscar funções de especialidade:', error);
      message.error('Erro ao carregar funções de especialidade');
      setFuncoesEspecialidade(funcoesEspecialidadeMock);
    } finally {
      setLoadingFuncoesEspecialidade(false);
    }
  };

  // Função para buscar usuários
  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const usuariosData = response?.data?.data || response?.data || [];
      setUsuarios(usuariosData);
      console.log('✅ Usuários carregados:', usuariosData);
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      message.error('Erro ao carregar usuários');
      setUsuarios(usuariosMock);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Função para buscar perfis
  const fetchPerfis = async () => {
    setLoadingPerfis(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/roles/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const perfisData = response?.data?.data || response?.data || [];
      setPerfis(perfisData);
      console.log('✅ Perfis carregados:', perfisData);
    } catch (error) {
      console.error('❌ Erro ao buscar perfis:', error);
      message.error('Erro ao carregar perfis');
      setPerfis(perfisMock);
    } finally {
      setLoadingPerfis(false);
    }
  };

  // Função para buscar preços de consultas
  const fetchPrecosConsultas = async () => {
    setLoadingPrecosConsultas(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const response = await axios.get('http://196.3.100.216/api/precos-consultas/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const precosData = response?.data?.data || response?.data || [];
      setPrecosConsultas(precosData);
      console.log('✅ Preços de consultas carregados:', precosData);
    } catch (error) {
      console.error('❌ Erro ao buscar preços de consultas:', error);
      message.error('Erro ao carregar preços de consultas');
      setPrecosConsultas(consultasMock);
    } finally {
      setLoadingPrecosConsultas(false);
    }
  };

  // Tabela de Tipos de Exame
  const tiposExameColumns = [
    {
      title: 'Nome do Tipo de Exame',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoExame', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Províncias
  const provinciasColumns = [
    {
      title: 'Nome da Província',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('provincia', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Bairros
  const bairrosColumns = [
    {
      title: 'Nome do Bairro',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Distrito',
      dataIndex: 'distrito_id',
      key: 'distrito_id',
      render: (id, record) => {
        const dist = record.distrito || distritos.find(d => d.id === id);
        return dist ? dist.nome : '-';
      }
    },
    {
      title: 'Código Postal',
      dataIndex: 'codigo_postal',
      key: 'codigo_postal',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('bairro', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Distritos
  const distritosColumns = [
    {
      title: 'Nome do Distrito',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Província',
      dataIndex: 'provincia_id',
      key: 'provincia_id',
      render: (id, record) => {
        const prov = record.provincia || provincias.find(p => p.id === id);
        return prov ? prov.nome : '-';
      }
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('distrito', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Exames
  const examesColumns = [
    {
      title: 'Nome do Tipo de Exame',
      key: 'tipoExame',
      render: (text, record) => {
        if (record.tipo_exame) {
          return record.tipo_exame.nome || record.tipo_exame.id || '-';
        }
        if (record.tipoExame) {
          return record.tipoExame.nome || record.tipoExame.id || '-';
        }
        return '-';
      }
    },
    {
      title: 'Tipo de Utente',
      key: 'tipoUtente',
      render: (text, record) => {
        if (record.tipo_utente) {
          return record.tipo_utente.nome || record.tipo_utente.id || '-';
        }
        if (record.tipoUtente) {
          return record.tipoUtente.nome || record.tipoUtente.id || '-';
        }
        return '-';
      }
    },
    {
      title: 'Valor a Pagar',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => valor ? `${valor} MZN` : '-',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('exame', record)}>Editar</Button>
      )
    }
  ];
  // Tabela de Tipos de Consulta
  const tiposConsultaColumns = [
    {
      title: 'Nome do Tipo de Consulta',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoConsulta', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Consultas (Preços)
  const consultasColumns = [
    {
      title: 'Tipo de Consulta',
      dataIndex: ['tipo_consulta', 'nome'],
      key: 'tipo_consulta',
      render: (text, record) => record.tipo_consulta?.nome || '-'
    },
    {
      title: 'Código',
      dataIndex: ['tipo_consulta', 'codigo'],
      key: 'codigo',
      render: (text, record) => record.tipo_consulta?.codigo || '-'
    },
    {
      title: 'Tipo Utente',
      dataIndex: 'tipo_utente_id',
      key: 'tipo_utente_id',
      render: (tipoUtenteId) => {
        const tipo = tiposUtente.find(t => t.id === tipoUtenteId);
        return tipo?.nome || tipoUtenteId;
      }
    },
    {
      title: 'Valor (MZN)',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => `${parseFloat(valor).toFixed(2)} MZN`
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('precoConsulta', record)}>Editar</Button>
      )
    }
  ];
  // Tabela de Tipos de Utente
  const tiposUtenteColumns = [
    {
      title: 'Nome do Tipo de Utente',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoUtente', record)}>Editar</Button>
      )
    }
  ];
  const [modalVisible, setModalVisible] = useState(false);
  const [tabKey, setTabKey] = useState('servicos');
  const [tratamentoTabKey, setTratamentoTabKey] = useState('tratamentos');
  const [form] = Form.useForm();

  // Para adicionar/editar especialidade ou serviço
  const [editType, setEditType] = useState(null); // 'especialidade' ou 'servico'
  const [editRecord, setEditRecord] = useState(null);

  // Tabela de Serviços
  const servicosColumns = [
    {
      title: 'Especialidade',
      dataIndex: 'especialidade_id',
      key: 'especialidade_id',
      render: (id, record) => {
        // Tentar usar especialidade do relacionamento ou buscar pelo ID
        if (record.especialidade?.nome) return record.especialidade.nome;
        const esp = especialidades.find(e => e.id === id);
        return esp ? esp.nome : '-';
      }
    },
    {
      title: 'Tipo de Utente',
      dataIndex: 'tipo_utente_id',
      key: 'tipo_utente_id',
      render: (id, record) => {
        // Tentar usar tipo_utente do relacionamento ou buscar pelo ID
        if (record.tipo_utente?.nome) return record.tipo_utente.nome;
        const tu = tiposUtente.find(t => t.id === id);
        return tu ? tu.nome : '-';
      }
    },
    {
      title: 'Valor a Pagar',
      dataIndex: 'valor',
      key: 'valor',
      render: v => `MZN ${parseFloat(v).toFixed(2)}`
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: estado => (
        <Tag color={estado === 'Ativo' ? 'green' : 'red'}>{estado}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('servico', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Tratamentos
  const tratamentosColumns = [
    {
      title: 'Nome do Tratamento',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tratamento', record)}>Editar</Button>
      )
    }
  ];
  
  // Tabela de Unidades Orgânicas
  const unidadesOrganicasColumns = [
    {
      title: 'Nome da Unidade Orgânica',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Sigla',
      dataIndex: 'sigla',
      key: 'sigla',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo) => tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '-'
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('unidadeOrganica', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Raças
  const racasColumns = [
    {
      title: 'Nome da Raça',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('raca', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Medicamentos
  const medicamentosColumns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Princípio Ativo',
      dataIndex: 'principio_ativo',
      key: 'principio_ativo',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Dosagem',
      key: 'dosagem',
      render: (_, record) => `${record.dosagem} ${record.unidade_dosagem}`
    },
    {
      title: 'Genérico',
      dataIndex: 'generico',
      key: 'generico',
      render: (generico) => (
        <Tag color={generico ? 'blue' : 'default'}>{generico ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Controlado',
      dataIndex: 'controlado',
      key: 'controlado',
      render: (controlado) => (
        <Tag color={controlado ? 'orange' : 'default'}>{controlado ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('medicamento', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Formas de Medicamento
  const formasMedicamentoColumns = [
    {
      title: 'Nome da Forma',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('formaMedicamento', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Vias de Administração
  const viasAdministracaoColumns = [
    {
      title: 'Nome da Via',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('viaAdministracao', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Tipos de Documento
  const tiposDocumentoColumns = [
    {
      title: 'Nome do Tipo',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Formato Validação',
      dataIndex: 'formato_validacao',
      key: 'formato_validacao',
      render: (formato) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formato || 'N/A'}</span>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('tipoDocumento', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Graus de Parentesco
  const grausParentescoColumns = [
    {
      title: 'Nome do Grau',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('grauParentesco', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Métodos de Pagamento
  const metodosPagamentoColumns = [
    {
      title: 'Nome do Método',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Requer Comprovante',
      dataIndex: 'requer_comprovante',
      key: 'requer_comprovante',
      render: (requer) => (
        <Tag color={requer ? 'blue' : 'default'}>{requer ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Requer Confirmação',
      dataIndex: 'requer_confirmacao',
      key: 'requer_confirmacao',
      render: (requer) => (
        <Tag color={requer ? 'orange' : 'default'}>{requer ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('metodoPagamento', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Funções de Especialidade
  const funcoesEspecialidadeColumns = [
    {
      title: 'Nome da Função',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Pode Prescrever',
      dataIndex: 'pode_prescrever',
      key: 'pode_prescrever',
      render: (pode) => (
        <Tag color={pode ? 'green' : 'default'}>{pode ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Pode Solicitar Exames',
      dataIndex: 'pode_solicitar_exames',
      key: 'pode_solicitar_exames',
      render: (pode) => (
        <Tag color={pode ? 'blue' : 'default'}>{pode ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Pode Criar Prontuário',
      dataIndex: 'pode_criar_prontuario',
      key: 'pode_criar_prontuario',
      render: (pode) => (
        <Tag color={pode ? 'orange' : 'default'}>{pode ? 'Sim' : 'Não'}</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('funcaoEspecialidade', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Usuários
  const usuariosColumns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      key: 'cargo',
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('usuario', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Perfis
  const perfisColumns = [
    {
      title: 'Nome do Perfil',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Permissões',
      dataIndex: 'permissoes',
      key: 'permissoes',
      render: (permissoes) => (
        <Tag color="blue">{permissoes?.length || 0} permissões</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo) => (
        <Tag color={ativo ? 'green' : 'red'}>{ativo ? 'Ativo' : 'Inativo'}</Tag>
      )
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('perfil', record)}>Editar</Button>
      )
    }
  ];

  // Tabela de Especialidades
  const especialidadesColumns = [
    {
      title: 'Nome da Especialidade',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Ação',
      key: 'acao',
      render: (_, record) => (
        <Button size="small" onClick={() => handleEdit('especialidade', record)}>Editar</Button>
      )
    }
  ];


  function handleEdit(type, record) {
    setEditType(type);
    setEditRecord(record);
    setModalVisible(true);
    if (type === 'especialidade') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'servico') {
      form.setFieldsValue({ 
        especialidade: record.especialidade_id || record.especialidade, 
        tipoUtente: record.tipo_utente_id || record.tipoUtente, 
        valor: record.valor, 
        estado: record.estado,
        descricao: record.descricao
      });
    } else if (type === 'tratamento') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'unidadeOrganica') {
      form.setFieldsValue({ nome: record.nome, sigla: record.sigla, descricao: record.descricao, tipo: record.tipo, ativo: record.ativo });
    } else if (type === 'provincia') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, ativo: record.ativo });
    } else if (type === 'bairro') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, distrito_id: record.distrito_id, codigo_postal: record.codigo_postal, ativo: record.ativo });
    } else if (type === 'distrito') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, provincia_id: record.provincia_id, ativo: record.ativo });
    } else if (type === 'tipoUtente') {
      form.setFieldsValue({ nome: record.nome, descricao: record.descricao });
    } else if (type === 'tipoConsulta') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, requer_triagem: record.requer_triagem, ativo: record.ativo });
    } else if (type === 'precoConsulta') {
      form.setFieldsValue({ tipo_consulta_id: record.tipo_consulta_id, tipo_utente_id: record.tipo_utente_id, valor: record.valor, descricao: record.descricao, ativo: record.ativo });
    } else if (type === 'tipoExame') {
      form.setFieldsValue({ 
        nome: record.nome, 
        descricao: record.descricao,
        ativo: record.ativo !== undefined ? record.ativo : true
      });
    } else if (type === 'exame') {
      form.setFieldsValue({ 
        tipoExame: record.tipo_exame_id || record.tipoExame?.id || record.tipoExame,
        tipoUtente: record.tipo_utente_id || record.tipoUtente?.id || record.tipoUtente,
        valor: record.valor, 
        estado: record.ativo ? 'Ativo' : 'Inativo'
      });
    } else if (type === 'raca') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, ativo: record.ativo });
    } else if (type === 'medicamento') {
      form.setFieldsValue({ 
        nome: record.nome, 
        principio_ativo: record.principio_ativo, 
        codigo: record.codigo, 
        forma_id: record.forma_id, 
        via_administracao_id: record.via_administracao_id, 
        dosagem: record.dosagem, 
        unidade_dosagem: record.unidade_dosagem,
        instrucoes_padrao: record.instrucoes_padrao,
        contraindicacoes: record.contraindicacoes,
        efeitos_colaterais: record.efeitos_colaterais,
        controlado: record.controlado,
        generico: record.generico,
        ativo: record.ativo
      });
    } else if (type === 'formaMedicamento') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, ativo: record.ativo });
    } else if (type === 'viaAdministracao') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, ativo: record.ativo });
    } else if (type === 'tipoDocumento') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, formato_validacao: record.formato_validacao, ativo: record.ativo });
    } else if (type === 'grauParentesco') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, ativo: record.ativo });
    } else if (type === 'metodoPagamento') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, requer_comprovante: record.requer_comprovante, requer_confirmacao: record.requer_confirmacao, ativo: record.ativo });
    } else if (type === 'tipoConsulta') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, requer_triagem: record.requer_triagem, ativo: record.ativo });
    } else if (type === 'funcaoEspecialidade') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, pode_prescrever: record.pode_prescrever, pode_solicitar_exames: record.pode_solicitar_exames, pode_criar_prontuario: record.pode_criar_prontuario, ativo: record.ativo });
    } else if (type === 'usuario') {
      form.setFieldsValue({ nome: record.nome, email: record.email, cargo: record.cargo, ativo: record.ativo });
    } else if (type === 'perfil') {
      form.setFieldsValue({ nome: record.nome, codigo: record.codigo, descricao: record.descricao, ativo: record.ativo });
    }
  }

  function handleAdd(type) {
      setEditType(type);
      setEditRecord(null);
      setModalVisible(true);
      form.resetFields();
      
      // Definir valores padrão para novo usuário, perfil ou preço de consulta
      if (type === 'usuario' || type === 'perfil' || type === 'precoConsulta') {
        form.setFieldsValue({ ativo: true });
      }
    }
  
    const handleSearchInput = (e) => {
      setSearchText(e.target.value);
      // Here you can add implementation for searching through data
    };


  function handleModalOk() {
    form.validateFields().then(async values => {
      try {
        if (editType === 'especialidade') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar especialidade existente
            await axios.put(`http://196.3.100.216/api/especialidades/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Especialidade atualizada com sucesso!');
          } else {
            // Criar nova especialidade
            await axios.post('http://196.3.100.216/api/especialidades/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Especialidade criada com sucesso!');
          }
          
          // Recarregar lista de especialidades
          await fetchEspecialidades();
        } else if (editType === 'servico') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          // Preparar payload
          const payload = {
            especialidade_id: values.especialidade,
            tipo_utente_id: values.tipoUtente,
            valor: parseFloat(values.valor),
            estado: values.estado || 'Ativo',
            descricao: values.descricao || null
          };
          
          console.log('📦 Payload do serviço:', payload);
          
          if (editRecord) {
            // Atualizar serviço existente
            await axios.put(`http://196.3.100.216/api/precos-especialidades/${editRecord.id}`, payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Serviço atualizado com sucesso!');
          } else {
            // Criar novo serviço
            await axios.post('http://196.3.100.216/api/precos-especialidades/', payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Serviço criado com sucesso!');
          }
          
          // Recarregar lista de serviços
          await fetchServicos();
        } else if (editType === 'tratamento') {
          if (editRecord) {
            setTratamentos(tratamentos.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
          } else {
            setTratamentos([...tratamentos, { id: Date.now(), ...values }]);
          }
        } else if (editType === 'tipoUtente') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar tipo de utente existente
            await axios.put(`http://196.3.100.216/api/tipos-utente/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Utente atualizado com sucesso!');
          } else {
            // Criar novo tipo de utente
            await axios.post('http://196.3.100.216/api/tipos-utente/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Utente criado com sucesso!');
          }
          
          // Recarregar lista de tipos de utente
          await fetchTiposUtente();
        } else if (editType === 'tipoConsulta') {
          if (editRecord) {
            setTiposConsulta(tiposConsulta.map(t => t.id === editRecord.id ? { ...t, ...values } : t));
          } else {
            setTiposConsulta([...tiposConsulta, { id: Date.now(), ...values }]);
          }
        } else if (editType === 'consulta') {
          if (editRecord) {
            setConsultas(consultas.map(c => c.id === editRecord.id ? { ...c, ...values } : c));
          } else {
            setConsultas([...consultas, { id: Date.now(), ...values }]);
          }
        } else if (editType === 'tipoExame') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          // Preparar payload com valores padrão para campos obrigatórios do backend
          const payload = {
            nome: values.nome,
            descricao: values.descricao || '',
            categoria: 'Geral', // Valor padrão
            preco_padrao: 0, // Valor padrão
            ativo: values.ativo !== undefined ? values.ativo : true
          };
          
          console.log('📦 Payload do tipo de exame:', payload);
          
          if (editRecord) {
            // Atualizar tipo de exame existente
            await axios.put(`http://196.3.100.216/api/tipos-exame/${editRecord.id}`, payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Exame atualizado com sucesso!');
          } else {
            // Criar novo tipo de exame
            await axios.post('http://196.3.100.216/api/tipos-exame/', payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Exame criado com sucesso!');
          }
          
          // Recarregar lista de tipos de exame
          await fetchTiposExame();
        } else if (editType === 'exame') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          // Preparar payload com nomes de campos corretos do backend
          const payload = {
            tipo_exame_id: values.tipoExame,
            tipo_utente_id: values.tipoUtente,
            valor: parseFloat(values.valor),
            ativo: values.estado === 'Ativo' || values.ativo === true,
            descricao: ''
          };
          
          console.log('📦 Payload do exame:', payload);
          
          if (editRecord) {
            // Atualizar exame existente
            await axios.put(`http://196.3.100.216/api/exames/${editRecord.id}`, payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Exame atualizado com sucesso!');
          } else {
            // Criar novo exame
            await axios.post('http://196.3.100.216/api/exames/', payload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Exame criado com sucesso!');
          }
          
          // Recarregar lista de exames
          await fetchExames();
        } else if (editType === 'provincia') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar província existente
            await axios.put(`http://196.3.100.216/api/provincias/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Província atualizada com sucesso!');
          } else {
            // Criar nova província
            await axios.post('http://196.3.100.216/api/provincias/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Província criada com sucesso!');
          }
          
          // Recarregar lista de províncias
          await fetchProvincias();
        } else if (editType === 'bairro') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar bairro existente
            await axios.put(`http://196.3.100.216/api/bairros/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Bairro atualizado com sucesso!');
          } else {
            // Criar novo bairro
            await axios.post('http://196.3.100.216/api/bairros/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Bairro criado com sucesso!');
          }
          
          // Recarregar lista de bairros
          await fetchBairros();
        } else if (editType === 'distrito') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar distrito existente
            await axios.put(`http://196.3.100.216/api/distritos/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Distrito atualizado com sucesso!');
          } else {
            // Criar novo distrito
            await axios.post('http://196.3.100.216/api/distritos/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Distrito criado com sucesso!');
          }
          
          // Recarregar lista de distritos
          await fetchDistritos();
        } else if (editType === 'unidadeOrganica') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar unidade orgânica existente
            await axios.put(`http://196.3.100.216/api/unidades-organicas/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Unidade Orgânica atualizada com sucesso!');
          } else {
            // Criar nova unidade orgânica
            await axios.post('http://196.3.100.216/api/unidades-organicas/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Unidade Orgânica criada com sucesso!');
          }
          
          // Recarregar lista de unidades orgânicas
          await fetchUnidadesOrganicas();
        } else if (editType === 'raca') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar raça existente
            await axios.put(`http://196.3.100.216/api/racas/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Raça atualizada com sucesso!');
          } else {
            // Criar nova raça
            await axios.post('http://196.3.100.216/api/racas/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Raça criada com sucesso!');
          }
          
          // Recarregar lista de raças
          await fetchRacas();
        } else if (editType === 'medicamento') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar medicamento existente
            await axios.put(`http://196.3.100.216/api/medicamentos/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Medicamento atualizado com sucesso!');
          } else {
            // Criar novo medicamento
            await axios.post('http://196.3.100.216/api/medicamentos/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Medicamento criado com sucesso!');
          }
          
          // Recarregar lista de medicamentos
          await fetchMedicamentos();
        } else if (editType === 'formaMedicamento') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar forma de medicamento existente
            await axios.put(`http://196.3.100.216/api/formas-medicamento/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Forma de Medicamento atualizada com sucesso!');
          } else {
            // Criar nova forma de medicamento
            await axios.post('http://196.3.100.216/api/formas-medicamento/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Forma de Medicamento criada com sucesso!');
          }
          
          // Recarregar lista de formas de medicamento
          await fetchFormasFarmaceuticas();
        } else if (editType === 'viaAdministracao') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar via de administração existente
            await axios.put(`http://196.3.100.216/api/vias-administracao/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Via de Administração atualizada com sucesso!');
          } else {
            // Criar nova via de administração
            await axios.post('http://196.3.100.216/api/vias-administracao/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Via de Administração criada com sucesso!');
          }
          
          // Recarregar lista de vias de administração
          await fetchViasAdministracao();
        } else if (editType === 'tipoDocumento') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar tipo de documento existente
            await axios.put(`http://196.3.100.216/api/tipos-documento/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Documento atualizado com sucesso!');
          } else {
            // Criar novo tipo de documento
            await axios.post('http://196.3.100.216/api/tipos-documento/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Documento criado com sucesso!');
          }
          
          // Recarregar lista de tipos de documento
          await fetchTiposDocumento();
        } else if (editType === 'grauParentesco') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar grau de parentesco existente
            await axios.put(`http://196.3.100.216/api/graus-parentesco/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Grau de Parentesco atualizado com sucesso!');
          } else {
            // Criar novo grau de parentesco
            await axios.post('http://196.3.100.216/api/graus-parentesco/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Grau de Parentesco criado com sucesso!');
          }
          
          // Recarregar lista de graus de parentesco
          await fetchGrausParentesco();
        } else if (editType === 'metodoPagamento') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar método de pagamento existente
            await axios.put(`http://196.3.100.216/api/metodos-pagamento/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Método de Pagamento atualizado com sucesso!');
          } else {
            // Criar novo método de pagamento
            await axios.post('http://196.3.100.216/api/metodos-pagamento/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Método de Pagamento criado com sucesso!');
          }
          
          // Recarregar lista de métodos de pagamento
          await fetchMetodosPagamento();
        } else if (editType === 'tipoConsulta') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar tipo de consulta existente
            await axios.put(`http://196.3.100.216/api/tipos-consulta/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Consulta atualizado com sucesso!');
          } else {
            // Criar novo tipo de consulta
            await axios.post('http://196.3.100.216/api/tipos-consulta/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Tipo de Consulta criado com sucesso!');
          }
          
          // Recarregar lista de tipos de consulta
          await fetchTiposConsulta();
        } else if (editType === 'funcaoEspecialidade') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar função de especialidade existente
            await axios.put(`http://196.3.100.216/api/funcoes-especialidade/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Função de Especialidade atualizada com sucesso!');
          } else {
            // Criar nova função de especialidade
            await axios.post('http://196.3.100.216/api/funcoes-especialidade/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Função de Especialidade criada com sucesso!');
          }
          
          // Recarregar lista de funções de especialidade
          await fetchFuncoesEspecialidade();
        } else if (editType === 'usuario') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar usuário existente - remover password se existir
            const { password, ...updateValues } = values;
            await axios.put(`http://196.3.100.216/api/users/${editRecord.id}`, updateValues, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Usuário atualizado com sucesso!');
          } else {
            // Criar novo usuário
            await axios.post('http://196.3.100.216/api/users/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Usuário criado com sucesso!');
          }
          
          // Recarregar lista de usuários
          await fetchUsuarios();
        } else if (editType === 'perfil') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar perfil existente
            await axios.put(`http://196.3.100.216/api/roles/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Perfil atualizado com sucesso!');
          } else {
            // Criar novo perfil
            await axios.post('http://196.3.100.216/api/roles/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Perfil criado com sucesso!');
          }
          
          // Recarregar lista de perfis
          await fetchPerfis();
        } else if (editType === 'precoConsulta') {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token');
          
          if (editRecord) {
            // Atualizar preço de consulta existente
            await axios.put(`http://196.3.100.216/api/precos-consultas/${editRecord.id}`, values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Preço de Consulta atualizado com sucesso!');
          } else {
            // Criar novo preço de consulta
            await axios.post('http://196.3.100.216/api/precos-consultas/', values, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            message.success('Preço de Consulta criado com sucesso!');
          }
          
          // Recarregar lista de preços de consultas
          await fetchPrecosConsultas();
        }
        setModalVisible(false);
      } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Erro ao salvar';
        message.error(errorMsg);
      }
    });
  }


  // Cards principais
  if (view === 'cards') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <Title level={3} style={{ color: '#28a745', marginBottom: 32 }}>Parametrização</Title>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('hospital')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <BankOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Hospital</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie módulos hospitalares</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('tipoUtente')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <UserOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Utentes</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de utente.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('territorio')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Território</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie províncias e bairros.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('unidadeOrganica')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Unidade Orgânica</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as unidades orgânicas.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('raca')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <UserOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Raças</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as raças.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('tipoDocumento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <FileOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Tipos de Documento</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de documento.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('grauParentesco')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <UserOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Graus de Parentesco</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os graus de parentesco.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('metodoPagamento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Métodos de Pagamento</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os métodos de pagamento.</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Card hoverable onClick={() => setView('usuario')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }} bodyStyle={{ padding: 24 }}>
              <UserOutlined style={{ fontSize: 32, color: '#28a745', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#28a745', marginBottom: 8 }}>Usuários</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as funções de especialidade.</div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // View de Hospital (Sub-cards)
  if (view === 'hospital') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ color: '#28a745', margin: 0 }}>Hospital</Title>
          <Button
            onClick={() => setView('cards')}
            style={{
              color: '#28a745',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '6px 16px',
              borderColor: '#28a745'
            }}
          >
            Voltar
          </Button>
        </div>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('especialidade')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Especialidades</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie especialidades e serviços</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('tratamento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Tratamentos</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os tipos de tratamentos</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('consulta')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Consultas</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie preços e tipos de consultas</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('exame')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Exames</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie exames e tipos de exames</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('medicamento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Medicamentos</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie os medicamentos</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('viaAdministracao')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <MedicineBoxOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Vias de Administração</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as vias de administração</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={8}>
            <Card hoverable onClick={() => setView('formaMedicamento')}
              style={{ borderRadius: 12, textAlign: 'center', minHeight: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              bodyStyle={{ padding: 24 }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#3b82f6', marginBottom: 16 }} />
              <Title level={5} style={{ color: '#3b82f6', marginBottom: 8 }}>Formas de Medicamento</Title>
              <div style={{ color: '#666', fontSize: 13 }}>Gerencie as formas farmacêuticas</div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // View de Exames
  if (view === 'exame') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
            <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
            <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Exames
            </h2>
          </div>

          <Button
            onClick={() => setView('cards')}
            style={{
          color: '#3b82f6',
          fontWeight: 'bold',
          borderRadius: '8px',
          padding: '6px 16px',
            }}
          >
            Voltar
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
          onChange={setActiveTab}
          type="card"
          style={{ marginBottom: 0 }}
          items={[
            {
              key: '1',
              label: 'Exames'
            },
            {
              key: '2',
              label: 'Tipos de Exames'
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
          <>
            <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd('exame')}
          style={{
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
            padding: '6px 16px',
            marginBottom: 16
          }}
            >
          Novo Exame
            </Button>
            <Table
          columns={examesColumns}
          dataSource={exames}
          rowKey="id"
          loading={loadingExames}
          pagination={{
            pageSize: 3,
            showSizeChanger: false,
            style: { marginTop: 5 },
          }}
          bordered
          style={{ borderRadius: 10, overflow: 'hidden' }}
          rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />
          </>
        ) : activeTab === '2' ? (
          <>
            <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd('tipoExame')}
          style={{
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '8px',
            padding: '6px 16px',
            marginBottom: 16
          }}
            >
          Novo Tipo de Exame
            </Button>
            <Table
          columns={tiposExameColumns}
          dataSource={tiposExame}
          rowKey="id"
          pagination={{
            pageSize: 3,
            showSizeChanger: false,
            style: { marginTop: 5 },
          }}
          bordered
          style={{ borderRadius: 10, overflow: 'hidden' }}
          rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />
          </>
        ) : null}

        <Modal
          open={modalVisible}
          title={editType === 'tipoExame' ? (editRecord ? 'Editar Tipo de Exame' : 'Novo Tipo de Exame') : (editType === 'exame' ? (editRecord ? 'Editar Exame' : 'Novo Exame') : '')}
          onCancel={() => setModalVisible(false)}
          onOk={handleModalOk}
          okText="Salvar"
          destroyOnClose
        >
          <Form form={form} layout="vertical">
            {editType === 'tipoExame' ? (
          <>
            <Form.Item name="nome" label="Nome do Tipo de Exame" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Input placeholder="Digite o nome do tipo de exame" />
            </Form.Item>
            <Form.Item name="descricao" label="Descrição" rules={[{ required: false }]}> 
              <Input.TextArea placeholder="Digite a descrição do tipo de exame" rows={3} />
            </Form.Item>
            <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Radio.Group>
                <Radio value={true}>Ativo</Radio>
                <Radio value={false}>Inativo</Radio>
              </Radio.Group>
            </Form.Item>
          </>
            ) : editType === 'exame' ? (
          <>
            <Form.Item name="tipoExame" label="Tipo de Exame" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select placeholder="Selecione o tipo de exame">
            {tiposExame.map(te => (
              <Select.Option key={te.id} value={te.id}>{te.nome}</Select.Option>
            ))}
              </Select>
            </Form.Item>
            <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select placeholder="Selecione o tipo de utente">
            {tiposUtente.map(tu => (
              <Select.Option key={tu.id} value={tu.id}>{tu.nome}</Select.Option>
            ))}
              </Select>
            </Form.Item>
            <Form.Item name="valor" label="Valor a Pagar" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" />
            </Form.Item>
            <Form.Item name="estado" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
              <Select>
            <Select.Option value="Ativo">Ativo</Select.Option>
            <Select.Option value="Inativo">Inativo</Select.Option>
              </Select>
            </Form.Item>
          </>
            ) : null}
          </Form>
        </Modal>

        {/* Estilos personalizados */}
        <style>{`
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
        `}</style>
          </Card>
        </div>
      </div>
        );
  }

  // View de Consulta
  if (view === 'consulta') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <FileTextOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Consultas
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  onChange={setActiveTab}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Consultas'
                    },
                    {
                      key: '2',
                      label: 'Tipos de Consultas'
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
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('precoConsulta')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Novo Preço de Consulta
                </Button>
                <Table
                  columns={consultasColumns}
                  dataSource={precosConsultas}
                  rowKey="id"
                  loading={loadingPrecosConsultas}
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : activeTab === '2' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('tipoConsulta')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Novo Tipo de Consulta
                </Button>
                <Table
                  columns={tiposConsultaColumns}
                  dataSource={tiposConsulta}
                  rowKey="id"
                  loading={loadingTiposConsulta}
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : null}

            <Modal
              open={modalVisible}
              title={editType === 'precoConsulta' ? (editRecord ? 'Editar Preço de Consulta' : 'Novo Preço de Consulta') : editType === 'tipoConsulta' ? (editRecord ? 'Editar Tipo de Consulta' : 'Novo Tipo de Consulta') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              width={600}
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'precoConsulta' ? (
                  <>
                    <Form.Item name="tipo_consulta_id" label="Tipo de Consulta" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de consulta" showSearch optionFilterProp="children">
                        {tiposConsulta.map(tc => (
                          <Select.Option key={tc.id} value={tc.id}>{tc.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="tipo_utente_id" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de utente" showSearch optionFilterProp="children">
                        {tiposUtente.map(tu => (
                          <Select.Option key={tu.id} value={tu.id}>{tu.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="valor" label="Valor (MZN)" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" placeholder="0.00" step={0.01} />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição"> 
                      <Input.TextArea placeholder="Digite uma descrição (opcional)" rows={3} />
                    </Form.Item>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : editType === 'tipoConsulta' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Tipo de Consulta" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do tipo de consulta" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código (ex: ACOM)" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição"> 
                      <Input.TextArea placeholder="Digite a descrição do tipo de consulta" rows={3} />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="requer_triagem" label="Requer Triagem" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Sim</Radio>
                            <Radio value={false}>Não</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Ativo</Radio>
                            <Radio value={false}>Inativo</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Tipos de Utente
  if (view === 'tipoUtente') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                  Tipos de Utente
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Tipos de Utente'
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

            {/* Conteúdo */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('tipoUtente')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Tipo de Utente
            </Button>
            <Table
              columns={tiposUtenteColumns}
              dataSource={tiposUtente}
              rowKey="id"
              loading={loadingTiposUtente}
              pagination={{
                pageSize: 3,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editType === 'tipoUtente' ? (editRecord ? 'Editar Tipo de Utente' : 'Novo Tipo de Utente') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do tipo de utente" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição do tipo de utente" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Território
  if (view === 'territorio') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Território
                </h2>
              </div>
              <Button
                onClick={() => setView('cards')}
                icon={<PlusOutlined style={{ transform: 'rotate(45deg)' }} />}
                style={{
                  background: '#e0f2fe',
                  color: '#3b82f6',
                  borderColor: 'transparent',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  onChange={setActiveTab}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Províncias'
                    },
                    {
                      key: '2',
                      label: 'Bairros'
                    },
                    {
                      key: '3',
                      label: 'Distritos'
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
            <div style={{ padding: '16px 0' }}>
              {activeTab === '1' && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd('provincia')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      marginBottom: 16
                    }}
                  >
                    Nova Província
                  </Button>
                  <Table
                    columns={provinciasColumns}
                    dataSource={provincias}
                    rowKey="id"
                    loading={loadingProvincias}
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      style: { marginTop: 5 },
                    }}
                    bordered
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                  />
                </>
              )}
              {activeTab === '2' && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd('bairro')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      marginBottom: 16
                    }}
                  >
                    Novo Bairro
                  </Button>
                  <Table
                    columns={bairrosColumns}
                    dataSource={bairros}
                    rowKey="id"
                    loading={loadingBairros}
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      style: { marginTop: 5 },
                    }}
                    bordered
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                  />
                </>
              )}
              {activeTab === '3' && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd('distrito')}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      marginBottom: 16
                    }}
                  >
                    Novo Distrito
                  </Button>
                  <Table
                    columns={distritosColumns}
                    dataSource={distritos}
                    rowKey="id"
                    loading={loadingDistritos}
                    pagination={{
                      pageSize: 5,
                      showSizeChanger: false,
                      style: { marginTop: 5 },
                    }}
                    bordered
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                  />
                </>
              )}
            </div>

            <Modal
              open={modalVisible}
              title={
                editType === 'provincia' 
                  ? (editRecord ? 'Editar Província' : 'Nova Província') 
                  : editType === 'bairro' 
                  ? (editRecord ? 'Editar Bairro' : 'Novo Bairro')
                  : editType === 'distrito'
                  ? (editRecord ? 'Editar Distrito' : 'Novo Distrito')
                  : ''
              }
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'provincia' ? (
                  <>
                    <Form.Item name="nome" label="Nome da Província" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome da província" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código da província" />
                    </Form.Item>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : editType === 'bairro' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Bairro" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do bairro" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código do bairro" />
                    </Form.Item>
                    <Form.Item name="distrito_id" label="Distrito" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o distrito">
                        {distritos.map(d => (
                          <Select.Option key={d.id} value={d.id}>{d.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="codigo_postal" label="Código Postal" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código postal" />
                    </Form.Item>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : editType === 'distrito' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Distrito" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do distrito" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código do distrito" />
                    </Form.Item>
                    <Form.Item name="provincia_id" label="Província" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a província">
                        {provincias.map(p => (
                          <Select.Option key={p.id} value={p.id}>{p.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Tratamentos
  if (view === 'tratamento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Tratamentos
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey={tratamentoTabKey}
                  onChange={setTratamentoTabKey}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: 'tratamentos',
                      label: 'Tratamentos'
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('tratamento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Tratamento
            </Button>
            <Table
              columns={tratamentosColumns}
              dataSource={tratamentos}
              rowKey="id"
              pagination={{
                pageSize: 3,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editType === 'tratamento' ? (editRecord ? 'Editar Tratamento' : 'Novo Tratamento') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Tratamento" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do tratamento" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição do tratamento" rows={3} />
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Especialidade/Serviços
  if (view === 'especialidade') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Especialidades & Serviços
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey={tabKey}
                  onChange={setTabKey}
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: 'servicos',
                      label: 'Serviços'
                    },
                    {
                      key: 'especialidades',
                      label: 'Especialidades'
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
            {tabKey === 'servicos' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('servico')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Novo Serviço
                </Button>
                <Table
                  columns={servicosColumns}
                  dataSource={servicos}
                  rowKey="id"
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : tabKey === 'especialidades' ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd('especialidade')}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    marginBottom: 16
                  }}
                >
                  Nova Especialidade
                </Button>
                <Table
                  columns={especialidadesColumns}
                  dataSource={especialidades}
                  rowKey="id"
                  loading={loadingEspecialidades}
                  pagination={{
                    pageSize: 3,
                    showSizeChanger: false,
                    style: { marginTop: 5 },
                  }}
                  bordered
                  style={{ borderRadius: 10, overflow: 'hidden' }}
                  rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
                />
              </>
            ) : null}

            <Modal
              open={modalVisible}
              title={editType === 'especialidade' ? (editRecord ? 'Editar Especialidade' : 'Nova Especialidade') : (editType === 'servico' ? (editRecord ? 'Editar Serviço' : 'Novo Serviço') : '')}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'especialidade' ? (
                  <>
                    <Form.Item name="nome" label="Nome da Especialidade" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome da especialidade" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input.TextArea placeholder="Digite a descrição da especialidade" rows={3} />
                    </Form.Item>
                  </>
                ) : editType === 'servico' ? (
                  <>
                    <Form.Item name="especialidade" label="Especialidade" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a especialidade">
                        {especialidades.map(e => (
                          <Select.Option key={e.id} value={e.id}>{e.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="tipoUtente" label="Tipo de Utente" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o tipo de utente">
                        {tiposUtente.map(t => (
                          <Select.Option key={t.id} value={t.id}>{t.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="valor" label="Valor a Pagar" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <InputNumber min={0} style={{ width: '100%' }} addonAfter="MZN" />
                    </Form.Item>
                    <Form.Item name="estado" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select>
                        <Select.Option value="Ativo">Ativo</Select.Option>
                        <Select.Option value="Inativo">Inativo</Select.Option>
                      </Select>
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }
  
  // View de Unidade Orgânica
  if (view === 'unidadeOrganica') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <AppstoreAddOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Unidades Orgânicas
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            {/* Área de Pesquisa */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('unidadeOrganica')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Nova Unidade Orgânica
            </Button>
            <Table
              columns={unidadesOrganicasColumns}
              dataSource={unidadesOrganicas}
              rowKey="id"
              loading={loadingUnidadesOrganicas}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Unidade Orgânica' : 'Nova Unidade Orgânica'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome da Unidade Orgânica" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome da unidade orgânica" />
                </Form.Item>
                <Form.Item name="sigla" label="Sigla" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite a sigla" />
                </Form.Item>
                <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Select placeholder="Selecione o tipo">
                    <Select.Option value="faculdade">Faculdade</Select.Option>
                    <Select.Option value="escola">Escola</Select.Option>
                    <Select.Option value="departamento">Departamento</Select.Option>
                    <Select.Option value="centro">Centro</Select.Option>
                    <Select.Option value="instituto">Instituto</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição da unidade orgânica" rows={3} />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Raças
  if (view === 'raca') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                  Raças
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Raças'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('raca')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Nova Raça
            </Button>
            <Table
              columns={racasColumns}
              dataSource={racas}
              rowKey="id"
              loading={loadingRacas}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Raça' : 'Nova Raça'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome da Raça" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome da raça" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input.TextArea placeholder="Digite a descrição da raça" rows={3} />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // View de Medicamentos
  if (view === 'medicamento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Medicamentos
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Medicamentos'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('medicamento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Medicamento
            </Button>
            <Table
              columns={medicamentosColumns}
              dataSource={medicamentos}
              rowKey="id"
              loading={loadingMedicamentos}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Medicamento' : 'Novo Medicamento'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={700}
            >
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="nome" label="Nome do Medicamento" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="principio_ativo" label="Princípio Ativo" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o princípio ativo" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="forma_id" label="Forma Farmacêutica" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a forma">
                        {formasFarmaceuticas.map(f => (
                          <Select.Option key={f.id} value={f.id}>{f.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="via_administracao_id" label="Via de Administração" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione a via">
                        {viasAdministracao.map(v => (
                          <Select.Option key={v.id} value={v.id}>{v.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Ex: MED001" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="dosagem" label="Dosagem" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Ex: 500" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="unidade_dosagem" label="Unidade" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione">
                        <Select.Option value="mg">mg</Select.Option>
                        <Select.Option value="g">g</Select.Option>
                        <Select.Option value="ml">ml</Select.Option>
                        <Select.Option value="mcg">mcg</Select.Option>
                        <Select.Option value="UI">UI</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="instrucoes_padrao" label="Instruções Padrão"> 
                  <Input.TextArea placeholder="Digite as instruções de uso" rows={2} />
                </Form.Item>
                <Form.Item name="contraindicacoes" label="Contraindicações"> 
                  <Input.TextArea placeholder="Digite as contraindicações" rows={2} />
                </Form.Item>
                <Form.Item name="efeitos_colaterais" label="Efeitos Colaterais"> 
                  <Input.TextArea placeholder="Digite os efeitos colaterais" rows={2} />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="generico" label="Genérico" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Sim</Radio>
                        <Radio value={false}>Não</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="controlado" label="Controlado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Sim</Radio>
                        <Radio value={false}>Não</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Formas de Medicamento
  if (view === 'formaMedicamento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <FileTextOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Formas de Medicamento
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Formas de Medicamento'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('formaMedicamento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Nova Forma de Medicamento
            </Button>
            <Table
              columns={formasMedicamentoColumns}
              dataSource={formasFarmaceuticas}
              rowKey="id"
              loading={loadingFormasMedicamento}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Forma de Medicamento' : 'Nova Forma de Medicamento'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={600}
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome da Forma" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome da forma" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código (ex: COMP)" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição"> 
                  <Input.TextArea placeholder="Digite a descrição" rows={3} />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Vias de Administração
  if (view === 'viaAdministracao') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <MedicineBoxOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Vias de Administração
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Vias de Administração'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('viaAdministracao')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Nova Via de Administração
            </Button>
            <Table
              columns={viasAdministracaoColumns}
              dataSource={viasAdministracao}
              rowKey="id"
              loading={loadingViasAdministracao}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Via de Administração' : 'Nova Via de Administração'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={600}
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome da Via" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome da via" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código (ex: OR)" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição"> 
                  <Input.TextArea placeholder="Digite a descrição" rows={3} />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Tipos de Documento
  if (view === 'tipoDocumento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <FileOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Tipos de Documento
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Tipos de Documento'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('tipoDocumento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Tipo de Documento
            </Button>
            <Table
              columns={tiposDocumentoColumns}
              dataSource={tiposDocumento}
              rowKey="id"
              loading={loadingTiposDocumento}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={600}
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Tipo" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do tipo de documento" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código (ex: BI)" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição"> 
                  <Input.TextArea placeholder="Digite a descrição" rows={3} />
                </Form.Item>
                <Form.Item name="formato_validacao" label="Formato de Validação (Regex)"> 
                  <Input placeholder="Ex: /^[0-9]{12}[A-Z]$/" />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Graus de Parentesco
  if (view === 'grauParentesco') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                  Graus de Parentesco
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Graus de Parentesco'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('grauParentesco')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Grau de Parentesco
            </Button>
            <Table
              columns={grausParentescoColumns}
              dataSource={grausParentesco}
              rowKey="id"
              loading={loadingGrausParentesco}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Grau de Parentesco' : 'Novo Grau de Parentesco'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={600}
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Grau" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do grau de parentesco" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código (ex: PAI)" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição"> 
                  <Input.TextArea placeholder="Digite a descrição" rows={3} />
                </Form.Item>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Usuários (Funções de Especialidade)
  if (view === 'usuario') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                  Gestão de Usuários
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
              </Button>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <Tabs.TabPane tab="Especialidade_user" key="1">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('funcaoEspecialidade')}>
                    Nova Função de Especialidade
                  </Button>
                </div>
                <Table 
                  columns={funcoesEspecialidadeColumns} 
                  dataSource={funcoesEspecialidade} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                  loading={loadingFuncoesEspecialidade}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Usuarios" key="2">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('usuario')}>
                    Novo Usuário
                  </Button>
                </div>
                <Table 
                  columns={usuariosColumns} 
                  dataSource={usuarios} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                  loading={loadingUsuarios}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="Perfil" key="3">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd('perfil')}>
                    Novo Perfil
                  </Button>
                </div>
                <Table 
                  columns={perfisColumns} 
                  dataSource={perfis} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                  loading={loadingPerfis}
                />
              </Tabs.TabPane>
            </Tabs>

            <Modal
              open={modalVisible}
              title={editType === 'perfil' ? (editRecord ? 'Editar Perfil' : 'Novo Perfil') : editType === 'usuario' ? (editRecord ? 'Editar Usuário' : 'Novo Usuário') : editType === 'funcaoEspecialidade' ? (editRecord ? 'Editar Função de Especialidade' : 'Nova Função de Especialidade') : ''}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              width={600}
              destroyOnClose
            >
              <Form form={form} layout="vertical">
                {editType === 'perfil' ? (
                  <>
                    <Form.Item name="nome" label="Nome do Perfil" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome do perfil" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código (ex: admin)" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição"> 
                      <Input.TextArea placeholder="Digite a descrição do perfil" rows={3} />
                    </Form.Item>
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : editType === 'usuario' ? (
                  <>
                    <Form.Item name="nome" label="Nome Completo" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome completo do usuário" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Insira um email válido' }]}> 
                      <Input placeholder="Digite o email (ex: usuario@clinica.com)" />
                    </Form.Item>
                    <Form.Item name="cargo" label="Cargo/Função" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Select placeholder="Selecione o cargo" showSearch optionFilterProp="children">
                        {funcoesEspecialidade.map(funcao => (
                          <Select.Option key={funcao.id} value={funcao.nome}>{funcao.nome}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    {!editRecord && (
                      <Form.Item name="password" label="Senha" rules={[{ required: true, message: 'Obrigatório' }]}> 
                        <Input.Password placeholder="Digite a senha" />
                      </Form.Item>
                    )}
                    <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Ativo</Radio>
                        <Radio value={false}>Inativo</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </>
                ) : editType === 'funcaoEspecialidade' ? (
                  <>
                    <Form.Item name="nome" label="Nome da Função" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o nome da função" />
                    </Form.Item>
                    <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Input placeholder="Digite o código (ex: MED)" />
                    </Form.Item>
                    <Form.Item name="descricao" label="Descrição"> 
                      <Input.TextArea placeholder="Digite a descrição da função" rows={3} />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="pode_prescrever" label="Pode Prescrever" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Sim</Radio>
                            <Radio value={false}>Não</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="pode_solicitar_exames" label="Pode Solicitar Exames" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Sim</Radio>
                            <Radio value={false}>Não</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="pode_criar_prontuario" label="Pode Criar Prontuário" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Sim</Radio>
                            <Radio value={false}>Não</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                          <Radio.Group>
                            <Radio value={true}>Ativo</Radio>
                            <Radio value={false}>Inativo</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ) : null}
              </Form>
            </Modal>
          </Card>
        </div>
      </div>
    );
  }

  // VIEW: Métodos de Pagamento
  if (view === 'metodoPagamento') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ width: '100%', maxWidth: 1300, padding: 7 }}>
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
                <FileTextOutlined style={{ fontSize: '22px', color: '#3b82f6' }} />
                <h2 style={{ color: '#2d3a4a', margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Métodos de Pagamento
                </h2>
              </div>

              <Button
                onClick={() => setView('cards')}
                style={{
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '6px 16px',
                }}
              >
                Voltar
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
                  activeKey="1"
                  type="card"
                  style={{ marginBottom: 0 }}
                  items={[
                    {
                      key: '1',
                      label: 'Métodos de Pagamento'
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

            {/* Conteúdo da Tabela */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd('metodoPagamento')}
              style={{
                background: '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '6px 16px',
                marginBottom: 16
              }}
            >
              Novo Método de Pagamento
            </Button>
            <Table
              columns={metodosPagamentoColumns}
              dataSource={metodosPagamento}
              rowKey="id"
              loading={loadingMetodosPagamento}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                style: { marginTop: 5 },
              }}
              bordered
              style={{ borderRadius: 10, overflow: 'hidden' }}
              rowClassName={(record, index) => index % 2 === 0 ? 'ant-table-row-light' : 'ant-table-row-dark'}
            />

            <Modal
              open={modalVisible}
              title={editRecord ? 'Editar Método de Pagamento' : 'Novo Método de Pagamento'}
              onCancel={() => setModalVisible(false)}
              onOk={handleModalOk}
              okText="Salvar"
              destroyOnClose
              width={600}
            >
              <Form form={form} layout="vertical">
                <Form.Item name="nome" label="Nome do Método" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o nome do método de pagamento" />
                </Form.Item>
                <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Input placeholder="Digite o código (ex: CARD)" />
                </Form.Item>
                <Form.Item name="descricao" label="Descrição"> 
                  <Input.TextArea placeholder="Digite a descrição" rows={3} />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="requer_comprovante" label="Requer Comprovante" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Sim</Radio>
                        <Radio value={false}>Não</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="requer_confirmacao" label="Requer Confirmação" rules={[{ required: true, message: 'Obrigatório' }]}> 
                      <Radio.Group>
                        <Radio value={true}>Sim</Radio>
                        <Radio value={false}>Não</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="ativo" label="Estado" rules={[{ required: true, message: 'Obrigatório' }]}> 
                  <Radio.Group>
                    <Radio value={true}>Ativo</Radio>
                    <Radio value={false}>Inativo</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Modal>

            {/* Estilos personalizados */}
            <style>{`
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
            `}</style>
          </Card>
        </div>
      </div>
    );
  }
};

export default Parametrizacao;
