import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { loginUser, getAllUsers } from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import { ROLE_DASHBOARD } from '../utils/constants'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const loginResponse = await loginUser({ email, password })
      
      let loggedUser = loginResponse.data
      
      if (!loggedUser || !loggedUser.role) {
        const { data: users } = await getAllUsers()
        loggedUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      }
      
      if (!loggedUser) throw new Error('User details not found')

      login(loggedUser)
      toast.success('Logged in successfully')
      navigate(ROLE_DASHBOARD[loggedUser.role] ?? '/citizen/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/60 p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-3xl transition-all sm:p-12">
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-slate-900">
          Smart City
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-slate-500">
          Sign in to manage operations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-2xl border border-slate-200/60 bg-white/70 px-5 py-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] hover:shadow-teal-500/40 active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-600">
          New user?{' '}
          <Link to="/register" className="font-bold text-teal-600 hover:text-indigo-600">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
