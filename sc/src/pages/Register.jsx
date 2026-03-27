import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { registerUser } from '../api/userApi'

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CITIZEN',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      await registerUser(form)
      toast.success('Registration successful. Please login.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/60 p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-3xl transition-all sm:p-12">
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-slate-900">
          Join Us
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-slate-500">
          Create an account to get started.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
            className="w-full rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            required
            className="w-full rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
            className="w-full rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          />
          <div className="relative">
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 pr-10 text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-teal-500/20"
            >
              <option value="CITIZEN">Citizen</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-orange-500 hover:text-amber-500">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
