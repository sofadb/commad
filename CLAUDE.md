# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commad is an AI-first encrypted by design thoughts editor. It provides a secure, collaborative environment for capturing and managing thoughts with real-time synchronization through CouchDB. Thoughts are stored as structured documents in PouchDB with bidirectional sync capabilities for collaborative editing.

## Development Commands

### Core Development
- `npm run dev` - Start development server at http://localhost:5173
- `npm run build` - Build for production (output to `dist/`)
- `npm run preview` - Preview production build at http://localhost:4173
- `npm run lint` - Run ESLint code quality checks

### CouchDB Development
- `npm run proxy` - Start proxy server for CouchDB connection
- `npm run dev:proxy` - Run both proxy and dev server concurrently

### Local Database Setup
```bash
cd couchdb
cp .env.example .env
docker-compose up -d
```

## Architecture Overview

### Thoughts Storage System
Thoughts are stored as documents in PouchDB with the following structure:
- **Document ID**: Unique identifier (`doc-${timestamp}` for new thoughts)
- **Title**: Thought title/heading
- **Content**: The actual thought content (supports rich text/markdown)
- **Timestamps**: `createdAt` and `updatedAt` for versioning
- **PouchDB metadata**: `_id`, `_rev` for conflict resolution

### Core Services Layer
- **DocumentManager** (`src/services/DocumentManager.js`) - High-level document operations for thoughts, handles default document creation and settings integration
- **DatabaseService** (`src/services/DatabaseService.js`) - PouchDB wrapper providing CRUD operations for thought documents
- **SyncService** (`src/services/SyncService.js`) - Bidirectional synchronization with CouchDB, conflict resolution, and connection management for collaborative thoughts
- **ConfigService** (`src/services/ConfigService.js`) - Configuration management with localStorage persistence
- **SettingsDocumentService** (`src/services/SettingsDocumentService.js`) - Manages application settings as YAML documents

### React Context Architecture
- **ConfigContext** (`src/contexts/ConfigContext.jsx`) - Global configuration state with React hooks integration
- Uses React Context pattern with `useConfig()` hook for component integration
- Real-time configuration updates across the application

### Component Structure
- **CodeEditor** - CodeMirror 6-based editor for thought editing with language support
- **CommandPalette** - Quick command interface using cmdk for thought management
- **ConfigDisplay** - Real-time configuration status display
- **SyncStatus** - Live sync status for collaborative thoughts
- **ConflictResolver** - UI for resolving thought conflicts during collaboration

### Console Tools for Thoughts Management
The application exposes a global `commad` object for development and configuration:
- `commad.config.*` - Configuration management commands
- `commad.sync.*` - Sync operations for collaborative thoughts
- `commad.utils.*` - Utility functions for testing and data management

Access with `commad.help()` for full command reference.

## Configuration System

### Configuration Keys
- `couchdbUrl` - CouchDB server URL (default: `/db` for Vite proxy)
- `couchdbUsername/couchdbPassword` - Authentication credentials for secure access
- `syncEnabled` - Enable/disable collaborative synchronization
- `syncInterval` - Sync frequency in milliseconds
- `appName` - Application identifier
- `theme` - UI theme preference

### Proxy Configuration
Vite proxy routes `/db/*` requests to CouchDB to avoid CORS issues. Proxy target configurable via `COUCHDB_URL` environment variable.

## Thoughts Database and Synchronization

### PouchDB Integration for Thoughts
- Local database: `commad-documents` (stores all thoughts)
- Document structure includes timestamps for thought versioning
- Automatic conflict detection for collaborative editing
- Offline-first architecture with sync when connection restored

### Collaborative Features
- Continuous bidirectional sync with CouchDB for real-time collaboration
- Manual sync operations (push/pull/force) for thought synchronization
- Automatic and manual conflict resolution for collaborative thought editing
- Real-time sync status monitoring

### Conflict Resolution for Collaborative Thoughts
- Auto-merge for non-conflicting thought changes
- UI-based manual resolution for complex thought conflicts
- Console commands for programmatic conflict management
- Intelligent merging attempts to preserve thought content

## Development Patterns

### Document-Centric Architecture
- All thoughts are first-class documents in PouchDB
- Services operate on document abstractions rather than files
- Event-driven updates for real-time collaborative features
- Singleton pattern for shared state management

### Thoughts Lifecycle Management
- Default welcome document created if no thoughts exist
- Settings document managed separately from regular thoughts
- Document sorting by most recently updated thoughts
- Protection against deleting the last thought document

## Testing Collaborative Features

Use console tools for testing collaboration:
```javascript
commad.utils.testCouchDB()
commad.config.setup("/db", "username", "password")
commad.sync.status()
commad.sync.conflicts() // Check for thought conflicts
```

Common setup for collaborative thoughts editing:
1. Configure CouchDB connection with credentials
2. Enable sync for real-time collaboration
3. Monitor sync status for collaborative sessions
4. Handle conflicts when multiple users edit the same thought