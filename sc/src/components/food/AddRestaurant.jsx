import { useRef, useState } from 'react'
import axios from 'axios'

const RESTAURANTS_CACHE_KEY = 'food_restaurants_cache'
const TARGET_UPLOAD_BYTES = 900 * 1024
const MAX_IMAGE_SIDE = 1400

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

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })

const compressImageIfNeeded = async (file) => {
  if (!file || file.size <= TARGET_UPLOAD_BYTES) return file

  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))

  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)

  while (blob && blob.size > TARGET_UPLOAD_BYTES && quality > 0.45) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, quality)
  }

  if (!blob) return file

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'upload'
  return new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' })
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

const AddRestaurant = ({ onAdded }) => {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleSubmit = async () => {
    console.log(name, location, image)

    if (!name.trim() || !location.trim()) {
      alert('Please enter restaurant name and location')
      return
    }

    if (!image) {
      alert('Please select an image file')
      return
    }

    try {
      setSubmitting(true)
      const formData = new FormData()
      const uploadFile = await compressImageIfNeeded(image)

      if (uploadFile.size > TARGET_UPLOAD_BYTES) {
        alert('Image is too large. Please choose a smaller image.')
        return
      }

      formData.append('name', name)
      formData.append('location', location)
      formData.append('image', uploadFile)

      const response = await axios.post('/api/restaurants/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      saveRestaurantToCache(response.data)
      if (onAdded) onAdded()

      alert('Restaurant added successfully')

      setName('')
      setLocation('')
      setImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

      <div className="grid gap-3 md:grid-cols-3">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
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