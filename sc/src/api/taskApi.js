import api from './axiosConfig'

const isRetryableTaskError = (error) => {
  const status = error?.response?.status
  return !status || [400, 404, 405, 415].includes(status)
}

const requestWithFallbacks = async (requests) => {
  let lastError = null

  for (const execute of requests) {
    try {
      return await execute()
    } catch (error) {
      lastError = error
      if (!isRetryableTaskError(error)) break
    }
  }

  throw lastError
}

export const postTaskAssignment = (complaintId, employeeId, adminId) =>
  requestWithFallbacks([
    () => api.post('/taskAssign/post', null, { params: { complaintId, employeeId, adminId } }),
    () => api.post('/taskAssign/assign', null, { params: { complaintId, employeeId, adminId } }),
    () => api.post('/taskAssign/create', null, { params: { complaintId, employeeId, adminId } }),
  ])

export const updateTaskStatus = (id, status) =>
  requestWithFallbacks([
    () => api.put(`/taskAssign/update/${id}`, null, { params: { status } }),
    () => api.post(`/taskAssign/update/${id}`, null, { params: { status } }),
    () => api.put(`/taskAssign/status/${id}`, null, { params: { status } }),
  ])

export const getAllTasks = () =>
  requestWithFallbacks([
    () => api.get('/taskAssign/all'),
    () => api.get('/taskAssign/getAll'),
    () => api.get('/taskAssign'),
  ])

export const getTasksByEmployee = (id) =>
  requestWithFallbacks([
    () => api.get(`/taskAssign/employee/${id}`),
    () => api.get('/taskAssign/employee', { params: { employeeId: id } }),
    () => api.get('/taskAssign/byEmployee', { params: { employeeId: id } }),
  ])

export const deleteTask = (id) =>
  requestWithFallbacks([
    () => api.delete(`/taskAssign/delete/${id}`),
    () => api.delete(`/taskAssign/${id}`),
  ])
