import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../api/axiosConfig'

const RESTAURANTS_CACHE_KEY = 'food_restaurants_cache'

const normalizeRestaurant = (raw) => {
  if (!raw || typeof raw !== 'object') return null

  const source = raw.restaurant ?? raw.data ?? raw.result ?? raw
  if (!source || typeof source !== 'object') return null

  const name = source.name ?? source.restaurantName ?? ''
  const location = source.location ?? source.place ?? ''
  const imagePath = source.imagePath ?? source.imageUrl ?? source.image ?? ''
  const id = source.id ?? source.restaurantId ?? null

  if (!name && !location && !imagePath) return null

  return { id, name, location, imagePath }
}

const saveRestaurantToCache = (restaurant) => {
  const normalized = normalizeRestaurant(restaurant)
  if (!normalized) return

  const existingRaw = localStorage.getItem(RESTAURANTS_CACHE_KEY)
  const existing = (() => {
    try {
      const parsed = JSON.parse(existingRaw ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const normalizedId = normalized.id ?? `${normalized.name}-${normalized.location}`
  const deduped = existing.filter(
    (item) => (item.id ?? item.restaurantId ?? `${item.name}-${item.location}`) !== normalizedId,
  )
  deduped.unshift(normalized)

  localStorage.setItem(RESTAURANTS_CACHE_KEY, JSON.stringify(deduped))
}

const createPlaceholderImageFile = async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image for upload')

  context.fillStyle = '#e2e8f0'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => {
    canvas.toBlob((fileBlob) => resolve(fileBlob), 'image/png')
  })

  if (!blob) throw new Error('Could not prepare image for upload')
  return new File([blob], 'restaurant-placeholder.png', { type: 'image/png' })
}

const AddRestaurant = ({ onAdded }) => {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !location.trim()) {
      alert('Please enter restaurant name and location')
      return
    }

    try {
      setSubmitting(true)
      const formData = new FormData()
      const placeholderImage = await createPlaceholderImageFile()
      formData.append('name', name.trim())
      formData.append('location', location.trim())
      formData.append('image', placeholderImage)

      const endpoints = [`${API_BASE_URL}/restaurants/create`, '/api/restaurants/create']

      let response = null
      let lastError = null
      for (const endpoint of endpoints) {
        try {
          response = await axios.post(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          break
        } catch (requestError) {
          lastError = requestError
          const status = requestError?.response?.status
          if (status && ![400, 404, 405, 415].includes(status)) {
            break
          }
        }
      }

      if (!response) {
        if (lastError) throw lastError
        throw new Error('Restaurant create endpoint is not available')
      }

      saveRestaurantToCache(response.data)
      if (onAdded) onAdded()

      alert('Restaurant added successfully')

      setName('')
      setLocation('')
    } catch (error) {
      console.error(error)
      const backendMessage =
        (typeof error?.response?.data === 'string' && error.response.data) ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add restaurant'
      alert(backendMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/60 p-5">
      <h3 className="text-xl font-bold text-slate-900">Add Restaurant</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? 'Adding...' : 'Add Restaurant'}
      </button>
    </div>
  )
}

export default AddRestaurant