/**
 * Console Tools - Development utilities for configuration management
 * These tools are exposed to the browser console for easy config management
 */
import configManager from '../services/ConfigService';
import syncService from '../services/SyncService.js';
import { DatabaseService } from '../services/DatabaseService.js';

// Console tools object that will be exposed globally
const consoleTools = {
  // Configuration management
  config: {
    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @returns {*} Configuration value
     */
    get: (key) => {
      if (!key) {
        console.log('Available config keys:', Object.keys(configManager.getAll()));
        return configManager.getAll();
      }
      const value = configManager.get(key);
      console.log(`Config ${key}:`, value);
      return value;
    },

    /**
     * Set a configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     */
    set: (key, value) => {
      if (!key) {
        console.error('Please provide a configuration key');
        return;
      }
      configManager.set(key, value);
    },

    /**
     * Set CouchDB URL with validation
     * @param {string} url - CouchDB URL
     */
    setCouchDB: (url) => {
      if (!url) {
        console.log('Usage: commad.config.setCouchDB("http://localhost:5984")');
        return;
      }

      try {
        // Validate URL format
        new URL(url);
        configManager.set('couchdbUrl', url);
        console.log(`✅ CouchDB URL set to: ${url}`);
        
        // Test connection
        consoleTools.utils.testCouchDB();
      } catch (error) {
        console.error('❌ Invalid URL format:', error.message);
      }
    },

    /**
     * Set CouchDB authentication
     * @param {string} username - Username
     * @param {string} password - Password
     */
    setAuth: (username, password) => {
      if (!username || !password) {
        console.log(`
Usage: commad.config.setAuth("username", "password")

Note: Credentials are stored in localStorage. Only use this in development!
For production, consider using environment variables or secure credential storage.
        `);
        return;
      }

      configManager.set('couchdbUsername', username);
      configManager.set('couchdbPassword', password);
      console.log('✅ CouchDB authentication credentials set');
      console.log('⚠️  Warning: Credentials stored in localStorage');
      
      // Test connection with new credentials
      consoleTools.utils.testCouchDB();
    },

    /**
     * Quick setup for authenticated CouchDB
     * @param {string} url - CouchDB URL
     * @param {string} username - Username
     * @param {string} password - Password
     */
    setup: (url, username, password) => {
      if (!url) {
        console.log(`
🚀 Quick Setup for CouchDB with Authentication
=============================================

Usage: commad.config.setup(url, username, password)

Example:
  commad.config.setup("http://localhost:5984", "admin", "password")

This will:
1. Set the CouchDB URL
2. Set authentication credentials
3. Test the connection
4. Enable sync if connection succeeds
        `);
        return;
      }

      console.log('🚀 Setting up CouchDB connection...');
      
      try {
        // Set URL
        new URL(url); // Validate URL
        configManager.set('couchdbUrl', url);
        console.log(`✅ CouchDB URL: ${url}`);
        
        // Set auth if provided
        if (username && password) {
          configManager.set('couchdbUsername', username);
          configManager.set('couchdbPassword', password);
          console.log(`✅ Authentication: ${username}`);
          console.log('⚠️  Credentials stored in localStorage');
        }
        
        // Test connection
        console.log('🔍 Testing connection...');
        consoleTools.utils.testCouchDB().then(() => {
          // Enable sync if connection test passes
          setTimeout(() => {
            console.log('🔄 Enabling sync...');
            configManager.set('syncEnabled', true);
            console.log('✅ Setup complete! Check the sync status in the UI.');
          }, 1000);
        });
        
      } catch (error) {
        console.error('❌ Setup failed:', error.message);
      }
    },

    /**
     * Clear CouchDB authentication
     */
    clearAuth: () => {
      configManager.set('couchdbUsername', '');
      configManager.set('couchdbPassword', '');
      console.log('✅ CouchDB authentication credentials cleared');
    },

    /**
     * Get all configuration
     */
    getAll: () => {
      const config = configManager.getAll();
      console.table(config);
      return config;
    },

    /**
     * Reset configuration to defaults
     */
    reset: () => {
      if (confirm('Are you sure you want to reset all configuration to defaults?')) {
        configManager.reset();
        console.log('✅ Configuration reset to defaults');
      }
    },

    /**
     * Export configuration as JSON
     */
    export: () => {
      const exported = configManager.export();
      console.log('Configuration exported:\n', exported);
      return exported;
    },

    /**
     * Import configuration from JSON
     * @param {string} jsonString - JSON configuration string
     */
    import: (jsonString) => {
      if (!jsonString) {
        console.log('Usage: commad.config.import(\'{"couchdbUrl": "http://example.com"}\')');
        return;
      }
      try {
        configManager.import(jsonString);
        console.log('✅ Configuration imported successfully');
      } catch (error) {
        console.error('❌ Error importing configuration:', error.message);
      }
    },

    /**
     * Show help for configuration commands
     */
    help: () => {
      console.log(`
🔧 Configuration Management Help
===============================

Available commands:
• commad.config.get()           - Show all config or get(key) for specific value
• commad.config.set(key, value) - Set a configuration value
• commad.config.setup(url, user, pass) - Quick setup with authentication
• commad.config.setCouchDB(url) - Set CouchDB URL with validation
• commad.config.setAuth(user, pass) - Set CouchDB authentication
• commad.config.clearAuth()     - Clear CouchDB credentials
• commad.config.getAll()        - Display all config in a table
• commad.config.reset()         - Reset to default configuration
• commad.config.export()        - Export config as JSON string
• commad.config.import(json)    - Import config from JSON string
• commad.config.help()          - Show this help

Examples:
---------
// Using Vite proxy (recommended for development)
commad.config.setup("/db", "admin", "password")

// Using direct CouchDB URL
commad.config.setup("http://localhost:5984", "admin", "password")
commad.config.setCouchDB("http://localhost:5984")
commad.config.setAuth("myuser", "mypassword")
commad.config.set("syncEnabled", true)
commad.config.get("couchdbUrl")
commad.config.getAll()

For 401 Authentication errors:
commad.config.setAuth("username", "password")
Or use the quick setup:
commad.config.setup("/db", "username", "password")

Available config keys:
• couchdbUrl      - CouchDB server URL (use "/db" for Vite proxy)
• couchdbUsername - CouchDB username (optional)
• couchdbPassword - CouchDB password (optional)
• syncEnabled     - Enable/disable synchronization
• syncInterval  - Sync interval in milliseconds
• appName       - Application name
• theme         - UI theme preference
      `);
    }
  },

  // Utility functions
  utils: {
    /**
     * Clear all application data
     */
    clearData: () => {
      if (confirm('Are you sure you want to clear ALL application data? This cannot be undone.')) {
        localStorage.clear();
        indexedDB.deleteDatabase('commad-documents');
        location.reload();
      }
    },

    /**
     * Show application info
     */
    info: () => {
      console.log(`
📱 Commad Application Info
=========================
Version: ${process.env.NODE_ENV === 'development' ? 'Development' : 'Production'}
Storage: LocalStorage + PouchDB
Config: ${Object.keys(configManager.getAll()).length} keys configured
      `);
    },

    /**
     * Test CouchDB connection
     */
    testCouchDB: async () => {
      const config = configManager.getAll();
      const { couchdbUrl, couchdbUsername, couchdbPassword } = config;
      
      console.log(`Testing connection to: ${couchdbUrl}`);
      
      try {
        const headers = {};
        
        // Add authentication if provided
        if (couchdbUsername && couchdbPassword) {
          const credentials = btoa(`${couchdbUsername}:${couchdbPassword}`);
          headers['Authorization'] = `Basic ${credentials}`;
          console.log(`Using authentication for user: ${couchdbUsername}`);
        }
        
        const response = await fetch(couchdbUrl, { headers });
        
        if (response.ok) {
          const info = await response.json();
          console.log('✅ CouchDB connection successful:', info);
          
          // Test database access
          const dbUrl = `${couchdbUrl}/commad-documents`;
          const dbResponse = await fetch(dbUrl, { headers });
          
          if (dbResponse.ok) {
            const dbInfo = await dbResponse.json();
            console.log('✅ Database access successful:', dbInfo);
          } else if (dbResponse.status === 404) {
            console.log('ℹ️  Database does not exist yet (will be created automatically)');
          } else if (dbResponse.status === 401) {
            console.error('❌ 401 Unauthorized: Database access denied');
            console.log('💡 Try: commad.config.setAuth("username", "password")');
          } else {
            console.log(`⚠️  Database response: ${dbResponse.status} ${dbResponse.statusText}`);
          }
        } else if (response.status === 401) {
          console.error('❌ 401 Unauthorized: Authentication required');
          console.log('💡 Try: commad.config.setAuth("username", "password")');
        } else {
          console.error(`❌ CouchDB connection failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ CouchDB connection error:', error.message);
        
        if (error.message.includes('Failed to fetch')) {
          console.log('💡 Check that CouchDB is running and the URL is correct');
          console.log('💡 Default CouchDB URL: http://localhost:5984');
        }
      }
    }
  },

  // Sync management
  sync: {
    /**
     * Show sync help
     */
    help: () => {
      console.log(`
🔄 Sync Management Commands
===========================

Status & Info:
• commad.sync.status()      - Get current sync status
• commad.sync.info()        - Show detailed sync information

Manual Sync:
• commad.sync.force()       - Force a full sync
• commad.sync.push()        - Push local changes to remote
• commad.sync.pull()        - Pull changes from remote

Connection Management:
• commad.sync.start()       - Start continuous sync
• commad.sync.stop()        - Stop sync
• commad.sync.reconnect()   - Reconnect to remote

Conflict Resolution:
• commad.sync.conflicts()   - List documents with conflicts
• commad.sync.resolve(id, winningRev, losingRevs) - Resolve conflict

Examples:
  commad.sync.status()
  commad.sync.force()
  commad.sync.conflicts()
      `);
    },

    /**
     * Get sync status
     */
    status: () => {
      const status = syncService.getStatus();
      console.log('📊 Sync Status:', status);
      return status;
    },

    /**
     * Show detailed sync information
     */
    info: () => {
      const status = syncService.getStatus();
      const config = configManager.getAll();
      
      console.log(`
🔄 Sync Information
==================
Status: ${status.status}
Online: ${status.isOnline ? '✅' : '❌'}
Connected: ${status.isConnected ? '✅' : '❌'}
CouchDB URL: ${config.couchdbUrl}
Sync Enabled: ${config.syncEnabled ? '✅' : '❌'}
Last Sync: ${status.lastSyncTime || 'Never'}
Error: ${status.error || 'None'}
Sync Interval: ${config.syncInterval}ms
      `);
      
      return status;
    },

    /**
     * Force a full sync
     */
    force: async () => {
      console.log('🔄 Starting forced sync...');
      try {
        const result = await DatabaseService.forceSync();
        console.log('✅ Sync completed successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Sync failed:', error.message);
        throw error;
      }
    },

    /**
     * Push local changes to remote
     */
    push: async () => {
      console.log('⬆️ Pushing local changes...');
      try {
        const result = await syncService.pushToRemote();
        console.log('✅ Push completed successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Push failed:', error.message);
        throw error;
      }
    },

    /**
     * Pull changes from remote
     */
    pull: async () => {
      console.log('⬇️ Pulling remote changes...');
      try {
        const result = await syncService.pullFromRemote();
        console.log('✅ Pull completed successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Pull failed:', error.message);
        throw error;
      }
    },

    /**
     * Start continuous sync
     */
    start: () => {
      console.log('▶️ Starting continuous sync...');
      const config = configManager.getAll();
      if (!config.syncEnabled) {
        configManager.set('syncEnabled', true);
        console.log('✅ Sync enabled and started');
      } else {
        console.log('ℹ️ Sync is already enabled');
      }
    },

    /**
     * Stop sync
     */
    stop: () => {
      console.log('⏹️ Stopping sync...');
      configManager.set('syncEnabled', false);
      console.log('✅ Sync stopped');
    },

    /**
     * Reconnect to remote
     */
    reconnect: async () => {
      console.log('🔄 Reconnecting to remote...');
      const config = configManager.getAll();
      
      if (!config.couchdbUrl) {
        console.error('❌ No CouchDB URL configured');
        return;
      }

      // Toggle sync to force reconnection
      configManager.set('syncEnabled', false);
      setTimeout(() => {
        configManager.set('syncEnabled', true);
        console.log('✅ Reconnection initiated');
      }, 1000);
    },

    /**
     * List documents with conflicts
     */
    conflicts: async () => {
      console.log('🔍 Checking for conflicts...');
      try {
        const conflicts = await DatabaseService.getConflicts();
        
        if (conflicts.length === 0) {
          console.log('✅ No conflicts found');
          return [];
        }
        
        console.log(`⚠️ Found ${conflicts.length} document(s) with conflicts:`);
        conflicts.forEach(conflict => {
          console.log(`- Document: ${conflict.id}`);
          console.log(`  Conflicts: ${conflict.conflicts.length} revision(s)`);
        });
        
        return conflicts;
      } catch (error) {
        console.error('❌ Error checking conflicts:', error.message);
        throw error;
      }
    },

    /**
     * Resolve a document conflict
     */
    resolve: async (docId, winningRev, losingRevs) => {
      if (!docId || !winningRev || !losingRevs) {
        console.log(`
Usage: commad.sync.resolve(docId, winningRev, losingRevs)

Example:
  commad.sync.resolve('doc1', '2-abc123', ['1-def456'])
        `);
        return;
      }

      console.log(`🔧 Resolving conflict for document: ${docId}`);
      try {
        const result = await DatabaseService.resolveConflict(docId, winningRev, losingRevs);
        
        if (result) {
          console.log('✅ Conflict resolved successfully');
        } else {
          console.log('❌ Failed to resolve conflict');
        }
        
        return result;
      } catch (error) {
        console.error('❌ Error resolving conflict:', error.message);
        throw error;
      }
    }
  },

  /**
   * Show general help
   */
  help: () => {
    console.log(`
🚀 Commad Console Tools
=======================

Available tool categories:
• commad.config.*  - Configuration management
• commad.sync.*    - Sync & CouchDB management
• commad.utils.*   - Utility functions
• commad.help()    - Show this help

Quick start:
• commad.config.help()     - Configuration help
• commad.sync.help()       - Sync management help
• commad.config.getAll()   - View current config
• commad.sync.status()     - Check sync status
• commad.utils.info()      - Application info

Type any command for detailed usage information.
    `);
  }
};

// Function to expose tools to global scope
export const exposeConsoleTools = () => {
  // Only expose in development or if explicitly enabled
  if (process.env.NODE_ENV === 'development' || configManager.get('enableConsoleTools')) {
    window.commad = consoleTools;
    console.log(`
🔧 Commad Console Tools Available!
Type 'commad.help()' to get started.
    `);
  }
};

export default consoleTools;
