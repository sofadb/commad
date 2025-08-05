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
      .on('change', async (info) => {
        console.log('Sync change:', info);
        this.lastSyncTime = new Date().toISOString();
        this.syncStatus = 'syncing';
        this.notifyListeners();
        
        // Always trigger document update when we receive changes
        // This ensures the editor refreshes regardless of sync direction
        if (info.change && info.change.docs && info.change.docs.length > 0) {
          console.log('Documents changed:', info.change.docs.length);
          const updatedDocIds = info.change.docs.map(doc => doc._id);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('documentsUpdated', {
              detail: { documentIds: updatedDocIds }
            }));
          }, 100);
        }
        
        // Auto-resolve conflicts immediately after any sync change
        setTimeout(async () => {
          try {
            const resolved = await this.autoResolveConflicts();
            if (resolved > 0) {
              console.log(`Auto-resolved ${resolved} conflict(s) after sync change`);
              // Trigger general document refresh after conflict resolution
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('documentsUpdated'));
              }, 500);
            }
          } catch (error) {
            console.error('Error during auto-conflict resolution:', error);
          }
        }, 500); // Small delay to let sync settle
      })
      .on('paused', async (err) => {
        if (err) {
          console.error('Sync paused with error:', err);
          this.syncStatus = 'error';
          this.syncError = err.message;
        } else {
          console.log('Sync paused (up to date)');
          this.syncStatus = 'up-to-date';
          this.syncError = null;
          
          // Auto-resolve any remaining conflicts when sync is up to date
          try {
            const resolved = await this.autoResolveConflicts();
            if (resolved > 0) {
              console.log(`Auto-resolved ${resolved} conflict(s) on sync pause`);
              // Trigger document refresh
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('documentsUpdated'));
              }, 500);
            }
          } catch (error) {
            console.error('Error during auto-conflict resolution on pause:', error);
          }
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
   * Auto-resolve conflicts by merging content
   */
  async autoResolveConflicts() {
    try {
      const conflicts = await this.getConflicts();
      
      for (const conflict of conflicts) {
        try {
          await this.autoResolveConflict(conflict);
        } catch (error) {
          console.error(`Failed to auto-resolve conflict for ${conflict.id}:`, error);
        }
      }
      
      return conflicts.length;
    } catch (error) {
      console.error('Error in auto-resolve conflicts:', error);
      return 0;
    }
  }

  /**
   * Auto-resolve a single conflict
   */
  async autoResolveConflict(conflict) {
    try {
      // Get current version
      const currentDoc = conflict.doc;
      
      // Get all conflicting versions
      const conflictVersions = [];
      for (const conflictRev of conflict.conflicts) {
        try {
          const conflictDoc = await this.localDB.get(conflict.id, { rev: conflictRev });
          conflictVersions.push(conflictDoc);
        } catch (error) {
          console.warn(`Could not load conflict revision ${conflictRev}:`, error);
        }
      }

      if (conflictVersions.length === 0) return;

      // Try to merge the content
      const mergedContent = this.mergeContent(currentDoc, conflictVersions[0]);
      
      // Create resolved document
      const resolvedDoc = {
        ...currentDoc,
        content: mergedContent,
        updatedAt: new Date().toISOString()
      };

      // Save merged document
      await this.localDB.put(resolvedDoc);
      
      // Remove conflict revisions
      for (const rev of conflict.conflicts) {
        try {
          await this.localDB.remove(conflict.id, rev);
        } catch (error) {
          console.warn(`Could not remove conflict revision ${rev}:`, error);
        }
      }

      console.log(`Auto-resolved conflict for document: ${conflict.id}`);
      
      // Notify that specific document was updated
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('documentsUpdated', {
          detail: { documentIds: [conflict.id] }
        }));
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error auto-resolving conflict:', error);
      return false;
    }
  }

  /**
   * Merge content from two document versions
   * Conservative approach - never lose any content
   */
  mergeContent(doc1, doc2) {
    const content1 = doc1.content || '';
    const content2 = doc2.content || '';
    
    // If contents are identical, return as-is
    if (content1 === content2) {
      return content1;
    }

    // If one is empty, use the non-empty one
    if (!content1.trim()) return content2;
    if (!content2.trim()) return content1;

    // Split into lines for comparison
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');

    // Try intelligent merging - if one version contains all content of the other
    if (lines1.every(line => lines2.includes(line))) {
      return content2; // content2 is a superset
    }
    if (lines2.every(line => lines1.includes(line))) {
      return content1; // content1 is a superset
    }

    // Try to merge by combining unique lines while preserving order
    const mergedLines = this.mergeLinesByContent(lines1, lines2);
    if (mergedLines) {
      return mergedLines.join('\n');
    }

    // If we can't merge intelligently, preserve both versions
    // Use timestamp to determine order
    const time1 = new Date(doc1.updatedAt || doc1.createdAt || 0);
    const time2 = new Date(doc2.updatedAt || doc2.createdAt || 0);
    
    let firstContent, secondContent, firstLabel, secondLabel;
    if (time1 > time2) {
      firstContent = content1;
      secondContent = content2;
      firstLabel = `Recent Version (${time1.toLocaleString()})`;
      secondLabel = `Earlier Version (${time2.toLocaleString()})`;
    } else {
      firstContent = content2;
      secondContent = content1;
      firstLabel = `Recent Version (${time2.toLocaleString()})`;
      secondLabel = `Earlier Version (${time1.toLocaleString()})`;
    }

    // Combine both versions with clear markers
    const mergedContent = [
      `<<<<<<< ${firstLabel}`,
      firstContent,
      '=======',
      secondContent,
      `>>>>>>> ${secondLabel}`,
      '',
      '<!-- AUTO-MERGED: Both versions preserved above -->',
      '<!-- Edit as needed and remove conflict markers -->'
    ].join('\n');

    return mergedContent;
  }

  /**
   * Attempt to merge lines intelligently by content
   */
  mergeLinesByContent(lines1, lines2) {
    // If one list is much shorter, it might be a subset
    if (lines1.length < 5 && lines2.length > lines1.length * 2) {
      // Check if lines1 is mostly contained in lines2
      const contained = lines1.filter(line => line.trim() && lines2.includes(line)).length;
      if (contained >= lines1.length * 0.8) {
        return lines2; // Use the longer version
      }
    }
    
    if (lines2.length < 5 && lines1.length > lines2.length * 2) {
      // Check if lines2 is mostly contained in lines1
      const contained = lines2.filter(line => line.trim() && lines1.includes(line)).length;
      if (contained >= lines2.length * 0.8) {
        return lines1; // Use the longer version
      }
    }

    // Try simple append detection - if one version starts with the other
    const lines1Str = lines1.join('\n');
    const lines2Str = lines2.join('\n');
    
    if (lines1Str.startsWith(lines2Str) || lines2Str.startsWith(lines1Str)) {
      // One is likely an extension of the other
      return lines1.length > lines2.length ? lines1 : lines2;
    }

    // Check if they have a common beginning and different endings
    let commonStart = 0;
    while (commonStart < Math.min(lines1.length, lines2.length) && 
           lines1[commonStart] === lines2[commonStart]) {
      commonStart++;
    }

    if (commonStart > 0 && commonStart >= Math.min(lines1.length, lines2.length) * 0.5) {
      // They share a significant common beginning
      const commonLines = lines1.slice(0, commonStart);
      const unique1 = lines1.slice(commonStart);
      const unique2 = lines2.slice(commonStart);
      
      // Combine: common part + unique parts
      return [...commonLines, ...unique1, ...unique2];
    }

    // No clear merge pattern found
    return null;
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
