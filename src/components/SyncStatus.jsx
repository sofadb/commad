import React, { useState, useEffect } from 'react';
import './SyncStatus.css';
import { DatabaseService } from '../services/DatabaseService';

const SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({
    status: 'disconnected',
    isOnline: navigator.onLine,
    lastSyncTime: null,
    error: null,
    isConnected: false,
    couchdbUrl: null
  });

  const [conflicts, setConflicts] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Get initial status
    const status = DatabaseService.getSyncStatus();
    setSyncStatus(status);

    // Listen for sync status changes
    const unsubscribe = DatabaseService.addSyncListener((newStatus) => {
      setSyncStatus(newStatus);
    });

    // Check for conflicts periodically
    const checkConflicts = async () => {
      try {
        const conflictList = await DatabaseService.getConflicts();
        setConflicts(conflictList);
      } catch (error) {
        console.error('Error checking conflicts:', error);
      }
    };

    checkConflicts();
    const conflictInterval = setInterval(checkConflicts, 30000); // Check every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(conflictInterval);
    };
  }, []);

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return '🔴';
    
    switch (syncStatus.status) {
      case 'connected':
      case 'up-to-date':
        return '🟢';
      case 'syncing':
        return '🟡';
      case 'error':
        return '🔴';
      case 'offline':
        return '⚫';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    
    switch (syncStatus.status) {
      case 'connected':
        return 'Connected';
      case 'up-to-date':
        return 'Up to date';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Error';
      case 'offline':
        return 'Offline';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const handleForceSync = async () => {
    try {
      await DatabaseService.forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Never';
    return new Date(timeString).toLocaleString();
  };

  return (
    <div className="sync-status">
      <div className="sync-status-header" onClick={() => setShowDetails(!showDetails)}>
        <span className="sync-icon">{getStatusIcon()}</span>
        <span className="sync-text">{getStatusText()}</span>
        {conflicts.length > 0 && (
          <span className="conflict-badge">{conflicts.length}</span>
        )}
        <span className="toggle-icon">{showDetails ? '▼' : '▶'}</span>
      </div>

      {showDetails && (
        <div className="sync-details">
          <div className="sync-info">
            <div className="info-row">
              <span className="label">Status:</span>
              <span className="value">{getStatusText()}</span>
            </div>
            
            <div className="info-row">
              <span className="label">Online:</span>
              <span className="value">{syncStatus.isOnline ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="info-row">
              <span className="label">Connected:</span>
              <span className="value">{syncStatus.isConnected ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="info-row">
              <span className="label">Last Sync:</span>
              <span className="value">{formatTime(syncStatus.lastSyncTime)}</span>
            </div>

            {syncStatus.couchdbUrl && (
              <div className="info-row">
                <span className="label">CouchDB:</span>
                <span className="value url">{syncStatus.couchdbUrl}</span>
              </div>
            )}

            {syncStatus.error && (
              <div className="info-row error">
                <span className="label">Error:</span>
                <span className="value">{syncStatus.error}</span>
              </div>
            )}
          </div>

          <div className="sync-actions">
            <button 
              onClick={handleForceSync}
              disabled={!syncStatus.isConnected || syncStatus.status === 'syncing'}
              className="sync-button"
            >
              {syncStatus.status === 'syncing' ? 'Syncing...' : 'Force Sync'}
            </button>
          </div>

          {conflicts.length > 0 && (
            <div className="conflicts-section">
              <h4>Conflicts ({conflicts.length})</h4>
              <div className="conflicts-list">
                {conflicts.map(conflict => (
                  <div key={conflict.id} className="conflict-item">
                    <span className="conflict-id">{conflict.id}</span>
                    <span className="conflict-count">
                      {conflict.conflicts.length} revision(s)
                    </span>
                  </div>
                ))}
              </div>
              <p className="conflict-note">
                Use console tools to resolve conflicts: <code>commad.sync.conflicts()</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
