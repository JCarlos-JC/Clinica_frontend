import api from './api';
import { API_ENDPOINTS } from './apiConfig';

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Login user
   * @param {string} nid - National ID
   * @param {string} password - User password
   * @returns {Promise} Login response with token
   */
  async login(nid, password) {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
      nid,
      password,
    });
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
    }
    
    return response.data;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user
   */
  async me() {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  },

  /**
   * Refresh token
   */
  async refresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await api.post(API_ENDPOINTS.AUTH.REFRESH, {
      refresh_token: refreshToken,
    });
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

/**
 * Users Service
 */
export const userService = {
  async list(params = {}) {
    const response = await api.get(API_ENDPOINTS.USERS.LIST, { params });
    return response.data;
  },

  async create(data) {
    const response = await api.post(API_ENDPOINTS.USERS.CREATE, data);
    return response.data;
  },

  async show(id) {
    const response = await api.get(API_ENDPOINTS.USERS.SHOW(id));
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(API_ENDPOINTS.USERS.UPDATE(id), data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(API_ENDPOINTS.USERS.DELETE(id));
    return response.data;
  },

  async logs(id) {
    const response = await api.get(API_ENDPOINTS.USERS.LOGS(id));
    return response.data;
  },
};

/**
 * Configuration Service
 */
export const configService = {
  // Location
  async getProvincias() {
    const response = await api.get(API_ENDPOINTS.CONFIG.PROVINCIAS);
    return response.data;
  },

  async getDistritos() {
    const response = await api.get(API_ENDPOINTS.CONFIG.DISTRITOS);
    return response.data;
  },

  async getDistritosByProvincia(provinciaId) {
    const response = await api.get(API_ENDPOINTS.CONFIG.DISTRITOS_BY_PROVINCIA(provinciaId));
    return response.data;
  },

  async getBairros() {
    const response = await api.get(API_ENDPOINTS.CONFIG.BAIRROS);
    return response.data;
  },

  async getBairrosByDistrito(distritoId) {
    const response = await api.get(API_ENDPOINTS.CONFIG.BAIRROS_BY_DISTRITO(distritoId));
    return response.data;
  },

  // Registration Types
  async getTiposDocumento() {
    const response = await api.get(API_ENDPOINTS.CONFIG.TIPOS_DOCUMENTO);
    return response.data;
  },

  async getTiposUtente() {
    const response = await api.get(API_ENDPOINTS.CONFIG.TIPOS_UTENTE);
    return response.data;
  },

  async getRacas() {
    const response = await api.get(API_ENDPOINTS.CONFIG.RACAS);
    return response.data;
  },

  async getGrausParentesco() {
    const response = await api.get(API_ENDPOINTS.CONFIG.GRAUS_PARENTESCO);
    return response.data;
  },

  async getUnidadesOrganica() {
    const response = await api.get(API_ENDPOINTS.CONFIG.UNIDADES_ORGANICA);
    return response.data;
  },

  // Medical
  async getEspecialidades() {
    const response = await api.get(API_ENDPOINTS.CONFIG.ESPECIALIDADES);
    return response.data;
  },

  async getTiposConsulta() {
    const response = await api.get(API_ENDPOINTS.CONFIG.TIPOS_CONSULTA);
    return response.data;
  },

  async getEstadosConsulta() {
    const response = await api.get(API_ENDPOINTS.CONFIG.ESTADOS_CONSULTA);
    return response.data;
  },

  async getClassificacoesRisco() {
    const response = await api.get(API_ENDPOINTS.CONFIG.CLASSIFICACOES_RISCO);
    return response.data;
  },

  async getEstadosUrgencia() {
    const response = await api.get(API_ENDPOINTS.CONFIG.ESTADOS_URGENCIA);
    return response.data;
  },

  async getFuncoesEspecialidade() {
    const response = await api.get(API_ENDPOINTS.CONFIG.FUNCOES_ESPECIALIDADE);
    return response.data;
  },

  // Pharmacy
  async getFormasMedicamento() {
    const response = await api.get(API_ENDPOINTS.CONFIG.FORMAS_MEDICAMENTO);
    return response.data;
  },

  async getViasAdministracao() {
    const response = await api.get(API_ENDPOINTS.CONFIG.VIAS_ADMINISTRACAO);
    return response.data;
  },

  async getMedicamentos() {
    const response = await api.get(API_ENDPOINTS.CONFIG.MEDICAMENTOS);
    return response.data;
  },

  async getMedicamento(id) {
    const response = await api.get(API_ENDPOINTS.CONFIG.MEDICAMENTO(id));
    return response.data;
  },

  // Laboratory
  async getTiposExame() {
    const response = await api.get(API_ENDPOINTS.CONFIG.TIPOS_EXAME);
    return response.data;
  },

  async getTiposExameByCategoria(categoria) {
    const response = await api.get(API_ENDPOINTS.CONFIG.TIPOS_EXAME_BY_CATEGORIA(categoria));
    return response.data;
  },

  // Finance
  async getMetodosPagamento() {
    const response = await api.get(API_ENDPOINTS.CONFIG.METODOS_PAGAMENTO);
    return response.data;
  },
};

/**
 * Triagem Service
 */
export const triagemService = {
  async list(params = {}) {
    const response = await api.get(API_ENDPOINTS.TRIAGENS.LIST, { params });
    return response.data;
  },

  async create(data) {
    const response = await api.post(API_ENDPOINTS.TRIAGENS.CREATE, data);
    return response.data;
  },

  async show(id) {
    const response = await api.get(API_ENDPOINTS.TRIAGENS.SHOW(id));
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(API_ENDPOINTS.TRIAGENS.UPDATE(id), data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(API_ENDPOINTS.TRIAGENS.DELETE(id));
    return response.data;
  },

  async getPendentes(params = {}) {
    const response = await api.get(API_ENDPOINTS.TRIAGENS.PENDENTES, { params });
    return response.data;
  },

  async getConcluidas(params = {}) {
    const response = await api.get(API_ENDPOINTS.TRIAGENS.CONCLUIDAS, { params });
    return response.data;
  },

  async getEstatisticas(params = {}) {
    const response = await api.get(API_ENDPOINTS.TRIAGENS.ESTATISTICAS, { params });
    return response.data;
  },

  async realizar(id, data) {
    const response = await api.post(API_ENDPOINTS.TRIAGENS.REALIZAR(id), data);
    return response.data;
  },

  async agendarConsulta(id, data) {
    const response = await api.post(API_ENDPOINTS.TRIAGENS.AGENDAR_CONSULTA(id), data);
    return response.data;
  },
};

/**
 * Sinais Vitais Service
 */
export const sinaisVitaisService = {
  async list(params = {}) {
    const response = await api.get(API_ENDPOINTS.SINAIS_VITAIS.LIST, { params });
    return response.data;
  },

  async create(data) {
    const response = await api.post(API_ENDPOINTS.SINAIS_VITAIS.CREATE, data);
    return response.data;
  },

  async show(id) {
    const response = await api.get(API_ENDPOINTS.SINAIS_VITAIS.SHOW(id));
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(API_ENDPOINTS.SINAIS_VITAIS.UPDATE(id), data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(API_ENDPOINTS.SINAIS_VITAIS.DELETE(id));
    return response.data;
  },

  async getByTriagem(triagemId) {
    const response = await api.get(API_ENDPOINTS.SINAIS_VITAIS.BY_TRIAGEM(triagemId));
    return response.data;
  },

  async getCriticos(params = {}) {
    const response = await api.get(API_ENDPOINTS.SINAIS_VITAIS.CRITICOS, { params });
    return response.data;
  },

  async getEstatisticas(params = {}) {
    const response = await api.get(API_ENDPOINTS.SINAIS_VITAIS.ESTATISTICAS, { params });
    return response.data;
  },

  async calcularIMC(peso, altura) {
    const response = await api.post(API_ENDPOINTS.SINAIS_VITAIS.CALCULAR_IMC, {
      peso,
      altura,
    });
    return response.data;
  },
};

/**
 * Agendamentos Service
 */
export const agendamentoService = {
  async list(params = {}) {
    const response = await api.get(API_ENDPOINTS.AGENDAMENTOS.LIST, { params });
    return response.data;
  },

  async show(id) {
    const response = await api.get(API_ENDPOINTS.AGENDAMENTOS.SHOW(id));
    return response.data;
  },

  async getAguardando(params = {}) {
    const response = await api.get(API_ENDPOINTS.AGENDAMENTOS.AGUARDANDO, { params });
    return response.data;
  },

  async getHoje(params = {}) {
    const response = await api.get(API_ENDPOINTS.AGENDAMENTOS.HOJE, { params });
    return response.data;
  },

  async confirmar(id) {
    const response = await api.post(API_ENDPOINTS.AGENDAMENTOS.CONFIRMAR(id));
    return response.data;
  },

  async cancelar(id, motivo) {
    const response = await api.post(API_ENDPOINTS.AGENDAMENTOS.CANCELAR(id), { motivo });
    return response.data;
  },

  async remarcar(id, data) {
    const response = await api.patch(API_ENDPOINTS.AGENDAMENTOS.REMARCAR(id), data);
    return response.data;
  },
};

/**
 * Roles Service
 */
export const roleService = {
  async list() {
    const response = await api.get(API_ENDPOINTS.ROLES.LIST);
    return response.data;
  },

  async create(data) {
    const response = await api.post(API_ENDPOINTS.ROLES.CREATE, data);
    return response.data;
  },

  async show(id) {
    const response = await api.get(API_ENDPOINTS.ROLES.SHOW(id));
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(API_ENDPOINTS.ROLES.UPDATE(id), data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(API_ENDPOINTS.ROLES.DELETE(id));
    return response.data;
  },
};

/**
 * Permissions Service
 */
export const permissionService = {
  async list() {
    const response = await api.get(API_ENDPOINTS.PERMISSIONS.LIST);
    return response.data;
  },
};

// Export all services
export default {
  auth: authService,
  user: userService,
  config: configService,
  triagem: triagemService,
  sinaisVitais: sinaisVitaisService,
  agendamento: agendamentoService,
  role: roleService,
  permission: permissionService,
};
