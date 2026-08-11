import { clearRequestCache } from './requestCache';
// API Configuration for React Frontend
// Base URL for API Gateway
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || (process.env.REACT_APP_API_URL || 'http://196.3.100.216/api').replace(/\/api\/?$/, '')).replace(/\/$/, '');
export const API_BASE = `${API_BASE_URL}/api`;


const DEFAULT_API_TIMEOUT = Number(process.env.REACT_APP_API_TIMEOUT || 10000);
const DEFAULT_API_RETRIES = Number(process.env.REACT_APP_API_RETRIES || 0);
const MAX_PARALLEL_API_REQUESTS = Number(process.env.REACT_APP_MAX_PARALLEL_API_REQUESTS || 2);
const RETRY_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

let activeApiRequests = 0;
const pendingApiQueue = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const releaseNextApiRequest = () => {
    if (activeApiRequests > 0) activeApiRequests -= 1;
    const next = pendingApiQueue.shift();
    if (next) next();
};

export const prepareApiRequestConfig = (config = {}) => {
    config.timeout = config.timeout || DEFAULT_API_TIMEOUT;
    config.headers = config.headers || {};
    config.metadata = {
        ...(config.metadata || {}),
        startedAt: Date.now(),
    };
    return config;
};

export const acquireApiSlot = async (config = {}) => {
    if (config._skipQueue) return config;

    if (activeApiRequests >= MAX_PARALLEL_API_REQUESTS) {
        await new Promise((resolve) => pendingApiQueue.push(resolve));
    }

    activeApiRequests += 1;
    config._releaseApiSlot = releaseNextApiRequest;
    return config;
};

export const releaseApiSlot = (config = {}) => {
    if (typeof config._releaseApiSlot !== 'function') return;
    const release = config._releaseApiSlot;
    delete config._releaseApiSlot;
    release();
};

const requestMethod = (config = {}) => String(config.method || 'get').toLowerCase();

export const isReadOnlyRequest = (config = {}) => ['get', 'head', 'options'].includes(requestMethod(config));

export const shouldRetryApiRequest = (error) => {
    const config = error?.config || {};
    if (config._noRetry || !isReadOnlyRequest(config) || isAuthRoute(config.url)) return false;

    const retryCount = config._retryCount || 0;
    if (retryCount >= DEFAULT_API_RETRIES) return false;

    const status = error?.response?.status;
    return !status || RETRY_STATUS_CODES.has(status);
};

export const retryApiRequest = async (client, error) => {
    const config = error.config;
    config._retryCount = (config._retryCount || 0) + 1;
    const delay = Math.min(1200, 300 * config._retryCount);
    await sleep(delay);
    return client(config);
};

export const getApiErrorMessage = (error, fallback = 'Não foi possível comunicar com o servidor. Tente novamente.') => {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error?.code === 'ECONNABORTED') return 'O servidor demorou demasiado para responder. Tente novamente.';
    if (!error?.response) return 'Não foi possível comunicar com o servidor. Verifique a ligação.';
    return fallback;
};

export const enhanceApiError = (error) => {
    if (error && !error.userMessage) {
        error.userMessage = getApiErrorMessage(error);
    }
    return error;
};

export const getAuthToken = () => localStorage.getItem('access_token') || localStorage.getItem('token');

export const clearAuthStorage = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    clearRequestCache();
};

export const isAuthRoute = (url = '') => /\/api\/auth\/(login|logout|refresh|me)\/?$/.test(String(url));

let sessionRedirecting = false;

export const handleExpiredSession = (reason = 'Sessão expirada. Faça login novamente.') => {
    if (sessionRedirecting) return;
    sessionRedirecting = true;

    clearAuthStorage();

    try {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason } }));
    } catch {
        // Older browsers may not support CustomEvent in every context.
    }

    const currentPath = window.location.pathname || '/';
    const isLoginPage = currentPath === '/' || currentPath === '/login';

    if (isLoginPage) {
        window.location.reload();
        return;
    }

    window.location.replace('/login');
};

export const authHeaders = (extra = {}) => {
    const token = getAuthToken();

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
};

export const normalizeApiData = (payload, fallback = null) => {
    if (payload?.data !== undefined) return payload.data;
    if (payload?.items !== undefined) return payload.items;
    if (payload?.results !== undefined) return payload.results;
    return payload ?? fallback;
};

export const normalizeApiList = (payload) => {
    const data = normalizeApiData(payload, []);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;

    return [];
};


// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
        ME: '/api/auth/me',
    },

    // Users
    USERS: {
        LIST: '/api/users',
        CREATE: '/api/users',
        SHOW: (id) => `/api/users/${id}`,
        UPDATE: (id) => `/api/users/${id}`,
        DELETE: (id) => `/api/users/${id}`,
        LOGS: (id) => `/api/users/${id}/logs`,
    },

    // Configuration
    CONFIG: {
        // Location
        PROVINCIAS: '/api/provincias',
        DISTRITOS: '/api/distritos',
        DISTRITOS_BY_PROVINCIA: (id) => `/api/provincias/${id}/distritos`,
        BAIRROS: '/api/bairros',
        BAIRROS_BY_DISTRITO: (id) => `/api/distritos/${id}/bairros`,

        // Registration Types
        TIPOS_DOCUMENTO: '/api/tipos-documentos',
        TIPOS_UTENTE: '/api/pacientes/tipos-utentes',
        RACAS: '/api/racas',
        GRAUS_PARENTESCO: '/api/graus-parentesco',
        UNIDADES_ORGANICA: '/api/unidades-organicas',
        UNIDADES_ORGANICAS: '/api/unidades-organicas',

        // Medical
        ESPECIALIDADES: '/api/especialidades',
        TIPOS_CONSULTA: '/api/tipos-consulta',
        ESTADOS_CONSULTA: '/api/estados-consulta',
        CLASSIFICACOES_RISCO: '/api/classificacoes-risco',
        ESTADOS_URGENCIA: '/api/estados-urgencia',
        FUNCOES_ESPECIALIDADE: '/api/funcoes-especialidade',

        // Pharmacy
        FORMAS_MEDICAMENTO: '/api/formas-medicamento',
        VIAS_ADMINISTRACAO: '/api/vias-administracao',
        MEDICAMENTOS: '/api/medicamentos',
        MEDICAMENTO: (id) => `/api/medicamentos/${id}`,

        // Laboratory
        TIPOS_EXAME: '/api/tipos-exame',
        TIPOS_EXAME_BY_CATEGORIA: (categoria) => `/api/tipos-exame/categoria/${categoria}`,

        // Finance
        METODOS_PAGAMENTO: '/api/metodos-pagamento',
    },

    // Triages
    TRIAGENS: {
        LIST: '/api/triagens',
        CREATE: '/api/triagens',
        SHOW: (id) => `/api/triagens/${id}`,
        UPDATE: (id) => `/api/triagens/${id}`,
        DELETE: (id) => `/api/triagens/${id}`,
        PENDENTES: '/api/triagens/pendentes',
        CONCLUIDAS: '/api/triagens/concluidas',
        ESTATISTICAS: '/api/triagens/estatisticas',
        REALIZAR: (id) => `/api/triagens/${id}/realizar`,
        AGENDAR_CONSULTA: (id) => `/api/triagens/${id}/agendar-consulta`,
    },

    // Agendamentos
    AGENDAMENTOS: {
        LIST: '/api/agendamentos',
        SHOW: (id) => `/api/agendamentos/${id}`,
        AGUARDANDO: '/api/agendamentos/aguardando',
        HOJE: '/api/agendamentos/hoje',
        CONFIRMAR: (id) => `/api/agendamentos/${id}/confirmar`,
        CANCELAR: (id) => `/api/agendamentos/${id}/cancelar`,
        REMARCAR: (id) => `/api/agendamentos/${id}/remarcar`,
    },

    // Sinais Vitais
    SINAIS_VITAIS: {
        LIST: '/api/sinais-vitais',
        CREATE: '/api/sinais-vitais',
        SHOW: (id) => `/api/sinais-vitais/${id}`,
        UPDATE: (id) => `/api/sinais-vitais/${id}`,
        DELETE: (id) => `/api/sinais-vitais/${id}`,
        BY_TRIAGEM: (triagemId) => `/api/sinais-vitais/triagem/${triagemId}`,
        CRITICOS: '/api/sinais-vitais/criticos',
        ESTATISTICAS: '/api/sinais-vitais/estatisticas',
        CALCULAR_IMC: '/api/sinais-vitais/calcular-imc',
    },

    // Roles & Permissions
    ROLES: {
        LIST: '/api/roles',
        CREATE: '/api/roles',
        SHOW: (id) => `/api/roles/${id}`,
        UPDATE: (id) => `/api/roles/${id}`,
        DELETE: (id) => `/api/roles/${id}`,
    },

    PERMISSIONS: {
        LIST: '/api/permissoes',
    },
};

export default API_ENDPOINTS;
