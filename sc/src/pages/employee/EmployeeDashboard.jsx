import { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../../api/axiosConfig'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import { employeeUpdateComplaintStatus } from '../../api/complaintsApi'
import { getAllEmployees } from '../../api/employeeApi'
import { getPerformanceByEmployeeId } from '../../api/performanceApi'
import { getTasksByEmployee, updateTaskStatus } from '../../api/taskApi'
import { EmployeeTaskBar } from '../../components/charts/DashboardCharts'
import Loader from '../../components/Loader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'
import { STATUS_STYLES } from '../../utils/constants'
import EmployeeOrders from '../../components/employee/EmployeeOrders'

const tabs = ['My Assigned Tasks', 'My Orders', 'My Performance']

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const Routing = ({ userLocation, complaintLocation }) => {
  const map = useMap()

  useEffect(() => {
    if (!userLocation || !complaintLocation) return undefined

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(complaintLocation.lat, complaintLocation.lng),
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
    }).addTo(map)

    return () => map.removeControl(routingControl)
  }, [map, userLocation, complaintLocation])

  return null
}

const getComplaintCoordinates = (complaint) => {
  const latitude = Number(
    complaint?.latitude ??
      complaint?.lat ??
      complaint?.location?.latitude ??
      complaint?.location?.lat ??
      complaint?.geoLocation?.latitude ??
      complaint?.geoLocation?.lat,
  )
  const longitude = Number(
    complaint?.longitude ??
      complaint?.lng ??
      complaint?.location?.longitude ??
      complaint?.location?.lng ??
      complaint?.geoLocation?.longitude ??
      complaint?.geoLocation?.lng,
  )

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

const renderStars = (rating = 0) => {
  const filled = Math.round(Number(rating))
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled)
}

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('My Assigned Tasks')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState({})
  const [performance, setPerformance] = useState(null)
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '', type: 'flood' })
  const [routeTaskId, setRouteTaskId] = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  const resolveEmployeeId = useCallback(async () => {
    try {
      const { data } = await getAllEmployees()
      const matchedEmployee = data.find(
        (employee) => employee.email?.toLowerCase() === user.email?.toLowerCase(),
      )
      return matchedEmployee?.id ?? user.id
    } catch {
      return user.id
    }
  }, [user.id, user.email])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const employeeId = await resolveEmployeeId()

      const possibleIds = [...new Set([Number(user.id), Number(employeeId)].filter(Boolean))]
      const taskResponses = await Promise.allSettled(possibleIds.map((id) => getTasksByEmployee(id)))
      const mergedTasks = taskResponses
        .filter((response) => response.status === 'fulfilled')
        .flatMap((response) => response.value.data ?? [])

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

  const handleShowRoute = (task) => {
    const complaint = task.complaint
    const coords = getComplaintCoordinates(complaint)
    if (!coords) {
      toast.error('Location not available for this complaint')
      return
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setRouteTaskId(task.id)
      },
      () => toast.error('Unable to fetch your current location'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
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
                    {item.complaint?.imageUrl && (
                      <img
                        src={item.complaint.imageUrl}
                        alt={item.complaint.title}
                        className="mt-3 h-36 w-full rounded-xl object-cover sm:w-64"
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
                        onClick={() => handleShowRoute(item)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        Show Route
                      </button>
                      {routeTaskId === item.id && (
                        <button
                          type="button"
                          onClick={() => setRouteTaskId(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          Hide Route
                        </button>
                      )}
                    </div>
                    {routeTaskId === item.id && userLocation && getComplaintCoordinates(item.complaint) && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <MapContainer
                          center={[
                            getComplaintCoordinates(item.complaint).latitude,
                            getComplaintCoordinates(item.complaint).longitude,
                          ]}
                          zoom={13}
                          className="h-72 w-full"
                        >
                          <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker
                            position={[getComplaintCoordinates(item.complaint).latitude, getComplaintCoordinates(item.complaint).longitude]}
                            icon={markerIcon}
                          />
                          <Marker
                            position={[userLocation.lat, userLocation.lng]}
                            icon={markerIcon}
                          />
                          <Routing
                            userLocation={userLocation}
                            complaintLocation={{
                              lat: getComplaintCoordinates(item.complaint).latitude,
                              lng: getComplaintCoordinates(item.complaint).longitude,
                            }}
                          />
                        </MapContainer>
                      </div>
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
