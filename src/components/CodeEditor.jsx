import { useEffect, useRef, useState, useCallback } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
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
  
  // Initialize documents from database
  useEffect(() => {
    async function loadDocuments() {
      const allDocs = await DocumentManager.getAllDocuments();
      setDocuments(allDocs);
      
      // Load the most recent document by default
      if (allDocs.length > 0) {
        setCurrentDocument(allDocs[0]);
        setContent(allDocs[0].content);
      }
    }
    
    loadDocuments();
  }, []);
  
  // Save current document content when it changes
  useEffect(() => {
    if (currentDocument && content !== currentDocument.content) {
      const updatedDoc = {
        ...currentDocument,
        content,
        updatedAt: new Date().toISOString()
      };
      
      async function saveDocument() {
        const savedDoc = await DocumentManager.saveDocument(updatedDoc);
        setCurrentDocument(savedDoc);
        
        // Update document list to reflect the change
        const allDocs = await DocumentManager.getAllDocuments();
        setDocuments(allDocs);
      }
      
      saveDocument();
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
            const savedDoc = await DocumentManager.saveDocument(updatedDoc);
            setCurrentDocument(savedDoc);
            const allDocs = await DocumentManager.getAllDocuments();
            setDocuments(allDocs);
          } catch (error) {
            console.error('Error saving document with keyboard shortcut:', error);
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

    // Create the editor view - ensure we're creating it with the right layout
    const view = new EditorView({
      doc: currentDocument.content,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
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
                    const savedDoc = await DocumentManager.saveDocument(updatedDoc);
                    setCurrentDocument(savedDoc);
                    const allDocs = await DocumentManager.getAllDocuments();
                    setDocuments(allDocs);
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
            {currentDocument.title} <span className="title-click-indicator">⌘</span>
          </h1>
          <div className="document-meta">
            Last updated: {new Date(currentDocument.updatedAt).toLocaleString()}
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
