import { useState, useEffect, useCallback } from 'react';
import configurationService from '../services/configurationService';
import patientService from '../services/patientService';
import { message } from 'antd';

/**
 * Hook customizado para gerenciar configurações do sistema
 * Carrega dados de tipos de utentes, províncias, distritos, bairros, raças, etc.
 * Mantém cache local para evitar requisições desnecessárias
 */
const useConfigurations = () => {
  const [tiposUtentes, setTiposUtentes] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [bairros, setBairros] = useState([]);
  const [racas, setRacas] = useState([]);
  const [tiposDocumentos, setTiposDocumentos] = useState([]);
  const [unidadesOrganicas, setUnidadesOrganicas] = useState([]);
  const [grausParentesco, setGrausParentesco] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cache de distritos por província
  const [distritosCache, setDistritosCache] = useState({});
  
  // Cache de bairros por distrito
  const [bairrosCache, setBairrosCache] = useState({});

  // Estados para configurações validadas pelo serviço de pacientes
  const [configuracoesPacientes, setConfiguracoesPacientes] = useState(null);
  const [configsPacientesLoaded, setConfigsPacientesLoaded] = useState(false);

  /**
   * Carrega todos os tipos de utentes (fallback para serviço de configuração)
   */
  const carregarTiposUtentes = useCallback(async () => {
    try {
      console.log('📤 Carregando tipos de utentes...');
      const response = await configurationService.getTiposUtentes();
      
      console.log('🔍 Resposta bruta de tipos utentes:', response);
      
      // Tratar diferentes estruturas de resposta
      let data;
      if (response.success && response.data) {
        // Se a resposta tem success=true e data
        if (response.data.status === 'success' && Array.isArray(response.data.data)) {
          // Estrutura aninhada: {success: true, data: {status: 'success', data: [...]}}
          data = response.data.data;
        } else if (Array.isArray(response.data)) {
          // Estrutura simples: {success: true, data: [...]}
          data = response.data;
        } else {
          console.warn('⚠️ Estrutura de resposta não reconhecida:', response.data);
          data = [];
        }
      } else if (Array.isArray(response)) {
        // Resposta direta como array
        data = response;
      } else {
        console.warn('⚠️ Resposta inválida de tipos utentes:', response);
        data = [];
      }
      
      if (data && data.length > 0) {
        setTiposUtentes(data);
        console.log('✅ Tipos de utentes carregados:', data);
        return data;
      } else {
        console.warn('⚠️ Nenhum tipo de utente retornado. Usando dados padrão.');
        // Dados padrão de fallback
        const tiposUtentesPadrao = [
          { id: 1, nome: 'Estudante', codigo: 'estudante' },
          { id: 2, nome: 'Funcionário', codigo: 'funcionario' },
          { id: 3, nome: 'Investigador', codigo: 'investigador' },
          { id: 4, nome: 'Visitante', codigo: 'visitante' },
          { id: 5, nome: 'Outro', codigo: 'outro' }
        ];
        setTiposUtentes(tiposUtentesPadrao);
        return tiposUtentesPadrao;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tipos de utentes:', error);
      setError(error.message);
      message.error('Erro ao carregar tipos de utentes');
      return [];
    }
  }, []);

  /**
   * Carrega todas as províncias
   */
  const carregarProvincias = useCallback(async () => {
    try {
      console.log('📤 Carregando províncias...');
      const response = await configurationService.getProvincias();
      
      if (response.success && response.data) {
        setProvincias(response.data);
        console.log('✅ Províncias carregadas:', response.data);
        return response.data;
      } else {
        console.warn('⚠️ Nenhuma província encontrada');
        setProvincias([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar províncias:', error);
      setError(error.message);
      message.error('Erro ao carregar províncias');
      return [];
    }
  }, []);

  /**
   * Carrega distritos de uma província específica
   * Usa cache para evitar requisições duplicadas
   */
  const carregarDistritosPorProvincia = useCallback(async (provinciaId) => {
    if (!provinciaId) {
      setDistritos([]);
      return [];
    }

    // Verificar se já existe no cache
    if (distritosCache[provinciaId]) {
      console.log(`✅ Usando cache de distritos para província ${provinciaId}`);
      setDistritos(distritosCache[provinciaId]);
      return distritosCache[provinciaId];
    }

    try {
      console.log(`📤 Carregando distritos da província ${provinciaId}...`);
      const response = await configurationService.getDistritosByProvincia(provinciaId);
      
      if (response.success && response.data) {
        setDistritos(response.data);
        
        // Adicionar ao cache
        setDistritosCache(prev => ({
          ...prev,
          [provinciaId]: response.data
        }));
        
        console.log('✅ Distritos carregados:', response.data);
        return response.data;
      } else {
        console.warn(`⚠️ Nenhum distrito encontrado para província ${provinciaId}`);
        setDistritos([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar distritos:', error);
      setError(error.message);
      message.error('Erro ao carregar distritos');
      return [];
    }
  }, [distritosCache]);

  /**
   * Carrega bairros de um distrito específico
   * Usa cache para evitar requisições duplicadas
   */
  const carregarBairrosPorDistrito = useCallback(async (distritoId) => {
    if (!distritoId) {
      setBairros([]);
      return [];
    }

    // Verificar se já existe no cache
    if (bairrosCache[distritoId]) {
      console.log(`✅ Usando cache de bairros para distrito ${distritoId}`);
      setBairros(bairrosCache[distritoId]);
      return bairrosCache[distritoId];
    }

    try {
      console.log(`📤 Carregando bairros do distrito ${distritoId}...`);
      const response = await configurationService.getBairrosByDistrito(distritoId);
      
      if (response.success && response.data) {
        setBairros(response.data);
        
        // Adicionar ao cache
        setBairrosCache(prev => ({
          ...prev,
          [distritoId]: response.data
        }));
        
        console.log('✅ Bairros carregados:', response.data);
        return response.data;
      } else {
        console.warn(`⚠️ Nenhum bairro encontrado para distrito ${distritoId}`);
        setBairros([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar bairros:', error);
      setError(error.message);
      message.error('Erro ao carregar bairros');
      return [];
    }
  }, [bairrosCache]);

  /**
   * Carrega todas as raças
   */
  const carregarRacas = useCallback(async () => {
    try {
      console.log('📤 Carregando raças...');
      const response = await configurationService.getRacas();
      
      if (response.success && response.data) {
        setRacas(response.data);
        console.log('✅ Raças carregadas:', response.data);
        return response.data;
      } else {
        console.warn('⚠️ Nenhuma raça encontrada');
        setRacas([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar raças:', error);
      setError(error.message);
      message.error('Erro ao carregar raças');
      return [];
    }
  }, []);

  /**
   * Carrega todos os tipos de documentos
   */
  const carregarTiposDocumentos = useCallback(async () => {
    try {
      console.log('📤 Carregando tipos de documentos...');
      const response = await configurationService.getTiposDocumentos();
      
      // Verificar múltiplos formatos de resposta do backend
      const dados = response?.data?.data || response?.data || response;
      
      if (dados && Array.isArray(dados) && dados.length > 0) {
        setTiposDocumentos(dados);
        console.log('✅ Tipos de documentos carregados do backend:', dados);
        return dados;
      } else {
        console.warn('⚠️ Nenhum tipo de documento retornado do backend. Usando dados padrão.');
        console.log('📊 Resposta recebida:', response);
        // Dados padrão de fallback
        const tiposDocumentosPadrao = [
          { id: 1, nome: 'Bilhete de Identidade', codigo: 'BI' },
          { id: 2, nome: 'Passaporte', codigo: 'PASSAPORTE' },
          { id: 3, nome: 'Cartão de Estudante', codigo: 'CARTAO_ESTUDANTE' },
          { id: 4, nome: 'Outro', codigo: 'OUTRO' }
        ];
        setTiposDocumentos(tiposDocumentosPadrao);
        setError(error.message);
        return tiposDocumentosPadrao;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tipos de documentos:', error);
      console.warn('⚠️ Usando dados padrão de tipos de documentos');
      // Dados padrão de fallback em caso de erro
      const tiposDocumentosPadrao = [
        { id: 1, nome: 'Bilhete de Identidade', codigo: 'BI' },
        { id: 2, nome: 'Passaporte', codigo: 'PASSAPORTE' },
        { id: 3, nome: 'Cartão de Estudante', codigo: 'CARTAO_ESTUDANTE' },
        { id: 4, nome: 'Outro', codigo: 'OUTRO' }
      ];
      setTiposDocumentos(tiposDocumentosPadrao);
      setError(error.message);
      return tiposDocumentosPadrao;
    }
  }, []);

  /**
   * Carrega todas as unidades orgânicas
   */
  const carregarUnidadesOrganicas = useCallback(async () => {
    try {
      console.log('📤 Carregando unidades orgânicas...');
      const response = await configurationService.getUnidadesOrganicas();
      
      // Verificar múltiplos formatos de resposta do backend
      const dados = response?.data?.data || response?.data || response;
      
      if (dados && Array.isArray(dados) && dados.length > 0) {
        setUnidadesOrganicas(dados);
        console.log('✅ Unidades orgânicas carregadas do backend:', dados);
        return dados;
      } else {
        console.warn('⚠️ Nenhuma unidade orgânica retornada do backend. Usando dados padrão.');
        console.log('📊 Resposta recebida:', response);
        // Dados padrão de fallback
        const unidadesOrganicasPadrao = [
          { id: 1, nome: 'Faculdade de Medicina', sigla: 'FM' },
          { id: 2, nome: 'Faculdade de Direito', sigla: 'FD' },
          { id: 3, nome: 'Faculdade de Engenharia', sigla: 'FENG' },
          { id: 4, nome: 'Faculdade de Educação', sigla: 'FACED' },
          { id: 5, nome: 'Faculdade de Veterinária', sigla: 'FAVET' },
          { id: 6, nome: 'Faculdade de Agronomia e Engenharia Florestal', sigla: 'FAEF' },
          { id: 7, nome: 'Faculdade de Economia', sigla: 'FEC' },
          { id: 8, nome: 'Faculdade de Letras e Ciências Sociais', sigla: 'FLCS' },
          { id: 9, nome: 'Faculdade de Ciências', sigla: 'FC' },
          { id: 10, nome: 'Escola Superior de Hotelaria e Turismo', sigla: 'ESHTI' },
          { id: 11, nome: 'Escola de Comunicação e Artes', sigla: 'ECA' },
          { id: 12, nome: 'Escola Superior de Ciências do Desporto', sigla: 'ESCIDE' }
        ];
        setUnidadesOrganicas(unidadesOrganicasPadrao);
        return unidadesOrganicasPadrao;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar unidades orgânicas:', error);
      console.warn('⚠️ Usando dados padrão de unidades orgânicas');
      // Dados padrão de fallback em caso de erro
      const unidadesOrganicasPadrao = [
        { id: 1, nome: 'Faculdade de Medicina', sigla: 'FM' },
        { id: 2, nome: 'Faculdade de Direito', sigla: 'FD' },
        { id: 3, nome: 'Faculdade de Engenharia', sigla: 'FENG' },
        { id: 4, nome: 'Faculdade de Educação', sigla: 'FACED' },
        { id: 5, nome: 'Faculdade de Veterinária', sigla: 'FAVET' },
        { id: 6, nome: 'Faculdade de Agronomia e Engenharia Florestal', sigla: 'FAEF' },
        { id: 7, nome: 'Faculdade de Economia', sigla: 'FEC' },
        { id: 8, nome: 'Faculdade de Letras e Ciências Sociais', sigla: 'FLCS' },
        { id: 9, nome: 'Faculdade de Ciências', sigla: 'FC' },
        { id: 10, nome: 'Escola Superior de Hotelaria e Turismo', sigla: 'ESHTI' },
        { id: 11, nome: 'Escola de Comunicação e Artes', sigla: 'ECA' },
        { id: 12, nome: 'Escola Superior de Ciências do Desporto', sigla: 'ESCIDE' }
      ];
      setUnidadesOrganicas(unidadesOrganicasPadrao);
      setError(error.message);
      return unidadesOrganicasPadrao;
    }
  }, []);

  /**
   * Carrega graus de parentesco do backend
   * Com fallback para dados padrão se backend não estiver disponível
   */
  const carregarGrausParentesco = useCallback(async () => {
    try {
      console.log('📤 Carregando graus de parentesco...');
      const response = await configurationService.getGrausParentesco();
      
      if (response.success && response.data) {
        setGrausParentesco(response.data);
        console.log('✅ Graus de parentesco carregados do backend:', response.data);
        return response.data;
      } else {
        console.warn('⚠️ Backend não disponível. Usando dados padrão de graus de parentesco.');
        // Dados padrão de fallback
        const grausParentescoPadrao = [
          { id: 1, nome: 'Pai', codigo: 'pai' },
          { id: 2, nome: 'Mãe', codigo: 'mae' },
          { id: 3, nome: 'Irmão/Irmã', codigo: 'irmao' },
          { id: 4, nome: 'Filho(a)', codigo: 'filho' },
          { id: 5, nome: 'Cônjuge', codigo: 'conjuge' },
          { id: 6, nome: 'Avô/Avó', codigo: 'avo' },
          { id: 7, nome: 'Tio(a)', codigo: 'tio' },
          { id: 8, nome: 'Primo(a)', codigo: 'primo' },
          { id: 9, nome: 'Outro', codigo: 'outro' }
        ];
        setGrausParentesco(grausParentescoPadrao);
        return grausParentescoPadrao;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar graus de parentesco:', error);
      console.warn('⚠️ Usando dados padrão de graus de parentesco');
      // Dados padrão de fallback em caso de erro
      const grausParentescoPadrao = [
        { id: 1, nome: 'Pai', codigo: 'pai' },
        { id: 2, nome: 'Mãe', codigo: 'mae' },
        { id: 3, nome: 'Irmão/Irmã', codigo: 'irmao' },
        { id: 4, nome: 'Filho(a)', codigo: 'filho' },
        { id: 5, nome: 'Cônjuge', codigo: 'conjuge' },
        { id: 6, nome: 'Avô/Avó', codigo: 'avo' },
        { id: 7, nome: 'Tio(a)', codigo: 'tio' },
        { id: 8, nome: 'Primo(a)', codigo: 'primo' },
        { id: 9, nome: 'Outro', codigo: 'outro' }
      ];
      setGrausParentesco(grausParentescoPadrao);
      return grausParentescoPadrao;
    }
  }, []);

  /**
   * Busca configurações válidas diretamente do serviço de pacientes
   * Estas configurações são as que o backend aceita para validação
   */
  const carregarConfiguracoesPacientes = useCallback(async () => {
    try {
      console.log('🔄 Buscando configurações válidas do serviço de pacientes...');
      
      const response = await patientService.getConfigurationOptions();
      
      if (response.success && response.data) {
        console.log('✅ Configurações do serviço de pacientes carregadas:', response.data);
        setConfiguracoesPacientes(response.data);
        setConfigsPacientesLoaded(true);
        
        // Se as configurações do serviço de pacientes têm raças, usar essas
        if (response.data.racas && Array.isArray(response.data.racas)) {
          console.log('🔄 Usando raças do serviço de pacientes:', response.data.racas);
          setRacas(response.data.racas);
        }
        
        // Se as configurações do serviço de pacientes têm tipos de utentes, usar esses
        if (response.data.tipos_utentes && Array.isArray(response.data.tipos_utentes)) {
          console.log('🔄 Usando tipos utentes do serviço de pacientes:', response.data.tipos_utentes);
          setTiposUtentes(response.data.tipos_utentes);
        }
        
        // Se as configurações do serviço de pacientes têm províncias, usar essas
        if (response.data.provincias && Array.isArray(response.data.provincias)) {
          console.log('🔄 Usando províncias do serviço de pacientes:', response.data.provincias);
          setProvincias(response.data.provincias);
        }
        
        // Se as configurações do serviço de pacientes têm unidades orgânicas, usar essas
        if (response.data.unidades_organicas && Array.isArray(response.data.unidades_organicas)) {
          console.log('🔄 Usando unidades orgânicas do serviço de pacientes:', response.data.unidades_organicas);
          setUnidadesOrganicas(response.data.unidades_organicas);
        }
        
        return response.data;
      } else {
        console.warn('⚠️ Não foi possível carregar configurações do serviço de pacientes, usando serviço de configuração');
        setConfigsPacientesLoaded(false);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar configurações do serviço de pacientes:', error);
      setConfigsPacientesLoaded(false);
      return null;
    }
  }, []);

  /**
   * Carrega todas as configurações iniciais
   * Chamado automaticamente quando o hook é montado
   */
  const carregarTodasConfiguracoes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Carregando todas as configurações...');
      
      // Primeiro, tentar carregar configurações do serviço de pacientes
      const configsPacientes = await carregarConfiguracoesPacientes();
      
      // Depois carregar as outras configurações do serviço de configuração
      // (apenas aquelas que não foram obtidas do serviço de pacientes)
      const promises = [];
      
      if (!configsPacientes?.tipos_utentes) {
        promises.push(carregarTiposUtentes());
      }
      
      if (!configsPacientes?.provincias) {
        promises.push(carregarProvincias());
      }
      
      if (!configsPacientes?.racas) {
        promises.push(carregarRacas());
      }
      
      if (!configsPacientes?.unidades_organicas) {
        promises.push(carregarUnidadesOrganicas());
      }
      
      // Sempre carregar estes do serviço de configuração
      promises.push(carregarTiposDocumentos());
      promises.push(carregarGrausParentesco());
      
      await Promise.all(promises);
      
      console.log('✅ Todas as configurações carregadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    carregarConfiguracoesPacientes,
    carregarTiposUtentes,
    carregarProvincias,
    carregarRacas,
    carregarTiposDocumentos,
    carregarUnidadesOrganicas
  ]);

  /**
   * Busca ID de tipo de utente por valor/nome
   * Útil para conversão de string para ID antes de enviar ao backend
   */
  const getTipoUtenteIdByValue = useCallback((value) => {
    if (!value) return null;
    
    // Verificar se tiposUtentes é um array válido
    if (!Array.isArray(tiposUtentes) || tiposUtentes.length === 0) {
      console.warn('⚠️ tiposUtentes não é um array válido:', tiposUtentes);
      return null;
    }
    
    const tipo = tiposUtentes.find(t => 
      t.codigo === value || 
      t.nome?.toLowerCase() === value.toLowerCase() ||
      t.descricao?.toLowerCase() === value.toLowerCase()
    );
    
    console.log('🔍 Buscando tipo utente:', { value, tipo, tiposUtentes });
    return tipo ? tipo.id : null;
  }, [tiposUtentes]);

  /**
   * Busca ID de província por nome
   */
  const getProvinciaIdByNome = useCallback((nome) => {
    if (!nome) return null;
    
    const provincia = provincias.find(p => 
      p.nome?.toLowerCase() === nome.toLowerCase()
    );
    
    return provincia ? provincia.id : null;
  }, [provincias]);

  /**
   * Valida configurações com o serviço de pacientes
   */
  const validarConfiguracoes = useCallback(async () => {
    try {
      console.log('🔍 Validando configurações com serviço de pacientes...');
      
      const response = await patientService.getConfigurationOptions();
      
      if (response.success && response.data) {
        console.log('✅ Configurações válidas do serviço de pacientes:', response.data);
        return response.data;
      } else {
        console.warn('⚠️ Não foi possível obter configurações do serviço de pacientes');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao validar configurações:', error);
      return null;
    }
  }, []);

  // Carregar configurações iniciais ao montar o hook
  useEffect(() => {
    carregarTodasConfiguracoes();
  }, [carregarTodasConfiguracoes]);

  return {
    // Estados
    tiposUtentes,
    provincias,
    distritos,
    bairros,
    racas,
    tiposDocumentos,
    unidadesOrganicas,
    grausParentesco,
    loading,
    error,
    
    // Configurações específicas do serviço de pacientes
    configuracoesPacientes,
    configsPacientesLoaded,
    
    // Funções de carregamento
    carregarTiposUtentes,
    carregarProvincias,
    carregarDistritosPorProvincia,
    carregarBairrosPorDistrito,
    carregarRacas,
    carregarTiposDocumentos,
    carregarUnidadesOrganicas,
    carregarGrausParentesco,
    carregarTodasConfiguracoes,
    carregarConfiguracoesPacientes,
    
    // Funções auxiliares
    getTipoUtenteIdByValue,
    getProvinciaIdByNome
  };
};

export default useConfigurations;