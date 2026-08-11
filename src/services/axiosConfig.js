import axios from 'axios';
import {
    acquireApiSlot,
    enhanceApiError,
    getAuthToken,
    handleExpiredSession,
    isAuthRoute,
    prepareApiRequestConfig,
    releaseApiSlot,
    retryApiRequest,
    shouldRetryApiRequest,
} from './apiConfig';

// Get token from localStorage
const getToken = () => {
    return getAuthToken();
};

// Add request interceptor to include token in all requests
axios.interceptors.request.use(
    async (config) => {
        prepareApiRequestConfig(config);
        const token = getToken();

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return acquireApiSlot(config);
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
        
        releaseApiSlot(response.config);
        return response;
    },
    async (error) => {
        releaseApiSlot(error.config);

        if (shouldRetryApiRequest(error)) {
            return retryApiRequest(axios, error);
        }

        enhanceApiError(error);

        if (error.response?.status === 401 && !error.config?._skipAuthRedirect && !isAuthRoute(error.config?.url)) {
            handleExpiredSession(error.response?.data?.error || error.response?.data?.message);
        }

        return Promise.reject(error);
    }
);

export default axios;