import axios from 'axios';
import { User, LoginData, RegisterData, AuthResponse, ApiResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token ist abgelaufen oder ungültig
      console.log('🔒 Token abgelaufen - Automatisches Logout');
      
      // Token entfernen
      localStorage.removeItem('token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Zum Login weiterleiten
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const authService = {
  async login(data: LoginData): Promise<AuthResponse['data']> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data.data;
  },

  async register(data: RegisterData): Promise<AuthResponse['data']> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (!response.data.data) {
      throw new Error('No user data');
    }
    return response.data.data;
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    return response.data.data;
  },
};

export default api;
