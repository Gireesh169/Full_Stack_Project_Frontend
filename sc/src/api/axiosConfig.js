import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
const fallbackBaseUrl = 'https://smart-city-fp56.onrender.com'
const deployedImageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL || configuredBaseUrl || fallbackBaseUrl
const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

const rawBaseUrl = isLocalhost
  ? 'http://localhost:8088'
  : deployedImageBaseUrl && deployedImageBaseUrl.trim()
    ? deployedImageBaseUrl.trim()
    : fallbackBaseUrl
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
