import api from './axiosConfig'

export const getNotificationsByRole = (role) => api.get(`/notifications/${role}`)
export const createNotification = (payload) => api.post('/notifications', payload)
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`)
