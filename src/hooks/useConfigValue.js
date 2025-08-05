/**
 * useConfigValue - Custom hook for accessing specific config values
 */
import { useConfig } from '../contexts/ConfigContext';

/**
 * Hook to get and set a specific configuration value
 * @param {string} key - Configuration key
 * @returns {[value, setValue]} - Current value and setter function
 */
export const useConfigValue = (key) => {
  const { config, setConfig } = useConfig();
  
  const value = config[key];
  const setValue = (newValue) => setConfig(key, newValue);
  
  return [value, setValue];
};

/**
 * Hook specifically for CouchDB URL management
 * @returns {[url, setUrl, isValid]} - URL, setter, and validation status
 */
export const useCouchDBUrl = () => {
  const { config, setCouchDBUrl, validateCouchDBUrl } = useConfig();
  
  const url = config.couchdbUrl;
  const isValid = validateCouchDBUrl(url);
  
  return [url, setCouchDBUrl, isValid];
};

/**
 * Hook for sync configuration
 * @returns {[syncConfig, setSyncEnabled, setSyncInterval]} - Sync settings and setters
 */
export const useSyncConfig = () => {
  const { config, setConfig } = useConfig();
  
  const syncConfig = {
    enabled: config.syncEnabled,
    interval: config.syncInterval
  };
  
  const setSyncEnabled = (enabled) => setConfig('syncEnabled', enabled);
  const setSyncInterval = (interval) => setConfig('syncInterval', interval);
  
  return [syncConfig, setSyncEnabled, setSyncInterval];
};

export default useConfigValue;
