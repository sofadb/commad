# CouchDB Local Development Setup

This directory contains everything needed to run a local CouchDB instance for development and debugging.

## Prerequisites

- Docker installed on your system
- Docker Compose

## Quick Start

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. (Optional) Edit `.env` to customize your settings

3. Start CouchDB:
   ```bash
   docker-compose up -d
   ```

4. Access Fauxton web interface at: http://localhost:5984/_utils

## Configuration

### Environment Variables

The following environment variables can be configured in your `.env` file:

- `COUCHDB_USER` - Admin username (default: admin)
- `COUCHDB_PASSWORD` - Admin password (default: password)
- `COUCHDB_PORT` - Port to expose CouchDB on (default: 5984)

### Default Credentials

- **Username**: admin
- **Password**: password

### CORS Configuration

CORS (Cross-Origin Resource Sharing) is pre-configured to allow requests from web applications. The configuration is in `local.ini` and includes:

- **Origins**: `*` (allows all origins - customize for production)
- **Methods**: GET, PUT, POST, HEAD, DELETE
- **Headers**: accept, authorization, content-type, origin, referer, x-csrf-token
- **Credentials**: Enabled

> **⚠️ Production Note**: The CORS configuration allows all origins (`*`) for development convenience. In production, replace `*` with your specific domain(s) in `local.ini`.

> **⚠️ Security Note**: These default credentials are for development only. Use secure credentials in production environments.

## Usage

### Starting the Database

```bash
# Start CouchDB in the background
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stopping the Database

```bash
# Stop the container
docker-compose down

# Stop and remove volumes (⚠️ This will delete all data)
docker-compose down -v
```

### Viewing Logs

```bash
# View current logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

## Accessing CouchDB

### Web Interface (Fauxton)
- URL: http://localhost:5984/_utils
- Login with the credentials from your `.env` file

### REST API
- Base URL: http://localhost:5984
- Authentication: HTTP Basic Auth

### Example API Calls

```bash
# Check if CouchDB is running
curl http://localhost:5984/

# Create a new database
curl -X PUT http://admin:password@localhost:5984/mydb

# List all databases
curl http://admin:password@localhost:5984/_all_dbs

# Create a document
curl -X POST http://admin:password@localhost:5984/mydb \
  -H "Content-Type: application/json" \
  -d '{"name": "test document", "type": "example"}'

# Test CORS (from browser or web app)
fetch('http://localhost:5984/', {
  method: 'GET',
  credentials: 'include'
}).then(response => response.json()).then(data => console.log(data));
  -d '{"name": "test document", "type": "example"}'
```

## Data Persistence

Database data is persisted in a Docker volume named `couchdb_data`. This means your data will survive container restarts but will be lost if you run `docker-compose down -v`.

## Troubleshooting

### Container won't start
- Check if port 5984 is already in use: `lsof -i :5984`
- View container logs: `docker-compose logs`

### Can't access Fauxton
- Ensure the container is running: `docker-compose ps`
- Check if the port is properly mapped: `docker port couchdb-dev`

### Reset everything
```bash
# Stop containers and remove all data
docker-compose down -v

# Remove the Docker image (forces fresh download)
docker rmi couchdb:3.3

# Start fresh
docker-compose up -d
```

## Development Tips

1. **Database Setup Scripts**: You can add initialization scripts in the `scripts/` directory
2. **Backup**: Use `docker exec couchdb-dev couchdb-backup` for backups
3. **Monitoring**: Access `http://localhost:5984/_stats` for database statistics
