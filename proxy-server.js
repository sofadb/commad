/**
 * Development proxy server for CouchDB
 * This proxy helps avoid CORS issues during development
 */
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Proxy middleware configuration
const proxyOptions = {
  target: COUCHDB_URL,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${COUCHDB_URL}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are set
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, HEAD, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With';
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    res.status(500).json({
      error: 'Proxy Error',
      message: err.message,
      target: COUCHDB_URL
    });
  }
};

// Create proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy: 'CouchDB Development Proxy',
    target: COUCHDB_URL,
    timestamp: new Date().toISOString()
  });
});

// Proxy all other requests to CouchDB
app.use('/', proxy);

// Start the proxy server
app.listen(PORT, () => {
  console.log(`
🚀 CouchDB Development Proxy Server
===================================
Proxy URL:    http://localhost:${PORT}
Target:       ${COUCHDB_URL}
Health Check: http://localhost:${PORT}/health

Use this proxy URL in your application configuration:
commad.config.setCouchDB("http://localhost:${PORT}")
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down proxy server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down proxy server...');
  process.exit(0);
});
