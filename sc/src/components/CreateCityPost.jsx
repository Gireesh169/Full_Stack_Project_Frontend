import { useState } from 'react'
import { toast } from 'react-toastify'
import { createPostMultipart } from '../api/cityPostApi'

const TARGET_UPLOAD_BYTES = 900 * 1024
const MAX_IMAGE_SIDE = 1400

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

const CreateCityPost = ({ userId, onSuccess, onCancel }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!file) {
      toast.error('Please select an image file')
      return
    }

    try {
      setLoading(true)

      const uploadFile = await compressImageIfNeeded(file)
      if (uploadFile.size > TARGET_UPLOAD_BYTES) {
        toast.error('Please choose a smaller image')
        return
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('location', location)
      formData.append('category', category)
      formData.append('image', uploadFile)

      const response = await createPostMultipart(userId ?? 1, formData)

      console.log(response.data)

      toast.success('Post uploaded successfully')
      setTitle('')
      setDescription('')
      setLocation('')
      setCategory('GENERAL')
      setFile(null)

      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
      const backendMessage =
        (typeof error?.response?.data === 'string' && error.response.data) ||
        error?.response?.data?.message ||
        error?.message ||
        'Upload failed'
      toast.error(backendMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <h3 className="text-xl font-bold text-slate-900">Create City Post</h3>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={4}
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />

      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />

      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="rounded-xl border border-slate-300 px-4 py-2"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Uploading...' : 'Create Post'}
      </button>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
        >
          Cancel
        </button>
      ) : null}
    </form>
  )
}

export default CreateCityPost
