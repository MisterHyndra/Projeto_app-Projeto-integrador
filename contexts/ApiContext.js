import React, { createContext, useEffect, useState } from 'react';

export const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  useEffect(() => {
    // Usar um endereço IP fixo em vez de detectar automaticamente
    // Isso resolve problemas de conectividade em alguns dispositivos
    setApiBaseUrl('http://192.168.1.2:3000');
  }, []);

  return (
    <ApiContext.Provider value={{ apiBaseUrl }}>
      {children}
    </ApiContext.Provider>
  );
};
