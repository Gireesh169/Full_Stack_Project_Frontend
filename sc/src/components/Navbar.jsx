import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navClass = ({ isActive }) =>
  `rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
    isActive
      ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-900/5'
      : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
  }`

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    localStorage.clear()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/60 backdrop-blur-3xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/posts" className={navClass}>
            City Posts
          </NavLink>
          <NavLink to="/weather" className={navClass}>
            Weather
          </NavLink>
          <NavLink to="/traffic" className={navClass}>
            Traffic Report
          </NavLink>
          <NavLink to="/main" className={navClass}>
            Dashboard
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] hover:shadow-rose-500/40 active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100/50 bg-indigo-50/80 px-5 py-2.5 text-sm font-extrabold text-indigo-800 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
          </span>
          {user?.name ?? 'Guest'}
        </div>
      </div>
    </header>
  )
}

export default Navbar
