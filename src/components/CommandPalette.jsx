import { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import './CommandPalette.css';
import DocumentManager from '../services/DocumentManager';

/**
 * CommandPalette component for document management
 * Uses cmdk for command palette functionality
 */
const CommandPalette = ({ 
  isOpen, 
  setIsOpen, 
  documents = [],
  onDocumentSelect,
  onDocumentCreate
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  // Focus the input when the command palette is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Reset search when opened
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);
  
  // Handle key down events for creating new documents with Ctrl+Enter
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && search.trim()) {
      // Create new document with the current search text as title
      onDocumentCreate(search.trim());
      setIsOpen(false);
      setSearch('');
      e.preventDefault();
    }
  }, [search, onDocumentCreate, setIsOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-overlay" />
        <Dialog.Content className="command-content">
          <Command className="command-palette" label="Command Palette" loop={true} shouldFilter={true}>
            <div className="command-header">
              <Command.Input
                ref={inputRef}
                value={search}
                onValueChange={setSearch}
                onKeyDown={handleKeyDown}
                placeholder="Search documents or type a new title + Ctrl+Enter"
                className="command-input"
                autoFocus
              />
              <div className="command-tip">
                <span className="command-tip-text">Press <kbd>Enter</kbd> to open, <kbd>Ctrl+Enter</kbd> to create new</span>
              </div>
            </div>
            
            <Command.List className="command-list">
              {/* Show empty state */}
              <Command.Empty className="command-empty">
                <div className="command-empty-state">
                  <p>No documents found</p>
                  {search.trim() && (
                    <p className="command-empty-tip">
                      Press <kbd>Ctrl+Enter</kbd> to create "<strong>{search.trim()}</strong>" as a new document
                    </p>
                  )}
                </div>
              </Command.Empty>
              
              {/* List all documents */}
              <Command.Group heading="Documents">
                {documents.map((document) => (
                  <Command.Item
                    key={document.id}
                    className="command-item"
                    onSelect={() => {
                      onDocumentSelect(document);
                      setIsOpen(false);
                    }}
                    value={document.title} // This helps with filtering
                  >
                    <div className="command-icon">📝</div>
                    <div className="command-details">
                      <div className="command-name">{document.title}</div>
                      <div className="command-description">
                        Last updated: {new Date(document.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="command-action">
                      <span className="command-action-tip">Press Enter</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
              
              {/* Create new document option */}
              {search.trim() && (
                <Command.Item 
                  className="command-item command-create-new"
                  onSelect={() => {
                    onDocumentCreate(search.trim());
                    setIsOpen(false);
                  }}
                >
                  <div className="command-icon">➕</div>
                  <div className="command-details">
                    <div className="command-name">Create "{search.trim()}"</div>
                    <div className="command-description">
                      Create a new document with this title
                    </div>
                  </div>
                  <div className="command-shortcut">
                    <span className="command-key">Ctrl</span>
                    <span className="command-key">Enter</span>
                  </div>
                </Command.Item>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CommandPalette;
