import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

console.log('main.jsx: Script loaded')
const rootElement = document.getElementById('root')
console.log('main.jsx: Root element found?', !!rootElement)

if (rootElement) {
  console.log('main.jsx: Creating React root')
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <ToastContainer position="top-right" autoClose={2500} />
          </AuthProvider>
        </BrowserRouter>
      </StrictMode>,
    )
    console.log('main.jsx: Render called successfully')
  } catch (error) {
    console.error('main.jsx: Error during render', error)
  }
} else {
  console.error('main.jsx: Root element not found!')
}
