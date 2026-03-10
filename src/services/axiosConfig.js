import axios from 'axios';

// Get token from localStorage
const getToken = () => {
    return localStorage.getItem('token');
};

// Add request interceptor to include token in all requests
axios.interceptors.request.use(
    (config) => {
        // ...existing code...
        
        const token = getToken();

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        // ...existing code...
        return Promise.reject(error);
    }
);

// Add response interceptor to handle unauthorized errors
axios.interceptors.response.use(
    (response) => {
        // ...existing code...
        
        // Log detalhado da resposta para pacientes
        // ...existing code...
        
        // Verificar se algo mudou no localStorage após cada resposta
        // ...existing code...
        
        return response;
    },
    (error) => {
        // ...existing code...
        
        // ...existing code...

        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axios;