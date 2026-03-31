import api from './axiosConfig'

export const postComplaint = (payload) => api.post('/complaints/posting', payload)
export const getAllComplaints = () => api.get('/complaints/getComplaints')
export const getComplaintById = (id) => api.get(`/complaints/getById/${id}`)
export const assignComplaint = (id, employeeId) =>
  api.put(`/complaints/assign/${id}`, { employeeId })

export const employeeUpdateComplaintStatus = (id, status) =>
  api.put(`/complaints/updateStatus/${id}`, status, {
    headers: { 'Content-Type': 'text/plain' },
  })

export const approveComplaint = (id) => api.put(`http://localhost:8086/complaints/approve/${id}`)

// Backward compatibility for existing references.
export const updateComplaintStatus = (id, status) => employeeUpdateComplaintStatus(id, status)
export const deleteComplaint = (id) => api.delete(`/complaints/delete/${id}`)
