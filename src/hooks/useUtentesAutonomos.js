import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import utenteAutonomoService from '../services/utenteAutonomoService';

/**
 * Hook para gerenciar utentes autónomos
 * Baseado no controller UtenteAutonomoController do backend Laravel
 */
const useUtentesAutonomos = () => {
  const [utentesAutonomos, setUtentesAutonomos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carrega todos os utentes autónomos do backend
   */
  const carregarUtentesAutonomos = useCallback(async (filtros = {}) => {
    setLoading(true);
    setError(null);

    try {      
      const response = await utenteAutonomoService.getAllUtentesAutonomos(filtros);
      
      
      if (response.success && response.data) {
        const dados = Array.isArray(response.data) ? response.data : [];
        setUtentesAutonomos(dados);
        return dados;
      } else {
        console.warn('⚠️ Erro ao carregar utentes autónomos:', response.message);
        setUtentesAutonomos([]);
        message.error(response.message || 'Erro ao carregar utentes autónomos');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar utentes autónomos:', error);
      setError(error.message);
      message.error('Erro ao carregar utentes autónomos');
      setUtentesAutonomos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza um utente autónomo existente
   */
  const atualizarUtenteAutonomo = useCallback(async (id, dadosUtente) => {
    setLoading(true);
    setError(null);

    try {      
      const response = await utenteAutonomoService.updateUtenteAutonomo(id, dadosUtente);
      
      if (response.success) {
        
        // Atualizar a lista local
        setUtentesAutonomos(prev => 
          prev.map(utente => 
            utente.id === id ? response.data : utente
          )
        );
        
        message.success(response.message || 'Utente autónomo atualizado com sucesso!');
        return response.data;
      } else {
        if (response.errors) {
          // Erros de validação
          Object.keys(response.errors).forEach(field => {
            const fieldErrors = Array.isArray(response.errors[field]) ? response.errors[field] : [response.errors[field]];
            fieldErrors.forEach(msg => {
              message.error(`${field}: ${msg}`);
            });
          });
        } else {
          message.error(response.message || 'Erro ao atualizar utente autónomo');
        }
        throw new Error(response.message || 'Erro ao atualizar utente autónomo');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar utente autónomo:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exclui um utente autónomo
   */
  const excluirUtenteAutonomo = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {      
      const response = await utenteAutonomoService.deleteUtenteAutonomo(id);
      
      if (response.success) {
        
        // Remover da lista local
        setUtentesAutonomos(prev => prev.filter(utente => utente.id !== id));
        
        message.success(response.message || 'Utente autónomo excluído com sucesso!');
        return true;
      } else {
        throw new Error(response.data.message || 'Erro ao excluir utente autónomo');
      }
    } catch (error) {
      console.error('❌ Erro ao excluir utente autónomo:', error);
      setError(error.message);
      message.error(error.message || 'Erro ao excluir utente autónomo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Altera o status de um utente autónomo
   */
  const alterarStatusUtente = useCallback(async (id, novoStatus) => {
    setLoading(true);
    setError(null);

    try {      
      const response = await utenteAutonomoService.changeStatus(id, novoStatus);
      
      if (response.success) {
        
        // Atualizar a lista local
        setUtentesAutonomos(prev => 
          prev.map(utente => 
            utente.id === id ? { ...utente, status: novoStatus } : utente
          )
        );
        
        message.success(response.message || 'Status alterado com sucesso!');
        return response.data;
      } else {
        throw new Error(response.message || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      setError(error.message);
      message.error(error.message || 'Erro ao alterar status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtém o próximo NID disponível
   */
  const obterProximoNID = useCallback(async () => {
    try {      
      const response = await utenteAutonomoService.getNextNID();
      
      if (response.success) {
        return response.data.next_nid;
      } else {
        throw new Error(response.message || 'Erro ao obter próximo NID');
      }
    } catch (error) {
      const msg = error.message || 'Erro ao obter próximo NID';
      message.error(msg);
      throw error;
    }
  }, []);

  // Carregar utentes autónomos ao inicializar o hook
  useEffect(() => {
    carregarUtentesAutonomos();
  }, [carregarUtentesAutonomos]);

    // Função para criar utente autónomo
    const criarUtenteAutonomo = useCallback(async (dadosUtente) => {
      setLoading(true);
      setError(null);
  
      try {
        const response = await utenteAutonomoService.createUtenteAutonomo(dadosUtente);
        if (response.success) {
          setUtentesAutonomos(prev => [response.data, ...prev]);
          message.success(response.message || 'Utente autónomo criado com sucesso!');
          return response.data;
        } else {
          if (response.errors) {
            Object.keys(response.errors).forEach(field => {
              const fieldErrors = Array.isArray(response.errors[field]) ? response.errors[field] : [response.errors[field]];
              fieldErrors.forEach(msg => {
                message.error(`${field}: ${msg}`);
              });
            });
          } else {
            message.error(response.message || 'Erro ao criar utente autónomo');
          }
          throw new Error(response.message || 'Erro ao criar utente autónomo');
        }
      } catch (error) {
        message.error('Erro ao criar utente autónomo');
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    }, []);
  
    return {
      utentesAutonomos,
      loading,
      error,
      carregarUtentesAutonomos,
      criarUtenteAutonomo,
      atualizarUtenteAutonomo,
      excluirUtenteAutonomo,
      alterarStatusUtente,
      obterProximoNID,
    };
  };
  export default useUtentesAutonomos;