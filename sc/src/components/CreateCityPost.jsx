import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../api/axiosConfig'

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

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('location', location)
    formData.append('category', category)
    formData.append('image', file)

    console.log([...formData.entries()])

    try {
      setLoading(true)

      const response = await axios.post(`${API_BASE_URL}/posts/create/${userId ?? 1}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

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
      toast.error('Upload failed')
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
