import axios from 'axios'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const configuredImageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const fallbackBaseUrl = 'https://smart-city-fp56.onrender.com'
const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

const rawApiBaseUrl = isLocalhost
  ? 'http://localhost:8088'
  : configuredApiBaseUrl && configuredApiBaseUrl.trim()
    ? configuredApiBaseUrl.trim()
    : fallbackBaseUrl

let normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')

// Prevent mixed-content failures in deployment when frontend runs on HTTPS.
if (
  !isLocalhost &&
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  normalizedApiBaseUrl.startsWith('http://')
) {
  normalizedApiBaseUrl = normalizedApiBaseUrl.replace('http://', 'https://')
}

export const API_BASE_URL = normalizedApiBaseUrl
export const IMAGE_BASE_URL =
  (configuredImageBaseUrl && configuredImageBaseUrl.trim()
    ? configuredImageBaseUrl.trim()
    : API_BASE_URL).replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
