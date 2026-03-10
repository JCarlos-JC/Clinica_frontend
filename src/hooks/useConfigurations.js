import { useState, useCallback } from 'react';
import configurationService from '../services/configurationService';
// import patientService from '../services/patientService';
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
  // const [configuracoesPacientes, setConfiguracoesPacientes] = useState(null);
  // const [configsPacientesLoaded, setConfigsPacientesLoaded] = useState(false);

  /**
   * Carrega todos os tipos de utentes (fallback para serviço de configuração)
   */
  const carregarTiposUtentes = useCallback(async () => {
    try {
      const response = await configurationService.getTiposUtentes();
      
      
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
        setTiposUtentes([]);
        return [];
      }
      
      // Verificar se data é um array
      if (Array.isArray(data)) {
        setTiposUtentes(data);
        return data;
      } else {
        setTiposUtentes([]);
        return [];
      }
    } catch (error) {
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
        return provinciasData;
      } else {
        setProvincias([]);
        return [];
      }
    } catch (error) {
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
      setDistritos(distritosCache[provinciaId]);
      return distritosCache[provinciaId];
    }

    try {
      const response = await configurationService.getDistritosByProvincia(provinciaId);
      
      if (response.success && response.data) {
        setDistritos(response.data);
        
        // Adicionar ao cache
        setDistritosCache(prev => ({
          ...prev,
          [provinciaId]: response.data
        }));
        
        return response.data;
      } else {
        setDistritos([]);
        return [];
      }
    } catch (error) {
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
      setBairros(bairrosCache[distritoId]);
      return bairrosCache[distritoId];
    }

    try {
      const response = await configurationService.getBairrosByDistrito(distritoId);
      
      if (response.success && response.data) {
        setBairros(response.data);
        
        // Adicionar ao cache
        setBairrosCache(prev => ({
          ...prev,
          [distritoId]: response.data
        }));
        
        return response.data;
      } else {
        setBairros([]);
        return [];
      }
    } catch (error) {
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
      const response = await configurationService.getRacas();
      
      if (response.success && response.data) {
        setRacas(response.data);
        return response.data;
      } else {
        setRacas([]);
        return [];
      }
    } catch (error) {
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
      const response = await configurationService.getTiposDocumentos();
      
      // Verificar múltiplos formatos de resposta do backend
      const dados = response?.data?.data || response?.data || response;
      
      if (dados && Array.isArray(dados) && dados.length > 0) {
        setTiposDocumentos(dados);
        return dados;
      } else {
        setTiposDocumentos([]);
        return [];
      }
    } catch (error) {
      setTiposDocumentos([]);
      setError(error.message);
      return [];
    }
  }, []);

  /**
   * Carrega todas as unidades orgânicas
   */
  const carregarUnidadesOrganicas = useCallback(async () => {
    try {
      const response = await configurationService.getUnidadesOrganicas();
      
      // Verificar múltiplos formatos de resposta do backend
      const dados = response?.data?.data || response?.data || response;
      
      if (dados && Array.isArray(dados) && dados.length > 0) {
        setUnidadesOrganicas(dados);
        return dados;
      } else {
        setUnidadesOrganicas([]);
        return [];
      }
    } catch (error) {
      setUnidadesOrganicas([]);
      setError(error.message);
      return [];
    }
  }, []);

  /**
   * Carrega graus de parentesco do backend
   * Com fallback para dados padrão se backend não estiver disponível
   */
  const carregarGrausParentesco = useCallback(async () => {
    try {
      const response = await configurationService.getGrausParentesco();
      
      if (response.success && response.data) {
        setGrausParentesco(response.data);
        return response.data;
      } else {
        setGrausParentesco([]);
        return [];
      }
    } catch (error) {
      setGrausParentesco([]);
      return [];
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
    return null;
  }, []);

  /**
   * Carrega todas as configurações iniciais
   * Chamado automaticamente quando o hook é montado
   */
  const carregarTodasConfiguracoes = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (carregandoConfiguracoes) {
      return;
    }

    setCarregandoConfiguracoes(true);
    setLoading(true);
    setError(null);

    try {
      
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
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setCarregandoConfiguracoes(false);
    }
  }, [
    carregandoConfiguracoes,
    carregarTiposUtentes,
    carregarProvincias,
    carregarRacas,
    carregarUnidadesOrganicas,
    carregarTiposDocumentos,
    carregarGrausParentesco
  ]); // Inclui todas as funções usadas

  /**
   * Busca ID de tipo de utente por valor/nome
   * Útil para conversão de string para ID antes de enviar ao backend
   */
  const getTipoUtenteIdByValue = useCallback((value) => {
    if (!value) return null;
    
    // Verificar se tiposUtentes é um array válido
    if (!Array.isArray(tiposUtentes) || tiposUtentes.length === 0) {
      return null;
    }
    
    const tipo = tiposUtentes.find(t => 
      t.codigo === value || 
      t.nome?.toLowerCase() === value.toLowerCase() ||
      t.descricao?.toLowerCase() === value.toLowerCase()
    );
    
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
  // const validarConfiguracoes = useCallback(async () => {
  //   console.log('⚠️ validarConfiguracoes está deprecated. Use rotas individuais.');
  //   return null;
  // }, []);

  // Carregar configurações iniciais ao montar o hook (apenas uma vez)
  // useEffect(() => {
  //   if (!configsPacientesLoaded && !carregandoConfiguracoes) {
  //     carregarTodasConfiguracoes();
  //   }
  // }, []); // Array vazio para executar apenas uma vez

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
    // configuracoesPacientes,
    // configsPacientesLoaded,
    
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
