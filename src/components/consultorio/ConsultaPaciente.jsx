import React, { useState, useMemo, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Tabs, Card, Tag, List, Typography, Divider, Alert, Row, Col, Select, InputNumber, TimePicker } from 'antd';
import moment from 'moment';
import {
  CheckOutlined,
  MedicineBoxOutlined,
  FileSearchOutlined,
  PrinterOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SearchOutlined,
  SwapOutlined,
  TeamOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import ConsultaDetalhadaModal from './ConsultaDetalhadaModal';
import useConsultas from '../../hooks/useConsultas';
import axios from 'axios';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const Consultorio = () => {
  // Função para normalizar exames (garantir que sejam sempre strings ou objetos processados)
  const normalizarExames = (exames) => {
    if (!exames) return [];
    
    if (!Array.isArray(exames)) {
      // Se for uma string simples
      if (typeof exames === 'string') return [exames];
      // Se for um objeto
      if (typeof exames === 'object' && exames !== null) {
        if (exames.nome) return [String(exames.nome)];
        return [JSON.stringify(exames)];
      }
      return [String(exames)];
    }
    
    // Se for array, garantir que cada item seja string
    return exames.map(exame => {
      if (typeof exame === 'string') return exame;
      if (typeof exame === 'object' && exame !== null) {
        if (exame.nome) return String(exame.nome);
        return JSON.stringify(exame);
      }
      return String(exame);
    });
  };

  // Função para formatar resultados de exames complexos para melhor exibição
  const formatarResultadoExame = (valor) => {
    if (!valor) return '';
    
    if (typeof valor === 'string') {
      return valor;
    }
    
    if (typeof valor === 'object') {
      // Se tem a propriedade 'nome', usar ela
      if (valor.nome) {
        return valor.nome;
      }
      
      // Se tem 'valores', formatar os valores
      if (valor.valores && typeof valor.valores === 'object') {
        const valoresFormatados = Object.entries(valor.valores)
          .map(([nome, val]) => `${nome}: ${val}`)
          .join(' | ');
        
        // Se também tem arquivos, adicionar informação
        const arquivosInfo = valor.arquivos && Array.isArray(valor.arquivos) && valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return valoresFormatados + arquivosInfo;
      }
      
      // Se tem 'arquivos', mencionar os arquivos
      if (valor.arquivos && Array.isArray(valor.arquivos)) {
        const arquivosInfo = valor.arquivos.length > 0 
          ? ` (${valor.arquivos.length} arquivo(s) anexo(s))`
          : '';
        
        return `Resultados disponíveis${arquivosInfo}`;
      }

      // Para objetos complexos como {"Hemograma Completo":{"valores":{"Hemácias":"4",...}}}
      // Detectar se é um exame com estrutura aninhada
      const entries = Object.entries(valor);
      if (entries.length > 0) {
        return entries
          .filter(([key, val]) => val !== null && val !== undefined)
          .map(([nomeExame, dadosExame]) => {
            if (typeof dadosExame === 'object' && dadosExame !== null) {
              // Se tem a estrutura {valores: {...}, arquivos: [...]}
              if (dadosExame.valores && typeof dadosExame.valores === 'object') {
                const valoresFormatados = Object.entries(dadosExame.valores)
                  .map(([param, val]) => `${param}: ${val}`)
                  .join(', ');
                
                const arquivosInfo = dadosExame.arquivos && Array.isArray(dadosExame.arquivos) && dadosExame.arquivos.length > 0 
                  ? ` (${dadosExame.arquivos.length} arquivo(s))`
                  : '';
                
                return `${nomeExame}: ${valoresFormatados}${arquivosInfo}`;
              }
              
              // Se for um objeto simples, tentar extrair informações
              if (Object.keys(dadosExame).length <= 5) {
                const subValores = Object.entries(dadosExame)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ');
                return `${nomeExame}: ${subValores}`;
              }
              
              // Para objetos muito complexos
              return `${nomeExame}: [Dados detalhados disponíveis]`;
            }
            
            // Se não for objeto, usar valor direto
            return `${nomeExame}: ${dadosExame}`;
          })
          .join(' | ');
      }
    }
    
    return String(valor);
  };

  // Estados para médicos e usuário (agora vêm da API)
  const [medicos, setMedicos] = useState([]);
  const [medicosFiltrados, setMedicosFiltrados] = useState([]);
  const [especialidadesAPI, setEspecialidadesAPI] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [loadingMedicosFiltrados, setLoadingMedicosFiltrados] = useState(false);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);

  // Carregar usuário do localStorage ao montar o componente
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        console.log('✅ Usuário carregado:', parsedUser);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuário:', error);
    }
  }, []);

  // Buscar médicos da API ao montar o componente
  useEffect(() => {
    const fetchMedicos = async () => {
      setLoadingMedicos(true);
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        
        // Buscar médicos da porta 8007 (consultation-service)
        const response = await axios.get('http://127.0.0.1:8007/api/medicos', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // Verificar formato da resposta e extrair os dados
        const medicosData = response?.data?.data || response?.data || [];
        setMedicos(medicosData);
        console.log('✅ Médicos carregados da porta 8007:', medicosData);
        console.log('📋 Estrutura do primeiro médico:', medicosData[0]);
      } catch (error) {
        console.error('❌ Erro ao buscar médicos:', error);
        message.error('Erro ao carregar lista de médicos');
        setMedicos([]);
      } finally {
        setLoadingMedicos(false);
      }
    };

    fetchMedicos();
  }, []);

  // Buscar especialidades da API ao montar o componente
  useEffect(() => {
    const fetchEspecialidades = async () => {
      setLoadingEspecialidades(true);
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        
        // Buscar especialidades da porta 8007 (consultation-service)
        const response = await axios.get('http://127.0.0.1:8007/api/especialidades', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // Verificar formato da resposta e extrair os dados
        const especialidadesData = response?.data?.data || response?.data || [];
        setEspecialidadesAPI(especialidadesData);
        console.log('✅ Especialidades carregadas da porta 8007:', especialidadesData);
      } catch (error) {
        console.error('❌ Erro ao buscar especialidades:', error);
        console.log('⚠️ Usando especialidades dos médicos como fallback');
        // Fallback para especialidades dos médicos se a API falhar
        const especialidadesFallback = [...new Set(medicos.map(m => m.cargo || m.especialidade).filter(Boolean))];
        setEspecialidadesAPI(especialidadesFallback);
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    // Só buscar se já tiver médicos carregados (para o fallback)
    if (medicos.length > 0) {
      fetchEspecialidades();
    }
  }, [medicos]);

  // Obter ID do médico logado para filtrar consultas
  const getMedicoId = () => {
    // Primeiro tentar obter do user
    if (user?.id) {
      return user.id;
    }

    // Fallback: tentar obter do localStorage
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        return parsedUser.id || null;
      }
    } catch (error) {
      console.error('Erro ao obter user do localStorage:', error);
    }

    return null;
  };

  const medicoId = getMedicoId();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExamesModalVisible, setIsExamesModalVisible] = useState(false);
  const [isExamesDetalhesModalVisible, setIsExamesDetalhesModalVisible] = useState(false);
  const [isSolicitarExamesModalVisible, setIsSolicitarExamesModalVisible] = useState(false);
  const [isConsultaDetalhadaModalVisible, setIsConsultaDetalhadaModalVisible] = useState(false);
  const [isTransferirMedicoModalVisible, setIsTransferirMedicoModalVisible] = useState(false);
  const [isTransferirEspecialidadeModalVisible, setIsTransferirEspecialidadeModalVisible] = useState(false);
  const [especialidadeSelecionadaTransfer, setEspecialidadeSelecionadaTransfer] = useState('');

  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [examesAnteriores, setExamesAnteriores] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [exames, setExames] = useState([]);
  const [form] = Form.useForm();
  const [exameForm] = Form.useForm();
  const [transferirMedicoForm] = Form.useForm();
  const [transferirEspecialidadeForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [searchPendentes, setSearchPendentes] = useState('');
  const [searchExames, setSearchExames] = useState('');
  const [searchHistorico, setSearchHistorico] = useState('');

  // Hook customizado para gerenciar consultas via API
  // Passa o ID do médico logado para filtrar consultas automaticamente
  const {
    consultasPendentes: consultasPendentesAPI,
    consultasRealizadas,
    pacientesComExames: pacientesComExamesAPI,
    loadingPendentes,
    fetchConsultasPendentes,
    fetchConsultasRealizadas,
    fetchPacientesComExames,
    fetchPrescricoesPaciente,
    finalizarConsulta,
    solicitarExames,
    registrarAlta,
    registrarObito,
    transferirMedico,
    transferirEspecialidade,
    adicionarPrescricao,
    atualizarPrescricao,
    removerPrescricao,
  } = useConsultas(medicoId);

  // Log para debug - ver se o filtro está funcionando
  useEffect(() => {
    if (medicoId) {
      console.log(`✅ Filtrando consultas para o médico ID: ${medicoId}`);
    } else {
      console.log('⚠️ Nenhum ID de médico encontrado - mostrando todas as consultas');
    }
  }, [medicoId]);

  // Log para debug - ver dados recebidos
  useEffect(() => {
    console.log('📊 Consultas Pendentes recebidas da API:', consultasPendentesAPI);
    console.log('📊 Total de consultas pendentes:', consultasPendentesAPI?.length || 0);
    console.log('📊 Pacientes Com Exames:', pacientesComExamesAPI);
    console.log('📊 Loading Pendentes:', loadingPendentes);
  }, [consultasPendentesAPI, pacientesComExamesAPI, loadingPendentes]);

  // Atualizar a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConsultasPendentes();
      fetchPacientesComExames();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchConsultasPendentes, fetchPacientesComExames]);

  // Obter especialidades únicas (da API ou dos médicos como fallback)
  const especialidades = especialidadesAPI.length > 0 
    ? especialidadesAPI 
    : [...new Set(medicos.map(m => m.cargo || m.especialidade).filter(Boolean))];

  // Função helper para filtrar médicos por especialidade
  const getMedicosPorEspecialidade = (especialidade) => {
    return medicos.filter(m => (m.cargo || m.especialidade) === especialidade);
  };

  // Função para buscar médicos filtrados por especialidade da API
  const buscarMedicosPorEspecialidade = async (especialidade) => {
    if (!especialidade) {
      setMedicosFiltrados([]);
      return;
    }

    setLoadingMedicosFiltrados(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      console.log('🔍 Buscando médicos por especialidade:', especialidade);
      
      // Buscar médicos filtrados por especialidade da porta 8007
      const response = await axios.get(`http://127.0.0.1:8007/api/medicos?especialidade=${encodeURIComponent(especialidade)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Verificar formato da resposta e extrair os dados
      const medicosData = response?.data?.data || response?.data || [];
      
      console.log(`✅ Resposta da API para especialidade "${especialidade}":`, {
        total: medicosData.length,
        medicos: medicosData.map(m => ({
          id: m.id,
          nome: m.name || m.nome,
          especialidade: m.cargo || m.especialidade
        }))
      });
      
      // Se a API retornar apenas 1 médico, fazer fallback para filtro local
      if (medicosData.length <= 1) {
        console.warn('⚠️ API retornou apenas 1 médico, usando filtro local como fallback');
        const medicosLocais = medicos.filter(m => 
          (m.cargo || m.especialidade) === especialidade
        );
        console.log('📋 Médicos locais da especialidade:', {
          total: medicosLocais.length,
          medicos: medicosLocais.map(m => ({
            id: m.id,
            nome: m.name || m.nome,
            especialidade: m.cargo || m.especialidade
          }))
        });
        setMedicosFiltrados(medicosLocais);
      } else {
        setMedicosFiltrados(medicosData);
      }
      
      console.log(`✅ Total de médicos disponíveis para transferência: ${medicosData.length > 1 ? medicosData.length : medicos.filter(m => (m.cargo || m.especialidade) === especialidade).length}`);
    } catch (error) {
      console.error('❌ Erro ao buscar médicos por especialidade:', error);
      console.log('⚠️ Usando filtro local como fallback');
      
      // Fallback: filtrar localmente dos médicos já carregados
      const medicosLocais = medicos.filter(m => 
        (m.cargo || m.especialidade) === especialidade
      );
      console.log('📋 Médicos locais da especialidade (fallback):', {
        total: medicosLocais.length,
        medicos: medicosLocais.map(m => ({
          id: m.id,
          nome: m.name || m.nome,
          especialidade: m.cargo || m.especialidade
        }))
      });
      setMedicosFiltrados(medicosLocais);
      
      if (medicosLocais.length === 0) {
        message.error('Nenhum médico encontrado para esta especialidade');
      }
    } finally {
      setLoadingMedicosFiltrados(false);
    }
  };

  // Obter pacientes que retornaram com exames realizados - usar dados da API
  const pacientesComExames = useMemo(() => {
    // Usar dados da API e aplicar filtro de busca
    return (pacientesComExamesAPI || [])
      .filter(p => {
        if (!searchExames) return true;
        const searchLower = searchExames.toLowerCase();
        return (
          (p.nome?.toLowerCase().includes(searchLower)) ||
          (p.apelido?.toLowerCase().includes(searchLower)) ||
          (p.nid?.toString().includes(searchLower))
        );
      })
      .sort((a, b) => {
        // Ordenar por data dos exames (mais antigos primeiro)
        const dateA = a.dataExames ? new Date(a.dataExames) : new Date(0);
        const dateB = b.dataExames ? new Date(b.dataExames) : new Date(0);
        return dateA - dateB;
      });
  }, [pacientesComExamesAPI, searchExames]);

  // Filtrar consultas pendentes por especialidade do médico logado
  const consultasPendentesFiltradas = useMemo(() => {
    if (!user || !user.especialidade) {
      // Se o médico não tem especialidade específica, pode ver todos os pacientes
      return consultasPendentesAPI;
    }

    return consultasPendentesAPI.filter(p => {
      // Se o paciente tem especialidade definida, mostrar apenas os da especialidade do médico
      return !p.especialidade || p.especialidade === user.especialidade;
    });
  }, [consultasPendentesAPI, user]);

  const pacientesPendentesFiltered = useMemo(() => {
    // IDs e NIDs dos pacientes que têm exames realizados e aguardam consulta de retorno
    const idsComExames = new Set();
    pacientesComExames.forEach(p => {
      // Adicionar todos os possíveis identificadores
      if (p.id) idsComExames.add(p.id);
      if (p.pacienteId) idsComExames.add(p.pacienteId);
      if (p.nid) idsComExames.add(p.nid);
    });

    // Retornar apenas pacientes que NÃO estão na lista de retorno com exames
    // e aplicar filtro de busca
    return consultasPendentesFiltradas
      .filter(p => {
        // Verificar também pelo NID se paciente tem exames pendentes
        const temExames = 
          idsComExames.has(p.id) || 
          idsComExames.has(p.pacienteId) || 
          (p.nid && idsComExames.has(p.nid));
        
        // NOVO: Excluir pacientes transferidos para especialidade
        const foiTransferidoEspecialidade = 
          p.status === 'transferido_especialidade' ||
          p.status === 'aguardando_pagamento_especialidade' ||
          p.transferido_especialidade === true;
          
        // Excluir pacientes com exames, aguardando exames ou transferidos para especialidade
        return !temExames && !p.aguardandoExames && !foiTransferidoEspecialidade;
      })
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
        // Ordenar por data de agendamento/cadastro (mais antigos primeiro)
        const dateA = a.dataConsulta ? new Date(a.dataConsulta) : (a.dataCadastro ? new Date(a.dataCadastro) : new Date(0));
        const dateB = b.dataConsulta ? new Date(b.dataConsulta) : (b.dataCadastro ? new Date(b.dataCadastro) : new Date(0));
        return dateA - dateB;
      });
  }, [consultasPendentesFiltradas, pacientesComExames, searchPendentes]);

  // Função para abrir a modal de consulta detalhada
  const abrirConsultaDetalhada = (paciente) => {
    // Preparar o paciente com todos os dados necessários
    const pacienteParaConsulta = {
      ...paciente,
      // Se for um paciente com resultados de exames, garantir que os resultados estejam disponíveis
      resultadosExames: paciente.resultadosExames || null,
      dataExames: paciente.dataExames || null,
      observacoesExames: paciente.observacoesExames || null
    };

    setPacienteSelecionado(pacienteParaConsulta);
    setIsConsultaDetalhadaModalVisible(true);
  };
  // Função para abrir a modal de consulta com exames já realizados
  const abrirExamesModal = (paciente) => {
    // Verificar se o paciente tem resultados de exames
    if (paciente && paciente.resultadosExames) {
      // CORREÇÃO: Garantir que o paciente está marcado como retorno com exames
      // e que o NID está preservado
      const pacienteComRetorno = {
        ...paciente,
        retornoComExames: true,
        nid: paciente.nid, // Garantir que o NID é preservado
        exameId: paciente.exameId || paciente.id, // Preservar o ID do exame
        dataExamesConsulta: new Date().toLocaleString() // Registrar quando os exames foram consultados
      };
      
      setPacienteSelecionado(pacienteComRetorno);
      setExamesAnteriores([
        {
          id: paciente.exameId || paciente.id,
          resultados: normalizarExames(paciente.resultadosExames),
          data: paciente.dataExames
        }
      ]);
      setMedicamentos([]);
      setExames([]);
      setIsExamesModalVisible(true);
    } else {
      message.warning('Este paciente não possui resultados de exames disponíveis');
    }
  };

  // Função para abrir somente os detalhes dos exames
  const abrirDetalhesExames = (paciente) => {
    // Verificar se o paciente tem resultados de exames
    if (paciente && paciente.resultadosExames) {
      setPacienteSelecionado(paciente);
      setExamesAnteriores([
        {
          id: paciente.exameId || paciente.id,
          resultados: paciente.resultadosExames, // Manter como objeto para formatação adequada no modal
          data: paciente.dataExames,
          observacoes: paciente.observacoesExames
        }
      ]);
      setIsExamesDetalhesModalVisible(true);
    } else {
      message.warning('Este paciente não possui resultados de exames disponíveis');
    }
  };

  // Handlers para o ConsultaDetalhadaModal
  const handleFinishConsultaDetalhada = async (values) => {
    try {
      // Preparar dados para envio ao backend
      const consultaData = {
        paciente_id: pacienteSelecionado.paciente_id || pacienteSelecionado.id || pacienteSelecionado.pacienteId,
        medico_id: medicoId,
        status: 'finalizada',
        historico: values.historico || '',
        queixa_principal: values.sintomas || values.queixa_principal || '',
        diagnostico: values.diagnostico || '',
        recomendacoes: values.recomendacoes || '',
        especialidade: pacienteSelecionado.especialidade || '',
        exames: values.exames || [],
        prescricoes: values.prescricoes || [],
      };

      // Enviar para o backend
      const consultaId = pacienteSelecionado?.consulta_id || pacienteSelecionado?.agendamento_id || pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
      await finalizarConsulta(consultaId, consultaData);

      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);

      message.success('Consulta realizada com sucesso!');

      setIsConsultaDetalhadaModalVisible(false);
      // Mudar para a tab de consultas realizadas após completar
      setActiveTab('2');
    } catch (error) {
      console.error('Erro ao finalizar consulta:', error);
      message.error('Erro ao finalizar consulta. Tente novamente.');
    }
  };

  // Função para finalizar consulta rapidamente (sem abrir modal)
  // const handleFinalizarConsultaRapida = async (paciente) => {
  //   try {
  //     console.log('🔄 Finalizando consulta rapidamente para:', paciente);
      
  //     const consultaId = paciente?.consulta_id || paciente?.agendamento_id || paciente?.id;
      
  //     if (!consultaId) {
  //       message.error('ID da consulta não encontrado');
  //       return;
  //     }

  //     // Preparar dados mínimos para finalização
  //     const consultaData = {
  //       paciente_id: paciente.paciente_id || paciente.id,
  //       medico_id: medicoId,
  //       status: 'finalizada',
  //       diagnostico: 'Consulta finalizada',
  //       recomendacoes: 'Acompanhamento conforme necessário',
  //       especialidade: paciente.especialidade,
  //     };

  //     console.log('📦 Enviando finalização para consulta ID:', consultaId);
      
  //     await finalizarConsulta(consultaId, consultaData);

  //     // Atualizar listas
  //     await Promise.all([
  //       fetchConsultasPendentes(),
  //       fetchConsultasRealizadas()
  //     ]);

  //     message.success(`Consulta de ${paciente.nome} finalizada com sucesso!`);
  //     setActiveTab('2'); // Mudar para tab de realizadas
  //   } catch (error) {
  //     console.error('❌ Erro ao finalizar consulta:', error);
  //     message.error('Erro ao finalizar consulta. Tente novamente.');
  //   }
  // };

  // Função para resetar paciente foi REMOVIDA
  // Reset agora é controlado centralmente pelo CadastroPaciente.jsx

  const handleAltaPaciente = (values) => {
    // Check if this is just an update without finalizing the consultation
    if (values.type === 'update' && values.finalizeConsultation === false) {
      // Just update the pacienteSelecionado with the alta data
      setPacienteSelecionado({
        ...pacienteSelecionado,
        ...values.data
      });
      message.success('Dados de alta salvos. Complete a consulta quando finalizar.');
      return;
    }

    // Otherwise, create the finalized consultation object with all data
    const consultaFinalizada = {
      ...pacienteSelecionado,
      historico: values.historico,
      sintomas: values.sintomas,
      diagnostico: values.diagnostico,
      recomendacoes: values.recomendacoes,
      dataConsulta: new Date().toLocaleString(),
      status: 'alta',
      // Include prescription and exam data if present
      exames: values.exames || [],
      prescricoes: values.prescricoes || [],
      dataAlta: values.dataAlta || new Date().toLocaleString(),
      // Indicar se houve prescrição para habilitar consulta de acompanhamento
      temPrescricao: values.prescricoes && values.prescricoes.length > 0,
      // Data limite para consulta de acompanhamento (7 dias após alta)
      dataLimiteAcompanhamento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString(),
      // Nova lógica: Alta SEMPRE finaliza a consulta E termina o ciclo
      deveFinalizarConsulta: true,
      deveTerminarCiclo: true,
      tipoFinalizacao: 'alta_com_prescricao'
    };

    // Registrar alta no backend
    const consultaId = pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
    registrarAlta(consultaId, {
      diagnostico: values.diagnostico,
      recomendacoes: values.recomendacoes,
      observacoes: values.observacoes,
      data_alta: new Date().toISOString(),
    }).then(() => {
      // Atualizar listas
      fetchConsultasPendentes();
      fetchConsultasRealizadas();
    }).catch(error => {
      console.error('Erro ao registrar alta:', error);
    });

    // REMOVIDO: Reset será feito automaticamente pelo CadastroPaciente.jsx ao detectar consulta finalizada
    // resetarPacienteEstadoInicial(pacienteSelecionado.id || pacienteSelecionado.pacienteId);

    // If there are pending exams that were sent to the lab, mark the patient as waiting for exams
    const examesParaLaboratorio = (values.exames || []).filter(exame => exame.estado === 'Enviado para Laboratório');
    if (examesParaLaboratorio.length > 0) {
      message.info(`${examesParaLaboratorio.length} exame(s) pendente(s) no laboratório.`);
    }

    message.success('Paciente recebeu alta com sucesso! Reset será processado automaticamente.');
    setIsConsultaDetalhadaModalVisible(false);
    // Mudar para a tab de consultas realizadas após completar
    setActiveTab('2');
  };

  const handleObitoPaciente = async (values) => {
    try {
      const consultaId = pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
      // Registrar óbito no backend
      await registrarObito(consultaId, {
        causa_morte: values.causaMorte || '',
        observacoes: values.observacoes || '',
        data_obito: values.dataObitoFormatada || new Date().toISOString(),
        hora_obito: values.horaObitoFormatada || '',
      });

      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);

      message.success('Óbito registrado com sucesso');
      setIsConsultaDetalhadaModalVisible(false);
      setActiveTab('2');
    } catch (error) {
      console.error('Erro ao registrar óbito:', error);
      message.error('Erro ao registrar óbito');
    }
  };

  const handleTransferenciaPaciente = async (values) => {
    try {
      const consultaId = pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
      // Enviar transferência para o backend
      await transferirMedico(consultaId, {
        hospital_destino: values.hospitalDestino === 'Outro' ? values.outroHospital : values.hospitalDestino,
        motivo: values.motivoTransferencia || '',
        observacoes: values.observacoes || '',
      });

      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas()
      ]);

      message.success('Paciente transferido com sucesso');
      setIsConsultaDetalhadaModalVisible(false);
      setActiveTab('2');
    } catch (error) {
      console.error('Erro ao transferir paciente:', error);
      message.error('Erro ao transferir paciente');
    }
  };

  const handleVerHistoricoPaciente = () => {
    // Implementar a lógica para visualizar o histórico do paciente
    message.info('Visualizando histórico do paciente...');
    // Aqui você poderia abrir uma nova modal com o histórico ou redirecionar para uma página específica
  };

  // Função para transferir paciente para outro médico
  const handleTransferirParaMedico = async (values) => {
    try {
      const medicoSelecionado = medicosFiltrados.find(m => m.id === values.medicoId);

      if (!medicoSelecionado) {
        message.error('Médico selecionado não encontrado');
        return;
      }

      // Validar que temos o consulta_id
      if (!pacienteSelecionado?.consulta_id) {
        message.error('Paciente não possui consulta_id válido');
        console.error('❌ Paciente sem consulta_id:', pacienteSelecionado);
        return;
      }

      // Usar consulta_id (ID numérico correto)
      const consultaId = Number(pacienteSelecionado.consulta_id);
      
      // Validar que o ID é numérico válido
      if (!Number.isInteger(consultaId) || consultaId <= 0) {
        message.error(`ID inválido: ${pacienteSelecionado.consulta_id}`);
        return;
      }
      
      // Preparar payload completo
      const payload = {
        medico_destino_id: medicoSelecionado.id,
        paciente_id: pacienteSelecionado.paciente_id || pacienteSelecionado.pacienteId,
        medico_origem_id: pacienteSelecionado.medico_id || pacienteSelecionado.medicoId,
        nid: pacienteSelecionado.nid,
        motivo: values.motivo,
        observacoes: values.observacoes
      };

      console.log('🔍 DEBUG Transferir Médico:', {
        pacienteSelecionado,
        consultaId,
        payload,
        url: `/consultas/${consultaId}/transferir-medico`
      });

      // Enviar transferência para o backend
      await transferirMedico(consultaId, payload);

      // Atualizar lista da API após transferir médico
      await fetchConsultasPendentes();

      const medicoNome = medicoSelecionado.name || medicoSelecionado.nome || medicoSelecionado.apelido || 'Médico';
      message.success(`Paciente transferido para ${medicoNome} com sucesso!`);
      setIsTransferirMedicoModalVisible(false);
      transferirMedicoForm.resetFields();
    } catch (error) {
      console.error('❌ Erro ao transferir médico:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.errors || 
                       error.message || 
                       'Erro ao transferir paciente';
      message.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }
  };

  // Função para transferir paciente para outra especialidade
  const handleTransferirParaEspecialidade = async (values) => {
    try {
      // PASSO 1: Atualizar lista de consultas para garantir dados atualizados
      message.loading('Verificando status da consulta...', 0.5);
      await fetchConsultasPendentes();
      
      // Aguardar um momento para a lista ser atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const medicoSelecionado = medicos.find(m => m.id === values.medicoId);

      if (!medicoSelecionado) {
        message.error('Médico selecionado não encontrado');
        return;
      }

      // CORREÇÃO: Usar agendamento_id ou consulta_id não finalizada
      // Prioridade: agendamento_id > consulta_id (não finalizada) > id
      let consultaId = null;
      
      // 1. Tentar usar agendamento_id (nova arquitetura)
      if (pacienteSelecionado?.agendamento_id) {
        consultaId = pacienteSelecionado.agendamento_id;
        console.log('✅ Usando agendamento_id:', consultaId);
      }
      // 2. Tentar usar consulta_id se não estiver finalizada
      else if (pacienteSelecionado?.consulta_id && pacienteSelecionado?.status !== 'finalizada' && pacienteSelecionado?.status !== 'concluida') {
        consultaId = pacienteSelecionado.consulta_id;
        console.log('✅ Usando consulta_id (status:', pacienteSelecionado.status, '):', consultaId);
      }
      // 3. Tentar consultaId alternativo
      else if (pacienteSelecionado?.consultaId && pacienteSelecionado?.status !== 'finalizada' && pacienteSelecionado?.status !== 'concluida') {
        consultaId = pacienteSelecionado.consultaId;
        console.log('✅ Usando consultaId alternativo (status:', pacienteSelecionado.status, '):', consultaId);
      }
      // 4. Último recurso: usar id se não for consulta finalizada
      else if (pacienteSelecionado?.id && pacienteSelecionado?.status !== 'finalizada' && pacienteSelecionado?.status !== 'concluida') {
        consultaId = pacienteSelecionado.id;
        console.log('⚠️ Usando id como fallback (status:', pacienteSelecionado.status, '):', consultaId);
      }
      
      if (!consultaId) {
        console.error('❌ Nenhum ID válido encontrado para transferência:', {
          agendamento_id: pacienteSelecionado?.agendamento_id,
          consulta_id: pacienteSelecionado?.consulta_id,
          consultaId: pacienteSelecionado?.consultaId,
          id: pacienteSelecionado?.id,
          status: pacienteSelecionado?.status
        });
        message.error('Não foi possível identificar a consulta/agendamento para transferência. Paciente pode já ter consulta finalizada.');
        return;
      }

      // Preparar payload completo para transferência de especialidade
      const payload = {
        especialidade_destino: values.especialidade,
        medico_destino_id: medicoSelecionado.id,
        medico_origem_id: pacienteSelecionado.medico_id || pacienteSelecionado.medicoId || medicoId,
        paciente_id: pacienteSelecionado.paciente_id || pacienteSelecionado.pacienteId,
        nid: pacienteSelecionado.nid,
        motivo: values.motivo,
        observacoes: values.observacoes,
      };

      console.log('🔍 DEBUG Transferir Especialidade - PAYLOAD COMPLETO:', {
        consultaId,
        tipoId: pacienteSelecionado?.agendamento_id ? 'agendamento_id' : 'consulta_id',
        payload,
        pacienteSelecionado: {
          id: pacienteSelecionado.id,
          agendamento_id: pacienteSelecionado.agendamento_id,
          consulta_id: pacienteSelecionado.consulta_id,
          consultaId: pacienteSelecionado.consultaId,
          paciente_id: pacienteSelecionado.paciente_id,
          pacienteId: pacienteSelecionado.pacienteId,
          medico_id: pacienteSelecionado.medico_id,
          medicoId: pacienteSelecionado.medicoId,
          nid: pacienteSelecionado.nid,
          nome: pacienteSelecionado.nome,
          especialidade_atual: pacienteSelecionado.especialidade,
          status: pacienteSelecionado.status
        },
        medicoDestino: {
          id: medicoSelecionado.id,
          nome: medicoSelecionado.name || medicoSelecionado.nome,
          especialidade: medicoSelecionado.cargo || medicoSelecionado.especialidade
        },
        url: `/consultas/${consultaId}/transferir-especialidade`
      });

      // Enviar transferência para o backend
      await transferirEspecialidade(consultaId, payload);

      const medicoNome = medicoSelecionado.name || medicoSelecionado.nome || medicoSelecionado.apelido || 'Médico';
      
      // Fechar modal imediatamente
      setIsTransferirEspecialidadeModalVisible(false);
      transferirEspecialidadeForm.resetFields();
      setEspecialidadeSelecionadaTransfer('');
      
      // Limpar paciente selecionado
      setPacienteSelecionado(null);
      
      // Mostrar mensagem de sucesso
      message.success({
        content: `Paciente transferido para ${values.especialidade} - ${medicoNome}. Aguarde processamento...`,
        duration: 3
      });

      // Aguardar um momento para o backend processar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar lista da API múltiplas vezes para garantir sincronização
      await fetchConsultasPendentes();
      
      // Segunda atualização após delay
      setTimeout(async () => {
        await fetchConsultasPendentes();
        message.info('Lista atualizada! Paciente agora está no CadastroPaciente.jsx na tab "Para Especialidades"');
      }, 1500);

    } catch (error) {
      console.error('❌ Erro ao transferir para especialidade:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.errors || 
                       error.message || 
                       'Erro ao transferir paciente';
      message.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    }
  };

  const adicionarMedicamento = () => {
    const nome = form.getFieldValue('novoMedicamento');
    if (nome) {
      setMedicamentos([...medicamentos, nome]);
      form.setFieldValue('novoMedicamento', '');
    }
  };

  const adicionarExame = () => {
    const nome = exameForm.getFieldValue('novoExame');
    if (nome) {
      setExames([...exames, nome]);
      exameForm.setFieldValue('novoExame', '');
    }
  };

  // Função para finalizar consulta com prescrição de medicamentos
  const handleFinishConsulta = (values) => {
    
    // CORREÇÃO: Log de diagnóstico para verificar os dados do paciente
    
    // Usar nova lógica baseada nos dados recebidos do modal
    const deveFinalizarConsulta = values.deveFinalizarConsulta !== false; // Default true para manter compatibilidade
    const deveTerminarCiclo = values.deveTerminarCiclo !== false; // Nova flag para controle de reset do paciente
    const status = values.status || 'finalizada';
    
    const consultaFinalizada = {
      ...pacienteSelecionado,
      // CORREÇÃO: Garantir explicitamente que o NID seja preservado
      nid: pacienteSelecionado?.nid,
      historico: values.historico,
      sintomas: values.sintomas,
      diagnostico: values.diagnostico,
      recomendacoes: values.recomendacoes,
      dataConsulta: new Date().toLocaleString(),
      status: status,
      // Include any prescription or exam data if present
      exames: values.exames || [],
      prescricoes: values.prescricoes || [],
      temPrescricao: values.temPrescricao || false,
      temExames: values.temExames || false,
      tipoFinalizacao: values.tipoFinalizacao || 'basica',
      // Nova flag para controlar se deve resetar o paciente no CadastroPaciente
      deveTerminarCiclo: deveTerminarCiclo,
      // Include data from the original appointment if available
      especialidade: pacienteSelecionado.especialidade,
      medico: pacienteSelecionado.medico || pacienteSelecionado.medicoNome
    };

    // Enviar para o backend
    const consultaId = pacienteSelecionado?.consulta_id || pacienteSelecionado?.agendamento_id || pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
    finalizarConsulta(consultaId, {
      paciente_id: pacienteSelecionado?.paciente_id || pacienteSelecionado?.id || pacienteSelecionado?.pacienteId,
      medico_id: medicoId,
      historico: values.historico || '',
      queixa_principal: values.sintomas || values.queixa_principal || '',
      diagnostico: values.diagnostico || '',
      recomendacoes: values.recomendacoes || '',
      especialidade: pacienteSelecionado?.especialidade || '',
      prescricoes: consultaFinalizada.prescricoes || [],
      exames: consultaFinalizada.exames || [],
      status: status,
    }).then(() => {
      // Nova lógica: sempre remove da lista de pendentes quando consulta é finalizada
      // O controle de "Em Consulta" será feito pelo CadastroPaciente baseado em deveTerminarCiclo
      if (deveFinalizarConsulta) {
        // Atualizar listas da API após finalizar consulta
        fetchConsultasPendentes();
        fetchConsultasRealizadas();
      
      if (deveTerminarCiclo) {
        // Ciclo terminado - paciente volta ao estado inicial
        if (status === 'finalizada') {
          if (values.temPrescricao) {
            message.success('Consulta finalizada com prescrição médica - ciclo terminado!');
          } else {
            message.success('Consulta realizada com sucesso - ciclo terminado!');
          }
        } else {
          message.success(`Consulta ${status === 'aguardando_prescricao' ? 'salva - aguardando prescrição' : 'finalizada'}!`);
        }
      } else {
        // Consulta finalizada mas ciclo não terminado (só exames)
        message.info({
          content: 'Exames solicitados - paciente removido desta lista mas permanece em consulta para futuras prescrições!',
          duration: 6
        });
      }
      
        // Mudar para a tab de consultas realizadas após completar
        setActiveTab('2');
      } else {
        // Esta condição não deveria mais ocorrer com a nova lógica
        message.info('Consulta em processamento.');
      }

      setIsConsultaDetalhadaModalVisible(false);
    }).catch(error => {
      console.error('Erro ao finalizar consulta:', error);
      message.error('Erro ao finalizar consulta. Tente novamente.');
    });
  };

  // Função para solicitar apenas exames (sem finalizar consulta)
  const handleSolicitarExames = async () => {
    if (exames.length === 0) {
      message.error('É necessário adicionar pelo menos um exame!');
      return;
    }

    try {
      // Enviar solicitação de exames para o backend
      const consultaId = pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
      await solicitarExames(consultaId, {
        exames: exames.map(exame => ({
          tipo_exame: exame,
          prioridade: 'normal',
          status: 'solicitado'
        }))
      });

      message.success('Exames solicitados com sucesso!');
      setIsSolicitarExamesModalVisible(false);

      // Atualizar lista da API após solicitar exames
      await fetchConsultasPendentes();
    } catch (error) {
      console.error('Erro ao solicitar exames:', error);
      message.error('Erro ao solicitar exames');
    }
  };

  const handleFinishConsultaComExames = async (values) => {
    try {
      // Preparar dados para envio ao backend
      const consultaData = {
        paciente_id: pacienteSelecionado?.paciente_id || pacienteSelecionado?.id || pacienteSelecionado?.pacienteId,
        medico_id: medicoId,
        status: 'finalizada',
        diagnostico: values.diagnostico || '',
        recomendacoes: values.recomendacoes || '',
        especialidade: pacienteSelecionado?.especialidade || '',
        prescricoes: medicamentos.map(med => ({
          medicamento: med,
          tipo: 'prescricao'
        })),
        exames_anteriores: pacienteSelecionado.resultadosExames || {},
      };

      // Se houver novos exames solicitados, adicionar
      if (exames.length > 0) {
        consultaData.exames = exames.map(exame => ({
          tipo_exame: exame,
          prioridade: 'normal',
          status: 'solicitado'
        }));
      }

      // Finalizar consulta no backend
      const consultaId = pacienteSelecionado?.consulta_id || pacienteSelecionado?.agendamento_id || pacienteSelecionado?.consultaId || pacienteSelecionado?.id;
      await finalizarConsulta(consultaId, consultaData);

      // Atualizar listas
      await Promise.all([
        fetchConsultasPendentes(),
        fetchConsultasRealizadas(),
        exames.length > 0 ? fetchPacientesComExames() : Promise.resolve()
      ]);

      message.success({
        content: 'Consulta de retorno com exames realizada com sucesso!',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });

      setIsExamesModalVisible(false);
      // Mudar para a tab de consultas realizadas após completar
      setActiveTab('2');
    } catch (error) {
      console.error('Erro ao finalizar consulta com exames:', error);
      message.error('Erro ao finalizar consulta');
    }
  };  // Função para imprimir o histórico do paciente
  const imprimirHistorico = (paciente) => {
    console.log('Imprimindo histórico para paciente:', paciente);
    
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    
    // Usar prescrições que vêm da API
    const todasPrescricoes = [...(paciente.prescricoes || [])];
    
    // Criar uma cópia do paciente com as prescrições da API
    const pacienteAtualizado = {
      ...paciente,
      prescricoes: todasPrescricoes,
      // Garantir que exames sempre seja um array válido com objetos bem formados
      exames: Array.isArray(paciente.exames) ? 
        paciente.exames.filter(exame => exame !== null && exame !== undefined) : 
        []
    };
    
    console.log('Paciente com todas as prescrições para impressão:', pacienteAtualizado);

    // Criar as seções de exames, se existirem
    let examesHTML = '';
    if (pacienteAtualizado.exames && pacienteAtualizado.exames.length > 0) {
      examesHTML = `
        <div class="section">
          <div class="section-title">Exames Solicitados:</div>
          <table class="table">
            <thead>
              <tr>
                <th>Exame</th>
                <th>Data de Coleta</th>
                <th>Prioridade</th>
                <th>Estado</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${pacienteAtualizado.exames.map(exame => {
                // Verificar se o exame é um objeto válido e extrair os dados
                if (!exame) return '';
                
                // Se exame for uma string simples, usá-la como nome
                if (typeof exame === 'string') {
                  return `
                  <tr>
                    <td>${exame}</td>
                    <td>Não informada</td>
                    <td>Normal</td>
                    <td>Solicitado</td>
                    <td>-</td>
                  </tr>
                  `;
                }
                
                // Se for um objeto, extrair propriedades com segurança
                const nome = exame.nome || 'Sem nome';
                const dataColeta = exame.dataColeta || 'Não informada';
                const prioridade = exame.prioridade || 'Normal';
                const estado = exame.estado || 'Solicitado';
                const observacoes = exame.observacoes || '-';
                
                return `
                <tr>
                  <td>${nome}</td>
                  <td>${dataColeta}</td>
                  <td>${prioridade}</td>
                  <td>${estado}</td>
                  <td>${observacoes}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Criar as seções de prescrições, se existirem
    let prescricoesHTML = '';
    if (pacienteAtualizado.prescricoes && pacienteAtualizado.prescricoes.length > 0) {
      // Ordenar prescrições por data, do mais antigo para o mais recente
      const prescricoesOrdenadas = [...pacienteAtualizado.prescricoes].sort((a, b) => {
        const dataA = a.dataCriacao || a.dataAtualizacao || '';
        const dataB = b.dataCriacao || b.dataAtualizacao || '';
        // Ordem crescente (mais antigo primeiro)
        return dataA.localeCompare(dataB);
      });
      
      
      prescricoesHTML = `
        <div class="section no-break">
          <div class="section-title">Prescrições</div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 16%">Medicamento</th>
                <th style="width: 14%">Dosagem</th>
                <th style="width: 10%">Via</th>
                <th style="width: 13%">Horários</th>
                <th style="width: 9%">Duração</th>
                <th style="width: 14%">Observações</th>
                <th style="width: 24%">Data</th>
              </tr>
            </thead>
            <tbody>
              ${prescricoesOrdenadas.map(prescricao => {
                // Determinar qual data mostrar e o status
                const dataCriacao = prescricao.dataCriacao || 'N/A';
                const dataAtualizacao = prescricao.dataAtualizacao || '';
                const status = dataAtualizacao ? '(Atualizado)' : '';
                let dataExibicao = `${dataCriacao}`;
                
                if (dataAtualizacao) {
                  dataExibicao = `${dataCriacao} <br><strong>${status}</strong> ${dataAtualizacao}`;
                }
                
                return `
                <tr>
                  <td><strong>${prescricao.medicamento || '-'}</strong></td>
                  <td>${prescricao.dosagem || `${prescricao.quantidade || '1'} ${prescricao.unidade || 'comp.'}`}</td>
                  <td>${prescricao.viaAdministracao || '-'}</td>
                  <td>${prescricao.horarios || '-'}</td>
                  <td>${prescricao.numeroDias ? prescricao.numeroDias + ' dias' : '-'}</td>
                  <td>${prescricao.comentario || '-'}</td>
                  <td>${dataExibicao}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Dados de alta, se existir
    let altaHTML = '';
    if (pacienteAtualizado.dataAlta) {
      altaHTML = `
        <div class="section">
          <div class="section-title">Informações de Alta:</div>
          <p><strong>Data de Alta:</strong> ${pacienteAtualizado.dataAlta}</p>
        </div>
      `;
    }

    // Estilo para o conteúdo impresso
    const printContent = `
      <html>
      <head>
      <title>Registro de Consulta - ${pacienteAtualizado.nome}</title>
      <style>
      @media print {
        @page {
        size: A4 landscape;
        margin: 10mm;
        }
        
        body {
        margin: 0;
        padding: 0;
        }
        
        .print-container {
        width: 100%;
        height: 100%;
        page-break-inside: avoid;
        }
        
        .print-divider {
        border-left: 4px dashed #000;
        height: 100%;
        z-index: 9999;
        }
        
        .scissors-icon {
        color: #000;
        font-size: 16px;
        font-weight: bold;
        }
        
        .print-instructions {
        display: none; /* Oculta as instruções na impressão */
        }
      }
      
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        font-size: 12px;
      }
      
      .print-container {
        display: flex;
        width: 100%;
        position: relative;
        min-height: 100vh; /* Garante que o container ocupe toda a altura da página */
        justify-content: center; /* Centraliza as duas metades */
      }
      
      .print-half {
        width: 50%;
        max-width: 50%;
        padding: 12px 20px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden; /* Evita que o conteúdo ultrapasse os limites */
        display: flex;
        flex-direction: column;
      }
      
      .print-divider {
        width: 0;
        border-left: 3px dashed #333;
        height: 100%;
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        transform: translateX(-50%);
        z-index: 10; /* Garante que a linha fique sobre qualquer conteúdo */
      }
      
      .scissors-icon {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: 18px;
        color: #333;
      }
      
      .print-instructions {
        text-align: center;
        font-weight: bold;
        color: #333;
        margin: 15px 0;
        padding: 8px;
        border: 2px dashed #666;
        background-color: #fffbe6;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      }
      
      h1 {
        text-align: center;
        color: #1890ff;
        font-size: 14px;
        margin: 5px 0;
      }
      
      .clinic-info {
        text-align: center;
        font-size: 11px;
        color: #444;
        margin: 5px 0 10px;
        padding-top: 5px;
        border-top: 1px solid #eee;
      }
      
      .header {
        margin-bottom: 10px;
      }
      
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }
      
      .logo {
        max-width: 60px;
      }
      
      .patient-info {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 8px;
        padding: 5px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      
      .info-item {
        flex: 1 0 30%;
        margin-bottom: 5px;
        min-width: 150px;
      }
      
      .content-wrapper {
        flex: 1;
        overflow: auto;
      }
      
      .section {
        margin-bottom: 10px;
        padding: 5px;
        border: 1px solid #eee;
        border-radius: 4px;
      }
      
      .row {
        display: flex;
        flex-wrap: wrap;
        margin: 0 -5px;
      }
      
      .col {
        flex: 1;
        padding: 0 5px;
        min-width: 150px;
      }
      
      .section-title {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 3px;
        padding-bottom: 2px;
        border-bottom: 1px solid #eee;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        font-size: 10px;
      }
      
      .table th, .table td {
        border: 1px solid #ddd;
        padding: 4px;
        text-align: left;
        vertical-align: top;
      }
      
      .table th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      .footer {
        margin-top: auto;
        padding-top: 15px;
        font-size: 10px;
        text-align: center;
        color: #888;
        border-top: 1px solid #ddd;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      p {
        margin: 3px 0;
      }
      </style>
      </head>
      <body>
      <div class="print-instructions">
        ✂️ ATENÇÃO: Recorte na linha tracejada vertical central para separar as duas cópias ✂️
      </div>
      
      <div class="print-container">
        <!-- Divisor central -->
        <div class="print-divider">
        <div class="scissors-icon" style="top: 10%;">✂️</div>
        <div class="scissors-icon" style="top: 25%;">✂️</div>
        <div class="scissors-icon" style="top: 40%;">✂️</div>
        <div class="scissors-icon" style="top: 60%;">✂️</div>
        <div class="scissors-icon" style="top: 75%;">✂️</div>
        <div class="scissors-icon" style="top: 90%;">✂️</div>
        </div>
        
        <!-- Lado esquerdo da impressão -->
        <div class="print-half">
        <div class="header">
          <div class="header-top">
          <img src="/assets/images/UEM.png" alt="Logo da Clínica" class="logo" />
          <h1>Sistema de Clínica Universitária</h1>
          <div style="text-align: right;">
            <strong>Data:</strong> ${new Date().toLocaleDateString()}
          </div>
          </div>
          <div class="clinic-info" style="text-align: center; font-size: 11px; margin: 2px 0 8px; color: #444;">
          <p style="margin: 1px 0;">Universidade Eduardo Mondlane - Faculdade de Medicina</p>
          <p style="margin: 1px 0;">Av. Salvador Allende, 702, Maputo - Moçambique</p>
          <p style="margin: 1px 0;">Tel: +258 21 428076 | E-mail: clinica@medicina.uem.mz</p>
          </div>
          
          <div class="patient-info">
          <div class="info-item"><strong>Paciente:</strong> ${pacienteAtualizado.nome}</div>
          <div class="info-item"><strong>NID:</strong> ${pacienteAtualizado.nid || 'Não informado'}</div>
          <div class="info-item"><strong>Data Consulta:</strong> ${new Date(pacienteAtualizado.dataConsulta).toLocaleDateString() || 'N/A'}</div>
          </div>
        </div>
        
        <div class="content-wrapper">
          ${altaHTML ? `
          <div class="section">
          <div class="section-title">Informações de Alta</div>
          <p><strong>Data de Alta:</strong> ${pacienteAtualizado.dataAlta}</p>
          </div>
          ` : ''}
          
          <!-- Prescrições -->
          ${prescricoesHTML}
          
          <!-- Exames -->
          ${examesHTML}
        </div>
        
        <div class="footer">
          <p>Documento gerado em: ${new Date().toLocaleString()}</p>
          <p>Sistema de Gestão Clínica</p>
        </div>
        </div>
        
        <!-- Lado direito da impressão (duplicata) -->
        <div class="print-half">
        <div class="header">
          <div class="header-top">
          <img src="/assets/images/UEM.png" alt="Logo da Clínica" class="logo" />
          <h1>Sistema de Clínica Universitária</h1>
          <div style="text-align: right;">
            <strong>Data:</strong> ${new Date().toLocaleDateString()}
          </div>
          </div>
          <div class="clinic-info" style="text-align: center; font-size: 11px; margin: 2px 0 8px; color: #444;">
          <p style="margin: 1px 0;">Universidade Eduardo Mondlane - Faculdade de Medicina</p>
          <p style="margin: 1px 0;">Av. Salvador Allende, 702, Maputo - Moçambique</p>
          <p style="margin: 1px 0;">Tel: +258 21 428076 | E-mail: clinica@medicina.uem.mz</p>
          </div>
          
          <div class="patient-info">
          <div class="info-item"><strong>Paciente:</strong> ${pacienteAtualizado.nome}</div>
          <div class="info-item"><strong>NID:</strong> ${pacienteAtualizado.nid || 'Não informado'}</div>
          <div class="info-item"><strong>Data Consulta:</strong> ${new Date(pacienteAtualizado.dataConsulta).toLocaleDateString() || 'N/A'}</div>
          </div>
        </div>
        
        <div class="content-wrapper">
          ${altaHTML ? `
          <div class="section">
          <div class="section-title">Informações de Alta</div>
          <p><strong>Data de Alta:</strong> ${pacienteAtualizado.dataAlta}</p>
          </div>
          ` : ''}
          
          <!-- Prescrições -->
          ${prescricoesHTML}
          
          <!-- Exames -->
          ${examesHTML}
        </div>
        
        <div class="footer">
          <p>Documento gerado em: ${new Date().toLocaleString()}</p>
          <p>Sistema de Gestão Clínica</p>
        </div>
        </div>
      </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Dar um pequeno atraso para garantir que os estilos foram carregados
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const columnsPendentes = [
    { title: 'NID', dataIndex: 'nid', key: 'nid' },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    {
      title: 'Idade',
      key: 'idade',
      render: (_, record) => {
        // Se a API já retorna a idade calculada, usar diretamente
        if (record.idade !== undefined && record.idade !== null) {
          return record.idade;
        }
        
        // Caso contrário, calcular a partir da data de nascimento
        const dataNascimento = record.data_nascimento || record.dataNascimento;
        if (!dataNascimento) return 'N/A';
        
        const birthDate = dataNascimento.isDayjs ? dataNascimento.toDate() : new Date(dataNascimento);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        return (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) ? age - 1 : age;
      },
    },
    { title: 'Genero', dataIndex: 'genero', key: 'genero' },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'transferido_medico') {
          return <Tag color="purple">Transferido para outro médico</Tag>;
        } else if (record.status === 'transferido_especialidade') {
          return <Tag color="magenta">Transferido para outra especialidade</Tag>;
        } else if (record.status === 'aguardando_prescricao') {
          return <Tag color="cyan">Aguardando prescrições</Tag>;
        } else if (record.aguardandoExames) {
          return <Tag color="orange">Aguardando realização de exames</Tag>;
        } else {
          return <Tag color="blue">Aguardando consulta</Tag>;
        }
      }
    },
    {
      title: 'Médico/Especialidade',
      key: 'medicoEspecialidade',
      render: (_, record) => (
        <div>
          <div><strong>{record.medico || 'Não informado'}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.especialidade || 'Não informado'}
          </div>
          {(record.status === 'transferido_medico' || record.status === 'transferido_especialidade') && (
            <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '2px' }}>
              Transferido em: {record.dataTransferencia ? new Date(record.dataTransferencia).toLocaleDateString() : 'N/A'}
            </div>
          )}
        </div>
      )
    }, {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Button
            type="primary"
            icon={<MedicineBoxOutlined />}
            onClick={() => abrirConsultaDetalhada(record)}
            size="small"
          >
            Consulta
          </Button>
          {/* <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleFinalizarConsultaRapida(record)}
            size="small"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Finalizar
          </Button> */}
          <Space size="small">
            <Button
              type="default"
              icon={<SwapOutlined />}
              onClick={() => {
                console.log('🔍 Abrindo modal de transferir médico');
                console.log('📊 Paciente selecionado:', record);
                console.log('📋 Especialidade do paciente:', record.especialidade);
                setPacienteSelecionado(record);
                setIsTransferirMedicoModalVisible(true);
                // Buscar médicos da mesma especialidade
                if (record.especialidade) {
                  buscarMedicosPorEspecialidade(record.especialidade);
                }
              }}
              size="small"
            >
              Outro Médico
            </Button>
            <Button
              type="default"
              icon={<TeamOutlined />}
              onClick={() => {
                setPacienteSelecionado(record);
                setIsTransferirEspecialidadeModalVisible(true);
              }}
              size="small"
            >
              Especialidade
            </Button>
          </Space>
        </Space>
      )
    }
  ];

  const columnsRetornoExames = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Apelido', dataIndex: 'apelido', key: 'apelido' },

    {
      title: 'Exames Realizados',
      key: 'exames',
      render: (_, record) => {
        if (record.resultadosExames) {
          return (
            <div>
              {Object.entries(record.resultadosExames).map(([exame, valor], idx) => {
                // If valor is an object with a 'nome' property, show that, else show exame name
                let label = exame;
                if (valor && typeof valor === 'object' && valor.nome) {
                  label = valor.nome;
                }
                return (
                  <Tag color="green" key={idx}>{label}</Tag>
                );
              })}
            </div>
          );
        }
        return 'Nenhum exame';
      }
    }, {
      title: 'Data dos Exames',
      dataIndex: 'dataExames',
      key: 'dataExames',
      defaultSortOrder: 'descend',
      sorter: (a, b) => {
        const dateA = a.dataExames ? new Date(a.dataExames) : new Date(0);
        const dateB = b.dataExames ? new Date(b.dataExames) : new Date(0);
        return dateA - dateB;
      },
      render: (text) => {
        if (!text) return 'N/A';
        // Formatar data para exibição amigável
        const date = new Date(text);
        return <span style={{ fontWeight: 'bold' }}>{date.toLocaleString('pt-BR')}</span>;
      }
    },
    {
      title: 'Observações',
      dataIndex: 'observacoesExames',
      key: 'observacoesExames',
      render: (text) => text || 'Nenhuma observação'
    }, {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<FileSearchOutlined />}
            onClick={() => abrirDetalhesExames(record)}
            style={{ background: '#722ed1' }}
          >
            Ver Exames
          </Button>
          <Button
            type="primary"
            icon={<MedicineBoxOutlined />}
            onClick={() => abrirConsultaDetalhada(record)}
          >
            Consulta
          </Button>
        </Space>
      )
    }
  ];

  // Estados para gerenciar os modais e dados de prescrições
  const [isPrescricoesModalVisible, setIsPrescricoesModalVisible] = useState(false);
  const [prescricoesSelecionadas, setPrescricoesSelecionadas] = useState([]);
  const [historiaTab, setHistoriaTab] = useState('exames');
  const [novoPrescricaoForm] = Form.useForm();
  const [numeroDosesDiarias, setNumeroDosesDiarias] = useState(1);
  
  // Função auxiliar para garantir que prescrições são objetos formatados corretamente
  const formatarPrescricoes = (prescricoes) => {
    if (!prescricoes || !Array.isArray(prescricoes)) return [];
    
    return prescricoes.map(p => {
      // Se já é um objeto com a estrutura esperada, retorne-o
      if (typeof p === 'object' && p !== null && p.medicamento) {
        return p;
      }
      
      // Se for uma string, converta para o formato de objeto
      if (typeof p === 'string') {
        return {
          id: Date.now() + Math.random(),
          medicamento: p,
          quantidade: "1",
          unidade: "comprimido",
          viaAdministracao: "oral",
          doseDiaria: "1",
          numeroDias: "7",
          horarios: "12h00",
          comentario: "",
          dosagem: "Conforme orientação médica"
        };
      }
      
      // Caso seja um objeto mas não tenha o formato esperado
      return {
        id: Date.now() + Math.random(),
        medicamento: JSON.stringify(p),
        quantidade: "1",
        unidade: "comprimido",
        viaAdministracao: "oral", 
        doseDiaria: "1",
        numeroDias: "7",
        horarios: "12h00",
        comentario: "Formato não reconhecido",
        dosagem: "Conforme orientação médica"
      };
    });
  };
  
  // Função para abrir modal de prescrições
  const abrirPrescricoesModal = (prescricoes) => {
    if (prescricoes && prescricoes.length > 0) {
      // Se já temos prescrições fornecidas, usamos elas
      setPrescricoesSelecionadas(formatarPrescricoes(prescricoes));
    } else if (pacienteSelecionado && pacienteSelecionado.prescricoes) {
      // Usar prescrições que já vêm da API com o paciente
      setPrescricoesSelecionadas(formatarPrescricoes(pacienteSelecionado.prescricoes));
    } else {
      setPrescricoesSelecionadas([]);
    }
    
    setIsPrescricoesModalVisible(true);
  };

  // Função para adicionar prescrição
  const handleAdicionarPrescricao = () => {
    novoPrescricaoForm.validateFields()
      .then(values => {
        // Coleta os dados do formulário
        const {
          medicamento,
          quantidade,
          unidade,
          viaAdministracao,
          doseDiaria,
          numeroDias,
          comentario,
          horarios
        } = values;
        
        console.log("Form values:", values);

        if (!medicamento) {
          message.error("Nome do medicamento é obrigatório");
          return;
        }

        // Formatar os horários se estiverem presentes
        let horariosFormatados = "12h00"; // Valor padrão
        let horariosList = ["12:00"]; // Valor padrão
        
        // Coletar todos os horários dos campos dinâmicos
        try {
          // Reset das variáveis
          horariosList = [];
          
          // Primeiro, tenta obter o horário principal (nome: "horarios")
          if (horarios && typeof horarios === 'object' && typeof horarios.format === 'function') {
            const baseHour = parseInt(horarios.format('HH'), 10);
            const baseMinute = horarios.format('mm');
            horariosList.push(`${String(baseHour).padStart(2, '0')}:${baseMinute}`);
          } else {
            // Se não tiver o horário base, adiciona um padrão
            horariosList.push("08:00");
          }
          
          // Verifica se há horários adicionais definidos nos outros campos
          const dosesPorDia = parseInt(doseDiaria, 10) || 1;
          
          if (dosesPorDia > 1) {
            // Procura por campos de horário adicionais no formulário
            for (let i = 1; i < dosesPorDia; i++) {
              const horarioAdicional = values[`horario_${i + 1}`];
              
              if (horarioAdicional && typeof horarioAdicional === 'object' && typeof horarioAdicional.format === 'function') {
                // Se tiver um valor definido pelo usuário, usa esse valor
                const hour = parseInt(horarioAdicional.format('HH'), 10);
                const minute = horarioAdicional.format('mm');
                horariosList.push(`${String(hour).padStart(2, '0')}:${minute}`);
              } else {
                // Se não tiver, calcula um horário padrão baseado no intervalo regular
                const baseHour = horariosList[0] ? parseInt(horariosList[0].split(':')[0], 10) : 8;
                const baseMinute = horariosList[0] ? horariosList[0].split(':')[1] : "00";
                const interval = Math.floor(24 / dosesPorDia);
                const nextHour = (baseHour + (i * interval)) % 24;
                horariosList.push(`${String(nextHour).padStart(2, '0')}:${baseMinute}`);
              }
            }
          }
          
          // Juntar todos os horários em uma string
          horariosFormatados = horariosList.join(', ');
        } catch (error) {
          console.error('Erro ao formatar horário:', error);
          horariosFormatados = "12h00";
          horariosList = ["12:00"];
        }
        
        // Cria um objeto de prescrição no formato esperado pelo sistema
        const novaPrescricaoObj = {
          medicamento: medicamento,
          quantidade: quantidade?.toString() || "1",
          unidade: unidade || "comprimido",
          viaAdministracao: viaAdministracao || "Oral",
          doseDiaria: doseDiaria?.toString() || "1",
          numeroDias: numeroDias?.toString() || "7",
          horarios: horariosFormatados,
          horariosList: horariosList,
          comentario: comentario || "",
          dosagem: `${quantidade || 1} ${unidade || 'comprimido'}, ${doseDiaria || 1}x ao dia, ${numeroDias || 7} dias`,
          criadoPor: user?.nome || 'Médico',
          pacienteId: pacienteSelecionado?.id,
          pacienteNid: pacienteSelecionado?.nid, // Adicionando NID do paciente
          pacienteNome: pacienteSelecionado?.nome
        };
        
        // Adicionar à lista local e ao contexto global
        const prescricaoAdicionada = adicionarPrescricao(novaPrescricaoObj);
        setPrescricoesSelecionadas([...prescricoesSelecionadas, prescricaoAdicionada]);
        
        novoPrescricaoForm.resetFields();
        // Resetar o número de doses diárias para 1
        setNumeroDosesDiarias(1);
        message.success('Prescrição adicionada com sucesso');
      })
      .catch(error => {
        console.error("Erro ao validar formulário:", error);
        message.error("Erro ao adicionar prescrição. Verifique os campos obrigatórios.");
      });
  };

  // Estado para controlar edição de prescrição
  const [prescricaoEmEdicao, setPrescricaoEmEdicao] = useState(null);

  // Função para iniciar edição de prescrição
  const iniciarEdicaoPrescricao = (prescricao, index) => {
    setPrescricaoEmEdicao({ ...prescricao, index });
    
    // Atualizar o número de doses diárias para exibir os campos de horário
    const dosesPorDia = parseInt(prescricao.doseDiaria, 10) || 1;
    setNumeroDosesDiarias(dosesPorDia);
    
    // Criar um objeto para armazenar todos os campos
    const formFields = {
      medicamento: prescricao.medicamento,
      quantidade: prescricao.quantidade,
      unidade: prescricao.unidade,
      viaAdministracao: prescricao.viaAdministracao,
      doseDiaria: prescricao.doseDiaria,
      numeroDias: prescricao.numeroDias,
      comentario: prescricao.comentario,
    };
    
    // Adicionar o horário principal
    formFields.horarios = prescricao.horariosList && prescricao.horariosList.length > 0 
      ? moment(prescricao.horariosList[0], 'HH:mm') 
      : moment('08:00', 'HH:mm');
    
    // Adicionar horários adicionais se existirem
    if (prescricao.horariosList && prescricao.horariosList.length > 1) {
      for (let i = 1; i < prescricao.horariosList.length && i < dosesPorDia; i++) {
        formFields[`horario_${i + 1}`] = moment(prescricao.horariosList[i], 'HH:mm');
      }
    }
    
    // Preencher o formulário com os dados da prescrição
    novoPrescricaoForm.setFieldsValue(formFields);
  };

  // Função para cancelar edição
  const cancelarEdicaoPrescricao = () => {
    setPrescricaoEmEdicao(null);
    novoPrescricaoForm.resetFields();
    // Resetar o número de doses diárias para 1
    setNumeroDosesDiarias(1);
  };

  // Função para atualizar prescrição sendo editada
  const atualizarPrescricaoLocal = () => {
    if (!prescricaoEmEdicao) return;
    
    novoPrescricaoForm.validateFields()
      .then(values => {
        // Mesma lógica de formatação usada no adicionarPrescricao
        const {
          medicamento,
          quantidade,
          unidade,
          viaAdministracao,
          doseDiaria,
          numeroDias,
          comentario,
          horarios
        } = values;
        
        if (!medicamento) {
          message.error("Nome do medicamento é obrigatório");
          return;
        }

        // Coletar todos os horários dos campos dinâmicos
        let horariosFormatados = "12h00"; // Valor padrão
        let horariosList = ["12:00"]; // Valor padrão
        
        try {
          // Reset das variáveis
          horariosList = [];
          
          // Primeiro, tenta obter o horário principal (nome: "horarios")
          if (horarios && typeof horarios === 'object' && typeof horarios.format === 'function') {
            const baseHour = parseInt(horarios.format('HH'), 10);
            const baseMinute = horarios.format('mm');
            horariosList.push(`${String(baseHour).padStart(2, '0')}:${baseMinute}`);
          } else {
            // Se não tiver o horário base, adiciona um padrão
            horariosList.push("08:00");
          }
          
          // Verifica se há horários adicionais definidos nos outros campos
          const dosesPorDia = parseInt(doseDiaria, 10) || 1;
          
          if (dosesPorDia > 1) {
            // Procura por campos de horário adicionais no formulário
            for (let i = 1; i < dosesPorDia; i++) {
              const horarioAdicional = values[`horario_${i + 1}`];
              
              if (horarioAdicional && typeof horarioAdicional === 'object' && typeof horarioAdicional.format === 'function') {
                // Se tiver um valor definido pelo usuário, usa esse valor
                const hour = parseInt(horarioAdicional.format('HH'), 10);
                const minute = horarioAdicional.format('mm');
                horariosList.push(`${String(hour).padStart(2, '0')}:${minute}`);
              } else {
                // Se não tiver, calcula um horário padrão baseado no intervalo regular
                const baseHour = horariosList[0] ? parseInt(horariosList[0].split(':')[0], 10) : 8;
                const baseMinute = horariosList[0] ? horariosList[0].split(':')[1] : "00";
                const interval = Math.floor(24 / dosesPorDia);
                const nextHour = (baseHour + (i * interval)) % 24;
                horariosList.push(`${String(nextHour).padStart(2, '0')}:${baseMinute}`);
              }
            }
          }
          
          // Juntar todos os horários em uma string
          horariosFormatados = horariosList.join(', ');
        } catch (error) {
          console.error('Erro ao formatar horário:', error);
          horariosFormatados = "12h00";
          horariosList = ["12:00"];
        }
        
        // Atualizar prescrição com novos dados
        const prescricaoAtualizada = {
          ...prescricaoEmEdicao,
          medicamento,
          quantidade: quantidade?.toString() || "1",
          unidade: unidade || "comprimido",
          viaAdministracao: viaAdministracao || "Oral",
          doseDiaria: doseDiaria?.toString() || "1",
          numeroDias: numeroDias?.toString() || "7",
          horarios: horariosFormatados,
          horariosList,
          comentario: comentario || "",
          dosagem: `${quantidade || 1} ${unidade || 'comprimido'}, ${doseDiaria || 1}x ao dia, ${numeroDias || 7} dias`,
          dataAtualizacao: new Date().toLocaleString(),
          // Garantir que o NID do paciente seja incluído ou mantido
          pacienteNid: prescricaoEmEdicao.pacienteNid || pacienteSelecionado?.nid
        };

        // Atualizar na lista local
        const novasPrescricoes = [...prescricoesSelecionadas];
        novasPrescricoes[prescricaoEmEdicao.index] = prescricaoAtualizada;
        setPrescricoesSelecionadas(novasPrescricoes);

        // Atualizar no contexto global se tiver ID
        if (prescricaoAtualizada.id) {
          atualizarPrescricao(prescricaoAtualizada.id, prescricaoAtualizada);
        }

        // Limpar estado de edição
        setPrescricaoEmEdicao(null);
        novoPrescricaoForm.resetFields();
        // Resetar o número de doses diárias para 1
        setNumeroDosesDiarias(1);
        message.success('Prescrição atualizada com sucesso');
      })
      .catch(error => {
        console.error("Erro ao validar formulário:", error);
        message.error("Erro ao atualizar prescrição. Verifique os campos obrigatórios.");
      });
  };

  // Função para remover prescrição
  const handleRemoverPrescricao = (index) => {
    const prescricaoParaRemover = prescricoesSelecionadas[index];
    if (prescricaoParaRemover && prescricaoParaRemover.id) {
      // Remover do contexto global
      removerPrescricao(prescricaoParaRemover.id);
    }
    
    // Remover da lista local
    const novasPrescricoes = [...prescricoesSelecionadas];
    novasPrescricoes.splice(index, 1);
    setPrescricoesSelecionadas(novasPrescricoes);
  };

  // Função para imprimir prescrições
  const imprimirPrescricao = () => {
    if (!prescricoesSelecionadas.length) {
      message.warning('Não há prescrições para imprimir');
      return;
    }
    
    // Buscar prescrições atualizadas do contexto global se paciente selecionado tem NID
    // Usar prescrições selecionadas (que já vêm da API)
    let prescricoesParaImprimir = [...prescricoesSelecionadas];
    
    // Garantir que todas as prescrições são objetos formatados corretamente
    const prescricoesFormatadas = formatarPrescricoes(prescricoesParaImprimir).map(p => {
      // Se não tiver dosagem definida, construir a partir de outros campos
      if (!p.dosagem && p.quantidade && p.unidade && p.doseDiaria && p.numeroDias) {
        return {
          ...p,
          dosagem: `${p.quantidade} ${p.unidade}(s), ${p.doseDiaria}x ao dia, ${p.numeroDias} dias`
        };
      }
      return p;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescrição Médica</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              align-items: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .logo {
              width: 80px;
              margin-right: 20px;
            }
            h1 {
              font-size: 24px;
              margin: 0;
              color: #333;
            }
            h2 {
              font-size: 18px;
              margin: 15px 0;
              color: #444;
            }
            .patient-info {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .prescription-item {
              padding: 10px;
              border-left: 3px solid #1890ff;
              margin-bottom: 10px;
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
              font-size: 12px;
              text-align: center;
            }
            .doctor-signature {
              margin-top: 60px;
              text-align: center;
            }
            .line {
              width: 200px;
              border-top: 1px solid #333;
              margin: 0 auto;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRESCRIÇÃO MÉDICA</h1>
          </div>
          
          <div class="clinic-info" style="text-align: center; font-size: 11px; margin: 4px 0 12px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 8px;">
            <p style="margin: 1px 0;">Universidade Eduardo Mondlane - Faculdade de Medicina</p>
            <p style="margin: 1px 0;">Av. Salvador Allende, 702, Maputo - Moçambique</p>
            <p style="margin: 1px 0;">Tel: +258 21 428076 | E-mail: clinica@medicina.uem.mz</p>
          </div>
          
          <div class="patient-info">
            <p><strong>Paciente:</strong> ${pacienteSelecionado?.nome || 'Não informado'}</p>
            <p><strong>NID:</strong> ${pacienteSelecionado?.nid || 'Não informado'}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            <p><strong>Médico:</strong> ${pacienteSelecionado?.medico || user?.nome || 'Não informado'}</p>
          </div>
          
          <h2>Medicamentos Prescritos</h2>
          <div class="prescriptions">
            ${prescricoesFormatadas.map((med, idx) => `
              <div class="prescription-item">
                <p><strong>${idx + 1}. ${med.medicamento || ""}</strong></p>
                ${med.dosagem ? `<p><strong>Dosagem:</strong> ${med.dosagem}</p>` : ''}
                ${med.viaAdministracao ? `<p><strong>Via de administração:</strong> ${med.viaAdministracao}</p>` : ''}
                ${med.quantidade && med.unidade ? `<p><strong>Quantidade:</strong> ${med.quantidade} ${med.unidade}(s)</p>` : ''}
                ${med.numeroDias ? `<p><strong>Duração do tratamento:</strong> ${med.numeroDias} dias</p>` : ''}
                ${med.horarios ? `<p><strong>Horários de administração:</strong> ${med.horarios} ${med.doseDiaria && parseInt(med.doseDiaria) > 1 ? `<span style="color: #1890ff; font-size: 0.9em;">(${med.doseDiaria}x ao dia)</span>` : ''}</p>` : ''}
                ${med.comentario ? `<p><strong>Observações:</strong> ${med.comentario}</p>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="doctor-signature">
            <div class="line"></div>
            <p>${user?.nome || 'Médico Responsável'}</p>
            <p>CRM: ${user?.crm || '______'}</p>
          </div>
          
          <div class="footer">
            <p>Sistema de Gestão Clínica - Emitido em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Colunas para a aba de exames no histórico
  const columnsExames = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Data', dataIndex: 'dataConsulta', key: 'dataConsulta', 
      render: (text) => text ? new Date(text).toLocaleDateString('pt-BR') : 'N/A' 
    },
    {
      title: 'Exames Solicitados',
      key: 'exames',
      render: (_, record) => (
        <div>
          {record.exames?.length > 0 ? (
            <List
              size="small"
              dataSource={normalizarExames(record.exames)}
              renderItem={(item) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <Tag color="purple" style={{ margin: '2px 0' }}>
                    <ExperimentOutlined style={{ marginRight: 4 }} /> {item}
                  </Tag>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">Nenhum exame</Text>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'statusExame',
      render: (_, record) => (
        <Tag color={record.examesCompletos ? 'green' : 'orange'}>
          {record.examesCompletos ? 'Concluído' : 'Pendente'}
        </Tag>
      )
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<FileSearchOutlined />}
          onClick={() => abrirDetalhesExames(record)}
          style={{ background: '#722ed1' }}
        >
          Ver Detalhes
        </Button>
      )
    }
  ];

  // Colunas para a aba de prescrições no histórico
  const columnsPrescricoes = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Data', dataIndex: 'dataConsulta', key: 'dataConsulta', 
      render: (text) => text ? new Date(text).toLocaleDateString('pt-BR') : 'N/A' 
    },
    { title: 'Diagnóstico', dataIndex: 'diagnostico', key: 'diagnostico' },
    {
      title: 'Prescrições',
      key: 'prescricoes',
      render: (_, record) => (
        <div>
          {record.prescricoes?.length > 0 ? (
            <Tag color="blue">
              <MedicineBoxOutlined style={{ marginRight: 4 }} />
              {record.prescricoes.length} {record.prescricoes.length === 1 ? 'Medicamento' : 'Medicamentos'}
            </Tag>
          ) : (
            <Text type="secondary">Nenhum medicamento</Text>
          )}
        </div>
      )
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              // Definir paciente selecionado para garantir que o NID esteja disponível
              setPacienteSelecionado(record);
              abrirPrescricoesModal(record.prescricoes);
            }}
            disabled={!record.prescricoes?.length}
          >
            Ver Prescrições
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              // Definir paciente selecionado para garantir que o NID esteja disponível
              setPacienteSelecionado(record);
              // Não precisa buscar prescrições aqui, a função imprimirHistorico já faz isso
              imprimirHistorico(record);
            }}
            style={{ background: '#722ed1' }}
          >
            Histórico
          </Button>
        </Space>
      )
    }
  ];

  const columnsRealizadas = [
    { title: 'Nome', dataIndex: 'nome', key: 'nome' },
    { title: 'Diagnóstico', dataIndex: 'diagnostico', key: 'diagnostico' },
    {
      title: 'Recomendações',
      dataIndex: 'recomendacoes',
      key: 'recomendacoes',
      render: (text) => text || 'Nenhuma recomendação'
    },
    {
      title: 'Dados Associados',
      key: 'dadosAssociados',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.prescricoes?.length > 0 && (
            <Tag color="blue" icon={<MedicineBoxOutlined />}>
              {record.prescricoes.length} Prescrição(ões)
            </Tag>
          )}
          {record.exames?.length > 0 && (
            <Tag color="purple" icon={<ExperimentOutlined />}>
              {record.exames.length} Exame(s)
            </Tag>
          )}
          {(!record.prescricoes?.length && !record.exames?.length) && (
            <Text type="secondary">Nenhum</Text>
          )}
        </Space>
      )
    }, {
      title: 'Data da Consulta',
      dataIndex: 'dataConsulta',
      key: 'dataConsulta',
      defaultSortOrder: 'ascend',
      sorter: (a, b) => {
        const dateA = a.dataConsulta ? new Date(a.dataConsulta) : new Date(0);
        const dateB = b.dataConsulta ? new Date(b.dataConsulta) : new Date(0);
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
      title: 'Status',
      key: 'status', dataIndex: 'status',
      render: (status) => {
        let color = 'blue';
        let text = 'Finalizada';

        if (status === 'alta') {
          color = 'green';
          text = 'Alta';
        } else if (status === 'obito') {
          color = 'red';
          text = 'Óbito';
        } else if (status === 'transferido') {
          color = 'purple';
          text = 'Transferido';
        }

        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Ações',
      key: 'acoes',                           
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              // Definir paciente selecionado para garantir que o NID esteja disponível
              setPacienteSelecionado(record);
              abrirPrescricoesModal(record.prescricoes);
            }}
            disabled={!record.prescricoes?.length}
          >
            Ver Prescrições
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              console.log("Botão Imprimir Histórico clicado para:", record);
              
              // Definir paciente selecionado para garantir que o NID esteja disponível
              setPacienteSelecionado(record);
              
              // Criar uma nova cópia do paciente para não modificar o original
              const pacienteAtualizado = { ...record };
              
              // Garantir que temos o NID
              if (!pacienteAtualizado.nid) {
                console.warn("Paciente sem NID! Tentando encontrar em outras fontes...");
                // Tentar encontrar o paciente por ID nas listas de consultas
                const pacienteComNID = [...consultasPendentesAPI, ...consultasRealizadas]
                  .find(p => p.id === record.id && p.nid);
                  
                if (pacienteComNID && pacienteComNID.nid) {
                  console.log("NID encontrado:", pacienteComNID.nid);
                  pacienteAtualizado.nid = pacienteComNID.nid;
                }
              }
              
              // Passar diretamente o paciente atualizado para a função imprimir histórico
              // A função imprimirHistorico já foi modificada para buscar todas as prescrições
              imprimirHistorico(pacienteAtualizado);
            }}
            style={{ background: '#722ed1' }}
          >
            Imprimir Histórico
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 1300, padding: 24 }}>
        <Card
          title="Gerenciamento de Consultas"
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
            style={{ marginBottom: '24px' }}
          >          <TabPane
            tab={
              <span>
                <MedicineBoxOutlined />
                Pacientes Aguardando Consulta
                {pacientesPendentesFiltered?.length > 0 &&
                  <span style={{
                    backgroundColor: '#1890ff',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '2px 8px',
                    fontSize: '12px',
                    marginLeft: '8px'
                  }}>
                    {pacientesPendentesFiltered.length}
                  </span>
                }
              </span>
            }
            key="1"
          >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Pacientes Aguardando Atendimento Médico</Title>
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
                columns={columnsPendentes}
                dataSource={pacientesPendentesFiltered}
                rowKey="id"
                bordered
                loading={loadingPendentes}
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há pacientes aguardando consulta' }}
              />
            </TabPane>

            {/* Nova aba para pacientes que retornam com exames */}          <TabPane
              tab={
                <span>
                  <ExperimentOutlined />
                  Retorno com Exames
                  {pacientesComExames?.length > 0 &&
                    <span style={{
                      backgroundColor: '#722ed1',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 8px',
                      fontSize: '12px',
                      marginLeft: '8px'
                    }}>
                      {pacientesComExames.length}
                    </span>
                  }
                </span>
              }
              key="3"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Pacientes que Retornaram com Resultados de Exames</Title>
                <Search
                  placeholder="Buscar por nome, apelido ou NID"
                  allowClear
                  onSearch={value => setSearchExames(value)}
                  onChange={e => setSearchExames(e.target.value)}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
              </div>
              <Table
                columns={columnsRetornoExames}
                dataSource={pacientesComExames}
                rowKey="id"
                bordered
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: 'Não há pacientes com resultados de exames pendentes de consulta' }}
              />
            </TabPane>          <TabPane
              tab={
                <span>
                  <FileSearchOutlined />
                  Histórico de Consultas
                </span>
              }
              key="2"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>Consultas Realizadas</Title>
                <Search
                  placeholder="Buscar por nome, apelido ou NID"
                  allowClear
                  onSearch={value => setSearchHistorico(value)}
                  onChange={e => setSearchHistorico(e.target.value)}
                  style={{ width: 300 }}
                  enterButton={<SearchOutlined />}
                />
              </div>
              
              <Tabs 
                activeKey={historiaTab} 
                onChange={setHistoriaTab}
                style={{ marginBottom: 16 }}
                type="card"
                size="small"
              >
                <TabPane 
                  tab={
                    <span>
                      <ExperimentOutlined /> Exames Solicitados
                    </span>
                  } 
                  key="exames"
                >
                  <Table
                    columns={columnsExames}
                    dataSource={consultasRealizadas.filter(c => {
                      // Filtrar apenas consultas com exames
                      if (!c.exames?.length) return false;
                      
                      // Aplicar filtro de busca
                      if (!searchHistorico) return true;
                      const searchLower = searchHistorico.toLowerCase();
                      return (
                        (c.nome?.toLowerCase().includes(searchLower)) ||
                        (c.apelido?.toLowerCase().includes(searchLower)) ||
                        (c.nid?.toString().includes(searchLower))
                      );
                    }).sort((a, b) => {
                      // Ordenar por data da consulta (mais recentes primeiro)
                      const dateA = a.dataConsulta ? new Date(a.dataConsulta) : new Date(0);
                      const dateB = b.dataConsulta ? new Date(b.dataConsulta) : new Date(0);
                      return dateB - dateA;
                    })}
                    rowKey="id"
                    bordered
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'Não há exames solicitados' }}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <MedicineBoxOutlined /> Prescrições
                    </span>
                  } 
                  key="prescricoes"
                >
                  <Table
                    columns={columnsPrescricoes}
                    dataSource={consultasRealizadas.filter(c => {
                      // Filtrar apenas consultas com prescrições
                      if (!c.prescricoes?.length) return false;
                      
                      // Aplicar filtro de busca
                      if (!searchHistorico) return true;
                      const searchLower = searchHistorico.toLowerCase();
                      return (
                        (c.nome?.toLowerCase().includes(searchLower)) ||
                        (c.apelido?.toLowerCase().includes(searchLower)) ||
                        (c.nid?.toString().includes(searchLower))
                      );
                    }).sort((a, b) => {
                      // Ordenar por data da consulta (mais recentes primeiro)
                      const dateA = a.dataConsulta ? new Date(a.dataConsulta) : new Date(0);
                      const dateB = b.dataConsulta ? new Date(b.dataConsulta) : new Date(0);
                      return dateB - dateA;
                    })}
                    rowKey="id"
                    bordered
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'Não há prescrições registradas' }}
                  />
                </TabPane>
              </Tabs>
              
              {/* Tabela original mantida como referência - comentada */}
              {/*
              <Table
                columns={columnsRealizadas}
                dataSource={consultasRealizadas.filter(c => {
                  if (!searchHistorico) return true;
                  const searchLower = searchHistorico.toLowerCase();
                  return (
                    (c.nome?.toLowerCase().includes(searchLower)) ||
                    (c.apelido?.toLowerCase().includes(searchLower)) ||
                    (c.nid?.toString().includes(searchLower))
                  );
                }).sort((a, b) => {
                  // Ordenar por data da consulta (mais antigos primeiro)
                  const dateA = a.dataConsulta ? new Date(a.dataConsulta) : new Date(0);
                  const dateB = b.dataConsulta ? new Date(b.dataConsulta) : new Date(0);
                  return dateA - dateB;
                })}
                rowKey="id"
                bordered
              />
              */}
            </TabPane>
          </Tabs>
        </Card>      {/* Modal para Realizar Consulta com medicamentos */}
        <Modal
          title={`Consulta - ${pacienteSelecionado?.nome}`}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          width={700}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleFinishConsulta}>
            <Form.Item
              label="Diagnóstico"
              name="diagnostico"
              rules={[{ required: true, message: 'Informe o diagnóstico' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            {/* Adicionar Medicamentos */}
            <Form.Item
              label="Adicionar Medicamento"
              extra="Você deve prescrever pelo menos um medicamento para finalizar a consulta"
            >
              <Space>
                <Form.Item name="novoMedicamento" noStyle>
                  <Input placeholder="Nome do medicamento" />
                </Form.Item>
                <Button type="dashed" onClick={adicionarMedicamento}>Adicionar</Button>
              </Space>
            </Form.Item>
            <div>
              {medicamentos.map((med, idx) => (
                <span key={idx} style={{ display: 'inline-block', background: '#e6f7ff', padding: '4px 8px', margin: '4px', borderRadius: 4 }}>
                  {med}
                </span>
              ))}
            </div>

            <Form.Item style={{ marginTop: 30, textAlign: 'right' }}>
              <Button style={{ marginRight: 8 }} onClick={() => setIsModalVisible(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CheckOutlined />}
                disabled={medicamentos.length === 0}
              >
                Finalizar Consulta
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal para Solicitar Exames (sem finalizar consulta) */}
        <Modal
          title={`Solicitação de Exames - ${pacienteSelecionado?.nomeCompleto}`}
          open={isSolicitarExamesModalVisible}
          onCancel={() => setIsSolicitarExamesModalVisible(false)}
          footer={null}
          width={700}
          destroyOnClose
        >
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Atenção"
              description="Ao solicitar exames, o paciente será encaminhado para o laboratório. A consulta não será finalizada até que o paciente retorne com os resultados."
              type="info"
              showIcon
            />
          </div>

          <Form form={exameForm} layout="vertical">
            {/* Adicionar Exames */}
            <Form.Item
              label="Adicionar Exame"
              extra="Adicione os exames necessários para o paciente"
            >
              <Space>
                <Form.Item name="novoExame" noStyle>
                  <Input placeholder="Nome do exame" />
                </Form.Item>
                <Button type="dashed" onClick={adicionarExame}>Adicionar</Button>
              </Space>
            </Form.Item>
            <div>
              {normalizarExames(exames).map((ex, idx) => (
                <span key={idx} style={{ display: 'inline-block', background: '#fff1f0', padding: '4px 8px', margin: '4px', borderRadius: 4 }}>
                  {ex}
                </span>
              ))}
            </div>

            <Form.Item style={{ marginTop: 30, textAlign: 'right' }}>
              <Button style={{ marginRight: 8 }} onClick={() => setIsSolicitarExamesModalVisible(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                onClick={handleSolicitarExames}
                icon={<ExperimentOutlined />}
                disabled={exames.length === 0}
              >
                Encaminhar para Exames
              </Button>
            </Form.Item>
          </Form>
        </Modal>      {/* Modal para Consulta com Resultados de Exames */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <MedicineBoxOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '10px' }} />
              <span>Consulta Médica com Resultados de Exames - {pacienteSelecionado?.nome}</span>
            </div>
          }
          open={isExamesModalVisible}
          onCancel={() => setIsExamesModalVisible(false)}
          footer={null}
          width={800}
          destroyOnClose
        >
          {examesAnteriores.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#52c41a', margin: 0, marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ marginRight: '8px' }} />
                  Resultados de Exames Disponíveis
                </h4>
                <p style={{ margin: 0 }}>
                  O paciente realizou exames no laboratório e os resultados estão disponíveis para análise.
                </p>
              </div>

              <Divider orientation="left">Resultados de Exames</Divider>
              <List
                bordered
                dataSource={examesAnteriores}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>Exames realizados em {item.data}</Text>
                          <Tag color="green">Completo</Tag>
                        </div>
                      }
                      description={
                        <div>
                          {item.resultados && Object.entries(item.resultados).map(([nome, valor], idx) => (
                            <div key={idx} style={{ margin: '8px 0', padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
                              <Text strong style={{ fontSize: '14px' }}>{nome}:</Text> {typeof valor === 'object' ? (valor.nome || JSON.stringify(valor)) : String(valor)}
                            </div>
                          ))}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>)}

          <Form form={form} layout="vertical" onFinish={handleFinishConsultaComExames}>
            <Form.Item
              label="Diagnóstico Baseado nos Resultados"
              name="diagnostico"
              rules={[{ required: true, message: 'Informe o diagnóstico' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            {/* Adicionar Medicamentos */}
            <Form.Item
              label="Adicionar Medicamento"
              extra="Você deve prescrever pelo menos um medicamento para finalizar a consulta"
            >
              <Space>
                <Form.Item name="novoMedicamento" noStyle>
                  <Input placeholder="Nome do medicamento" />
                </Form.Item>
                <Button type="dashed" onClick={adicionarMedicamento}>Adicionar</Button>
              </Space>
            </Form.Item>
            <div>
              {medicamentos.map((med, idx) => (
                <span key={idx} style={{ display: 'inline-block', background: '#e6f7ff', padding: '4px 8px', margin: '4px', borderRadius: 4 }}>
                  {med}
                </span>
              ))}
            </div>

            {/* Adicionar Novos Exames (opcional) */}
            <Form.Item label="Solicitar Novos Exames" style={{ marginTop: 20 }}>
              <Space>
                <Form.Item name="novoExame" noStyle>
                  <Input placeholder="Nome do exame" />
                </Form.Item>
                <Button type="dashed" onClick={adicionarExame}>Adicionar</Button>
              </Space>
            </Form.Item>
            <div>
              {normalizarExames(exames).map((ex, idx) => (
                <span key={idx} style={{ display: 'inline-block', background: '#fff1f0', padding: '4px 8px', margin: '4px', borderRadius: 4 }}>
                  {ex}
                </span>
              ))}
            </div>

            <Form.Item style={{ marginTop: 30, textAlign: 'right' }}>
              <Button style={{ marginRight: 8 }} onClick={() => setIsExamesModalVisible(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CheckOutlined />}
                disabled={medicamentos.length === 0}
              >
                Finalizar Consulta
              </Button>
            </Form.Item>
          </Form>      </Modal>

        {/* Modal de Consulta Detalhada */}      <ConsultaDetalhadaModal
          open={isConsultaDetalhadaModalVisible}
          onCancel={() => setIsConsultaDetalhadaModalVisible(false)}
          onAlta={handleAltaPaciente}
          onObito={handleObitoPaciente}
          onTransferir={handleTransferenciaPaciente}
          agendamento={pacienteSelecionado}
          onFinish={handleFinishConsulta}
        />
        {/* Modal somente para visualização de detalhes dos exames */}      <Modal title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ExperimentOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '10px' }} />
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Detalhes dos Exames - {pacienteSelecionado?.nome}</span>
          </div>
        }
          open={isExamesDetalhesModalVisible}
          onCancel={() => setIsExamesDetalhesModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsExamesDetalhesModalVisible(false)} style={{ fontSize: '14px' }}>
              Fechar
            </Button>
          ]}
          width={800}
          destroyOnClose
        >        {examesAnteriores.length > 0 && (
          <div>
            <div style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <div style={{
                backgroundColor: '#52c41a',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: '16px',
                flexShrink: 0
              }}>
                <CheckCircleOutlined style={{ color: 'white', fontSize: '20px' }} />
              </div>
              <div>
                <h4 style={{ color: '#52c41a', margin: 0, marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
                  Resultados de Exames Disponíveis
                </h4>
                <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>
                  O paciente realizou exames no laboratório e os resultados estão disponíveis para análise médica detalhada.
                  Estes resultados já foram validados pelo laboratório.
                </p>
              </div>
            </div>

            <Divider orientation="left" style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              Dados do Paciente e Exames
            </Divider>

            {/* Informações do paciente melhoradas */}            <div style={{ marginBottom: '24px' }}>
              <Card
                size="small"
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <UserOutlined style={{ marginRight: '10px', color: '#1890ff' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Informações do Paciente</span>
                  </div>
                }
                bordered={true}
                style={{
                  background: '#f9f9f9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8'
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="64 64 896 896" focusable="false" data-icon="user" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                        <path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path>
                      </svg>
                      <strong>Nome:</strong> <span style={{ marginLeft: '5px' }}>{pacienteSelecionado?.nome}</span>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="64 64 896 896" focusable="false" data-icon="id-card" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                        <path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zm-40 632H136V232h752v560zM610.3 476h123.4c1.3 0 2.3-3.6 2.3-8v-48c0-4.4-1-8-2.3-8H610.3c-1.3 0-2.3 3.6-2.3 8v48c0 4.4 1 8 2.3 8zm4.8 144h185.7c3.9 0 7.1-3.6 7.1-8v-48c0-4.4-3.2-8-7.1-8H615.1c-3.9 0-7.1 3.6-7.1 8v48c0 4.4 3.2 8 7.1 8zM224 673h43.9c4.2 0 7.6-3.3 7.9-7.5 3.8-50.5 46-90.5 97.2-90.5s93.4 40 97.2 90.5c.3 4.2 3.7 7.5 7.9 7.5H522a8 8 0 008-8.4c-2.8-53.3-32-99.7-74.6-126.1a111.8 111.8 0 0029.1-75.5c0-61.9-49.9-112-111.4-112s-111.4 50.1-111.4 112c0 29.1 11 55.5 29.1 75.5a158.09 158.09 0 00-74.6 126.1c-.4 4.6 3.2 8.4 7.8 8.4zm149-262c28.5 0 51.7 23.3 51.7 52s-23.2 52-51.7 52-51.7-23.3-51.7-52 23.2-52 51.7-52z"></path>
                      </svg>
                      <strong>NID:</strong> <span style={{ marginLeft: '5px' }}>{pacienteSelecionado?.nid || 'Não informado'}</span>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="64 64 896 896" focusable="false" data-icon="calendar" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                        <path d="M880 184H712v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H384v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H144c-17.7 0-32 14.3-32 32v664c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 656H184V460h656v380zM184 392V256h128v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h256v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h128v136H184z"></path>
                      </svg>
                      <strong>Data dos Exames:</strong>
                      <span style={{ marginLeft: '5px' }}>
                        {pacienteSelecionado?.dataExames ?
                          new Date(pacienteSelecionado.dataExames).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Não informado'}
                      </span>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <svg viewBox="64 64 896 896" focusable="false" data-icon="medicine-box" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                        <path d="M839.2 278.1a32 32 0 00-30.4-22.1H736V144c0-17.7-14.3-32-32-32H320c-17.7 0-32 14.3-32 32v112h-72.8a31.9 31.9 0 00-30.4 22.1L112 502v378c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V502l-72.8-223.9zM360 184h304v72H360v-72zm480 656H184V513.4L244.3 328h535.4L840 513.4V840zM652 572H544V464c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v108H372c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h108v108c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V636h108c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
                      </svg>
                      <strong>Solicitado por:</strong> <span style={{ marginLeft: '5px' }}>{pacienteSelecionado?.solicitadoPor || 'Não especificado'}</span>
                    </div>
                  </Col>
                  {pacienteSelecionado?.observacoes && (
                    <Col span={24}>
                      <div style={{
                        background: '#fffbe6',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        marginTop: '8px',
                        border: '1px solid #ffe58f',
                        boxShadow: '0 1px 4px rgba(255, 229, 143, 0.2)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                          <svg viewBox="64 64 896 896" focusable="false" data-icon="file-text" width="1em" height="1em" fill="#faad14" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                            <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494zM504 618H320c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h184c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM312 490v48c0 4.4 3.6 8 8 8h384c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8H320c-4.4 0-8 3.6-8 8z"></path>
                          </svg>
                          <strong>Observações Clínicas:</strong>
                        </div>
                        <div style={{ paddingLeft: '24px', lineHeight: '1.6', color: '#5c5c5c' }}>
                          {pacienteSelecionado.observacoes}
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            </div>

            {/* Lista de resultados melhorada */}            <List
              header={
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#e6f7ff',
                  borderRadius: '8px 8px 0 0',
                  borderBottom: '1px solid #91d5ff',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ExperimentOutlined style={{ marginRight: '10px', color: '#1890ff', fontSize: '18px' }} />
                    Resultados Detalhados dos Exames
                  </div>
                  <Tag color="green" style={{ marginLeft: '10px', fontSize: '12px' }}>
                    {examesAnteriores.length} {examesAnteriores.length === 1 ? 'laudo' : 'laudos'} disponível{examesAnteriores.length !== 1 ? 'is' : ''}
                  </Tag>
                </div>
              }
              bordered
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderRadius: '8px',
                border: '1px solid #e8e8e8'
              }}
              dataSource={examesAnteriores}
              renderItem={item => (
                <List.Item style={{ padding: '16px' }}>
                  <List.Item.Meta title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Text strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                        <svg viewBox="64 64 896 896" focusable="false" data-icon="calendar" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ marginRight: '8px', fontSize: '16px' }}>
                          <path d="M880 184H712v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H384v-64c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v64H144c-17.7 0-32 14.3-32 32v664c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 656H184V460h656v380zM184 392V256h128v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h256v48c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-48h128v136H184z"></path>
                        </svg>
                        Exames realizados em {
                          item.data ?
                            new Date(item.data).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Data não informada'
                        }
                      </Text>
                      <Tag color="green" style={{ fontSize: '14px', padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
                        <CheckCircleOutlined style={{ marginRight: '4px' }} />
                        Completo
                      </Tag>
                    </div>
                  }
                    description={
                      <div>                        {item.resultados && Object.entries(item.resultados).map(([nome, valor], idx) => {
                        // Use the new formatting function for better display
                        const valorStr = formatarResultadoExame(valor);
                        
                        // Determine result status
                        const isNormal = valorStr.toLowerCase().includes('normal');
                        const isAlterado = valorStr.toLowerCase().includes('alterado');
                        const isElevado = valorStr.toLowerCase().includes('elevado');
                        const isCritico = valorStr.toLowerCase().includes('crítico');
                        const isBaixo = valorStr.toLowerCase().includes('baixo');
                        const isNumerico = valorStr.match(/\b[0-9]+\s*mg\/dL/) && !isNormal && !isAlterado && !isElevado && !isCritico && !isBaixo;

                        // Determine background and border colors based on result status
                        let bgColor = '#fafafa';
                        let borderColor = '#f0f0f0';
                        let statusIcon = null;
                        let tagColor = 'default';
                        let tagText = '';

                        if (isNormal) {
                          bgColor = '#f6ffed';
                          borderColor = '#b7eb8f';
                          statusIcon = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px', marginRight: '8px' }} />;
                          tagColor = 'green';
                          tagText = 'Normal';
                        } else if (isCritico) {
                          bgColor = '#fff1f0';
                          borderColor = '#ffa39e';
                          statusIcon = <svg viewBox="64 64 896 896" focusable="false" data-icon="warning" width="1em" height="1em" fill="#f5222d" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}><path d="M955.7 856l-416-720c-6.2-10.7-16.9-16-27.7-16s-21.6 5.3-27.7 16l-416 720C56 877.4 71.4 904 96 904h832c24.6 0 40-26.6 27.7-48zM480 416c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v184c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V416zm32 352a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"></path></svg>;
                          tagColor = 'red';
                          tagText = 'Crítico';
                        } else if (isAlterado || isElevado) {
                          bgColor = '#fff7e6';
                          borderColor = '#ffd591';
                          statusIcon = <svg viewBox="64 64 896 896" focusable="false" data-icon="exclamation-circle" width="1em" height="1em" fill="#fa8c16" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path><path d="M464 688a48 48 0 1096 0 48 48 0 10-96 0zm24-112h48c4.4 0 8-3.6 8-8V296c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8z"></path></svg>;
                          tagColor = 'orange';
                          tagText = isElevado ? 'Elevado' : 'Alterado';
                        } else if (isBaixo) {
                          bgColor = '#e6f7ff';
                          borderColor = '#91d5ff';
                          statusIcon = <svg viewBox="64 64 896 896" focusable="false" data-icon="info-circle" width="1em" height="1em" fill="#1890ff" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path><path d="M464 336a48 48 0 1096 0 48 48 0 10-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z"></path></svg>;
                          tagColor = 'blue';
                          tagText = 'Baixo';
                        } else if (isNumerico) {
                          bgColor = '#f9f0ff';
                          borderColor = '#d3adf7';
                          statusIcon = <svg viewBox="64 64 896 896" focusable="false" data-icon="database" width="1em" height="1em" fill="#722ed1" aria-hidden="true" style={{ fontSize: '18px', marginRight: '8px' }}><path d="M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-600 72h560v208H232V136zm560 480H232V408h560v208zm0 272H232V680h560v208zM304 240a40 40 0 1080 0 40 40 0 10-80 0zm0 272a40 40 0 1080 0 40 40 0 10-80 0zm0 272a40 40 0 1080 0 40 40 0 10-80 0z"></path></svg>;
                          tagColor = 'purple';
                          tagText = 'Valor Numérico';
                        }

                        return (
                          <div key={idx} style={{
                            margin: '12px 0',
                            padding: '16px',
                            background: bgColor,
                            borderRadius: '8px',
                            border: `1px solid ${borderColor}`,
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                          }}>
                            <Text strong style={{
                              fontSize: '15px',
                              color: '#333',
                              display: 'flex',
                              alignItems: 'center',
                              borderBottom: `1px solid ${borderColor}`,
                              paddingBottom: '8px',
                              marginBottom: '10px'
                            }}>
                              <ExperimentOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                              {nome}
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                                {statusIcon}
                                <span style={{ fontWeight: tagText ? '500' : 'normal' }}>
                                  {valorStr}
                                </span>
                              </div>
                              <div>
                                {tagText && <Tag color={tagColor} style={{ marginLeft: '10px', padding: '2px 10px' }}>{tagText}</Tag>}
                              </div>
                            </div>

                            {/* Display reference ranges or additional info if available */}
                            {isNumerico && (
                              <div style={{
                                marginTop: '10px',
                                paddingTop: '10px',
                                borderTop: `1px dashed ${borderColor}`,
                                fontSize: '12px',
                                color: '#666'
                              }}>
                                <div>Valores de referência: (70-100 mg/dL)</div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                        {item.observacoes && (
                          <div style={{
                            margin: '16px 0',
                            padding: '16px',
                            background: '#fffbe6',
                            borderRadius: '8px',
                            border: '1px solid #ffe58f',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                          }}>
                            <Text strong style={{
                              fontSize: '15px',
                              color: '#faad14',
                              display: 'flex',
                              alignItems: 'center',
                              borderBottom: '1px solid #ffe58f',
                              paddingBottom: '8px',
                              marginBottom: '10px'
                            }}>
                              <svg viewBox="64 64 896 896" focusable="false" data-icon="info-circle" width="1em" height="1em" fill="currentColor" aria-hidden="true" style={{ marginRight: '8px' }}>
                                <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
                                <path d="M464 336a48 48 0 1096 0 48 48 0 10-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z"></path>
                              </svg>
                              Observações do Laboratório
                            </Text>
                            <div style={{ marginTop: '8px', lineHeight: '1.6' }}>{item.observacoes}</div>
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
        </Modal>

        {/* Modal para transferir paciente para outro médico */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SwapOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '8px' }} />
              <span>Transferir para Outro Médico</span>
            </div>
          }
          open={isTransferirMedicoModalVisible}
          onCancel={() => {
            setIsTransferirMedicoModalVisible(false);
            transferirMedicoForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={transferirMedicoForm}
            layout="vertical"
            onFinish={handleTransferirParaMedico}
          >
            <Alert
              message="Transferência de Médico"
              description="O paciente será transferido para outro médico da mesma especialidade ou de especialidade diferente."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Paciente"
                  name="pacienteNome"
                  initialValue={pacienteSelecionado?.nome || ''}
                >
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Médico Atual"
                  name="medicoAtual"
                  initialValue={pacienteSelecionado?.medico || 'Não informado'}
                >
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Selecionar Novo Médico"
              name="medicoId"
              rules={[{ required: true, message: 'Selecione um médico' }]}
              extra={pacienteSelecionado?.especialidade ? `Médicos da especialidade: ${pacienteSelecionado.especialidade}` : ''}
            >
              <Select
                placeholder={loadingMedicosFiltrados ? "Carregando médicos..." : "Selecione o médico"}
                showSearch
                loading={loadingMedicosFiltrados}
                disabled={loadingMedicosFiltrados}
                notFoundContent={loadingMedicosFiltrados ? "Carregando..." : "Nenhum médico encontrado nesta especialidade"}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {medicosFiltrados && medicosFiltrados.length > 0 ? (
                  medicosFiltrados.map(medico => {
                    const nome = medico.name || medico.nome || medico.apelido || 'Sem nome';
                    const especialidade = medico.cargo || medico.especialidade || medico.specialty || 'Sem especialidade';
                    return (
                      <Option key={medico.id} value={medico.id}>
                        {nome} - {especialidade}
                      </Option>
                    );
                  })
                ) : null}
              </Select>
            </Form.Item>

            <Form.Item
              label="Motivo da Transferência"
              name="motivo"
              rules={[{ required: true, message: 'Informe o motivo da transferência' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Descreva o motivo da transferência..."
              />
            </Form.Item>

            <Form.Item
              label="Observações Adicionais"
              name="observacoes"
            >
              <Input.TextArea
                rows={2}
                placeholder="Observações adicionais (opcional)..."
              />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => {
                  setIsTransferirMedicoModalVisible(false);
                  transferirMedicoForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" icon={<SwapOutlined />}>
                  Transferir
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal para transferir paciente para outra especialidade */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeamOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '8px' }} />
              <span>Transferir para Outra Especialidade</span>
            </div>
          }
          open={isTransferirEspecialidadeModalVisible}
          onCancel={() => {
            setIsTransferirEspecialidadeModalVisible(false);
            transferirEspecialidadeForm.resetFields();
            setEspecialidadeSelecionadaTransfer('');
          }}
          footer={null}
          width={600}
        >
          <Form
            form={transferirEspecialidadeForm}
            layout="vertical"
            onFinish={handleTransferirParaEspecialidade}
          >
            <Alert
              message="Transferência de Especialidade"
              description="O paciente será transferido para uma nova especialidade médica."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Paciente"
                  name="pacienteNome"
                  initialValue={pacienteSelecionado?.nome || ''}
                >
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Especialidade Atual"
                  name="especialidadeAtual"
                  initialValue={pacienteSelecionado?.especialidade || 'Não informado'}
                >
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Nova Especialidade"
              name="especialidade"
              rules={[{ required: true, message: 'Selecione uma especialidade' }]}
            >
              <Select
                placeholder="Selecione a nova especialidade"
                onChange={(value) => {
                  // Reset médico quando especialidade muda
                  transferirEspecialidadeForm.setFieldsValue({ medicoId: undefined });
                  setEspecialidadeSelecionadaTransfer(value);
                }}
              >
                {especialidades.map(esp => (
                  <Option key={esp} value={esp}>{esp}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Selecionar Médico"
              name="medicoId"
              rules={[{ required: true, message: 'Selecione um médico' }]}
            >
              <Select
                placeholder="Primeiro selecione a especialidade"
                showSearch
                optionFilterProp="children"
                disabled={!especialidadeSelecionadaTransfer}
              >
                {especialidadeSelecionadaTransfer &&
                  getMedicosPorEspecialidade(especialidadeSelecionadaTransfer).map(medico => (
                    <Option key={medico.id} value={medico.id}>
                      {medico.nome || medico.apelido}
                    </Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item
              label="Motivo da Transferência"
              name="motivo"
              rules={[{ required: true, message: 'Informe o motivo da transferência' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Descreva o motivo da transferência para nova especialidade..."
              />
            </Form.Item>

            <Form.Item
              label="Observações Adicionais"
              name="observacoes"
            >
              <Input.TextArea
                rows={2}
                placeholder="Observações adicionais (opcional)..."
              />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => {
                  setIsTransferirEspecialidadeModalVisible(false);
                  transferirEspecialidadeForm.resetFields();
                  setEspecialidadeSelecionadaTransfer('');
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" icon={<TeamOutlined />}>
                  Transferir
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal para gerenciar prescrições */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <MedicineBoxOutlined style={{ color: '#1890ff', fontSize: '20px', marginRight: '10px' }} />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Gerenciar Prescrições</span>
            </div>
          }
          open={isPrescricoesModalVisible}
          onCancel={() => setIsPrescricoesModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsPrescricoesModalVisible(false)}>
              Cancelar
            </Button>,
            <Button key="save" type="primary" icon={<CheckOutlined />} onClick={async () => {
              // Salvar prescrições no paciente selecionado
              if (pacienteSelecionado) {
                // Atualizar o paciente local
                setPacienteSelecionado({
                  ...pacienteSelecionado,
                  prescricoes: [...prescricoesSelecionadas]
                });
                
                // Atualizar no contexto global - para cada prescrição
                prescricoesSelecionadas.forEach(prescricao => {
                  // Garantir que cada prescrição inclua o pacienteNid
                  const prescricaoCompleta = {
                    ...prescricao,
                    pacienteId: prescricao.pacienteId || pacienteSelecionado.id,
                    pacienteNid: prescricao.pacienteNid || pacienteSelecionado.nid
                  };
                  
                  if (prescricao.id) {
                    // Se já tem ID, atualiza
                    atualizarPrescricao(prescricao.id, prescricaoCompleta);
                  } else {
                    // Se não tem ID, adiciona como nova
                    adicionarPrescricao(prescricaoCompleta);
                  }
                });
                
                // Atualizar o paciente nas listas de consultas via API
                if (pacienteSelecionado.nid || pacienteSelecionado.id) {
                  // Atualizar via API
                  await fetchConsultasPendentes();
                  message.success('Prescrições salvas com sucesso!');
                } else {
                  message.error('Não foi possível salvar as prescrições: paciente não selecionado');
                }
              } else {
                message.error('Não foi possível salvar as prescrições: paciente não selecionado');
              }
              setIsPrescricoesModalVisible(false);
            }}>
              Salvar Alterações
            </Button>,
            <Button key="print" icon={<PrinterOutlined />} onClick={imprimirPrescricao}>
              Imprimir
            </Button>
          ]}
          width={700}
        >
          <div style={{ marginBottom: 20 }}>
            <Alert
              message="Gerenciamento de Prescrições"
              description="Visualize, adicione ou remova prescrições médicas. As alterações serão salvas automaticamente."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* Lista de prescrições atuais */}
            <div style={{ marginBottom: 20 }}>
              <Divider orientation="left">Prescrições Atuais</Divider>
              <List
                bordered
                dataSource={prescricoesSelecionadas}
                locale={{ emptyText: 'Nenhuma prescrição disponível' }}
                renderItem={(item, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        key="edit" 
                        type="primary"
                        icon={<EditOutlined />} 
                        size="small"
                        onClick={() => iniciarEdicaoPrescricao(item, index)}
                        style={{ marginRight: '8px' }}
                      />,
                      <Button 
                        key="delete" 
                        danger 
                        icon={<DeleteOutlined />} 
                        size="small"
                        onClick={() => handleRemoverPrescricao(index)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<MedicineBoxOutlined style={{ fontSize: '18px', color: '#1890ff' }} />}
                      title={`Medicamento ${index + 1}: ${item.medicamento || ""}`}
                      description={
                        <div>
                          <div><strong>Dosagem:</strong> {item.dosagem || "N/A"}</div>
                          {item.viaAdministracao && <div><strong>Via:</strong> {item.viaAdministracao}</div>}
                          {item.horarios && (
                            <div>
                              <strong>Horários:</strong> {item.horarios}
                              {item.doseDiaria && parseInt(item.doseDiaria) > 1 && (
                                <span style={{ color: '#1890ff', marginLeft: '8px' }}>
                                  ({item.doseDiaria}x ao dia)
                                </span>
                              )}
                            </div>
                          )}
                          {item.comentario && <div><strong>Observações:</strong> {item.comentario}</div>}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            {/* Formulário para adicionar ou editar prescrição */}
            <div style={{ marginTop: 30 }}>
              <Divider orientation="left">
                {prescricaoEmEdicao ? 'Editar Prescrição' : 'Adicionar Nova Prescrição'}
              </Divider>
              <Form
                form={novoPrescricaoForm}
                layout="vertical"
                initialValues={{ doseDiaria: 1, viaAdministracao: 'Oral' }}
                style={{ marginBottom: 16, padding: 16, backgroundColor: prescricaoEmEdicao ? '#fff7e6' : '#fafafa', borderRadius: 8, border: prescricaoEmEdicao ? '1px solid #ffd591' : 'none' }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="medicamento"
                      label="Medicamento"
                      rules={[{ required: true, message: 'Campo obrigatório' }]}
                    >
                      <Input placeholder="Nome do medicamento" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="quantidade"
                      label="Quantidade"
                      rules={[{ required: true, message: 'Campo obrigatório' }]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} defaultValue={1} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="unidade"
                      label="Unidade"
                      rules={[{ required: true, message: 'Campo obrigatório' }]}
                    >
                      <Select defaultValue="comprimido">
                        <Option value="mg">mg</Option>
                        <Option value="g">g</Option>
                        <Option value="ml">ml</Option>
                        <Option value="comprimido">comprimido</Option>
                        <Option value="cápsula">cápsula</Option>
                        <Option value="gotas">gotas</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="viaAdministracao" label="Via de Administração">
                      <Select defaultValue="Oral">
                        <Option value="Oral">Oral</Option>
                        <Option value="Intramuscular">Intramuscular</Option>
                        <Option value="Intravenosa">Intravenosa</Option>
                        <Option value="Subcutânea">Subcutânea</Option>
                        <Option value="Tópica">Tópica</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="doseDiaria" label="Doses por dia">
                      <InputNumber
                        min={1}
                        max={6}
                        defaultValue={1}
                        style={{ width: '100%' }}
                        onChange={(value) => {
                          // Atualizar o número de doses diárias para mostrar os campos de horário
                          setNumeroDosesDiarias(value || 1);
                          
                          // Força a atualização do texto de ajuda do campo de horários
                          novoPrescricaoForm.validateFields(['horarios']).then(() => {
                            // Atualiza o formulário para renderizar o novo texto de ajuda
                            novoPrescricaoForm.setFieldsValue({ 
                              doseDiaria: value
                            });
                          }).catch(() => {
                            // Ignora erros de validação, só queremos atualizar o UI
                          });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="numeroDias" label="Número de dias">
                      <InputNumber min={1} defaultValue={7} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Horários de administração dinâmicos com base no número de doses */}
                <Divider orientation="left">Horários de administração ({numeroDosesDiarias} doses por dia)</Divider>
                
                {/* Renderização dinâmica dos campos de horário */}
                {Array.from({ length: numeroDosesDiarias }).map((_, index) => (
                  <Form.Item
                    key={`horario_${index}`}
                    name={index === 0 ? "horarios" : `horario_${index + 1}`}
                    label={`${index + 1}º Horário de administração`}
                    help={index === 0 ? "Defina os horários de administração do medicamento" : null}
                  >
                    <TimePicker 
                      format="HH:mm" 
                      placeholder={`${index + 1}º horário`}
                      defaultValue={moment(index === 0 ? '08:00' : `${(8 + (24 / numeroDosesDiarias) * index) % 24}:00`, 'HH:mm')}
                      minuteStep={5}
                      use12Hours={false}
                      showNow={true}
                      hideDisabledOptions={true}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                ))}

                <Form.Item name="comentario" label="Comentários/Instruções">
                  <Input.TextArea rows={2} placeholder="Instruções especiais" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  {prescricaoEmEdicao ? (
                    <>
                      <Button 
                        onClick={cancelarEdicaoPrescricao}
                        style={{ marginRight: '8px' }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="primary" 
                        onClick={atualizarPrescricaoLocal} 
                        icon={<CheckOutlined />}
                      >
                        Salvar Alterações
                      </Button>
                    </>
                  ) : (
                    <Button 
                      type="primary" 
                      onClick={handleAdicionarPrescricao} 
                      icon={<PlusOutlined />}
                    >
                      Adicionar Prescrição
                    </Button>
                  )}
                </Form.Item>
              </Form>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Consultorio;