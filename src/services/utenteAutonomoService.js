import axios from 'axios';

// URL base do serviço de pacientes (porta 8002)
const API_URL = 'http://196.3.100.216/api';

/**
 * Serviço para gerenciar utentes autônomos
 * Comunica com o patient-service na porta 8002
 */
class UtenteAutonomoService {
    
    /**
     * Buscar todos os utentes autônomos
     * GET /api/utentes-autonomos
     */
    async getAllUtentesAutonomos(params = {}) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/utentes-autonomos/`, {
                params: {
                    paginate: 'false', // Buscar todos sem paginação
                    ...params
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
                        
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data
                };
            }
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar utentes autônomos:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar utentes autônomos',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Criar novo utente autônomo
     * POST /api/utentes-autonomos
     */
    async createUtenteAutonomo(data) {
        try {
            
            const token = localStorage.getItem('token');
            
            const response = await axios.post(`${API_URL}/utentes-autonomos/`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao criar utente autônomo',
                errors: response.data.errors
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar utente autônomo:', error);
            console.error('❌ Response:', error.response?.data);
            console.error('❌ Detalhes completos do erro:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                message: error.response?.data?.message,
                errors: error.response?.data?.errors,
                fullData: error.response?.data,
                url: error.config?.url,
                method: error.config?.method,
                requestData: error.config?.data
            });
            
            // Log específico para erro 500 com genero
            if (error.response?.status === 500) {
                console.error('🚨 ERRO 500 - BACKEND INTERNO (CREATE):', {
                    generoEnviado: JSON.parse(error.config?.data || '{}').genero,
                    dadosCompletos: JSON.parse(error.config?.data || '{}'),
                    responseText: error.response?.data,
                    responseHeaders: error.response?.headers
                });
            }
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao criar utente autônomo',
                error: error.message,
                errors: error.response?.data?.errors
            };
        }
    }

    /**
     * Atualizar utente autônomo
     * PUT /api/utentes-autonomos/{id}
     */
    async updateUtenteAutonomo(id, data) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.put(`${API_URL}/utentes-autonomos/${id}`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao atualizar utente autônomo',
                errors: response.data.errors
            };
            
        } catch (error) {
            console.error('❌ Erro ao atualizar utente autônomo:', error);
            console.error('❌ Detalhes do erro:', {
                status: error.response?.status,
                message: error.response?.data?.message,
                errors: error.response?.data?.errors,
                data: error.response?.data,
                fullResponse: error.response,
                url: error.config?.url,
                method: error.config?.method,
                requestData: error.config?.data
            });
            
            // Log específico para erro 500 com genero
            if (error.response?.status === 500) {
                console.error('🚨 ERRO 500 - BACKEND INTERNO DETALHADO:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    generoEnviado: JSON.parse(error.config?.data || '{}').genero,
                    dadosCompletos: JSON.parse(error.config?.data || '{}'),
                    responseData: error.response?.data,
                    responseStatus: error.response?.status,
                    responseHeaders: error.response?.headers,
                    errorMessage: error.message,
                    // Tentar extrair stack trace do backend se disponível
                    backendError: error.response?.data?.error || error.response?.data?.exception || error.response?.data?.trace
                });
                
                // Se a resposta contém HTML (página de erro), vamos analisar
                if (typeof error.response?.data === 'string' && error.response.data.includes('<html>')) {
                    console.error('🚨 RESPOSTA HTML DE ERRO (provavelmente página de erro do Laravel)');
                    console.error('📄 Conteúdo da resposta (primeiros 1000 chars):', 
                        error.response.data.substring(0, 1000));
                }
            }
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao atualizar utente autônomo',
                error: error.message,
                errors: error.response?.data?.errors
            };
        }
    }

    /**
     * Buscar utente autônomo por ID
     * GET /api/utentes-autonomos/{id}
     */
    async getUtenteAutonomoById(id) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/utentes-autonomos/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
            
                    success: true,
                    data: response.data.data
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Utente autônomo não encontrado'
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar utente autônomo:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar utente autônomo',
                error: error.message
            };
        }
    }

    /**
     * Deletar utente autônomo
     * DELETE /api/utentes-autonomos/{id}
     */
    async deleteUtenteAutonomo(id) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.delete(`${API_URL}/utentes-autonomos/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    message: response.data.message
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao deletar utente autônomo'
            };
            
        } catch (error) {
            console.error('❌ Erro ao deletar utente autônomo:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao deletar utente autônomo',
                error: error.message
            };
        }
    }

    /**
     * Obter próximo NID disponível
     * GET /api/utentes-autonomos/next-nid
     */
    async getNextNID() {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/utentes-autonomos/next-nid`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao obter próximo NID'
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter próximo NID:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao obter próximo NID',
                error: error.message
            };
        }
    }

    /**
     * Alterar status do utente autônomo
     * PATCH /api/utentes-autonomos/{id}/status
     */
    async changeStatus(id, status) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.patch(`${API_URL}/utentes-autonomos/${id}/status`, 
                { status }, 
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao alterar status'
            };
            
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao alterar status',
                error: error.message
            };
        }
    }

    /**
     * Obter estatísticas de utentes autônomos
     * GET /api/utentes-autonomos/statistics
     */
    async getStatistics() {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/utentes-autonomos/statistics`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erro ao obter estatísticas'
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao obter estatísticas',
                error: error.message
            };
        }
    }
}

// Exportar instância única
const utenteAutonomoService = new UtenteAutonomoService();
export default utenteAutonomoService;
