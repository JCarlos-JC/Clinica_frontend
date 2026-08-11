import api from './api';
import { normalizeApiData, normalizeApiList } from './apiConfig';

const unwrap = (response) => response?.data || {};
const errorResult = (error, fallbackMessage) => ({
    success: false,
    message: error.response?.data?.message || fallbackMessage,
    error: error.message,
    errors: error.response?.data?.errors,
    status: error.response?.status,
    data: [],
});

class UtenteAutonomoService {
    async getAllUtentesAutonomos(params = {}) {
        try {
            const response = await api.get('/api/pacientes/utentes-autonomos', {
                params: { paginate: 'false', ...params },
            });
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiList(payload),
                pagination: payload.pagination || payload.meta || normalizeApiData(payload)?.meta,
                message: payload.message,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao buscar utentes autonomos');
        }
    }

    async createUtenteAutonomo(data) {
        try {
            const response = await api.post('/api/pacientes/utentes-autonomos', data);
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload),
                message: payload.message || 'Utente autonomo criado com sucesso.',
                errors: payload.errors,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao criar utente autonomo');
        }
    }

    async updateUtenteAutonomo(id, data) {
        try {
            const response = await api.put(`/api/pacientes/utentes-autonomos/${id}`, data);
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload),
                message: payload.message || 'Utente autonomo atualizado com sucesso.',
                errors: payload.errors,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao atualizar utente autonomo');
        }
    }

    async getUtenteAutonomoById(id) {
        try {
            const response = await api.get(`/api/pacientes/utentes-autonomos/${id}`);
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload),
                message: payload.message,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao buscar utente autonomo');
        }
    }

    async deleteUtenteAutonomo(id) {
        try {
            const response = await api.delete(`/api/pacientes/utentes-autonomos/${id}`);
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                message: payload.message || 'Utente autonomo removido com sucesso.',
            };
        } catch (error) {
            return errorResult(error, 'Erro ao remover utente autonomo');
        }
    }

    async getNextNID() {
        try {
            const response = await api.get('/api/pacientes/utentes-autonomos/next-nid');
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload),
                message: payload.message,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao obter proximo NID');
        }
    }

    async changeStatus(id, status) {
        try {
            const response = await api.patch(`/api/pacientes/utentes-autonomos/${id}/status`, { status });
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload),
                message: payload.message || 'Status alterado com sucesso.',
            };
        } catch (error) {
            return errorResult(error, 'Erro ao alterar status');
        }
    }

    async getStatistics() {
        try {
            const response = await api.get('/api/pacientes/utentes-autonomos/statistics');
            const payload = unwrap(response);
            return {
                success: payload.success !== false,
                data: normalizeApiData(payload, {}),
                message: payload.message,
            };
        } catch (error) {
            return errorResult(error, 'Erro ao obter estatisticas');
        }
    }
}

const utenteAutonomoService = new UtenteAutonomoService();
export default utenteAutonomoService;
