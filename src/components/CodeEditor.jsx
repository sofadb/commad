import { useEffect, useRef, useState, useCallback } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import CommandPalette from './CommandPalette';
import DocumentManager from '../services/DocumentManager';
import './CodeEditor.css';

const CodeEditor = () => {
  const editorRef = useRef(null);
  const [editorView, setEditorView] = useState(null);
  const editorWrapperRef = useRef(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [content, setContent] = useState('');
  const [isSaved, setIsSaved] = useState(true); // Track save status
  
  // Initialize documents from database
  useEffect(() => {
    async function loadDocuments() {
      const allDocs = await DocumentManager.getAllDocuments();
      setDocuments(allDocs);
      
      // Load the most recent document by default
      if (allDocs.length > 0) {
        setCurrentDocument(allDocs[0]);
        setContent(allDocs[0].content);
        setIsSaved(true); // Initially loaded document is saved
      }
    }
    
    loadDocuments();
  }, []);

  // Listen for document updates (e.g., after conflict resolution)
  useEffect(() => {
    const handleDocumentsUpdate = async (event) => {
      // If we have specific document IDs that were updated, only refresh those
      const updatedDocIds = event?.detail?.documentIds;
      
      if (updatedDocIds && currentDocument) {
        // Check if current document was updated
        const currentDocId = currentDocument.id || currentDocument._id;
        if (updatedDocIds.includes(currentDocId)) {
          console.log('Current document was updated remotely, refreshing editor');
          try {
            const updatedCurrentDoc = await DocumentManager.getDocument(currentDocId);
            if (updatedCurrentDoc && updatedCurrentDoc.updatedAt !== currentDocument.updatedAt) {
              setCurrentDocument(updatedCurrentDoc);
              setContent(updatedCurrentDoc.content);
              setIsSaved(true); // Document updated from remote is considered saved
              
              // Update the editor view with the new content
              if (editorView) {
                editorView.dispatch({
                  changes: {
                    from: 0,
                    to: editorView.state.doc.length,
                    insert: updatedCurrentDoc.content
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error refreshing current document:', error);
          }
        }
        
        // Only reload full document list if we need to (for the command palette)
        if (isCommandPaletteOpen) {
          const allDocs = await DocumentManager.getAllDocuments();
          setDocuments(allDocs);
        }
      } else {
        // Fallback: full refresh only if we don't have specific IDs
        const allDocs = await DocumentManager.getAllDocuments();
        setDocuments(allDocs);
        
        // Check if the current document was updated
        if (currentDocument) {
          const updatedCurrentDoc = allDocs.find(doc => doc.id === currentDocument.id || doc._id === currentDocument.id);
          if (updatedCurrentDoc && updatedCurrentDoc.updatedAt !== currentDocument.updatedAt) {
            console.log('Current document was updated remotely, refreshing editor');
            setCurrentDocument(updatedCurrentDoc);
            setContent(updatedCurrentDoc.content);
            setIsSaved(true); // Document updated from remote is considered saved
            
            // Update the editor view with the new content
            if (editorView) {
              editorView.dispatch({
                changes: {
                  from: 0,
                  to: editorView.state.doc.length,
                  insert: updatedCurrentDoc.content
                }
              });
            }
          }
        }
      }
    };

    const handleOpenSettingsDocument = () => {
      // Open the command palette and focus on settings document
      setIsCommandPaletteOpen(true);
      // The user can then select the settings document
    };

    window.addEventListener('documentsUpdated', handleDocumentsUpdate);
    window.addEventListener('openSettingsDocument', handleOpenSettingsDocument);
    
    return () => {
      window.removeEventListener('documentsUpdated', handleDocumentsUpdate);
      window.removeEventListener('openSettingsDocument', handleOpenSettingsDocument);
    };
  }, [currentDocument, editorView, isCommandPaletteOpen]);
  
  // Refresh documents list when command palette opens (lazy loading)
  useEffect(() => {
    if (isCommandPaletteOpen) {
      async function refreshDocumentsList() {
        const allDocs = await DocumentManager.getAllDocuments();
        setDocuments(allDocs);
      }
      refreshDocumentsList();
    }
  }, [isCommandPaletteOpen]);
  
  // Debounced save - wait for user to stop typing before saving (only for regular documents)
  useEffect(() => {
    if (currentDocument && content !== currentDocument.content) {
      // Mark as unsaved when content changes
      setIsSaved(false);
      
      // Skip autosave for settings document
      if (currentDocument.id === 'settings' || currentDocument.noAutosave) {
        return; // No cleanup needed for settings
      }
      
      // Clear any existing timeout
      const timeoutId = setTimeout(async () => {
        const updatedDoc = {
          ...currentDocument,
          content,
          updatedAt: new Date().toISOString()
        };
        
        try {
          console.log('Auto-saving document after typing pause...');
          const savedDoc = await DocumentManager.saveDocument(updatedDoc);
          setCurrentDocument(savedDoc);
          setIsSaved(true); // Mark as saved after successful save
          
          // Update document list to reflect the change
          const allDocs = await DocumentManager.getAllDocuments();
          setDocuments(allDocs);
        } catch (error) {
          console.error('Error auto-saving document:', error);
          // Keep isSaved as false if save failed
        }
      }, 2000); // Wait 2 seconds after user stops typing
      
      // Cleanup function to clear timeout if component unmounts or content changes again
      return () => clearTimeout(timeoutId);
    }
  }, [content, currentDocument]);
  
  // We don't need commands list anymore since we're directly showing documents
  
  // Handle document selection from the command palette
  const handleDocumentSelect = (document) => {
    if (document && document.id !== currentDocument?.id) {
      // Save current document before switching
      if (currentDocument) {
        const updatedDoc = {
          ...currentDocument,
          content,
          updatedAt: new Date().toISOString()
        };
        
        // Save the document but don't wait for it
        DocumentManager.saveDocument(updatedDoc).catch(err => 
          console.error('Error saving document before switching:', err)
        );
      }
      
      // Switch to the selected document
      setCurrentDocument(document);
      setContent(document.content);
      setIsSaved(true); // Reset save status for new document
      
      // Update editor content and focus
      if (editorView) {
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: document.content
          }
        });
        
        // Focus the editor after switching documents
        editorView.focus();
      }
    }
  };
  
  // Handle creating a new document
  const handleCreateDocument = async (title) => {
    try {
      // Create a new document
      const newDoc = await DocumentManager.createDocument(title);
      
      // Update document list
      const allDocs = await DocumentManager.getAllDocuments();
      setDocuments(allDocs);
      
      // Switch to the new document
      setCurrentDocument(newDoc);
      setContent(newDoc.content);
      setIsSaved(true); // New document is considered saved
      
      // Update editor content and focus
      if (editorView) {
        editorView.dispatch({
          changes: {
            from: 0,
            to: editorView.state.doc.length,
            insert: newDoc.content
          }
        });
        
        // Focus the editor after creating a new document
        editorView.focus();
      }
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };
  
  // Handle keyboard shortcuts (Command palette with Ctrl+P and save with Ctrl+S)
  const handleKeyDown = useCallback((e) => {
    // Open document palette with Ctrl+P or Ctrl+K
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'k')) {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }
    
    // Also allow Ctrl+Enter as an alternative shortcut to open command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setIsCommandPaletteOpen(true);
    }
    
    // Save shortcut: Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentDocument) {
        const updatedDoc = {
          ...currentDocument,
          content,
          updatedAt: new Date().toISOString()
        };
        
        // Use async/await in an IIFE
        (async () => {
          try {
            const isSettings = currentDocument.id === 'settings';
            console.log(isSettings ? 'Saving settings and applying changes...' : 'Manual save triggered (Ctrl+S)');
            
            const savedDoc = await DocumentManager.saveDocument(updatedDoc);
            setCurrentDocument(savedDoc);
            setIsSaved(true); // Mark as saved after successful save
            
            if (isSettings) {
              console.log('✅ Settings saved and applied successfully');
              // Show a brief success message
              const statusElement = document.querySelector('.save-status');
              if (statusElement) {
                statusElement.textContent = '✅ Settings Applied';
                statusElement.style.color = '#28a745';
                setTimeout(() => {
                  statusElement.textContent = currentDocument.noAutosave ? 'Press Ctrl+S to save' : 'Saved';
                  statusElement.style.color = '';
                }, 2000);
              }
            } else {
              const allDocs = await DocumentManager.getAllDocuments();
              setDocuments(allDocs);
              console.log('Document saved successfully');
            }
          } catch (error) {
            console.error('Error saving document:', error);
            setIsSaved(false);
            
            // Show error message
            const statusElement = document.querySelector('.save-status');
            if (statusElement) {
              statusElement.textContent = `❌ Error: ${error.message}`;
              statusElement.style.color = '#dc3545';
              setTimeout(() => {
                statusElement.textContent = currentDocument.noAutosave ? 'Press Ctrl+S to save' : 'Unsaved';
                statusElement.style.color = '';
              }, 3000);
            }
          }
        })();
      }
    }
  }, [currentDocument, content]);

  useEffect(() => {
    // Add global keyboard listener
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!editorRef.current || !currentDocument) return;

    // Choose language mode based on document type
    const languageExtension = currentDocument.type === 'settings' 
      ? yaml()
      : markdown({ codeLanguages: languages });

    // Create the editor view - ensure we're creating it with the right layout
    const view = new EditorView({
      doc: currentDocument.content,
      extensions: [
        basicSetup,
        languageExtension,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
        keymap.of([
          ...defaultKeymap,
          {
            key: 'Ctrl-Enter',
            run: () => {
              setIsCommandPaletteOpen(true);
              return true;
            }
          },
          {
            key: 'Ctrl-p',
            run: () => {
              setIsCommandPaletteOpen(true);
              return true;
            }
          },
          {
            key: 'Ctrl-k',
            run: () => {
              setIsCommandPaletteOpen(true);
              return true;
            }
          },
          {
            key: 'Ctrl-s',
            run: () => {
              if (currentDocument) {
                const updatedDoc = {
                  ...currentDocument,
                  content,
                  updatedAt: new Date().toISOString()
                };
                
                // Use an IIFE to handle async calls
                (async () => {
                  try {
                    console.log('Manual save triggered (Ctrl+S in editor)');
                    const savedDoc = await DocumentManager.saveDocument(updatedDoc);
                    setCurrentDocument(savedDoc);
                    setIsSaved(true); // Mark as saved after successful save
                    const allDocs = await DocumentManager.getAllDocuments();
                    setDocuments(allDocs);
                    console.log('Document saved successfully');
                  } catch (error) {
                    console.error('Error saving document in CodeMirror keybinding:', error);
                  }
                })();
              }
              return true;
            }
          }
        ])
      ],
      parent: editorRef.current
    });

    setEditorView(view);
    setContent(currentDocument.content);

    // Focus the editor when it's first created or when switching documents
    setTimeout(() => {
      view.focus();
    }, 0);

    // Cleanup
    return () => {
      view.destroy();
    };
  }, [currentDocument?.id]); // Only re-create editor when switching documents

  return (
    <div 
      ref={editorWrapperRef}
      className="editor-wrapper"
    >
      {/* Header is now part of the flex layout and clickable */}
      {currentDocument && (
        <div 
          className="document-header"
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Click to open document list"
        >
          <h1 className="document-title">
            {currentDocument.icon && <span className="document-icon">{currentDocument.icon}</span>}
            {currentDocument.title} 
            {!isSaved && (
              <span className="save-status unsaved">
                {currentDocument.noAutosave ? 'Press Ctrl+S to save' : '●'}
              </span>
            )}
            {isSaved && currentDocument.noAutosave && (
              <span className="save-status saved">
                Saved
              </span>
            )}
            <span className="title-click-indicator">⌘</span>
          </h1>
          <div className="document-meta">
            {currentDocument.noAutosave ? (
              <span>Settings document - Manual save only (Ctrl+S)</span>
            ) : (
              <span>Last updated: {new Date(currentDocument.updatedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
      
      {/* Editor container will expand to fill remaining space */}
      <div ref={editorRef} className="editor" />
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
        documents={documents}
        onDocumentSelect={handleDocumentSelect}
        onDocumentCreate={handleCreateDocument}
      />
    </div>
  );
};

export default CodeEditor;
