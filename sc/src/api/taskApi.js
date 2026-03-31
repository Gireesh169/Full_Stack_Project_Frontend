import api from './axiosConfig'

export const postTaskAssignment = (complaintId, employeeId, adminId) =>
  api.post('http://localhost:8086/taskAssign/post', null, { params: { complaintId, employeeId, adminId } })

export const updateTaskStatus = (id, status) =>
  api.put(`/taskAssign/update/${id}`, null, { params: { status } })

export const getAllTasks = () => api.get('/taskAssign/all')
export const getTasksByEmployee = (id) => api.get(`/taskAssign/employee/${id}`)
export const deleteTask = (id) => api.delete(`/taskAssign/delete/${id}`)
