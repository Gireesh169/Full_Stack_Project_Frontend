import api from './axiosConfig'

export const createPost = (userId, payload) => api.post(`/posts/create/${userId}`, payload)
export const getAllPosts = () => api.get('/posts/all')
export const getPostsFeed = () => api.get('/posts/feed')
export const getPostById = (id) => api.get(`/posts/${id}`)
export const getPostsByLocation = (location) => api.get(`/posts/location/${location}`)
export const getPostsByCategory = (category) => api.get(`/posts/category/${category}`)
export const getPostsByUser = (userId) => api.get(`/posts/user/${userId}`)
export const likePost = (postId, userId) => api.put(`/posts/${postId}/like`, null, { params: { userId } })
export const deletePost = (id) => api.delete(`/posts/${id}`)
