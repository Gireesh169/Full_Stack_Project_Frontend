import api from './axiosConfig'

export const addWeather = (payload) => api.post('/weather/add', payload)
export const getAllWeather = () => api.get('/weather/all')
export const getWeatherById = (id) => api.get(`/weather/${id}`)
export const deleteWeather = (id) => api.delete(`/weather/${id}`)
