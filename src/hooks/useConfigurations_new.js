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
          data = [];
        }
      } else if (Array.isArray(response)) {
        // Resposta direta como array
        data = response;
      } else {
        data = [];
      }
      
      if (data && data.length > 0) {
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
        setProvincias(response.data);
        return response.data;
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
      setError(error.message);
      message.error('Erro ao carregar tipos de documentos');
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
   */
  const carregarConfiguracoesPacientes = useCallback(async () => {
    try {
      
      const response = await patientService.getConfigurationOptions();
      
      if (response.success && response.data) {
        setConfiguracoesPacientes(response.data);
        setConfigsPacientesLoaded(true);
        
        // Se as configurações do serviço de pacientes têm raças, usar essas
        if (response.data.racas && Array.isArray(response.data.racas)) {
          setRacas(response.data.racas);
        }
        
        // Se as configurações do serviço de pacientes têm tipos de utentes, usar esses
        if (response.data.tipos_utentes && Array.isArray(response.data.tipos_utentes)) {
          setTiposUtentes(response.data.tipos_utentes);
        }
        
        // Se as configurações do serviço de pacientes têm províncias, usar essas
        if (response.data.provincias && Array.isArray(response.data.provincias)) {
          setProvincias(response.data.provincias);
        }
        
        // Se as configurações do serviço de pacientes têm unidades orgânicas, usar essas
        if (response.data.unidades_organicas && Array.isArray(response.data.unidades_organicas)) {
          setUnidadesOrganicas(response.data.unidades_organicas);
        }
        
        return response.data;
      } else {
        setConfigsPacientesLoaded(false);
        return null;
      }
    } catch (error) {
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
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    carregarConfiguracoesPacientes,
    carregarTiposUtentes,
    carregarProvincias,
    carregarRacas,
    carregarUnidadesOrganicas,
    carregarTiposDocumentos,
    carregarGrausParentesco
  ]);

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
   * Valida configurações com o serviço de pacientes
   */
  const validarConfiguracoes = useCallback(async () => {
    try {
      
      const response = await patientService.getConfigurationOptions();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
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