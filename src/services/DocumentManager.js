/**
 * DocumentManager - Service for managing documents in local storage
 */

const STORAGE_KEY = 'commad-documents';

// Default document to create when no documents exist
const DEFAULT_DOCUMENT = {
  id: 'welcome',
  title: 'Welcome Document',
  content: '# Welcome to Commad\n\nThis is your first document. You can edit it or create new ones using the command palette (Ctrl+Enter).\n\n## Features\n\n- Markdown editing\n- Document management\n- Command palette',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DocumentManager = {
  /**
   * Get all documents from local storage
   * @returns {Array} Array of document objects
   */
  getAllDocuments: () => {
    try {
      const documents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      
      // If no documents exist, create a default one
      if (documents.length === 0) {
        const defaultDoc = { ...DEFAULT_DOCUMENT };
        DocumentManager.saveDocument(defaultDoc);
        return [defaultDoc];
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
   * @returns {Object|null} Document object or null if not found
   */
  getDocument: (id) => {
    try {
      const documents = DocumentManager.getAllDocuments();
      return documents.find(doc => doc.id === id) || null;
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  },

  /**
   * Save a document to local storage
   * @param {Object} document - Document to save
   * @returns {Object} Saved document
   */
  saveDocument: (document) => {
    try {
      const documents = DocumentManager.getAllDocuments();
      const now = new Date().toISOString();
      
      // Check if document already exists
      const existingDocIndex = documents.findIndex(doc => doc.id === document.id);
      
      if (existingDocIndex >= 0) {
        // Update existing document
        const updatedDoc = {
          ...documents[existingDocIndex],
          ...document,
          updatedAt: now
        };
        documents[existingDocIndex] = updatedDoc;
      } else {
        // Create new document with generated ID if not provided
        const newDoc = {
          ...document,
          id: document.id || `doc-${Date.now()}`,
          createdAt: now,
          updatedAt: now
        };
        documents.push(newDoc);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
      return existingDocIndex >= 0 ? documents[existingDocIndex] : documents[documents.length - 1];
    } catch (error) {
      console.error('Error saving document:', error);
      return document;
    }
  },

  /**
   * Delete a document from local storage
   * @param {string} id - Document ID
   * @returns {boolean} Success status
   */
  deleteDocument: (id) => {
    try {
      const documents = DocumentManager.getAllDocuments();
      const filteredDocs = documents.filter(doc => doc.id !== id);
      
      // Don't allow deleting the last document
      if (filteredDocs.length === 0) {
        return false;
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredDocs));
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  },
  
  /**
   * Create a new empty document
   * @param {string} title - Document title
   * @returns {Object} New document
   */
  createDocument: (title = 'Untitled Document') => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title,
      content: `# ${title}\n\n`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return DocumentManager.saveDocument(newDoc);
  }
};

export default DocumentManager;
