import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import utenteAutonomoService from '../services/utenteAutonomoService';

/**
 * Hook para gerenciar utentes autônomos
 * Baseado no controller UtenteAutonomoController do backend Laravel
 */
const useUtentesAutonomos = () => {
  const [utentesAutonomos, setUtentesAutonomos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carrega todos os utentes autônomos do backend
   */
  const carregarUtentesAutonomos = useCallback(async (filtros = {}) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📤 Carregando utentes autônomos...');
      
      const response = await utenteAutonomoService.getAllUtentesAutonomos(filtros);
      
      console.log('📥 Resposta de utentes autônomos:', response);
      
      if (response.success && response.data) {
        const dados = Array.isArray(response.data) ? response.data : [];
        setUtentesAutonomos(dados);
        console.log('✅ Utentes autônomos carregados:', dados.length);
        return dados;
      } else {
        console.warn('⚠️ Erro ao carregar utentes autônomos:', response.message);
        setUtentesAutonomos([]);
        message.error(response.message || 'Erro ao carregar utentes autônomos');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar utentes autônomos:', error);
      setError(error.message);
      message.error('Erro ao carregar utentes autônomos');
      setUtentesAutonomos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza um utente autônomo existente
   */
  const atualizarUtenteAutonomo = useCallback(async (id, dadosUtente) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📤 Atualizando utente autônomo:', { id, dadosUtente });
      
      const response = await utenteAutonomoService.updateUtenteAutonomo(id, dadosUtente);
      
      if (response.success) {
        console.log('✅ Utente autônomo atualizado:', response.data);
        
        // Atualizar a lista local
        setUtentesAutonomos(prev => 
          prev.map(utente => 
            utente.id === id ? response.data : utente
          )
        );
        
        message.success(response.message || 'Utente autônomo atualizado com sucesso!');
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
          message.error(response.message || 'Erro ao atualizar utente autônomo');
        }
        throw new Error(response.message || 'Erro ao atualizar utente autônomo');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar utente autônomo:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exclui um utente autônomo
   */
  const excluirUtenteAutonomo = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📤 Excluindo utente autônomo:', id);
      
      const response = await utenteAutonomoService.deleteUtenteAutonomo(id);
      
      if (response.success) {
        console.log('✅ Utente autônomo excluído');
        
        // Remover da lista local
        setUtentesAutonomos(prev => prev.filter(utente => utente.id !== id));
        
        message.success(response.message || 'Utente autônomo excluído com sucesso!');
        return true;
      } else {
        throw new Error(response.data.message || 'Erro ao excluir utente autônomo');
      }
    } catch (error) {
      console.error('❌ Erro ao excluir utente autônomo:', error);
      setError(error.message);
      message.error(error.message || 'Erro ao excluir utente autônomo');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Altera o status de um utente autônomo
   */
  const alterarStatusUtente = useCallback(async (id, novoStatus) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📤 Alterando status do utente autônomo:', { id, novoStatus });
      
      const response = await utenteAutonomoService.changeStatus(id, novoStatus);
      
      if (response.success) {
        console.log('✅ Status alterado:', response.data);
        
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
      console.log('📤 Obtendo próximo NID...');
      
      const response = await utenteAutonomoService.getNextNID();
      
      if (response.success) {
        console.log('✅ Próximo NID:', response.data.next_nid);
        return response.data.next_nid;
      } else {
        throw new Error(response.message || 'Erro ao obter próximo NID');
      }
    } catch (error) {
      console.error('❌ Erro ao obter próximo NID:', error);
      // Gerar um NID temporário baseado no timestamp se o backend falhar
      const ano = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-3);
      return `UT${timestamp}/${ano}`;
    }
  }, []);

  // Carregar utentes autônomos ao inicializar o hook
  useEffect(() => {
    carregarUtentesAutonomos();
  }, [carregarUtentesAutonomos]);

    // Função para criar utente autônomo
    const criarUtenteAutonomo = useCallback(async (dadosUtente) => {
      setLoading(true);
      setError(null);
  
      try {
        const response = await utenteAutonomoService.createUtenteAutonomo(dadosUtente);
        if (response.success) {
          setUtentesAutonomos(prev => [response.data, ...prev]);
          message.success(response.message || 'Utente autônomo criado com sucesso!');
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
            message.error(response.message || 'Erro ao criar utente autônomo');
          }
          throw new Error(response.message || 'Erro ao criar utente autônomo');
        }
      } catch (error) {
        message.error('Erro ao criar utente autônomo');
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