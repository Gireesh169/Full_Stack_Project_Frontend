import api from './axiosConfig'

export const addEmployee = (payload) => api.post('/Employee/addingEmployee', { id: 0, ...payload })
export const getAllEmployees = () => api.get('/Employee/getAllEmployees')
export const getEmployeeById = (id) => api.get(`/Employee/getById/${id}`)
export const getEmployeeByUserId = (userId) => api.get(`/employees/user/${userId}`)
export const deleteEmployee = (id) => api.delete(`/Employee/delete/${id}`)
