import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
const fallbackBaseUrl = 'https://smart-city-fp56.onrender.com'
const rawBaseUrl = configuredBaseUrl && configuredBaseUrl.trim() ? configuredBaseUrl.trim() : fallbackBaseUrl
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
