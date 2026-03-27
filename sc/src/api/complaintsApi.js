import api from './axiosConfig'

export const postComplaint = (payload) => api.post('/complaints/posting', payload)
export const getAllComplaints = () => api.get('/complaints/getComplaints')
export const getComplaintById = (id) => api.get(`/complaints/getById/${id}`)
export const updateComplaintStatus = (id, status) => api.put(`/complaints/updateStatus/${id}`, status, {
  headers: { 'Content-Type': 'text/plain' },
})
export const deleteComplaint = (id) => api.delete(`/complaints/delete/${id}`)
