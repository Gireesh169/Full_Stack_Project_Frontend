import api from './axiosConfig'

export const postPerformance = (payload) => api.post('/employeePerformance/post', payload)
export const getAllPerformance = () => api.get('/employeePerformance/getAll')
export const getPerformanceByEmployeeId = (employeeId) => api.get(`/employeePerformance/getById/${employeeId}`)
export const triggerPerformanceUpdate = () => api.get('/employeePerformance/update')
