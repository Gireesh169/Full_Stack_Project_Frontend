import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.trim() ? configuredBaseUrl : 'https://smart-city-fp56.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
})

export default api
