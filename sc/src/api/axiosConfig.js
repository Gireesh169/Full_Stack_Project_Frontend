import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
const fallbackBaseUrl = 'http://localhost:8088'
const rawBaseUrl = configuredBaseUrl && configuredBaseUrl.trim() ? configuredBaseUrl.trim() : fallbackBaseUrl
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
