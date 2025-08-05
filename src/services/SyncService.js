/**
 * SyncService - Service for syncing with CouchDB
 */
import PouchDB from 'pouchdb';
import configManager from './ConfigService.js';

class SyncService {
  constructor() {
    this.localDB = new PouchDB('commad-documents');
    this.remoteDB = null;
    this.syncHandler = null;
    this.isOnline = navigator.onLine;
    this.syncStatus = 'disconnected';
    this.lastSyncTime = null;
    this.syncError = null;
    this.listeners = new Set();
    
    // Listen for config changes
    configManager.addListener(this.handleConfigChange.bind(this));
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initialize sync if enabled
    this.initializeSync();
  }

  /**
   * Initialize sync based on current configuration
   */
  async initializeSync() {
    const config = configManager.getAll();
    if (config.syncEnabled && config.couchdbUrl) {
      await this.setupSync(config.couchdbUrl);
    }
  }

  /**
   * Handle configuration changes
   */
  handleConfigChange(newConfig) {
    if (newConfig.syncEnabled && newConfig.couchdbUrl) {
      this.setupSync(newConfig.couchdbUrl);
    } else {
      this.stopSync();
    }
  }

  /**
   * Setup sync with remote CouchDB
   */
  async setupSync(couchdbUrl) {
    try {
      // Stop existing sync
      this.stopSync();
      
      // Get authentication from config
      const config = configManager.getAll();
      const { couchdbUsername, couchdbPassword } = config;
      
      // Create remote database connection with auth if provided
      let remoteUrl = `${couchdbUrl}`;
      
      if (couchdbUsername && couchdbPassword) {
        // Add auth to URL
        const url = new URL(couchdbUrl);
        url.username = couchdbUsername;
        url.password = couchdbPassword;
        remoteUrl = `${url.toString()}`;
      }
      
      this.remoteDB = new PouchDB(remoteUrl);
      
      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to CouchDB - check URL and credentials');
      }

      // Start continuous sync
      this.startContinuousSync();
      
      this.syncStatus = 'connected';
      this.syncError = null;
      this.notifyListeners();
      
      console.log('Sync initialized with:', couchdbUrl);
    } catch (error) {
      console.error('Error setting up sync:', error);
      this.syncStatus = 'error';
      this.syncError = error.message;
      this.notifyListeners();
    }
  }

  /**
   * Test connection to remote database
   */
  async testConnection() {
    try {
      if (!this.remoteDB) return false;
      
      await this.remoteDB.info();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Start continuous sync
   */
  startContinuousSync() {
    if (!this.remoteDB || !this.isOnline) return;

    const config = configManager.getAll();
    
    this.syncHandler = this.localDB.sync(this.remoteDB, {
      live: true,
      retry: true,
      timeout: 30000,
      heartbeat: config.syncInterval || 30000
    });

    // Handle sync events
    this.syncHandler
      .on('change', (info) => {
        console.log('Sync change:', info);
        this.lastSyncTime = new Date().toISOString();
        this.syncStatus = 'syncing';
        this.notifyListeners();
      })
      .on('paused', (err) => {
        if (err) {
          console.error('Sync paused with error:', err);
          this.syncStatus = 'error';
          this.syncError = err.message;
        } else {
          console.log('Sync paused (up to date)');
          this.syncStatus = 'up-to-date';
          this.syncError = null;
        }
        this.notifyListeners();
      })
      .on('active', () => {
        console.log('Sync active');
        this.syncStatus = 'syncing';
        this.syncError = null;
        this.notifyListeners();
      })
      .on('denied', (err) => {
        console.error('Sync denied:', err);
        this.syncStatus = 'error';
        this.syncError = 'Access denied';
        this.notifyListeners();
      })
      .on('complete', (info) => {
        console.log('Sync complete:', info);
        this.syncStatus = 'complete';
        this.lastSyncTime = new Date().toISOString();
        this.notifyListeners();
      })
      .on('error', (err) => {
        console.error('Sync error:', err);
        this.syncStatus = 'error';
        this.syncError = err.message;
        this.notifyListeners();
      });
  }

  /**
   * Stop sync
   */
  stopSync() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    
    this.syncStatus = 'disconnected';
    this.syncError = null;
    this.notifyListeners();
    
    console.log('Sync stopped');
  }

  /**
   * Force a one-time sync
   */
  async forceSync() {
    if (!this.remoteDB || !this.isOnline) {
      throw new Error('Not connected to remote database');
    }

    try {
      this.syncStatus = 'syncing';
      this.notifyListeners();

      const result = await this.localDB.sync(this.remoteDB, {
        timeout: 30000
      });

      this.lastSyncTime = new Date().toISOString();
      this.syncStatus = 'up-to-date';
      this.syncError = null;
      this.notifyListeners();

      return result;
    } catch (error) {
      console.error('Force sync failed:', error);
      this.syncStatus = 'error';
      this.syncError = error.message;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Push local changes to remote
   */
  async pushToRemote() {
    if (!this.remoteDB || !this.isOnline) {
      throw new Error('Not connected to remote database');
    }

    try {
      this.syncStatus = 'syncing';
      this.notifyListeners();

      const result = await this.localDB.replicate.to(this.remoteDB);
      
      this.lastSyncTime = new Date().toISOString();
      this.syncStatus = 'up-to-date';
      this.notifyListeners();

      return result;
    } catch (error) {
      console.error('Push to remote failed:', error);
      this.syncStatus = 'error';
      this.syncError = error.message;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Pull changes from remote
   */
  async pullFromRemote() {
    if (!this.remoteDB || !this.isOnline) {
      throw new Error('Not connected to remote database');
    }

    try {
      this.syncStatus = 'syncing';
      this.notifyListeners();

      const result = await this.localDB.replicate.from(this.remoteDB);
      
      this.lastSyncTime = new Date().toISOString();
      this.syncStatus = 'up-to-date';
      this.notifyListeners();

      return result;
    } catch (error) {
      console.error('Pull from remote failed:', error);
      this.syncStatus = 'error';
      this.syncError = error.message;
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Network is back online');
    this.isOnline = true;
    
    const config = configManager.getAll();
    if (config.syncEnabled && config.couchdbUrl) {
      this.startContinuousSync();
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Network went offline');
    this.isOnline = false;
    this.syncStatus = 'offline';
    this.notifyListeners();
  }

  /**
   * Get sync status information
   */
  getStatus() {
    return {
      status: this.syncStatus,
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      error: this.syncError,
      isConnected: !!this.remoteDB,
      couchdbUrl: this.remoteDB ? this.remoteDB.name : null
    };
  }

  /**
   * Add a listener for sync status changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status changes
   */
  notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Get conflict documents
   */
  async getConflicts() {
    try {
      const allDocs = await this.localDB.allDocs({
        include_docs: true,
        conflicts: true
      });

      return allDocs.rows
        .filter(row => row.doc._conflicts)
        .map(row => ({
          id: row.doc._id,
          conflicts: row.doc._conflicts,
          doc: row.doc
        }));
    } catch (error) {
      console.error('Error getting conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a conflict by choosing a revision
   */
  async resolveConflict(docId, winningRev, losingRevs) {
    try {
      // Remove losing revisions
      for (const rev of losingRevs) {
        await this.localDB.remove(docId, rev);
      }
      
      console.log(`Conflict resolved for document ${docId}`);
      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopSync();
    this.listeners.clear();
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create and export singleton instance
const syncService = new SyncService();
export default syncService;
