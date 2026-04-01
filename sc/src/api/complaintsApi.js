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

export const approveComplaint = (id) => api.put(`/complaints/approve/${id}`)

const buildUpdateParams = (complaintData = {}) => ({
  title: complaintData.title,
  description: complaintData.description,
  place: complaintData.place,
  address: complaintData.place,
  status: complaintData.status,
  latitude: complaintData.latitude,
  longitude: complaintData.longitude,
})

const buildFallbackFormData = (id, complaintData = {}) => {
  const formData = new FormData()
  formData.append('id', String(id))
  formData.append('title', complaintData.title ?? '')
  formData.append('description', complaintData.description ?? '')
  formData.append('place', complaintData.place ?? '')
  formData.append('address', complaintData.place ?? '')
  formData.append('status', complaintData.status ?? 'PENDING')
  formData.append('latitude', String(complaintData.latitude ?? 0))
  formData.append('longitude', String(complaintData.longitude ?? 0))
  formData.append('image', new File([], 'empty.jpg', { type: 'image/jpeg' }))

  return formData
}

export const updateComplaint = (id, complaintData) => {
  const params = buildUpdateParams(complaintData)

  return api.put(`/complaints/update/${id}`, null, { params }).catch((error) => {
    if (error?.response?.status !== 404) {
      throw error
    }

    // Fallback for backends that support save/update through posting endpoint.
    const formData = buildFallbackFormData(id, complaintData)
    return api.post('/complaints/posting', formData)
  })
}

export const updateComplaintStatus = (id, status) => employeeUpdateComplaintStatus(id, status)
export const deleteComplaint = (id) => api.delete(`/complaints/delete/${id}`)

