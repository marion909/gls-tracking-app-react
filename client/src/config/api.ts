// API Configuration für Development und Production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
  : '/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  
  // Helper Funktion für API-Calls
  getFullUrl: (endpoint: string) => {
    if (process.env.NODE_ENV === 'production') {
      return `${API_BASE_URL}${endpoint}`;
    }
    return endpoint; // Im Development-Modus wird der Proxy verwendet
  }
};

export default apiConfig;
