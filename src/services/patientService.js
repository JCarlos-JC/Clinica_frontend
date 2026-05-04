import axios from 'axios';

const API_URL = 'http://196.3.100.216/api';

class PatientService {
    constructor() {
        // Cache para configurações
        this.configCache = null;
        this.configCacheExpiry = null;
        this.configCacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        // Controle de requisições em andamento
        this.pendingConfigRequest = null;
        
        // Debounce para evitar múltiplas chamadas rápidas
        this.configDebounceTimeout = null;
    }
    /**
     * Get all patients
     * GET /api/pacientes
     */
    async getAllPatients(params = {}) {
        try {
            const token = localStorage.getItem('token');
            
            // ...existing code...
            
            const response = await axios.get(`${API_URL}/pacientes`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                params: params // search, per_page, page, etc.
            });
            
            // ...existing code...
            
            // ...existing code...
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data,
                    pagination: response.data.pagination || null
                };
            }
            
            // Se for array direto
            if (Array.isArray(response.data)) {
                return {
                    success: true,
                    data: response.data
                };
            }
            
            // Se tiver data diretamente
            if (response.data.data) {
                return {
                    success: true,
                    data: response.data.data,
                    pagination: response.data.meta || response.data.pagination || null
                };
            }
            
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            // ...existing code...
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar pacientes',
                error: error.message,
                data: [] // Retornar array vazio para não quebrar o frontend
            };
        }
    }
    
    /**
     * Get patient by ID
     * GET /api/pacientes/{id}
     */
    async getPatientById(id) {
        try {
            const token = localStorage.getItem('token');
            
            // ...existing code...
            
            const response = await axios.get(`${API_URL}/pacientes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            // ...existing code...
            
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            }
            
            if (response.data.data) {
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
            // ...existing code...
            
            return {
                success: false,
                message: error.response?.data?.message || 'Paciente não encontrado',
                error: error.message
            };
        }
    }
    
    /**
     * Search patients by NID, nome, apelido
     * GET /api/pacientes?search={query}
     */
    async searchPatients(query) {
        try {
            const token = localStorage.getItem('token');
            
            // ...existing code...
            
            const response = await axios.get(`${API_URL}/pacientes/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                params: {
                    search: query
                }
            });
            
            // ...existing code...
            
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data
                };
            }
            
            if (response.data.data) {
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
            console.error('❌ Erro ao buscar pacientes:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar pacientes',
                error: error.message
            };
        }
    }
    
    /**
     * Create new patient
     * POST /api/pacientes
     */
    async createPatient(patientData) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Criando paciente:', patientData); // DEBUG
            
            const response = await axios.post(`${API_URL}/pacientes/`, patientData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Paciente criado:', response.data); // DEBUG
            
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Paciente criado com sucesso'
                };
            }
            
            if (response.data.data) {
                return {
                    success: true,
                    data: response.data.data,
                    message: 'Paciente criado com sucesso'
                };
            }
            
            return {
                success: true,
                data: response.data,
                message: 'Paciente criado com sucesso'
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar paciente:', error);
            console.error('❌ Response completa:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers
            });
            
            console.error('❌ DADOS COMPLETOS DO ERRO (expandir para ver):', JSON.stringify(error.response?.data, null, 2));
            
            const errorData = error.response?.data || {};
            console.error('❌ Detalhamento do erro:', {
                message: errorData.message,
                errors: errorData.errors,
                validation: errorData.validation,
                exception: errorData.exception
            });
            
            return {
                success: false,
                message: errorData.message || 'Erro ao criar paciente',
                errors: errorData.errors || null,
                error: error.message
            };
        }
    }
    
    /**
     * Update patient
     * PUT /api/pacientes/{id}
     */
    async updatePatient(id, patientData) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 PatientService - Atualizando paciente ID:', id);
            console.log('📦 PatientService - Dados enviados:', patientData);
            
            // 🔍 DEBUG CRÍTICO: Verificar campos específicos antes de enviar
            console.log('🎯 PatientService - CAMPOS CRÍTICOS:', {
                tipo_utente_id: {
                    valor: patientData.tipo_utente_id,
                    tipo: typeof patientData.tipo_utente_id,
                    existe: 'tipo_utente_id' in patientData
                },
                unidade_organica_id: {
                    valor: patientData.unidade_organica_id,
                    tipo: typeof patientData.unidade_organica_id,
                    existe: 'unidade_organica_id' in patientData
                }
            });
            
            const response = await axios.put(`${API_URL}/pacientes/${id}`, patientData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 PatientService - Resposta do backend:', response.data);
            
            // 🔍 DEBUG: Verificar o que o backend retornou
            console.log('🎯 PatientService - DADOS RETORNADOS:', {
                'response.data.data?.tipo_utente_id': response.data.data?.tipo_utente_id,
                'response.data.data?.unidade_organica_id': response.data.data?.unidade_organica_id,
                status: response.data.status,
                message: response.data.message
            });
            
            if (response.data.status === 'success') {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Paciente atualizado com sucesso'
                };
            }
            
            if (response.data.data) {
                return {
                    success: true,
                    data: response.data.data,
                    message: 'Paciente atualizado com sucesso'
                };
            }
            
            return {
                success: true,
                data: response.data,
                message: 'Paciente atualizado com sucesso'
            };
            
        } catch (error) {
            console.error('❌ Erro ao atualizar paciente:', error);
            console.error('📋 Detalhes do erro 422:', {
                status: error.response?.status,
                data: error.response?.data,
                errors: error.response?.data?.errors,
                message: error.response?.data?.message
            });
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao atualizar paciente',
                errors: error.response?.data?.errors || null,
                error: error.message
            };
        }
    }
    
    /**
     * Delete patient
     * DELETE /api/pacientes/{id}
     */
    async deletePatient(id) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Deletando paciente ID:', id); // DEBUG
            
            const response = await axios.delete(`${API_URL}/pacientes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Paciente deletado:', response.data); // DEBUG
            
            return {
                success: true,
                message: response.data.message || 'Paciente deletado com sucesso'
            };
            
        } catch (error) {
            console.error('❌ Erro ao deletar paciente:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao deletar paciente',
                error: error.message
            };
        }
    }
    
    /**
     * Get patient statistics
     * GET /api/pacientes/estatisticas
     */
    async getStatistics() {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/pacientes/estatisticas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.status === 'success') {
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
            console.error('❌ Erro ao buscar estatísticas:', error);
            
            return {
                success: false,
                message: 'Erro ao buscar estatísticas',
                error: error.message
            };
        }
    }

    // REMOVIDO: getConfigurationOptions e _makeConfigRequest
    // Agora usamos rotas individuais para cada tipo de configuração:
    // - GET /pacientes/racas
    // - GET /pacientes/tipos-utentes
    // - GET /pacientes/unidades-organicas
    // - GET /pacientes/tipos-documentos
    // - GET /pacientes/provincias
    // - GET /pacientes/distritos
    // - GET /pacientes/bairros
    // - GET /pacientes/graus-parentesco

    /**
     * Método para limpar o cache de configurações (útil para forçar nova busca)
     */
    clearConfigCache() {
        this.configCache = null;
        this.configCacheExpiry = null;
        this.pendingConfigRequest = null;
        console.log('🗑️ Cache de configurações limpo');
    }

    /**
     * Método para verificar se o cache está válido
     */
    hasValidConfigCache(params = {}) {
        const cacheKey = JSON.stringify(params);
        const now = Date.now();
        return this.configCache && 
               this.configCache[cacheKey] && 
               this.configCacheExpiry && 
               now < this.configCacheExpiry;
    }

    // REMOVIDO: getConfigurationOptionsDebounced
    // Use rotas individuais para carregar configurações
    
    /**
     * Validate data against patient service configurations
     * POST /api/pacientes/validate-references
     */
    async validateReferences(data) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Validando referências com o serviço de pacientes:', data);
            
            const response = await axios.post(`${API_URL}/pacientes/validate-references`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data && response.data.success) {
                console.log('✅ Referências válidas');
                return {
                    success: true,
                    data: response.data.data
                };
            }

            return {
                success: false,
                errors: response.data.errors || {},
                message: response.data.message || 'Erro de validação'
            };
            
        } catch (error) {
            console.error('❌ Erro ao validar referências:', error);
            
            return {
                success: false,
                message: 'Erro ao validar referências',
                error: error.message,
                errors: error.response?.data?.errors || {}
            };
        }
    }

    /**
     * Confirmar solicitação de exame no Patient-Service
     * PUT /api/solicitacoes-exames/{id}/confirmar
     * @param {number} solicitacaoId - ID da solicitação criada pelo Consultation-Service
     * @param {Object} payload - Dados adicionais de confirmação (opcional)
     * @returns {Promise}
     */
    async confirmarSolicitacaoExame(solicitacaoId, payload = {}) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            console.log('📤 [PatientService] Confirmando solicitação de exame ID:', solicitacaoId);

            const response = await axios.put(
                `${API_URL}/solicitacoes-exames/${solicitacaoId}/confirmar`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log('✅ [PatientService] Solicitação confirmada:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ [PatientService] Erro ao confirmar solicitação de exame:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao confirmar solicitação de exame',
                error: error.message
            };
        }
    }
}

const patientServiceInstance = new PatientService();

export default patientServiceInstance;
