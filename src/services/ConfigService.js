/**
 * ConfigService - Service for managing application configuration
 */

// Default configuration values
const DEFAULT_CONFIG = {
  couchdbUrl: '/db', // Use Vite proxy path for development
  couchdbUsername: '',
  couchdbPassword: '',
  syncEnabled: false,
  syncInterval: 30000, // 30 seconds
  appName: 'commad',
  theme: 'light'
};

// Configuration storage key
const CONFIG_STORAGE_KEY = 'commad-config';

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
    this.listeners = new Set();
  }

  /**
   * Load configuration from localStorage or use defaults
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (storedConfig) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.warn('Error loading config from localStorage:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving config to localStorage:', error);
    }
  }

  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @returns {*} Configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   */
  set(key, value) {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    console.log(`Config updated: ${key} = ${JSON.stringify(value)} (was: ${JSON.stringify(oldValue)})`);
    
    this.saveConfig();
  }

  /**
   * Set multiple configuration values
   * @param {Object} updates - Object containing key-value pairs to update
   */
  setMultiple(updates) {
    const changes = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      const oldValue = this.config[key];
      this.config[key] = value;
      changes[key] = { old: oldValue, new: value };
    });
    
    console.log('Config updated:', changes);
    
    this.saveConfig();
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...DEFAULT_CONFIG };
    console.log('Config reset to defaults');
    this.saveConfig();
  }

  /**
   * Export configuration as JSON string
   * @returns {string} JSON string of configuration
   */
  export() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   * @param {string} jsonString - JSON string containing configuration
   */
  import(jsonString) {
    try {
      const importedConfig = JSON.parse(jsonString);
      this.config = { ...DEFAULT_CONFIG, ...importedConfig };
      console.log('Config imported successfully');
      this.saveConfig();
    } catch (error) {
      console.error('Error importing config:', error);
      throw new Error('Invalid JSON configuration');
    }
  }

  /**
   * Add a listener for configuration changes
   * @param {Function} listener - Callback function to call when config changes
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a configuration change listener
   * @param {Function} listener - Listener function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of configuration changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Error calling config listener:', error);
      }
    });
  }

  /**
   * Validate CouchDB URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateCouchDBUrl(url) {
    // Allow relative paths for proxy (like '/db')
    if (url.startsWith('/')) {
      return true;
    }
    
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Set CouchDB URL with validation
   * @param {string} url - CouchDB URL
   */
  setCouchDBUrl(url) {
    if (!this.validateCouchDBUrl(url)) {
      throw new Error('Invalid CouchDB URL format. Must be a valid HTTP or HTTPS URL.');
    }
    this.set('couchdbUrl', url);
  }
}

// Create a singleton instance
const configManager = new ConfigManager();

// Export the singleton instance
export default configManager;

// Export individual methods for convenience
export const {
  get: getConfig,
  set: setConfig,
  getAll: getAllConfig,
  reset: resetConfig,
  setCouchDBUrl,
  validateCouchDBUrl
} = configManager;
