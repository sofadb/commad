import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/commad/',
  optimizeDeps: {
    allowNodeBuiltins: ['pouchdb-browser', 'pouchdb-utils']
  },
  server: {
    proxy: {
      // Proxy all requests to /db/* to CouchDB
      '/db': {
        target: process.env.COUCHDB_URL || 'http://localhost:5984',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/db/, ''), // /db/test -> /test
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, '->', options.target + req.url.replace(/^\/db/, ''));
          });
        }
      }
    }
  }
})
