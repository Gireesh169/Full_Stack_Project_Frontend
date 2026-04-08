import { useEffect, useState } from 'react'
import ComplaintLocationPicker from './ComplaintLocationPicker'
import { postComplaint } from '../api/complaintsApi'

const TARGET_UPLOAD_BYTES = 450 * 1024
const MAX_IMAGE_SIDE = 1400
const MIN_IMAGE_SIDE = 600

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

  let width = Math.max(1, Math.round(image.naturalWidth * scale))
  let height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return file

  let blob = null
  let attempts = 0
  while (attempts < 8) {
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    let quality = 0.85
    blob = await canvasToBlob(canvas, quality)

    while (blob && blob.size > TARGET_UPLOAD_BYTES && quality > 0.35) {
      quality -= 0.1
      blob = await canvasToBlob(canvas, quality)
    }

    if (blob && blob.size <= TARGET_UPLOAD_BYTES) break

    const nextWidth = Math.max(MIN_IMAGE_SIDE, Math.round(width * 0.85))
    const nextHeight = Math.max(MIN_IMAGE_SIDE, Math.round(height * 0.85))
    if (nextWidth === width && nextHeight === height) break

    width = nextWidth
    height = nextHeight
    attempts += 1
  }

  if (!blob) return file

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'upload'
  return new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' })
}

const buildComplaintFormData = ({ title, description, place, location, image }) => {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('description', description)
  formData.append('place', place)
  formData.append('address', place)
  formData.append('status', 'PENDING')
  formData.append('latitude', String(location.lat))
  formData.append('longitude', String(location.lng))

  // Some backend controllers require multipart part presence even when image is optional.
  // Send an empty file part when user did not choose an image.
  const imagePart = image ?? new File([], 'empty.jpg', { type: 'image/jpeg' })
  formData.append('image', imagePart)

  return formData
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
    const file = e.target.files?.[0] ?? null

    if (!file) {
      setImageFile(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file.')
      setImageFile(null)
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Please choose an image smaller than 8 MB.')
      setImageFile(null)
      return
    }

    setImageFile(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!location) {
      alert('Please select complaint location on map')
      return
    }

    let uploadFile = null

    if (imageFile) {
      uploadFile = await compressImageIfNeeded(imageFile)

      if (uploadFile.size > TARGET_UPLOAD_BYTES) {
        alert('Upload failed: Image is still too large after compression. Please choose a smaller image.')
        return
      }
    }

    const formDataWithOptionalImage = buildComplaintFormData({
      title,
      description,
      place,
      location,
      image: uploadFile,
    })

    const formDataWithoutImage = buildComplaintFormData({
      title,
      description,
      place,
      location,
      image: null,
    })

    setUploading(true)
    try {
      let response

      if (uploadFile) {
        try {
          response = await postComplaint(formDataWithOptionalImage)
        } catch (err) {
          if (err?.response?.status === 413) {
            response = await postComplaint(formDataWithoutImage)

            alert('Complaint submitted without image because image exceeded server limit.')
          } else {
            throw err
          }
        }
      } else {
        response = await postComplaint(formDataWithoutImage)
      }

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
        alert('Upload failed: File too large for server limit. Try a smaller image (around 1 MB or less).')
      } else {
        const backendMessage =
          typeof err?.response?.data === 'string'
            ? err.response.data
            : err?.response?.data?.message || err?.response?.data?.error
        alert(backendMessage ? `Upload failed: ${backendMessage}` : 'Upload failed')
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

      <p className="text-xs text-slate-500">Image is optional. You can submit complaint without uploading a file.</p>

      {imageFile && (
        <button
          type="button"
          onClick={() => setImageFile(null)}
          className="w-fit rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Remove selected image
        </button>
      )}

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
        {uploading ? 'Submitting...' : 'Submit Complaint'}
      </button>
    </form>
  )
}

export default SubmitComplaint
