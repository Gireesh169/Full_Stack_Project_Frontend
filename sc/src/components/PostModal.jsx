import { useState } from 'react'

const categories = ['FLOOD', 'EVENT', 'ROAD', 'POWER', 'GENERAL']

const PostModal = ({ isOpen, onClose, onSubmit, presetCategory }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    category: presetCategory ?? 'GENERAL',
  })

  if (!isOpen) return null

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ ...form, category: presetCategory ?? form.category })
    setForm({
      title: '',
      description: '',
      imageUrl: '',
      location: '',
      category: presetCategory ?? 'GENERAL',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Create City Post</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Title"
            required
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            maxLength={1000}
            required
            rows={4}
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="Image URL"
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location"
            required
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <select
            name="category"
            value={presetCategory ?? form.category}
            onChange={handleChange}
            disabled={Boolean(presetCategory)}
            className="rounded-xl border border-slate-300 px-4 py-2"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          Publish
        </button>
      </form>
    </div>
  )
}

export default PostModal
