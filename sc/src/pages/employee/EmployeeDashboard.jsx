import { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { API_BASE_URL, IMAGE_BASE_URL } from '../../api/axiosConfig'
import { employeeUpdateComplaintStatus } from '../../api/complaintsApi'
import { getAllEmployees } from '../../api/employeeApi'
import { getEmployeeByUserId } from '../../api/employeeApi'
import { getPerformanceByEmployeeId } from '../../api/performanceApi'
import { getAllTasks, getTasksByEmployee, updateTaskStatus } from '../../api/taskApi'
import { EmployeeTaskBar } from '../../components/charts/DashboardCharts'
import Loader from '../../components/Loader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'
import { STATUS_STYLES } from '../../utils/constants'
import EmployeeOrders from '../../components/employee/EmployeeOrders'
import MapComponent from '../../components/MapComponent'

const tabs = ['My Assigned Tasks', 'My Orders', 'My Performance']

const getComplaintCoordinates = (complaint) => {
  const latitude = Number(
    complaint?.latitude ??
      complaint?.lat ??
      complaint?.location?.latitude ??
      complaint?.location?.lat ??
      complaint?.geoLocation?.latitude ??
      complaint?.geoLocation?.lat ??
      complaint?.coordinates?.latitude ??
      complaint?.coordinates?.lat ??
      complaint?.mapLocation?.latitude ??
      complaint?.mapLocation?.lat,
  )
  const longitude = Number(
    complaint?.longitude ??
      complaint?.lng ??
      complaint?.location?.longitude ??
      complaint?.location?.lng ??
      complaint?.geoLocation?.longitude ??
      complaint?.geoLocation?.lng ??
      complaint?.coordinates?.longitude ??
      complaint?.coordinates?.lng ??
      complaint?.mapLocation?.longitude ??
      complaint?.mapLocation?.lng,
  )

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

const renderStars = (rating = 0) => {
  const filled = Math.round(Number(rating))
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled)
}

const resolveComplaintImageSrc = (complaint) => {
  const rawImageUrl = String(complaint?.imageUrl ?? complaint?.imagePath ?? complaint?.image ?? '').trim()
  if (!rawImageUrl) return ''

  if (rawImageUrl.startsWith('http')) {
    try {
      const parsedUrl = new URL(rawImageUrl)
      const apiOrigin = new URL(IMAGE_BASE_URL)

      if (['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
        parsedUrl.protocol = apiOrigin.protocol
        parsedUrl.hostname = apiOrigin.hostname
        parsedUrl.port = apiOrigin.port
        return parsedUrl.toString()
      }
    } catch {
      return rawImageUrl
    }
  }

  const normalizedPath = rawImageUrl.replace(/^\/+/, '')
  try {
    return new URL(normalizedPath, IMAGE_BASE_URL).toString()
  } catch {
    return `${IMAGE_BASE_URL}/${normalizedPath}`
  }
}

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('My Assigned Tasks')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState({})
  const [performance, setPerformance] = useState(null)
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', type: 'flood' })

  const resolveEmployeeId = useCallback(async () => {
    const storedEmployeeId = localStorage.getItem('employeeId')

    try {
      const employeeByUser = await getEmployeeByUserId(user.id)
      const employeeRecord = employeeByUser?.data
      if (employeeRecord?.id) {
        return employeeRecord.id
      }
    } catch {
      // Some deployments do not expose user->employee lookup endpoint.
      // Continue with catalog fallback instead of returning early.
    }

    try {
      const { data } = await getAllEmployees()
      const list = Array.isArray(data) ? data : []
      const userEmail = String(user.email ?? '').toLowerCase()
      const userName = String(user.name ?? '').toLowerCase()

      const matchedEmployee = list.find((employee) => {
        const employeeEmail = String(employee?.email ?? '').toLowerCase()
        const employeeName = String(employee?.name ?? '').toLowerCase()
        return (userEmail && employeeEmail === userEmail) || (userName && employeeName === userName)
      })

      if (matchedEmployee?.id) {
        return matchedEmployee.id
      }
    } catch {
      // Fall through to stored/user id fallback.
    }

    if (storedEmployeeId) {
      return Number(storedEmployeeId)
    }

    return user.id
  }, [user.id, user.email])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const employeeId = await resolveEmployeeId()
      localStorage.setItem('employeeId', String(employeeId))

      const possibleIds = [...new Set([Number(employeeId), Number(user.id)].filter(Boolean))]
      const taskResponses = await Promise.allSettled(possibleIds.map((id) => getTasksByEmployee(id)))
      const tasksFromEmployeeEndpoints = taskResponses
        .filter((response) => response.status === 'fulfilled')
        .flatMap((response) => response.value.data ?? [])

      let mergedTasks = tasksFromEmployeeEndpoints

      // Fallback for deployments where employee-task route maps differently.
      if (mergedTasks.length === 0) {
        const allTasksResponse = await getAllTasks()
        const allTasks = Array.isArray(allTasksResponse?.data) ? allTasksResponse.data : []
        const userEmail = String(user.email ?? '').toLowerCase()

        mergedTasks = allTasks.filter((task) => {
          const candidateIds = [
            task?.employee?.id,
            task?.employeeId,
            task?.assignedEmployeeId,
            task?.complaint?.assignedEmployeeId,
            task?.complaint?.employeeId,
            task?.complaint?.user?.id,
          ]

          const matchesId = candidateIds.some((value) =>
            possibleIds.includes(Number(value)),
          )

          const taskEmail = String(task?.employee?.email ?? '').toLowerCase()
          const matchesEmail = Boolean(userEmail) && taskEmail === userEmail

          return matchesId || matchesEmail
        })
      }

      const uniqueTasks = Array.from(new Map(mergedTasks.map((task) => [task.id, task])).values())
      setTasks(uniqueTasks)

      const performanceResponses = await Promise.allSettled(
        possibleIds.map((id) => getPerformanceByEmployeeId(id)),
      )
      const firstPerformance = performanceResponses.find((response) => response.status === 'fulfilled')
      setPerformance(firstPerformance?.status === 'fulfilled' ? firstPerformance.value.data : null)
    } catch {
      toast.error('Failed to load employee data')
    } finally {
      setLoading(false)
    }
  }, [resolveEmployeeId, user.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusUpdate = async (taskId) => {
    const status = selectedStatuses[taskId]
    if (!status) {
      toast.error('Select status before submitting')
      return
    }

    try {
      const matchedTask = tasks.find((task) => Number(task.id) === Number(taskId))
      const complaintId = matchedTask?.complaint?.id

      await updateTaskStatus(taskId, status)

      // Keep complaint workflow status aligned with task status so admin approval can succeed.
      if (complaintId) {
        await employeeUpdateComplaintStatus(complaintId, status)
      }

      toast.success('Task status updated')
      fetchData()
    } catch {
      toast.error('Failed to update task status')
    }
  }

  const handleLocationSubmit = async (event) => {
    event.preventDefault()

    const latitude = Number(locationForm.latitude)
    const longitude = Number(locationForm.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Latitude and longitude must be valid numbers')
      return
    }

      try {
        await axios.post(`${API_BASE_URL}/api/locations`, {
        latitude,
        longitude,
        type: locationForm.type,
      })
      toast.success('Location submitted')
      setLocationForm({ latitude: '', longitude: '', type: 'flood' })
    } catch {
      toast.error('Failed to submit location')
    }
  }

  const sidebarClass = (tab) =>
    `w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-500/20'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  const realTotalAssigned = tasks.length
  const realTotalCompleted = tasks.filter((item) => item.status === 'RESOLVED').length
  const realRating = realTotalAssigned > 0 ? (realTotalCompleted / realTotalAssigned) * 5 : 0

  const employeeTaskChartData = useMemo(() => {
    const completed = tasks.filter((item) => item.status === 'RESOLVED').length
    const pending = tasks.filter((item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS').length

    return [
      { name: 'Completed', count: completed },
      { name: 'Pending', count: pending },
    ]
  }, [tasks])

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-[260px_1fr] sm:px-6">
      <aside className="h-fit rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
        <h2 className="mb-6 px-2 text-xl font-extrabold text-slate-900">Employee Panel</h2>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={sidebarClass(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </aside>

      <main className="rounded-[2.5rem] border border-white/60 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-3xl sm:p-8">
        {loading ? (
          <Loader label="Loading employee data..." />
        ) : (
          <>
            {activeTab === 'My Assigned Tasks' && (
              <div className="space-y-4">
                <form
                  onSubmit={handleLocationSubmit}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4"
                >
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={locationForm.latitude}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, latitude: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={locationForm.longitude}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, longitude: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <select
                    value={locationForm.type}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  >
                    <option value="flood">flood</option>
                    <option value="fire">fire</option>
                    <option value="accident">accident</option>
                    <option value="safe">safe</option>
                  </select>
                  <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                    Submit Location
                  </button>
                </form>

                {tasks.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                    No assigned tasks found.
                  </div>
                ) : (
                  tasks.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-lg font-bold text-slate-900">{item.complaint?.title ?? 'Untitled Complaint'}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.complaint?.description}</p>
                    <p className="mt-1 text-sm text-slate-600">Place: {item.complaint?.place}</p>
                    {resolveComplaintImageSrc(item.complaint) && (
                      <img
                        src={resolveComplaintImageSrc(item.complaint)}
                        alt={item.complaint.title}
                        className="mt-3 h-36 w-full rounded-xl object-cover sm:w-64"
                        onError={(event) => {
                          event.currentTarget.onerror = null
                          event.currentTarget.src =
                            'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'420\' viewBox=\'0 0 800 420\'%3E%3Crect width=\'800\' height=\'420\' fill=\'%23e2e8f0\'/%3E%3Ctext x=\'400\' y=\'220\' text-anchor=\'middle\' font-family=\'Arial, sans-serif\' font-size=\'30\' font-weight=\'700\' fill=\'%23475569\'%3EImage unavailable%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      Assigned at: {formatDateTime(item.assignedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[item.status] ?? ''}`}>
                        {item.status}
                      </span>
                      {item.status === 'RESOLVED' && !item.complaint?.adminApproved && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                          Waiting for admin approval
                        </span>
                      )}
                      <select
                        value={selectedStatuses[item.id] ?? item.status ?? ''}
                        onChange={(e) =>
                          setSelectedStatuses((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                      >
                        <option value="" disabled>
                          Select status
                        </option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(item.id)}
                        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Update Status
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!getComplaintCoordinates(item.complaint)) {
                            toast.error('Location not available for this complaint')
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        Complaint Map
                      </button>
                    </div>
                    {getComplaintCoordinates(item.complaint) ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <MapComponent
                          destination={{
                            lat: getComplaintCoordinates(item.complaint).latitude,
                            lng: getComplaintCoordinates(item.complaint).longitude,
                          }}
                          readOnly
                          mapHeight={300}
                        />
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-amber-700">Citizen location map not available for this complaint.</p>
                    )}
                  </article>
                  ))
                )}
              </div>
            )}

            {activeTab === 'My Orders' && <EmployeeOrders />}

            {activeTab === 'My Performance' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Total Assigned</p>
                    <p className="text-3xl font-black text-slate-900">{realTotalAssigned}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Total Completed</p>
                    <p className="text-3xl font-black text-slate-900">{realTotalCompleted}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Average Resolution Time</p>
                    <p className="text-2xl font-black text-slate-900">{performance?.averageResolutionTime ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Real-Time Rating</p>
                    <p className="text-2xl font-black text-amber-500">{renderStars(realRating)}</p>
                  </div>
                </div>
                <EmployeeTaskBar data={employeeTaskChartData} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default EmployeeDashboard
