import api from './axiosConfig'

export const addCityInfo = (payload) => api.post('/citycontroller/add', payload)
export const getAllCityInfo = () => api.get('/citycontroller/getAll')
export const getCityInfoById = (id) => api.get(`/citycontroller/getById/${id}`)
export const deleteCityInfo = (id) => api.delete(`/citycontroller/delete/${id}`)
