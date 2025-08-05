/**
 * ConfigDisplay - Component to display current configuration
 */
import React from 'react';
import { useConfig } from '../contexts/ConfigContext';
import './ConfigDisplay.css';

const ConfigDisplay = ({ showTitle = true }) => {
  const { config } = useConfig();

  return (
    <div className="config-display">
      {showTitle && <h3>Current Configuration</h3>}
      <div className="config-grid">
        <div className="config-item">
          <label>CouchDB URL:</label>
          <span className="config-value">{config.couchdbUrl}</span>
        </div>
        <div className="config-item">
          <label>Sync Enabled:</label>
          <span className={`config-value ${config.syncEnabled ? 'enabled' : 'disabled'}`}>
            {config.syncEnabled ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="config-item">
          <label>Sync Interval:</label>
          <span className="config-value">{config.syncInterval / 1000}s</span>
        </div>
        <div className="config-item">
          <label>Theme:</label>
          <span className="config-value">{config.theme}</span>
        </div>
      </div>
      <div className="config-note">
        <p>💡 Use browser console commands to modify configuration:</p>
        <code>commad.config.setCouchDB("http://your-couchdb-url:5984")</code>
      </div>
    </div>
  );
};

export default ConfigDisplay;
