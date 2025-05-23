import axios from 'axios';
import { API_CONFIG } from '../config';

// Cria uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Desabilitado a menos que seja necessário
});

// Função para definir o token de autenticação
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Interceptor para tratamento de erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Erros 4xx/5xx
      console.error('Erro na resposta da API:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
    } else {
      // Erro ao configurar a requisição
      console.error('Erro ao configurar requisição:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
