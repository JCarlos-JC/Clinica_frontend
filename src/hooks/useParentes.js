import { useState, useCallback } from 'react';
import parenteService from '../services/parenteService';
import { message } from 'antd';

/**
 * Hook customizado para gerenciar parentes/acompanhantes de pacientes
 * Integra com o backend através do parenteService
 */
const useParentes = (pacienteNid) => {
  const [parentes, setParentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carrega todos os parentes de um paciente pelo NID
   */
  const carregarParentes = useCallback(async (nid = pacienteNid) => {
    if (!nid) {
      console.warn('⚠️ NID do paciente não fornecido');
      setParentes([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Carregando parentes do paciente NID: ${nid}...`);
      
      const response = await parenteService.getParentesByPacienteNid(nid);
      
      if (response.success) {
        // Verificar se tem dados
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Normalizar dados para o formato do frontend (camelCase)
          const parentesNormalizados = response.data.map(parente => ({
            id: parente.id,
            nome: parente.nome,
            grauParentesco: parente.grau_parentesco_id || parente.grauParentesco,
            grauParentescoNome: parente.grau_parentesco_nome || parente.grauParentescoNome,
            celular: parente.celular,
            celularAlternativo: parente.celular_alternativo || parente.celularAlternativo,
            pacienteNid: parente.paciente_nid || parente.pacienteNid || nid,
            createdAt: parente.created_at || parente.createdAt,
            updatedAt: parente.updated_at || parente.updatedAt
          }));
          
          console.log('✅ Parentes carregados:', parentesNormalizados);
          return parentesNormalizados;
        } else {
          // Sucesso mas sem dados - normal para pacientes sem parentes
          console.log('ℹ️ Paciente não possui parentes cadastrados');
          setParentes([]);
          return [];
        }
      } else {
        // Erro no service
        console.error('❌ Erro retornado pelo service:', response.message);
        setError(response.message || 'Erro ao carregar parentes');
        setParentes([]);
        return [];
      }
      
    } catch (error) {
      setError(error.message || 'Erro ao carregar parentes');
      setParentes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [pacienteNid]);

  /**
   */
  const criarParente = useCallback(async (nid, dadosParente) => {
    if (!nid) {
      message.error('NID do paciente é obrigatório');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📤 Criando parente para paciente NID: ${nid}`, dadosParente);
      
      const response = await parenteService.createParente(nid, dadosParente);
      
      if (response.success) {
        message.success(response.message || 'Acompanhante adicionado com sucesso!');
        
        // Normalizar dados do parente criado
        const parenteNormalizado = {
          id: response.data.id,
          nome: response.data.nome,
          grauParentesco: response.data.grau_parentesco_id || response.data.grauParentesco,
          grauParentescoNome: response.data.grau_parentesco_nome || response.data.grauParentescoNome,
          celular: response.data.celular,
          celularAlternativo: response.data.celular_alternativo || response.data.celularAlternativo,
          pacienteNid: response.data.paciente_nid || nid,
          createdAt: response.data.created_at || response.data.createdAt,
          updatedAt: response.data.updated_at || response.data.updatedAt
        };
        
        // Adicionar ao estado local
        setParentes(prev => [...prev, parenteNormalizado]);
        
        console.log('✅ Parente criado:', parenteNormalizado);
        return parenteNormalizado;
      } else {
        message.error(response.message || 'Erro ao adicionar acompanhante');
        setError(response.message);
        
        // Mostrar erros de validação se existirem
        if (response.errors) {
          Object.keys(response.errors).forEach(field => {
            const errorMessages = response.errors[field];
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach(msg => message.error(`${field}: ${msg}`));
            }
          });
        }
        
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao criar parente:', error);
      message.error('Erro ao adicionar acompanhante');
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza um parente existente
   */
  const atualizarParente = useCallback(async (parenteId, dadosParente) => {
    if (!parenteId) {
      message.error('ID do parente é obrigatório');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await parenteService.updateParente(parenteId, dadosParente);
      if (response.success) {
        message.success(response.message || 'Acompanhante atualizado com sucesso!');
        const parenteNormalizado = {
          id: response.data.id,
          nome: response.data.nome,
          grauParentesco: response.data.grau_parentesco_id || response.data.grauParentesco,
          grauParentescoNome: response.data.grau_parentesco_nome || response.data.grauParentescoNome,
          celular: response.data.celular,
          celularAlternativo: response.data.celular_alternativo || response.data.celularAlternativo,
          pacienteNid: response.data.paciente_nid || response.data.pacienteNid,
          createdAt: response.data.created_at || response.data.createdAt,
          updatedAt: response.data.updated_at || response.data.updatedAt
        };
        setParentes(prev => prev.map(p => p.id === parenteId ? parenteNormalizado : p));
        return parenteNormalizado;
      } else {
        message.error(response.message || 'Erro ao atualizar acompanhante');
        setError(response.message);
        if (response.errors) {
          Object.keys(response.errors).forEach(field => {
            const errorMessages = response.errors[field];
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach(msg => message.error(`${field}: ${msg}`));
            }
          });
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar parente:', error);
      message.error('Erro ao atualizar acompanhante');
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deleta um parente
   */
  const deletarParente = useCallback(async (parenteId) => {
    if (!parenteId) {
      message.error('ID do parente é obrigatório');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🗑️ Deletando parente ID: ${parenteId}...`);
      
      const response = await parenteService.deleteParente(parenteId);
      
      if (response.success) {
        message.success(response.message || 'Acompanhante removido com sucesso!');
        
        // Remover do estado local
        setParentes(prev => prev.filter(p => p.id !== parenteId));
        
        console.log('✅ Parente deletado');
        return true;
      } else {
        message.error(response.message || 'Erro ao remover acompanhante');
        setError(response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao deletar parente:', error);
      message.error('Erro ao remover acompanhante');
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca um parente específico por ID
   */
  const buscarParentePorId = useCallback(async (parenteId) => {
    if (!parenteId) {
      console.warn('⚠️ ID do parente não fornecido');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Buscando parente ID: ${parenteId}...`);
      
      const response = await parenteService.getParenteById(parenteId);
      
      if (response.success && response.data) {
        // Normalizar dados
        const parenteNormalizado = {
          id: response.data.id,
          nome: response.data.nome,
          grauParentesco: response.data.grau_parentesco_id || response.data.grauParentesco,
          grauParentescoNome: response.data.grau_parentesco_nome || response.data.grauParentescoNome,
          celular: response.data.celular,
          celularAlternativo: response.data.celular_alternativo || response.data.celularAlternativo,
          pacienteNid: response.data.paciente_nid || response.data.pacienteNid,
          createdAt: response.data.created_at || response.data.createdAt,
          updatedAt: response.data.updated_at || response.data.updatedAt
        };
        
        console.log('✅ Parente encontrado:', parenteNormalizado);
        return parenteNormalizado;
      } else {
        console.warn('⚠️ Parente não encontrado');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar parente:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Estado
    parentes,
    loading,
    error,
    
    // Funções CRUD
    carregarParentes,
    criarParente,
    atualizarParente,
    deletarParente,
    buscarParentePorId
  };
};

export default useParentes;
