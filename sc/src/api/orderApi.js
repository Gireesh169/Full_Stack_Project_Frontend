import api from './axiosConfig'

export const getUserOrders = (userId) => api.get(`http://localhost:8086/orders/user/${userId}`)

export const cancelOrder = (orderId) => api.put(`http://localhost:8086/orders/cancel/${orderId}`)