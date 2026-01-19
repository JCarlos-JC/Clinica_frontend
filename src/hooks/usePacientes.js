import { useState, useEffect, useCallback } from 'react';
import patientService from '../services/patientService';
import { message } from 'antd';

/**
 * Hook customizado para gerenciar operações CRUD de pacientes
 * Integra com o backend através do patientService
 */
const usePacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  /**
   * Busca todos os pacientes com paginação e filtros
   */
  const carregarPacientes = useCallback(async (params = {}) => {
    console.log('🚀 carregarPacientes chamado:', { params, currentState: pacientes.length });
    setLoading(true);
    setError(null);

    try {
      const response = await patientService.getAllPatients({
        page: params.page || pagination.current,
        per_page: params.pageSize || pagination.pageSize,
        search: params.search || '',
        ...params,
      });

      console.log('📡 Resposta do patientService:', { success: response?.success, hasData: !!response?.data, dataLength: response?.data?.length });

      // patientService returns { success, data, pagination? }
      const payload = response && response.success ? response.data : response;

      console.log('📊 Payload processado:', { isArray: Array.isArray(payload), length: payload?.length });

      // Normalizar dados para o formato esperado pelo frontend
      const pacientesNormalizados = (payload || []).map(paciente => ({
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
        estadoAtual: paciente.estado_atual,
        statusPagamentoConsulta: paciente.status_pagamento_consulta,
        
        // Manter campos originais do backend também
        ...paciente,
      }));

      console.log('✅ Pacientes normalizados:', { 
        total: pacientesNormalizados.length, 
        primeiro: pacientesNormalizados[0]?.nome,
        // 🔍 DEBUG: Verificar se a normalização está correta para o primeiro paciente
        primeiroCompleto: {
          id: pacientesNormalizados[0]?.id,
          nome: pacientesNormalizados[0]?.nome,
          tipo_utente_id: pacientesNormalizados[0]?.tipo_utente_id,
          tipoUtenteId: pacientesNormalizados[0]?.tipoUtenteId,
          unidade_organica_id: pacientesNormalizados[0]?.unidade_organica_id,
          unidadeOrganicaId: pacientesNormalizados[0]?.unidadeOrganicaId
        }
      });
      setPacientes(pacientesNormalizados);
      console.log('📝 setPacientes executado com', pacientesNormalizados.length, 'pacientes');

      // Atualizar paginação se disponível
      const paginationPayload = response && (response.pagination || response.meta || response.data?.pagination || response.data?.meta);
      if (paginationPayload) {
        setPagination({
          current: paginationPayload.current_page || paginationPayload.current || pagination.current,
          pageSize: paginationPayload.per_page || paginationPayload.per_page || pagination.pageSize,
          total: paginationPayload.total || pagination.total || 0,
        });
      }

      return pacientesNormalizados;
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
      setError(err.message || 'Erro ao carregar pacientes');
      message.error('Erro ao carregar pacientes do servidor');
      return [];
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  /**
   * Busca um paciente específico por ID
   */
  const buscarPacientePorId = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await patientService.getPatientById(id);
      const payload = response && response.success ? response.data : response;
      console.log('Paciente carregado:', payload);

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
      // Os dados já vêm no formato correto do componente (snake_case) seguindo o modelo Paciente
      console.log('📊 Dados originais recebidos do formulário:', dadosPaciente);
      console.log('📊 Tipo dos dados:', typeof dadosPaciente);
      console.log('📊 Chaves dos dados:', Object.keys(dadosPaciente));
      
      // Apenas remover campos null/undefined para evitar erros de validação
      const dadosBackend = {};
      
      // Processar cada campo, adicionando apenas se tiver valor válido
      Object.keys(dadosPaciente).forEach(key => {
        const valor = dadosPaciente[key];
        
        // Ignorar campos internos de controle
        if (key.startsWith('_')) {
          console.log('🔧 Ignorando campo interno:', key);
          return;
        }
        
        // Adicionar apenas se o valor não for null, undefined ou string vazia
        if (valor !== null && valor !== undefined && valor !== '') {
          dadosBackend[key] = valor;
        }
      });
      
      console.log('🔍 Dados processados:', dadosBackend);
      console.log('🔍 Número de campos processados:', Object.keys(dadosBackend).length);
      
      // Log crítico para debug de raca_id
      console.log('🔍 CRÍTICO - Verificação de raca_id no hook:', {
        raca_id_original: dadosPaciente.raca_id,
        raca_id_processado: dadosBackend.raca_id,
        tipo_original: typeof dadosPaciente.raca_id,
        tipo_processado: typeof dadosBackend.raca_id,
        foi_removido: !dadosBackend.hasOwnProperty('raca_id')
      });
      
      // Log crítico para debug de bilhete_identidade
      console.log('🔍 CRÍTICO - Verificação de bilhete_identidade no hook:', {
        bilhete_identidade_original: dadosPaciente.bilhete_identidade,
        bilhete_identidade_processado: dadosBackend.bilhete_identidade,
        tipo_original: typeof dadosPaciente.bilhete_identidade,
        tipo_processado: typeof dadosBackend.bilhete_identidade,
        foi_removido: !dadosBackend.hasOwnProperty('bilhete_identidade'),
        temLetras: dadosPaciente.bilhete_identidade ? /[A-Za-z]/.test(dadosPaciente.bilhete_identidade) : false
      });
      
      // Garantir que campos obrigatórios estejam presentes
      const camposObrigatorios = ['nome', 'apelido', 'data_nascimento', 'genero', 'celular'];
      const camposFaltando = camposObrigatorios.filter(campo => !dadosBackend[campo]);
      
      if (camposFaltando.length > 0) {
        console.error('❌ Campos obrigatórios faltando:', camposFaltando);
        throw new Error(`Campos obrigatórios estão faltando: ${camposFaltando.join(', ')}`);
      }
      
      console.log('✅ Todos os campos obrigatórios estão presentes');
      console.log('✅ Campos obrigatórios verificados:', camposObrigatorios.map(campo => `${campo}: ${dadosBackend[campo]}`));

      // Verificar se temos token de autenticação
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      console.log('🔄 Enviando ao backend (snake_case):', dadosBackend);
      console.log('🔑 Token presente:', !!token);
      
      const response = await patientService.createPatient(dadosBackend);
      
      console.log('📥 Resposta do backend:', response);
      
      // Verificar se houve erro de validação
      if (!response.success) {
        console.error('❌ Resposta de erro do backend:', response);
        
        if (response.errors) {
          console.error('❌ Erros de validação do Laravel:', response.errors);
          
          // RETRY AUTOMÁTICO para raca_id inválida
          if (response.errors.raca_id && dadosBackend._tentativasRaca && dadosBackend._tentativasRaca.length > 0) {
            console.log('🔄 RETRY: Tentando próximo ID de raça...');
            
            const proximoId = dadosBackend._tentativasRaca.shift();
            dadosBackend.raca_id = proximoId;
            
            console.log('🔄 Nova tentativa com raca_id:', {
              idAnterior: response.errors.raca_id,
              novoId: proximoId,
              tentativasRestantes: dadosBackend._tentativasRaca.length,
              nomeRaca: dadosBackend._racaOriginal?.nome
            });
            
            // Tentar novamente
            console.log('🔄 RECURSÃO: Chamando criarPaciente novamente...');
            return await criarPaciente(dadosBackend);
          }
          
          // Mostrar cada erro de validação
          Object.keys(response.errors).forEach(field => {
            const errorMessages = response.errors[field];
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach(msg => {
                message.error(`Campo "${field}": ${msg}`);
              });
            } else {
              message.error(`Campo "${field}": ${errorMessages}`);
            }
          });
          
          throw new Error('Erro de validação dos campos');
        } else {
          // Erro geral sem detalhes de validação
          const errorMsg = response.message || response.error || 'Erro desconhecido do servidor';
          message.error(`Erro do servidor: ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
      
      const payload = response && response.success ? response.data : response;
      console.log('✅ Paciente criado com sucesso:', payload);
      
      message.success('Paciente cadastrado com sucesso!');

      // Recarregar lista de pacientes
      await carregarPacientes();

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
        data_nascimento: dadosPaciente.dataNascimento,
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

      console.log('📤 Dados originais recebidos:', dadosPaciente);
      console.log('📦 Dados transformados para backend:', dadosBackend);
      
      // 🔍 DEBUG CRÍTICO: Verificar campos específicos
      console.log('🎯 CAMPOS CRÍTICOS ENVIADOS AO BACKEND:', {
        tipo_utente_id: {
          valor: dadosBackend.tipo_utente_id,
          tipo: typeof dadosBackend.tipo_utente_id,
          existe: 'tipo_utente_id' in dadosBackend,
          isNull: dadosBackend.tipo_utente_id === null,
          isUndefined: dadosBackend.tipo_utente_id === undefined
        },
        unidade_organica_id: {
          valor: dadosBackend.unidade_organica_id,
          tipo: typeof dadosBackend.unidade_organica_id,
          existe: 'unidade_organica_id' in dadosBackend
        },
        dadosOriginais: {
          'dadosPaciente.tipo_utente_id': dadosPaciente.tipo_utente_id,
          'dadosPaciente.tipoUtenteId': dadosPaciente.tipoUtenteId,
          'dadosPaciente.unidade_organica_id': dadosPaciente.unidade_organica_id,
          'dadosPaciente.unidadeOrganicaId': dadosPaciente.unidadeOrganicaId
        }
      });

      const response = await patientService.updatePatient(id, dadosBackend);
      const payload = response && response.success ? response.data : response;
      console.log('✅ Resposta do backend:', response);
      console.log('📄 Payload do paciente atualizado:', payload);
      
      // 🔍 DEBUG: Verificar se os campos foram realmente atualizados no backend
      console.log('🎯 VALORES RETORNADOS DO BACKEND:', {
        'payload.tipo_utente_id': payload?.tipo_utente_id,
        'payload.tipoUtenteId': payload?.tipoUtenteId,
        'payload.unidade_organica_id': payload?.unidade_organica_id,
        'payload.unidadeOrganicaId': payload?.unidadeOrganicaId
      });
      
      if (response && response.success) {
        message.success(response.message || 'Paciente atualizado com sucesso!');
      } else {
        message.error('Erro ao atualizar paciente. Verifique os dados.');
        return null;
      }

      // Recarregar lista de pacientes
      console.log('🔄 Iniciando recarregamento da lista de pacientes...');
      const pacientesAtualizados = await carregarPacientes();
      console.log('✅ Lista recarregada com sucesso:', pacientesAtualizados?.length, 'pacientes');

      return payload;
    } catch (err) {
      console.error('❌ Erro ao atualizar paciente:', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atualizar paciente';
      setError(errorMessage);
      message.error(errorMessage);
      
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
  console.log('Paciente deletado:', id);

      message.success('Paciente removido com sucesso!');

      // Recarregar lista de pacientes
      await carregarPacientes();

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
      console.log('Resultados da busca:', payload);

      // Normalizar dados
      const pacientesNormalizados = (payload || []).map(paciente => ({
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
    const token = localStorage.getItem('token');
    
    console.log('🔄 usePacientes useEffect executado:', {
      hasToken: !!token,
      currentPacientes: pacientes.length
    });
    
    if (token) {
      // Pequeno delay para garantir que tudo está pronto
      const timer = setTimeout(async () => {
        console.log('🔄 Iniciando carregamento de pacientes do backend...');
        const result = await carregarPacientes();
        console.log('📊 Resultado do carregamento:', {
          totalCarregados: result?.length || 0,
          estadoAtual: pacientes.length
        });
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.warn('⚠️ Token não encontrado - não carregando pacientes');
    }
  }, []); // Executar apenas uma vez

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
