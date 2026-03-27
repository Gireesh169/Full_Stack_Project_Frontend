import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleDashboardPath = {
  ADMIN: '/admin/dashboard',
  EMPLOYEE: '/employee/dashboard',
  CITIZEN: '/citizen/dashboard',
}

const RoleRoute = ({ allowedRoles }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleDashboardPath[user.role] ?? '/login'} replace />
  }

  return <Outlet />
}

export default RoleRoute
