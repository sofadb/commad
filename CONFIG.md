# Configuration Management

This document explains how to use the configuration management system in Commad.

## Overview

The configuration system provides:
- Global configuration store using React Context
- Persistent storage in localStorage
- Browser console tools for easy configuration management
- Validation for configuration values
- Real-time updates across the application

## Available Configuration Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `couchdbUrl` | string | `/db` | URL for CouchDB server (use `/db` for Vite proxy) |
| `couchdbUsername` | string | `""` | CouchDB username (optional) |
| `couchdbPassword` | string | `""` | CouchDB password (optional) |
| `syncEnabled` | boolean | `false` | Enable/disable synchronization |
| `syncInterval` | number | `30000` | Sync interval in milliseconds |
| `appName` | string | `commad` | Application name |
| `theme` | string | `light` | UI theme preference |

## Using Console Tools

The configuration can be managed through the browser console using the `commad` global object.

### Configuration Commands

```javascript
// Show help
commad.help()
commad.config.help()

// Quick setup (recommended for 401 errors)
commad.config.setup("http://localhost:5984", "username", "password")

// Manual configuration
// Set CouchDB URL with validation
commad.config.setCouchDB('/db') // Use Vite proxy (recommended)
// OR
commad.config.setCouchDB('http://localhost:5984') // Direct connection
commad.config.setAuth('username', 'password')

// View current configuration
commad.config.getAll()

// Get a specific config value
commad.config.get('couchdbUrl')

// Set a configuration value
commad.config.set('syncEnabled', true)

// Clear authentication
commad.config.clearAuth()
```

### Sync Management Commands

```javascript
// Show sync help
commad.sync.help()

// Check sync status
commad.sync.status()
commad.sync.info()

// Manual sync operations
commad.sync.force()     // Force a full sync
commad.sync.push()      // Push local changes to remote
commad.sync.pull()      // Pull changes from remote

// Connection management
commad.sync.start()     // Start continuous sync
commad.sync.stop()      // Stop sync
commad.sync.reconnect() // Reconnect to remote

// Conflict resolution
commad.sync.conflicts() // List documents with conflicts
commad.sync.resolve(docId, winningRev, losingRevs) // Resolve conflict
```

### Advanced Commands

```javascript
// Export configuration as JSON
commad.config.export()

// Import configuration from JSON
commad.config.import('{"couchdbUrl": "http://example.com:5984", "syncEnabled": true}')

// Reset to default configuration
commad.config.reset()

// Test CouchDB connection
commad.utils.testCouchDB()

// Clear all application data
commad.utils.clearData()
```

## Using in React Components

```jsx
import { useConfig } from '../contexts/ConfigContext';

function MyComponent() {
  const { config, setConfig, setCouchDBUrl } = useConfig();
  
  // Access config values
  const couchdbUrl = config.couchdbUrl;
  
  // Update configuration
  const handleUrlChange = (url) => {
    setCouchDBUrl(url);
  };
  
  return (
    <div>
      <p>Current CouchDB URL: {couchdbUrl}</p>
      <button onClick={() => handleUrlChange('http://new-url:5984')}>
        Update URL
      </button>
    </div>
  );
}
```

## Using ConfigService Directly

```javascript
import configManager from '../services/ConfigService';

// Get configuration
const url = configManager.get('couchdbUrl');

// Set configuration
configManager.set('syncEnabled', true);

// Listen for changes
configManager.addListener((newConfig) => {
  console.log('Config changed:', newConfig);
});
```

## Proxy Setup (Recommended)

The application uses Vite's built-in proxy to avoid CORS issues during development. The proxy is configured in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/db': {
      target: process.env.COUCHDB_URL || 'http://localhost:5984',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/db/, '')
    }
  }
}
```

### Using the Proxy

1. **Default setup**: The application is pre-configured to use `/db` as the CouchDB URL
2. **Custom CouchDB target**: Set the `COUCHDB_URL` environment variable
3. **No CORS configuration needed**: The proxy handles all cross-origin requests

### Environment Variables

Create a `.env` file in the project root:

```bash
# Optional: Custom CouchDB URL for proxy target
COUCHDB_URL=http://localhost:5984
# or for GitHub Codespaces
COUCHDB_URL=https://your-codespace-5984.app.github.dev
```

## Getting Started

1. Open the browser developer console
2. Type `commad.help()` to see available commands
3. **Quick setup with proxy** (recommended): `commad.config.setup("/db", "username", "password")`
4. **Or set URL manually**: `commad.config.setCouchDB("/db")` (for proxy) or `commad.config.setCouchDB("http://your-couchdb-url:5984")` (direct)
5. **If you get a 401 error**: Set authentication: `commad.config.setAuth("username", "password")`
6. Enable sync: `commad.sync.start()`
7. Check sync status: `commad.sync.status()`
8. View the configuration and sync panels in the UI

### Troubleshooting 401 Errors

If you encounter 401 Unauthorized errors:

1. **Check if CouchDB requires authentication**:
   ```javascript
   commad.utils.testCouchDB()
   ```

2. **Set your credentials**:
   ```javascript
   commad.config.setAuth("your-username", "your-password")
   ```

3. **Test the connection again**:
   ```javascript
   commad.utils.testCouchDB()
   ```

4. **Enable sync**:
   ```javascript
   commad.sync.start()
   ```

The configuration is automatically saved to localStorage and will persist between browser sessions. Sync runs continuously in the background when enabled.

## Sync Features

- **Continuous sync**: Real-time bidirectional synchronization with CouchDB
- **Offline support**: Works offline and syncs when connection is restored
- **Conflict resolution**: Automatic conflict detection with manual resolution tools
- **Manual sync**: Force sync, push-only, or pull-only operations
- **Status monitoring**: Real-time sync status in the UI and console
- **Error handling**: Comprehensive error reporting and recovery
