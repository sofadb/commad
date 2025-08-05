import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConfigProvider } from './contexts/ConfigContext.jsx'
import { exposeConsoleTools } from './utils/consoleTools.js'

// Initialize console tools for development
exposeConsoleTools();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
