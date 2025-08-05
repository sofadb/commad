/**
 * DatabaseService - Service for interacting with PouchDB
 */
import PouchDB from 'pouchdb';
import syncService from './SyncService.js';

// Create a database instance
const db = new PouchDB('commad-documents');

export const DatabaseService = {
  /**
   * Initialize the database
   * @returns {Promise} Promise resolving when initialization is complete
   */
  init: async () => {
    try {
      // Ensure the database is accessible
      await db.info();
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      return false;
    }
  },

  /**
   * Get all documents from the database
   * @returns {Promise<Array>} Promise resolving to array of document objects
   */
  getAllDocuments: async () => {
    try {
      const response = await db.allDocs({
        include_docs: true,
        attachments: false
      });
      
      return response.rows.map(row => row.doc);
    } catch (error) {
      console.error('Error getting all documents:', error);
      return [];
    }
  },

  /**
   * Get a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Promise resolving to document object or null if not found
   */
  getDocument: async (id) => {
    try {
      return await db.get(id);
    } catch (error) {
      if (error.name === 'not_found') {
        return null;
      }
      console.error(`Error getting document with id ${id}:`, error);
      return null;
    }
  },

  /**
   * Save a document to the database
   * @param {Object} document - Document to save
   * @returns {Promise<Object>} Promise resolving to the saved document
   */
  saveDocument: async (document) => {
    try {
      // Check if document already exists
      let existingDoc = null;
      let docToSave = { ...document };
      
      try {
        if (document._id || document.id) {
          const docId = document._id || document.id;
          existingDoc = await db.get(docId);
          docToSave = {
            ...existingDoc,
            ...document,
            _id: docId,
            _rev: existingDoc._rev, // Important: keep the revision
            updatedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        if (error.name !== 'not_found') {
          throw error;
        }
        // Document doesn't exist, continue with save
      }
      
      // If it's a new document, ensure it has _id and timestamps
      if (!existingDoc) {
        const newId = document.id || document._id || `doc-${Date.now()}`;
        docToSave = {
          ...docToSave,
          _id: newId,
          id: newId,
          createdAt: document.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const response = await db.put(docToSave);
      
      // If successful, get the saved document
      if (response.ok) {
        return await db.get(response.id);
      }
      
      throw new Error('Failed to save document');
    } catch (error) {
      console.error('Error saving document:', error);
      return document;
    }
  },

  /**
   * Delete a document from the database
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  deleteDocument: async (id) => {
    try {
      // Get the document first to get its _rev
      const doc = await db.get(id);
      await db.remove(doc);
      return true;
    } catch (error) {
      console.error(`Error deleting document with id ${id}:`, error);
      return false;
    }
  },

  /**
   * Get sync status
   * @returns {Object} Current sync status
   */
  getSyncStatus: () => {
    return syncService.getStatus();
  },

  /**
   * Force a sync with remote database
   * @returns {Promise} Promise resolving when sync is complete
   */
  forceSync: async () => {
    return await syncService.forceSync();
  },

  /**
   * Add listener for sync status changes
   * @param {Function} callback - Callback function to call on status changes
   * @returns {Function} Unsubscribe function
   */
  addSyncListener: (callback) => {
    return syncService.addListener(callback);
  },

  /**
   * Get conflicts that need resolution
   * @returns {Promise<Array>} Promise resolving to array of conflict objects
   */
  getConflicts: async () => {
    return await syncService.getConflicts();
  },

  /**
   * Resolve a document conflict
   * @param {string} docId - Document ID
   * @param {string} winningRev - Revision to keep
   * @param {Array} losingRevs - Revisions to remove
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  resolveConflict: async (docId, winningRev, losingRevs) => {
    return await syncService.resolveConflict(docId, winningRev, losingRevs);
  }
};
