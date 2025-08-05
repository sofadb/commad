import React, { useState } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import './ConflictResolver.css';

const ConflictResolver = ({ conflictCount, onRefresh }) => {
  const [isResolving, setIsResolving] = useState(false);

  const handleAutoResolve = async () => {
    try {
      setIsResolving(true);
      const resolved = await DatabaseService.autoResolveConflicts();
      
      if (resolved > 0) {
        console.log(`Auto-resolved ${resolved} conflict(s)`);
        // Refresh the conflicts list and document list
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error auto-resolving conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  if (conflictCount === 0) {
    return null;
  }

  return (
    <div className="conflict-resolver-simple">
      <div className="conflict-notification">
        <span className="conflict-icon">⚠️</span>
        <span className="conflict-message">
          {conflictCount} document conflict{conflictCount > 1 ? 's' : ''} detected
        </span>
        <button 
          onClick={handleAutoResolve}
          disabled={isResolving}
          className="auto-resolve-button"
        >
          {isResolving ? 'Resolving...' : 'Auto-Resolve'}
        </button>
      </div>
      <div className="conflict-help">
        Conflicts are usually resolved automatically. Click "Auto-Resolve" to merge changes or create conflict markers.
      </div>
    </div>
  );
};

export default ConflictResolver;
