/**
 * ConfigContext - React context for configuration management
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import configManager from '../services/ConfigService';

// Create the context
const ConfigContext = createContext();

/**
 * ConfigProvider component to wrap the app and provide config context
 */
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(configManager.getAll());

  useEffect(() => {
    // Add listener for config changes
    const handleConfigChange = (newConfig) => {
      setConfig({ ...newConfig });
    };

    configManager.addListener(handleConfigChange);

    // Cleanup listener on unmount
    return () => {
      configManager.removeListener(handleConfigChange);
    };
  }, []);

  const contextValue = {
    config,
    getConfig: configManager.get.bind(configManager),
    setConfig: configManager.set.bind(configManager),
    setMultipleConfig: configManager.setMultiple.bind(configManager),
    resetConfig: configManager.reset.bind(configManager),
    setCouchDBUrl: configManager.setCouchDBUrl.bind(configManager),
    validateCouchDBUrl: configManager.validateCouchDBUrl.bind(configManager),
    exportConfig: configManager.export.bind(configManager),
    importConfig: configManager.import.bind(configManager)
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Custom hook to use the config context
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export default ConfigContext;
