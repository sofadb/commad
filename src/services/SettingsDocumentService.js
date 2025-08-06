/**
 * SettingsDocumentService - Service for managing settings as YAML document
 */
import configManager from './ConfigService.js';

// YAML helper functions
const yamlStringify = (obj) => {
  const lines = [];
  
  const addComment = (comment) => {
    lines.push(`# ${comment}`);
  };
  
  const addValue = (key, value, comment = null) => {
    if (comment) {
      lines.push(`# ${comment}`);
    }
    
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  };
  
  addComment('Commad Application Settings');
  addComment('Edit these values and press Ctrl+S to apply changes');
  addComment('');
  
  addComment('CouchDB Configuration');
  addValue('couchdbUrl', obj.couchdbUrl, 'CouchDB server URL (use "/db" for Vite proxy)');
  addValue('couchdbUsername', obj.couchdbUsername, 'CouchDB username (optional)');
  addValue('couchdbPassword', obj.couchdbPassword, 'CouchDB password (optional)');
  lines.push('');
  
  addComment('Synchronization Settings');
  addValue('syncEnabled', obj.syncEnabled, 'Enable/disable synchronization');
  addValue('syncInterval', obj.syncInterval, 'Sync interval in milliseconds');
  lines.push('');
  
  addComment('Application Settings');
  addValue('appName', obj.appName, 'Application name');
  addValue('theme', obj.theme, 'UI theme preference (light/dark)');
  lines.push('');
  
  addComment('Console Tools');
  addValue('enableConsoleTools', obj.enableConsoleTools || false, 'Enable console tools in production');
  
  return lines.join('\n');
};

const yamlParse = (yamlString) => {
  const config = {};
  const lines = yamlString.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }
    
    // Parse key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    
    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Parse different types
    if (value === 'true') {
      config[key] = true;
    } else if (value === 'false') {
      config[key] = false;
    } else if (!isNaN(value) && value !== '') {
      config[key] = Number(value);
    } else {
      config[key] = value;
    }
  }
  
  return config;
};

class SettingsDocumentService {
  constructor() {
    this.storageKey = 'commad-settings-document';
    this.listeners = new Set();
  }

  /**
   * Get the settings document as YAML string
   * @returns {Object} Document object with content and metadata
   */
  getDocument() {
    const config = configManager.getAll();
    const content = yamlStringify(config);
    
    return {
      id: 'settings',
      title: 'Settings',
      content: content,
      type: 'settings',
      icon: '⚙️',
      lastModified: new Date().toISOString(),
      isReadonly: false,
      noAutosave: true, // Disable autosave for settings
      saveShortcut: 'Ctrl+S' // Custom save shortcut
    };
  }

  /**
   * Save the settings document and apply changes
   * @param {string} yamlContent - YAML content to save
   * @returns {Promise<boolean>} Success status
   */
  async saveDocument(yamlContent) {
    try {
      // Parse YAML content
      const newConfig = yamlParse(yamlContent);
      
      // Validate required fields
      const requiredFields = ['couchdbUrl', 'syncEnabled', 'syncInterval', 'appName', 'theme'];
      const missingFields = requiredFields.filter(field => !(field in newConfig));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Validate specific values
      if (typeof newConfig.syncEnabled !== 'boolean') {
        throw new Error('syncEnabled must be true or false');
      }
      
      if (typeof newConfig.syncInterval !== 'number' || newConfig.syncInterval < 1000) {
        throw new Error('syncInterval must be a number >= 1000 (milliseconds)');
      }
      
      if (newConfig.couchdbUrl && !configManager.validateCouchDBUrl(newConfig.couchdbUrl)) {
        throw new Error('Invalid CouchDB URL format');
      }
      
      // Save the YAML content to localStorage for editing history
      localStorage.setItem(this.storageKey, yamlContent);
      
      // Apply configuration changes
      const oldConfig = configManager.getAll();
      const changes = {};
      
      Object.keys(newConfig).forEach(key => {
        if (oldConfig[key] !== newConfig[key]) {
          changes[key] = { old: oldConfig[key], new: newConfig[key] };
        }
      });
      
      // Update configuration
      configManager.setMultiple(newConfig);
      
      // Log changes
      if (Object.keys(changes).length > 0) {
        console.log('⚙️ Settings applied:', changes);
      } else {
        console.log('⚙️ Settings saved (no changes)');
      }
      
      // Notify listeners
      this.notifyListeners({
        type: 'saved',
        changes: changes,
        content: yamlContent
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Error saving settings:', error.message);
      
      // Notify listeners of error
      this.notifyListeners({
        type: 'error',
        error: error.message,
        content: yamlContent
      });
      
      throw error;
    }
  }

  /**
   * Get the saved YAML content from localStorage
   * @returns {string|null} Saved YAML content or null
   */
  getSavedContent() {
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Check if there are unsaved changes
   * @param {string} currentContent - Current editor content
   * @returns {boolean} True if there are unsaved changes
   */
  hasUnsavedChanges(currentContent) {
    const savedContent = this.getSavedContent();
    if (!savedContent) {
      // Compare with generated content from current config
      const currentDocument = this.getDocument();
      return currentContent !== currentDocument.content;
    }
    return currentContent !== savedContent;
  }

  /**
   * Reset to current configuration
   * @returns {Object} Fresh document with current config
   */
  reset() {
    // Remove saved content
    localStorage.removeItem(this.storageKey);
    
    // Return fresh document
    const document = this.getDocument();
    
    console.log('⚙️ Settings document reset to current configuration');
    
    this.notifyListeners({
      type: 'reset',
      content: document.content
    });
    
    return document;
  }

  /**
   * Export current settings as YAML
   * @returns {string} YAML content
   */
  export() {
    const document = this.getDocument();
    return document.content;
  }

  /**
   * Add a listener for settings document events
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a settings document listener
   * @param {Function} listener - Listener function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   * @param {Object} event - Event object
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error calling settings document listener:', error);
      }
    });
  }

  /**
   * Validate YAML syntax without saving
   * @param {string} yamlContent - YAML content to validate
   * @returns {Object} Validation result
   */
  validate(yamlContent) {
    try {
      const config = yamlParse(yamlContent);
      
      // Check required fields
      const requiredFields = ['couchdbUrl', 'syncEnabled', 'syncInterval', 'appName', 'theme'];
      const missingFields = requiredFields.filter(field => !(field in config));
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }
      
      // Validate types
      if (typeof config.syncEnabled !== 'boolean') {
        return {
          valid: false,
          error: 'syncEnabled must be true or false'
        };
      }
      
      if (typeof config.syncInterval !== 'number' || config.syncInterval < 1000) {
        return {
          valid: false,
          error: 'syncInterval must be a number >= 1000 (milliseconds)'
        };
      }
      
      if (config.couchdbUrl && !configManager.validateCouchDBUrl(config.couchdbUrl)) {
        return {
          valid: false,
          error: 'Invalid CouchDB URL format'
        };
      }
      
      return {
        valid: true,
        config: config
      };
      
    } catch (error) {
      return {
        valid: false,
        error: `YAML parsing error: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
const settingsDocumentService = new SettingsDocumentService();
export default settingsDocumentService;
