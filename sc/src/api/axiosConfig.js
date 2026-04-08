import axios from 'axios'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const configuredImageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const fallbackBaseUrl = 'https://smart-city-fp56.onrender.com'
const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

const deployedApiOrigin =
  configuredApiBaseUrl && configuredApiBaseUrl.trim()
    ? configuredApiBaseUrl.trim()
    : fallbackBaseUrl

let deployedImageOrigin =
  configuredImageBaseUrl && configuredImageBaseUrl.trim()
    ? configuredImageBaseUrl.trim()
    : deployedApiOrigin

// Prevent mixed-content failures in deployment when frontend runs on HTTPS.
if (
  !isLocalhost &&
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  deployedImageOrigin.startsWith('http://')
) {
  deployedImageOrigin = deployedImageOrigin.replace('http://', 'https://')
}

// On deployment, route requests through Vercel rewrite (/api/*) to avoid browser CORS failures.
export const API_BASE_URL = isLocalhost ? 'http://localhost:8088' : '/api'
export const IMAGE_BASE_URL = (isLocalhost ? 'http://localhost:8088' : deployedImageOrigin).replace(/\/+$/, '')

export const resolveImageUrl = (value) => {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return ''

  if (rawValue.startsWith('http')) {
    try {
      const parsedUrl = new URL(rawValue)
      const imageOrigin = new URL(IMAGE_BASE_URL)

      if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
        parsedUrl.protocol = imageOrigin.protocol
        parsedUrl.hostname = imageOrigin.hostname
        parsedUrl.port = imageOrigin.port
        return parsedUrl.toString()
      }
    } catch {
      return rawValue
    }

    return rawValue
  }

  const normalizedPath = rawValue.replace(/^\/+/, '')
  try {
    return new URL(normalizedPath, IMAGE_BASE_URL).toString()
  } catch {
    return `${IMAGE_BASE_URL}/${normalizedPath}`
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
