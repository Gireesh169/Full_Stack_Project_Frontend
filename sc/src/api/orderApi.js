import api from './axiosConfig'

export const getUserOrders = (userId) => api.get(`/orders/user/${userId}`)

export const cancelOrder = (orderId) => api.put(`/orders/cancel/${orderId}`)