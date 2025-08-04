/**
 * DocumentManager - Service for managing documents with PouchDB
 */
import { DatabaseService } from './DatabaseService';

// Default document to create when no documents exist
const DEFAULT_DOCUMENT = {
  id: 'welcome',
  title: 'Welcome Document',
  content: '# Welcome to Commad\n\nThis is your first document. You can edit it or create new ones using the command palette (Ctrl+Enter).\n\n## Features\n\n- Markdown editing\n- Document management\n- Command palette\n- PouchDB storage for offline support',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Initialize database and migrate data
(async () => {
  await DatabaseService.init();
  await DatabaseService.migrateFromLocalStorage();
})();

export const DocumentManager = {
  /**
   * Get all documents from the database
   * @returns {Promise<Array>} Promise resolving to array of document objects
   */
  getAllDocuments: async () => {
    try {
      let documents = await DatabaseService.getAllDocuments();
      
      // If no documents exist, create a default one
      if (documents.length === 0) {
        const defaultDoc = { ...DEFAULT_DOCUMENT };
        await DocumentManager.saveDocument(defaultDoc);
        documents = [defaultDoc];
      }
      
      // Sort by most recently updated
      return documents.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } catch (error) {
      console.error('Error getting documents:', error);
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
      return await DatabaseService.getDocument(id);
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  },

  /**
   * Save a document to the database
   * @param {Object} document - Document to save
   * @returns {Promise<Object>} Promise resolving to saved document
   */
  saveDocument: async (document) => {
    try {
      return await DatabaseService.saveDocument(document);
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
      // Check if this is the last document
      const documents = await DocumentManager.getAllDocuments();
      
      // Don't allow deleting the last document
      if (documents.length <= 1) {
        return false;
      }
      
      return await DatabaseService.deleteDocument(id);
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  },
  
  /**
   * Create a new empty document
   * @param {string} title - Document title
   * @returns {Promise<Object>} Promise resolving to new document
   */
  createDocument: async (title = 'Untitled Document') => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title,
      content: `# ${title}\n\n`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return await DocumentManager.saveDocument(newDoc);
  }
};

export default DocumentManager;
