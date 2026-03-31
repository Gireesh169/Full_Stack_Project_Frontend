import { useEffect, useState } from 'react'
import axios from 'axios'
import ComplaintLocationPicker from './ComplaintLocationPicker'

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
  if (file.size <= TARGET_UPLOAD_BYTES) return file

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

const SubmitComplaint = ({ onSuccess }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [place, setPlace] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [location, setLocation] = useState(null)

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  const handleFileChange = (e) => {
    setImageFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!imageFile) {
      alert('Please select an image file')
      return
    }

    if (!location) {
      alert('Please select complaint location on map')
      return
    }

    const formData = new FormData()
    const uploadFile = await compressImageIfNeeded(imageFile)

    if (uploadFile.size > TARGET_UPLOAD_BYTES) {
      alert('Upload failed: Image is too large. Please choose a smaller image.')
      return
    }

    formData.append('title', title)
    formData.append('description', description)
    formData.append('place', place)
    formData.append('address', place)
    formData.append('status', 'PENDING')
    formData.append('latitude', String(location.lat))
    formData.append('longitude', String(location.lng))
    formData.append('lat', String(location.lat))
    formData.append('lng', String(location.lng))
    formData.append('locationLatitude', String(location.lat))
    formData.append('locationLongitude', String(location.lng))
    formData.append('image', uploadFile)

    console.log([...formData])
    console.log('Image size (bytes):', uploadFile.size)

    setUploading(true)
    try {
      const response = await axios.post('/api/complaints/posting', formData)
      console.log('Upload URL used:', '/api/complaints/posting (proxied to 8086)')

      console.log('Upload response:', response.data)

      alert('Upload successful')
      setTitle('')
      setDescription('')
      setPlace('')
      setImageFile(null)
      setLocation(null)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error(err)

      if (!err?.response) {
        alert('Upload failed: Backend unreachable or blocked by CORS. Ensure Spring Boot is running on 8086.')
      } else if (err?.response?.status === 413) {
        alert('Upload failed: File too large for server limit. Use a smaller image.')
      } else {
        alert('Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <h3 className="text-xl font-bold text-slate-900">Submit Complaint</h3>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-2"
        rows={4}
        required
      />
      <input
        placeholder="Place"
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-2"
        required
      />

      <ComplaintLocationPicker value={location} onChange={setLocation} />

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="rounded-xl border border-slate-300 px-4 py-2"
      />

      {previewUrl && (
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">Image Preview</p>
          <img src={previewUrl} alt="Complaint preview" className="h-44 w-full rounded-lg object-cover sm:w-72" />
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {uploading ? 'Uploading...' : 'Submit Complaint'}
      </button>
    </form>
  )
}

export default SubmitComplaint
