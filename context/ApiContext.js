import React, { createContext, useState, useEffect } from 'react';
import * as Network from 'expo-network';

export const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  useEffect(() => {
    const getApiBaseUrl = async () => {
      const networkState = await Network.getNetworkStateAsync();
      const ip = networkState.ipv4Address;
      setApiBaseUrl(`http://${ip}:3001`);
    };
    getApiBaseUrl();
  }, []);

  return (
    <ApiContext.Provider value={{ apiBaseUrl }}>
      {children}
    </ApiContext.Provider>
  );
};
