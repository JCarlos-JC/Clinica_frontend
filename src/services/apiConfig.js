// API Configuration for React Frontend
// Base URL for API Gateway
export const API_BASE_URL = "http://196.3.100.216";

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
        LIST: '/api/usuarios',
        CREATE: '/api/usuarios',
        SHOW: (id) => `/api/usuarios/${id}`,
        UPDATE: (id) => `/api/usuarios/${id}`,
        DELETE: (id) => `/api/usuarios/${id}`,
        LOGS: (id) => `/api/usuarios/${id}/logs`,
    },

    // Configuration
    CONFIG: {
        // Location
        PROVINCIAS: '/api/configuracao/localizacao/provincias',
        DISTRITOS: '/api/configuracao/localizacao/distritos',
        DISTRITOS_BY_PROVINCIA: (id) => `/api/configuracao/localizacao/provincias/${id}/distritos`,
        BAIRROS: '/api/configuracao/localizacao/bairros',
        BAIRROS_BY_DISTRITO: (id) => `/api/configuracao/localizacao/distritos/${id}/bairros`,

        // Registration Types
        TIPOS_DOCUMENTO: '/api/configuracao/cadastro/tipos-documento',
        TIPOS_UTENTE: '/api/configuracao/cadastro/tipos-utente',
        RACAS: '/api/configuracao/cadastro/racas',
        GRAUS_PARENTESCO: '/api/configuracao/cadastro/graus-parentesco',
        UNIDADES_ORGANICA: '/api/configuracao/cadastro/unidades-organica',

        // Medical
        ESPECIALIDADES: '/api/configuracao/consultas/especialidades',
        TIPOS_CONSULTA: '/api/configuracao/consultas/tipos-consulta',
        ESTADOS_CONSULTA: '/api/configuracao/consultas/estados-consulta',
        CLASSIFICACOES_RISCO: '/api/configuracao/consultas/classificacoes-risco',
        ESTADOS_URGENCIA: '/api/configuracao/consultas/estados-urgencia',
        FUNCOES_ESPECIALIDADE: '/api/configuracao/consultas/funcoes-especialidade',

        // Pharmacy
        FORMAS_MEDICAMENTO: '/api/configuracao/farmacia/formas-medicamento',
        VIAS_ADMINISTRACAO: '/api/configuracao/farmacia/vias-administracao',
        MEDICAMENTOS: '/api/configuracao/farmacia/medicamentos',
        MEDICAMENTO: (id) => `/api/configuracao/farmacia/medicamentos/${id}`,

        // Laboratory
        TIPOS_EXAME: '/api/configuracao/laboratorio/tipos-exame',
        TIPOS_EXAME_BY_CATEGORIA: (categoria) => `/api/configuracao/laboratorio/tipos-exame/categoria/${categoria}`,

        // Finance
        METODOS_PAGAMENTO: '/api/configuracao/financeiro/metodos-pagamento',
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
        LIST: '/api/perfis',
        CREATE: '/api/perfis',
        SHOW: (id) => `/api/perfis/${id}`,
        UPDATE: (id) => `/api/perfis/${id}`,
        DELETE: (id) => `/api/perfis/${id}`,
    },

    PERMISSIONS: {
        LIST: '/api/permissoes',
    },
};

export default API_ENDPOINTS;
