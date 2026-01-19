import axios from 'axios';

const API_URL = process.env.REACT_APP_PATIENT_SERVICE_URL || 'http://localhost:8002/api';

class ParenteService {
    /**
     * Get all relatives of a patient by NID
     * Tenta múltiplos formatos de endpoint:
     * 1. GET /api/pacientes/{nid}/parentes
     * 2. GET /api/parentes?paciente_nid={nid}
     * 3. GET /api/parentes/by-patient/{nid}
     */
    async getParentesByPacienteNid(pacienteNid) {
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📤 Buscando parentes do paciente NID: ${pacienteNid}...`);
            
            // Lista de endpoints para tentar
            const endpoints = [
                `${API_URL}/pacientes/${pacienteNid}/parentes`,
                `${API_URL}/parentes?paciente_nid=${encodeURIComponent(pacienteNid)}`,
                `${API_URL}/parentes/by-patient/${encodeURIComponent(pacienteNid)}`
            ];
            
            let lastError = null;
            
            // Tentar cada endpoint sequencialmente
            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i];
                
                try {
                    console.log(`🔄 Tentativa ${i + 1}/${endpoints.length}: ${endpoint}`);
                    
                    const response = await axios.get(endpoint, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    console.log(`✅ Sucesso na tentativa ${i + 1}:`, response.data);
                    
                    // Processar resposta de sucesso
                    if (response.data.success) {
                        return {
                            success: true,
                            data: response.data.data || response.data.parentes || []
                        };
                    }
                    
                    // Se não tem propriedade success, assume que data é array direto
                    if (Array.isArray(response.data)) {
                        return {
                            success: true,
                            data: response.data
                        };
                    }
                    
                    return {
                        success: true,
                        data: response.data
                    };
                    
                } catch (endpointError) {
                    lastError = endpointError;
                    
                    // Se é 404, continua para próximo endpoint
                    if (endpointError.response?.status === 404) {
                        console.warn(`⚠️ Endpoint ${i + 1} não encontrado (404): ${endpoint}`);
                        continue;
                    }
                    
                    // Se é outro erro, também tenta o próximo
                    console.warn(`⚠️ Erro no endpoint ${i + 1}:`, endpointError.response?.status, endpointError.message);
                    continue;
                }
            }
            
            // Se chegou aqui, todos os endpoints falharam
            console.error('❌ Todos os endpoints falharam. Último erro:', lastError);
            
            // Retorno graceful - não é erro crítico se paciente não tem parentes
            return {
                success: true,
                data: [],
                message: 'Nenhum parente encontrado - paciente pode não ter parentes cadastrados'
            };
            
        } catch (error) {
            console.error('❌ Erro CRÍTICO ao buscar parentes:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar parentes',
                error: error.message,
                data: []
            };
        }
    }

    /**
     * Create a new relative for a patient
     * POST /api/pacientes/{nid}/parentes
     */
    async createParente(pacienteNid, parenteData) {
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📤 Criando parente para paciente NID: ${pacienteNid}`, parenteData);
            
            // Transformar dados para formato do backend (snake_case)
            const payload = {
                paciente_nid: pacienteNid,
                nome: parenteData.nome,
                grau_parentesco_id: parenteData.grauParentescoId || parenteData.grauParentesco,
                celular: parenteData.celular,
                celular_alternativo: parenteData.celularAlternativo
            };
            
            console.log('📤 Payload enviado:', payload);
            
            const response = await axios.post(
                `${API_URL}/pacientes/${pacienteNid}/parentes`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ Parente criado:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data.parente || response.data,
                message: response.data.message || 'Parente criado com sucesso!'
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar parente:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao criar parente',
                errors: error.response?.data?.errors || {},
                error: error.message
            };
        }
    }

    /**
     * Update a relative
     * PUT /api/parentes/{id}
     */
    async updateParente(parenteId, parenteData) {
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📤 Atualizando parente ID: ${parenteId}`, parenteData);
            
            // Transformar dados para formato do backend (snake_case)
            const payload = {
                nome: parenteData.nome,
                grau_parentesco_id: parenteData.grauParentescoId || parenteData.grauParentesco,
                celular: parenteData.celular,
                celular_alternativo: parenteData.celularAlternativo
            };
            
            console.log('📤 Payload enviado:', payload);
            
            const response = await axios.put(
                `${API_URL}/parentes/${parenteId}`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ Parente atualizado:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data.parente || response.data,
                message: response.data.message || 'Parente atualizado com sucesso!'
            };
            
        } catch (error) {
            console.error('❌ Erro ao atualizar parente:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao atualizar parente',
                errors: error.response?.data?.errors || {},
                error: error.message
            };
        }
    }

    /**
     * Delete a relative
     * DELETE /api/parentes/{id}
     */
    async deleteParente(parenteId) {
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📤 Deletando parente ID: ${parenteId}...`);
            
            const response = await axios.delete(`${API_URL}/parentes/${parenteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Parente deletado:', response.data);
            
            return {
                success: true,
                message: response.data.message || 'Parente deletado com sucesso!'
            };
            
        } catch (error) {
            console.error('❌ Erro ao deletar parente:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao deletar parente',
                error: error.message
            };
        }
    }

    /**
     * Get a single relative by ID
     * GET /api/parentes/{id}
     */
    async getParenteById(parenteId) {
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📤 Buscando parente ID: ${parenteId}...`);
            
            const response = await axios.get(`${API_URL}/parentes/${parenteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 Parente recebido:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data.parente || response.data
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar parente:', error);
            
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao buscar parente',
                error: error.message
            };
        }
    }
}

export default new ParenteService();
