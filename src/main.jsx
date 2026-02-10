import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import App from './App.tsx'
import { PluginProvider } from './plugins'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PluginProvider>
        <App />
      </PluginProvider>
    </AuthProvider>
  </StrictMode>,
)
