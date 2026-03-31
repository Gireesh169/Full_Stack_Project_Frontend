import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import FoodMenu from './components/food/FoodMenu'
import { useAuth } from './context/AuthContext'
import AdminDashboard from './pages/admin/AdminDashboard'
import CitizenDashboard from './pages/citizen/CitizenDashboard'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import Login from './pages/Login'
import Posts from './pages/Posts'
import Register from './pages/Register'
import Traffic from './pages/Traffic'
import Weather from './pages/Weather'
import { ROLE_DASHBOARD } from './utils/constants'

const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  )
}

const MainRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_DASHBOARD[user.role] ?? '/citizen/dashboard'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/posts" element={<Posts />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/traffic" element={<Traffic />} />
          <Route path="/main" element={<MainRedirect />} />

          <Route element={<RoleRoute allowedRoles={['CITIZEN']} />}>
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/food-menu" element={<FoodMenu />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
