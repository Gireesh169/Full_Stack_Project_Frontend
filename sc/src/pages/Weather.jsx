import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { addWeather, deleteWeather, getAllWeather } from '../api/weatherApi'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/date'

const Weather = () => {
  const { user } = useAuth()
  const [weatherList, setWeatherList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ temp: '', place: '' })

  const fetchWeather = async () => {
    setLoading(true)
    try {
      const { data } = await getAllWeather()
      setWeatherList(data)
    } catch {
      toast.error('Failed to load weather')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
  }, [])

  const handleAdd = async (event) => {
    event.preventDefault()
    try {
      await addWeather({ ...form, temp: Number(form.temp) })
      toast.success('Weather added')
      setForm({ temp: '', place: '' })
      fetchWeather()
    } catch {
      toast.error('Failed to add weather')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteWeather(id)
      toast.success('Weather removed')
      fetchWeather()
    } catch {
      toast.error('Failed to delete weather')
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-black text-slate-900 sm:text-3xl">Weather Updates</h1>

      {user.role === 'ADMIN' && (
        <form onSubmit={handleAdd} className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <input
            type="number"
            placeholder="Temperature"
            value={form.temp}
            onChange={(e) => setForm((prev) => ({ ...prev, temp: e.target.value }))}
            required
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <input
            placeholder="Place"
            value={form.place}
            onChange={(e) => setForm((prev) => ({ ...prev, place: e.target.value }))}
            required
            className="rounded-xl border border-slate-300 px-4 py-2"
          />
          <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
            Add Weather
          </button>
        </form>
      )}

      {loading ? (
        <Loader label="Loading weather..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weatherList.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">{item.place}</h2>
              <p className="mt-1 text-3xl font-black text-teal-700">{item.temp}°C</p>
              <p className="mt-2 text-sm text-slate-500">{formatDateTime(item.time)}</p>

              {user.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="mt-4 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Weather
