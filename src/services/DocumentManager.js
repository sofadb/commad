/**
 * DocumentManager - Service for managing documents with PouchDB
 */
import { DatabaseService } from './DatabaseService';
import settingsDocumentService from './SettingsDocumentService.js';

// Default document to create when no documents exist
const DEFAULT_DOCUMENT = {
  id: 'welcome',
  title: 'Welcome Document',
  content: '# Welcome to Commad\n\nThis is your first document. You can edit it or create new ones using the command palette (Ctrl+Enter).\n\n## Features\n\n- Markdown editing\n- Document management\n- Command palette\n- PouchDB storage for offline support',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Initialize database
(async () => {
  await DatabaseService.init();
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
      
      // Add settings document at the beginning
      const settingsDoc = settingsDocumentService.getDocument();
      documents.unshift(settingsDoc);
      
      // Sort regular documents by most recently updated (keep settings first)
      const regularDocs = documents.slice(1).sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      return [settingsDoc, ...regularDocs];
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
      // Check if this is the settings document
      if (id === 'settings') {
        return settingsDocumentService.getDocument();
      }
      
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
      // Check if this is the settings document
      if (document.id === 'settings') {
        await settingsDocumentService.saveDocument(document.content);
        return settingsDocumentService.getDocument();
      }
      
      return await DatabaseService.saveDocument(document);
    } catch (error) {
      console.error('Error saving document:', error);
      throw error; // Re-throw for settings validation errors
    }
  },

  /**
   * Delete a document from the database
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  deleteDocument: async (id) => {
    try {
      // Don't allow deleting the settings document
      if (id === 'settings') {
        return false;
      }
      
      // Check if this is the last document
      const documents = await DocumentManager.getAllDocuments();
      const regularDocs = documents.filter(doc => doc.id !== 'settings');
      
      // Don't allow deleting the last regular document
      if (regularDocs.length <= 1) {
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
