import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to dynamically inject the Supabase JWT
apiClient.interceptors.request.use(
  (config) => {
    const session = useAuthStore.getState().session;
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for centralized API error handling/toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const addToast = useToastStore.getState().addToast;
    
    // Check if network is down or request timed out
    if (!error.response) {
      addToast('Cannot connect to the analytics server. Please ensure the backend services are running.', 'error');
    } else {
      const status = error.response.status;
      const message = error.response.data?.details || error.response.data?.error || 'An unexpected API error occurred.';
      
      // We trigger toasts globally for severe server/authorization issues, but let pages handle validation errors (400, 409) if they wish
      if (status === 500) {
        addToast(`Server Error: ${message}`, 'error');
      } else if (status === 401) {
        addToast('Session expired. Please log in again.', 'warning');
        useAuthStore.getState().signOut();
      } else if (status === 403) {
        addToast('Access denied: Insufficient role permissions.', 'error');
      }
    }
    
    return Promise.reject(error);
  }
);
