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
  
  // Flag para evitar múltiplas chamadas simultâneas
  const [carregandoConfiguracoes, setCarregandoConfiguracoes] = useState(false);
  
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
          data = response.data;
        }
      } else if (response.status === 'success' && response.data) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      } else {
        console.warn('⚠️ Estrutura de resposta não reconhecida para tipos utentes:', response);
        setTiposUtentes([]);
        return [];
      }
      
      // Verificar se data é um array
      if (Array.isArray(data)) {
        setTiposUtentes(data);
        console.log('✅ Tipos de utentes carregados:', data);
        return data;
      } else {
        console.warn('⚠️ Data não é um array válido:', data);
        setTiposUtentes([]);
        return [];
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
        // Verificar se data é um array ou objeto e converter adequadamente
        let provinciasData;
        if (Array.isArray(response.data)) {
          provinciasData = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Se for um objeto, tentar extrair as províncias ou converter para array
          provinciasData = response.data.data || Object.values(response.data) || [];
        } else {
          provinciasData = [];
        }
        
        setProvincias(provinciasData);
        console.log('✅ Províncias carregadas (formatadas como array):', provinciasData);
        return provinciasData;
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
          { id: 3, nome: 'Cartão de Residência', codigo: 'CARTAO_RESIDENCIA' },
          { id: 4, nome: 'Outro', codigo: 'OUTRO' }
        ];
        setTiposDocumentos(tiposDocumentosPadrao);
        return tiposDocumentosPadrao;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tipos de documentos:', error);
      console.warn('⚠️ Usando dados padrão de tipos de documentos');
      // Dados padrão de fallback em caso de erro
      const tiposDocumentosPadrao = [
        { id: 1, nome: 'Bilhete de Identidade', codigo: 'BI' },
        { id: 2, nome: 'Passaporte', codigo: 'PASSAPORTE' },
        { id: 3, nome: 'Cartão de Residência', codigo: 'CARTAO_RESIDENCIA' },
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
   * DEPRECATED: Não usar mais. Use rotas individuais.
   */
  const carregarConfiguracoesPacientes = useCallback(async () => {
    // REMOVIDO: Não usa mais getConfigurationOptions
    // Cada configuração deve ser carregada individualmente via rotas específicas
    console.log('⚠️ carregarConfiguracoesPacientes está deprecated. Use rotas individuais.');
    return null;
  }, []);

  /**
   * Carrega todas as configurações iniciais
   * Chamado automaticamente quando o hook é montado
   */
  const carregarTodasConfiguracoes = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (carregandoConfiguracoes) {
      console.log('⏳ Configurações já sendo carregadas, aguardando...');
      return;
    }

    setCarregandoConfiguracoes(true);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Carregando todas as configurações...');
      
      // REMOVIDO: Não usar mais carregarConfiguracoesPacientes
      // Carregar tudo via rotas individuais
      const promises = [];
      
      promises.push(carregarTiposUtentes());
      promises.push(carregarProvincias());
      promises.push(carregarRacas());
      promises.push(carregarUnidadesOrganicas());
      promises.push(carregarTiposDocumentos());
      promises.push(carregarGrausParentesco());
      
      await Promise.all(promises);
      
      console.log('✅ Todas as configurações carregadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setCarregandoConfiguracoes(false);
    }
  }, [carregandoConfiguracoes]); // Só depende da flag de controle

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
   * DEPRECATED: Valida configurações com o serviço de pacientes
   * Use rotas individuais para carregar configurações
   */
  const validarConfiguracoes = useCallback(async () => {
    console.log('⚠️ validarConfiguracoes está deprecated. Use rotas individuais.');
    return null;
  }, []);

  // Carregar configurações iniciais ao montar o hook (apenas uma vez)
  useEffect(() => {
    if (!configsPacientesLoaded && !carregandoConfiguracoes) {
      carregarTodasConfiguracoes();
    }
  }, []); // Array vazio para executar apenas uma vez

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
