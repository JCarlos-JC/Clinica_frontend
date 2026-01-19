import axios from 'axios';

// URL base do serviço de configuração (porta 8004)
const API_URL = process.env.REACT_APP_CONFIG_SERVICE_URL || 'http://localhost:8004/api';

/**
 * Serviço para buscar dados de referência externa do Configuration Service (porta 8004)
 * Usado para preencher dropdowns e selects no frontend
 */
class ConfigurationService {
    
    /**
     * Buscar todas as raças disponíveis
     * GET /api/racas
     */
    async getRacas() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando raças do Configuration Service (porta 8004)...');
            
            const response = await axios.get(`${API_URL}/racas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Raças recebidas do Configuration Service:', response.data);
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data || response.data.racas || []
                };
            }
            
            return {
                success: true,
                data: Array.isArray(response.data) ? response.data : []
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar raças do Configuration Service:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar raças',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get all tipos de utentes
     * GET /api/tipos-utentes
     */
    async getTiposUtentes() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando tipos de utentes do Configuration Service (porta 8004)...');
            
            const response = await axios.get(`${API_URL}/tipos-utentes`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Tipos de utentes recebidos do Configuration Service:', response.data);
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data || response.data.tipos_utentes || []
                };
            }
            
            return {
                success: true,
                data: Array.isArray(response.data) ? response.data : []
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar tipos de utentes do Configuration Service:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar tipos de utentes',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Buscar todas as unidades orgânicas disponíveis
     * GET /api/unidades-organicas
     */
    async getUnidadesOrganicas() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando unidades orgânicas do Configuration Service (porta 8004)...');
            
            const response = await axios.get(`${API_URL}/unidades-organicas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Unidades orgânicas recebidas do Configuration Service:', response.data);
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data || response.data.unidades_organicas || []
                };
            }
            
            return {
                success: true,
                data: Array.isArray(response.data) ? response.data : []
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar unidades orgânicas do Configuration Service:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar unidades orgânicas',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Buscar todos os tipos de documento disponíveis
     * GET /api/tipos-documento
     */
    async getTiposDocumento() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando tipos de documento do Configuration Service (porta 8004)...');
            
            const response = await axios.get(`${API_URL}/tipos-documento`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Tipos de documento recebidos do Configuration Service:', response.data);
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data || response.data.tipos_documento || []
                };
            }
            
            return {
                success: true,
                data: Array.isArray(response.data) ? response.data : []
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar tipos de documento do Configuration Service:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar tipos de documento',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get all províncias
     * GET /api/provincias
     */
    async getProvincias() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando províncias do Configuration Service (porta 8004)...');
            
            const response = await axios.get(`${API_URL}/provincias`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Províncias recebidas do Configuration Service:', response.data);
            
            if (response.data.success) {
                return {
                    success: true,
                    data: response.data.data || response.data.provincias || []
                };
            }
            
            return {
                success: true,
                data: Array.isArray(response.data) ? response.data : []
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar províncias do Configuration Service:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar províncias',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get distritos by província
     * GET /api/distritos?provincia_id={id}
     */
    async getDistritosByProvincia(provinciaId) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando distritos da província:', provinciaId);
            //implementar a rota correcta dos distritos com relacionamento provincia
            const response = await axios.get(`${API_URL}/distritos`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                params: {
                    provincia_id: provinciaId
                }
            });
            
            console.log('📥 Distritos recebidos:', response.data);
            
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
            console.error('❌ Erro ao buscar distritos:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar distritos',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get bairros by distrito
     * GET /api/bairros?distrito_id={id}
     */
    async getBairrosByDistrito(distritoId) {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando bairros do distrito:', distritoId);
            
            //implemtentar a rota certa do relacionamento
            const response = await axios.get(`${API_URL}/bairros`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                params: {
                    distrito_id: distritoId
                }
            });
            
            console.log('📥 Bairros recebidos:', response.data);
            
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
            console.error('❌ Erro ao buscar bairros:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar bairros',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get all raças
     * GET /api/racas
     */


    /**
     * Get all tipos de documentos
     * GET /api/tipos-documentos
     */
    async getTiposDocumentos() {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_URL}/tipos-documentos`, {
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
            console.error('❌ Erro ao buscar tipos de documentos:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar tipos de documentos',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Get all unidades orgânicas
     * GET /api/unidades-organicas
     */


    /**
     * Get all graus de parentesco
     * GET /api/graus-parentesco
     */
    async getGrausParentesco() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('📤 Buscando graus de parentesco...');
            
            const response = await axios.get(`${API_URL}/graus-parentesco`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ Resposta da API graus-parentesco:', response.data);

            return {
                success: true,
                message: 'Graus de parentesco carregados com sucesso',
                data: response.data?.data || response.data || []
            };
        } catch (error) {
            console.error('❌ Erro ao buscar graus de parentesco:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar graus de parentesco',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Buscar todas as configurações de uma vez (método otimizado)
     * Este é o método PRINCIPAL para usar no frontend
     */
    async getAllConfigurations() {
        try {
            const token = localStorage.getItem('token');
            
            console.log('🚀 Buscando TODAS as configurações do Configuration Service (porta 8004)...');
            
            // Tentar buscar endpoint consolidado primeiro (se existir)
            try {
                const response = await axios.get(`${API_URL}/configuracoes/completas`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📥 Configurações completas recebidas do endpoint consolidado:', response.data);
                
                if (response.data.success) {
                    return {
                        success: true,
                        data: response.data.data
                    };
                }
            } catch (consolidatedError) {
                console.log('⚠️ Endpoint consolidado não disponível, buscando individualmente...');
            }
            
            // Se endpoint consolidado não existir, buscar individualmente
            console.log('🔄 Buscando configurações individualmente...');
            
            const [racasRes, tiposRes, unidadesRes, docRes, provRes] = await Promise.all([
                this.getRacas(),
                this.getTiposUtentes(),
                this.getUnidadesOrganicas(),
                this.getTiposDocumento(),
                this.getProvincias()
            ]);
            
            console.log('📊 Resultados das buscas individuais:', {
                racas: { success: racasRes.success, count: racasRes.data?.length || 0 },
                tipos_utentes: { success: tiposRes.success, count: tiposRes.data?.length || 0 },
                unidades_organicas: { success: unidadesRes.success, count: unidadesRes.data?.length || 0 },
                tipos_documento: { success: docRes.success, count: docRes.data?.length || 0 },
                provincias: { success: provRes.success, count: provRes.data?.length || 0 }
            });
            
            return {
                success: true,
                data: {
                    racas: racasRes.success ? racasRes.data : [],
                    tipos_utentes: tiposRes.success ? tiposRes.data : [],
                    unidades_organicas: unidadesRes.success ? unidadesRes.data : [],
                    tipos_documento: docRes.success ? docRes.data : [],
                    provincias: provRes.success ? provRes.data : []
                }
            };
            
        } catch (error) {
            console.error('❌ Erro CRÍTICO ao buscar configurações do Configuration Service:', error);
            
            return {
                success: false,
                message: 'Erro ao carregar configurações do servidor',
                error: error.message,
                data: {
                    racas: [],
                    tipos_utentes: [],
                    unidades_organicas: [],
                    tipos_documento: [],
                    provincias: []
                }
            };
        }
    }
}

const configurationServiceInstance = new ConfigurationService();

export default configurationServiceInstance;
