import axios from 'axios';

// Get token from localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Add request interceptor to include token in all requests
axios.interceptors.request.use(
    (config) => {
        console.log('🌐 [AXIOS REQUEST]', config.method?.toUpperCase(), config.url); // DEBUG
        
        const token = getToken();

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        console.error('❌ [AXIOS REQUEST ERROR]', error); // DEBUG
        return Promise.reject(error);
    }
);

// Add response interceptor to handle unauthorized errors
axios.interceptors.response.use(
    (response) => {
        console.log('✅ [AXIOS RESPONSE]', response.status, response.config.url); // DEBUG
        
        // Log detalhado da resposta para pacientes
        if (response.config.url && response.config.url.includes('pacientes')) {
            console.log('👥 [AXIOS PACIENTES] Response data:', response.data);
            console.log('👥 [AXIOS PACIENTES] Data type:', typeof response.data);
            console.log('👥 [AXIOS PACIENTES] Is array:', Array.isArray(response.data));
            console.log('👥 [AXIOS PACIENTES] Keys:', response.data && typeof response.data === 'object' ? Object.keys(response.data) : 'N/A');
        }
        
        // Verificar se algo mudou no localStorage após cada resposta
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
            const userData = JSON.parse(currentUser);
            console.log('👤 [USER CHECK AFTER RESPONSE] roles:', userData.roles, 'tipo:', userData.tipo_usuario); // DEBUG
        }
        
        return response;
    },
    (error) => {
        console.error('❌ [AXIOS RESPONSE ERROR]', error.response?.status, error.config?.url); // DEBUG
        
        if (error.response?.status === 401) {
            console.warn('🚨 [401 UNAUTHORIZED] Removendo token e user do localStorage'); // DEBUG
            
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axios;