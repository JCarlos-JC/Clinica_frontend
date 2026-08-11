import axios from 'axios';
import {
  API_BASE_URL,
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

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    prepareApiRequestConfig(config);
    const token = getAuthToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return acquireApiSlot(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle expired sessions consistently.
api.interceptors.response.use(
  (response) => {
    releaseApiSlot(response.config);
    return response;
  },
  async (error) => {
    releaseApiSlot(error.config);

    if (shouldRetryApiRequest(error)) {
      return retryApiRequest(api, error);
    }

    enhanceApiError(error);
    if (error.response?.status === 401 && !error.config?._skipAuthRedirect && !isAuthRoute(error.config?.url)) {
      handleExpiredSession(error.response?.data?.error || error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

export default api;
