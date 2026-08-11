import { useState, useEffect, useCallback } from 'react';
import patientService from '../services/patientService';
import { message } from 'antd';
import { normalizeApiList } from '../services/apiConfig';
import { getCachedRequest, invalidateCachedRequest, peekCachedRequest, setCachedRequest } from '../services/requestCache';

/**
 * Hook customizado para gerenciar operações CRUD de pacientes
 * Integra com o backend através do patientService
 */
const usePacientes = () => {
  const snapshot = peekCachedRequest('pacientes:list:last', null, { persist: true, allowStale: true });
  const [pacientes, setPacientes] = useState(snapshot?.pacientes || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(snapshot?.pagination || {
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const currentPage = pagination.current;
  const defaultPageSize = pagination.pageSize;

  /**
   * Busca todos os pacientes com paginação e filtros
   */
  const carregarPacientes = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { pageSize, ...restParams } = params;
      delete restParams.force;
      const queryParams = {
        page: params.page || currentPage,
        per_page: pageSize || defaultPageSize,
        search: params.search || '',
        ...restParams,
      };

      const requestKey = `pacientes:list:${JSON.stringify(queryParams)}`;
      const response = await getCachedRequest(
        requestKey,
        () => patientService.getAllPatients(queryParams),
        { singleFlight: true }
      );

      // patientService pode devolver array direto, wrapper {data}, ou paginador Laravel em data.data.
      const payload = response && response.success ? response.data : response;
      const pacientesPayload = normalizeApiList(payload);

      // Normalizar dados para o formato esperado pelo frontend
      const pacientesNormalizados = pacientesPayload.map(paciente => ({
        // IDs
        id: paciente.id,
        
        // Dados pessoais (backend usa snake_case, frontend usa camelCase)
        nid: paciente.nid || paciente.numero_identificacao || `${paciente.id}/${new Date().getFullYear()}`,
        nome: paciente.nome,
        apelido: paciente.apelido,
        dataNascimento: paciente.data_nascimento,
        dataCadastro: paciente.created_at || paciente.data_cadastro,
        genero: paciente.genero,
        
        // Contatos
        telefone: paciente.celular || paciente.telefone,
        celular: paciente.celular,
        celularAlternativo: paciente.celular_alternativo,
        email: paciente.email,
        whatsapp: paciente.whatsapp,
        
        // Endereço
        endereco: paciente.endereco || `${paciente.avenida_rua_celula || ''} ${paciente.numero_casa || ''}`.trim(),
        avenidaRuaCelula: paciente.avenida_rua_celula,
        numeroCasa: paciente.numero_casa,
        quarteirao: paciente.quarteirao,
        
        // IDs de referências externas
        tipoUtenteId: paciente.tipo_utente_id,
        unidadeOrganicaId: paciente.unidade_organica_id,
        provinciaId: paciente.provincia_id,
        distritoId: paciente.distrito_id,
        bairroId: paciente.bairro_id,
        tipoDocumentoId: paciente.tipo_documento_id,
        racaId: paciente.raca_id,
        
        // Outros dados
        estadoCivil: paciente.estado_civil,
        nacionalidade: paciente.nacionalidade,
        nomeFamiliar: paciente.nome_familiar,
        observacoes: paciente.observacoes,
        
        // Status e estados
        status: paciente.status,
        estadoAtual: paciente.estado_atual || paciente.status,
        statusPagamentoConsulta: paciente.status_pagamento_consulta || paciente.status_pagamento,
        
        // Manter campos originais do backend também
        ...paciente,
      }));

      setPacientes(pacientesNormalizados);

      // Atualizar paginação se disponível
      const paginationPayload = response && (response.pagination || response.meta || response.data?.pagination || response.data?.meta || response.data);
      const nextPagination = paginationPayload
        ? {
            current: paginationPayload.current_page || paginationPayload.current || params.page || currentPage,
            pageSize: paginationPayload.per_page || paginationPayload.pageSize || params.pageSize || defaultPageSize,
            total: paginationPayload.total ?? pacientesNormalizados.length,
          }
        : {
            current: params.page || currentPage,
            pageSize: params.pageSize || defaultPageSize,
            total: pacientesNormalizados.length,
          };

      setPagination(nextPagination);
      setCachedRequest('pacientes:list:last', {
        pacientes: pacientesNormalizados,
        pagination: nextPagination,
      }, { persist: true });

      return pacientesNormalizados;
    } catch (err) {
      setError(err.message || 'Erro ao carregar pacientes');
      message.error('Erro ao carregar pacientes do servidor');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentPage, defaultPageSize]);

  /**
   * Busca um paciente específico por ID
   */
  const buscarPacientePorId = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await patientService.getPatientById(id);
      const payload = response && response.success ? response.data : response;

      // Normalizar dados
      const pacienteNormalizado = {
        // IDs
        id: payload.id,
        
        // Dados pessoais
        nid: payload.nid || payload.numero_identificacao || `${payload.id}/${new Date().getFullYear()}`,
        nome: payload.nome,
        apelido: payload.apelido,
        dataNascimento: payload.data_nascimento,
        dataCadastro: payload.created_at || payload.data_cadastro,
        genero: payload.genero,
        
        // Contatos
        telefone: payload.celular || payload.telefone,
        celular: payload.celular,
        email: payload.email,
        
        // Manter campos originais também
        ...payload,
      };

      return pacienteNormalizado;
    } catch (err) {
      console.error('Erro ao buscar paciente:', err);
      setError(err.message || 'Erro ao buscar paciente');
      message.error('Erro ao buscar dados do paciente');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cria um novo paciente
   */
  const criarPaciente = useCallback(async (dadosPaciente) => {
    setLoading(true);
    setError(null);

    try {

      // Apenas remover campos null/undefined para evitar erros de validação
      const dadosBackend = {};
      
      // Processar cada campo, adicionando apenas se tiver valor válido
      Object.keys(dadosPaciente).forEach(key => {
        const valor = dadosPaciente[key];
        
        // Ignorar campos internos de controle
        if (key.startsWith('_')) {
          return;
        }
        
        // Adicionar apenas se o valor não for null, undefined ou string vazia
        if (valor !== null && valor !== undefined && valor !== '') {
          dadosBackend[key] = valor;
        }
      });
      
      
      // Garantir que campos obrigatórios estejam presentes
      const camposObrigatorios = ['nome', 'apelido', 'data_nascimento', 'genero', 'celular'];
      const camposFaltando = camposObrigatorios.filter(campo => !dadosBackend[campo]);
      
      if (camposFaltando.length > 0) {
        console.error('❌ Campos obrigatórios faltando:', camposFaltando);
        throw new Error(`Campos obrigatórios estão faltando: ${camposFaltando.join(', ')}`);
      }
      // Verificar se temos token de autenticação
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      const response = await patientService.createPatient(dadosBackend);

      // Verificar se houve erro de validação
      if (!response.success) {
        console.error('❌ Resposta de erro do backend:', response);
        
        if (response.errors) {
          console.error('❌ Erros de validação do Laravel:', response.errors);
          
          const validationError = new Error('Erro de validação dos campos');
          validationError.errors = response.errors;
          validationError.response = { data: { errors: response.errors, message: response.message } };
          throw validationError;
        } else {
          // Erro geral sem detalhes de validação
          const errorMsg = response.message || response.error || 'Erro desconhecido do servidor';
          message.error(`Erro do servidor: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
            
      message.success('Paciente cadastrado com sucesso!');

      invalidateCachedRequest('pacientes:list:');

      // Recarregar lista de pacientes
      await carregarPacientes({ force: true });

      return response.data;
    } catch (err) {
      console.error('❌ Erro ao criar paciente:', err);
      setError(err.message || 'Erro ao criar paciente');
      
      // Não mostrar mensagem duplicada se já mostramos os erros de validação
      if (!err.message?.includes('validação')) {
        message.error(err.message || 'Erro ao cadastrar paciente');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [carregarPacientes]);

  /**
   * Atualiza um paciente existente
   */
  const atualizarPaciente = useCallback(async (id, dadosPaciente) => {
    setLoading(true);
    setError(null);

    try {
      // Transformar dados do formato frontend para backend
      const dadosBackend = {
        // Dados pessoais
        nome: dadosPaciente.nome,
        apelido: dadosPaciente.apelido,
        data_nascimento: dadosPaciente.data_nascimento || dadosPaciente.dataNascimento,
        genero: dadosPaciente.genero,
        
        // Documento de identidade - CRÍTICO PARA UTENTES REGULARES
        // Suportar tanto snake_case quanto camelCase vindos do formulário
        bilhete_identidade: dadosPaciente.bilhete_identidade || dadosPaciente.bilheteIdentidade,
        
        // Contatos
        celular: dadosPaciente.telefone || dadosPaciente.celular,
        celular_alternativo: dadosPaciente.celularAlternativo || dadosPaciente.celular_alternativo,
        email: dadosPaciente.email,
        whatsapp: dadosPaciente.whatsapp || dadosPaciente.whatsApp,
        
        // Endereço
        avenida_rua_celula: dadosPaciente.avenidaRuaCelula || dadosPaciente.avenida_rua_celula || dadosPaciente.endereco,
        numero_casa: dadosPaciente.numeroCasa || dadosPaciente.numero_casa,
        quarteirao: dadosPaciente.quarteirao,
        
        // IDs de referências externas - PRIORIDADE para snake_case (valores do formulário convertidos)
        // CORREÇÃO CRÍTICA: snake_case vem do formulário (valores novos), camelCase vem do objeto original
        tipo_utente_id: dadosPaciente.tipo_utente_id || dadosPaciente.tipoUtenteId,
        unidade_organica_id: dadosPaciente.unidade_organica_id || dadosPaciente.unidadeOrganicaId,
        provincia_id: dadosPaciente.provincia_id || dadosPaciente.provinciaId,
        distrito_id: dadosPaciente.distrito_id || dadosPaciente.distritoId,
        bairro_id: dadosPaciente.bairro_id || dadosPaciente.bairroId,
        tipo_documento_id: dadosPaciente.tipo_documento_id || dadosPaciente.tipoDocumentoId,
        raca_id: dadosPaciente.raca_id || dadosPaciente.racaId,
        
        // Outros dados
        estado_civil: dadosPaciente.estadoCivil || dadosPaciente.estado_civil,
        nacionalidade: dadosPaciente.nacionalidade,
        nome_familiar: dadosPaciente.nomeFamiliar || dadosPaciente.nome_familiar,
        observacoes: dadosPaciente.observacoes,
        status: dadosPaciente.status,
      };


      Object.keys(dadosBackend).forEach((key) => {
        if (dadosBackend[key] === undefined || dadosBackend[key] === null || dadosBackend[key] === '') {
          delete dadosBackend[key];
        }
      });

      const response = await patientService.updatePatient(id, dadosBackend);

      
      if (response && response.success) {
        message.success(response.message || 'Paciente atualizado com sucesso!');
        invalidateCachedRequest('pacientes:list:');
        await carregarPacientes({ force: true });
        return response.data;
      } else {
        if (response?.errors) {
          Object.entries(response.errors).forEach(([field, messages]) => {
            message.error(`${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`);
          });
        }

        throw new Error(response?.message || 'Erro ao atualizar paciente. Verifique os dados.');
      }

    } catch (err) {
      console.error('❌ Erro ao atualizar paciente:', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      
      // Se houver erros de validação, mostrar detalhes
      if (err.response?.data?.errors) {
        console.error('📋 Erros de validação:', err.response.data.errors);
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          message.error(`${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`);
        });
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [carregarPacientes]);

  /**
   * Deleta um paciente
   */
  const deletarPaciente = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
  await patientService.deletePatient(id);

      message.success('Paciente removido com sucesso!');

      invalidateCachedRequest('pacientes:list:');

      // Recarregar lista de pacientes
      await carregarPacientes({ force: true });

      return true;
    } catch (err) {
      console.error('Erro ao deletar paciente:', err);
      setError(err.message || 'Erro ao deletar paciente');
      message.error(err.message || 'Erro ao remover paciente');
      return false;
    } finally {
      setLoading(false);
    }
  }, [carregarPacientes]);

  /**
   * Busca pacientes por termo de pesquisa
   */
  const buscarPacientes = useCallback(async (searchTerm) => {
    setLoading(true);
    setError(null);

    try {
      const response = await patientService.searchPatients(searchTerm);
      const payload = response && response.success ? response.data : response;

      // Normalizar dados
      const pacientesNormalizados = normalizeApiList(payload).map(paciente => ({
        // IDs
        id: paciente.id,
        
        // Dados pessoais
        nid: paciente.nid || paciente.numero_identificacao || `${paciente.id}/${new Date().getFullYear()}`,
        nome: paciente.nome,
        apelido: paciente.apelido,
        dataNascimento: paciente.data_nascimento,
        dataCadastro: paciente.created_at || paciente.data_cadastro,
        
        // Manter campos originais também
        ...paciente,
      }));

      setPacientes(pacientesNormalizados);

      return pacientesNormalizados;
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
      setError(err.message || 'Erro ao buscar pacientes');
      message.error('Erro ao buscar pacientes');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carrega pacientes ao montar o componente
   * Com delay para garantir que auth esteja completo
   */
  useEffect(() => {
    // Verificar se tem token antes de carregar
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    

    
    if (token) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(async () => {
        await carregarPacientes();
        // Removido o console.log para não exibir no console
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      console.warn('⚠️ Token não encontrado - não carregando pacientes');
    }
  }, [carregarPacientes]);

  return {
    // Estado
    pacientes,
    loading,
    error,
    pagination,

    // Métodos
    carregarPacientes,
    buscarPacientePorId,
    criarPaciente,
    atualizarPaciente,
    deletarPaciente,
    buscarPacientes,

    // Método para atualizar paginação
    setPagination,
  };
};

export default usePacientes;
