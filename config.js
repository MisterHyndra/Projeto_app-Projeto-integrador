// Configuração do ambiente
export const API_CONFIG = {
  // Altere para o IP da sua máquina na rede local
  // No Windows, execute 'ipconfig' no prompt de comando e procure por 'IPv4'
  // Exemplo: 'http://192.168.1.100:3000'
  BASE_URL: 'http://192.168.1.2:3000',
  
  // Configurações de timeout (em milissegundos)
  TIMEOUT: 10000,
};

// Exemplo de uso:
// import { API_CONFIG } from './config';
// const api = axios.create({
//   baseURL: API_CONFIG.BASE_URL,
//   timeout: API_CONFIG.TIMEOUT
// });
