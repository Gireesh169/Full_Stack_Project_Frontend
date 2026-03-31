import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { addCityInfo, deleteCityInfo, getAllCityInfo } from '../../api/cityInfoApi'
import { approveComplaint, getAllComplaints } from '../../api/complaintsApi'
import { addEmployee, deleteEmployee, getAllEmployees } from '../../api/employeeApi'
import { getAllPerformance, postPerformance } from '../../api/performanceApi'
import { getAllPosts } from '../../api/cityPostApi'
import { getAllTasks, postTaskAssignment } from '../../api/taskApi'
import { getAllUsers, deleteUser } from '../../api/userApi'
import { addWeather, deleteWeather, getAllWeather } from '../../api/weatherApi'
import { AdminCategoryPie, AdminMonthlyTrendLine } from '../../components/charts/DashboardCharts'
import AdminOrders from '../../components/admin/AdminOrders'
import AddFoodItem from '../../components/admin/food/AddFoodItem'
import AddRestaurant from '../../components/food/AddRestaurant'
import Loader from '../../components/Loader'
import MapComponent from '../../components/MapComponent'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'

const tabs = [
  'Dashboard Home',
  'Task Assignment',
  'Employee Management',
  'Employee Performance',
  'City Info Management',
  'Weather Management',
  'Food Management',
  'Order Management',
  'User Management',
]

const renderStars = (rating = 0) => {
  const filled = Math.round(Number(rating))
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled)
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

const getComplaintAddressQuery = (complaint) =>
  String(
    complaint?.address ??
      complaint?.place ??
      complaint?.location?.address ??
      complaint?.location?.name ??
      '',
  ).trim()

const getStatusValue = (rawStatus) => {
  if (rawStatus && typeof rawStatus === 'object') {
    if ('status' in rawStatus) {
      return String(rawStatus.status ?? 'PENDING').toUpperCase()
    }
    return String(rawStatus.value ?? 'PENDING').toUpperCase()
  }

  if (typeof rawStatus === 'string') {
    const trimmed = rawStatus.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return getStatusValue(parsed)
      } catch {
        return trimmed.toUpperCase()
      }
    }
    return trimmed.toUpperCase()
  }

  return String(rawStatus ?? 'PENDING').toUpperCase()
}

const AdminDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Dashboard Home')
  const [loading, setLoading] = useState(true)

  const [complaints, setComplaints] = useState([])
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks] = useState([])
  const [posts, setPosts] = useState([])
  const [performances, setPerformances] = useState([])
  const [cityInfo, setCityInfo] = useState([])
  const [weather, setWeather] = useState([])
  const [users, setUsers] = useState([])

  const [employeeForm, setEmployeeForm] = useState({ name: '', email: '' })
  const [cityInfoForm, setCityInfoForm] = useState({ area: '', placeImp: '' })
  const [weatherForm, setWeatherForm] = useState({ temp: '', place: '' })
  const [performanceForm, setPerformanceForm] = useState({
    employeeId: '',
    totalAssigned: '',
    totalCompleted: '',
    averageResolutionTime: '',
    rating: '',
  })
  const [foodRefreshToken, setFoodRefreshToken] = useState(0)
  const [assignmentSelection, setAssignmentSelection] = useState({})
  const [approvingComplaintIds, setApprovingComplaintIds] = useState({})

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [
        complaintsRes,
        employeesRes,
        tasksRes,
        postsRes,
        performanceRes,
        cityInfoRes,
        weatherRes,
        usersRes,
      ] = await Promise.all([
        getAllComplaints(),
        getAllEmployees(),
        getAllTasks(),
        getAllPosts(),
        getAllPerformance(),
        getAllCityInfo(),
        getAllWeather(),
        getAllUsers(),
      ])

      setComplaints(complaintsRes.data)
      setEmployees(employeesRes.data)
      setTasks(tasksRes.data)
      setPosts(postsRes.data)
      setPerformances(performanceRes.data)
      setCityInfo(cityInfoRes.data)
      setWeather(weatherRes.data)
      setUsers(usersRes.data)
    } catch {
      toast.error('Failed to load admin dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'Task Assignment') {
        fetchAllData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [activeTab])

  const uniqueComplaints = useMemo(
    () => Array.from(new Map((complaints ?? []).map((item) => [item.id, item])).values()),
    [complaints],
  )

  const summaryCards = useMemo(
    () => [
      { label: 'Total Complaints', value: uniqueComplaints.length },
      { label: 'Total Employees', value: employees.length },
      { label: 'Active Tasks', value: tasks.length },
      { label: 'Total Posts', value: posts.length },
    ],
    [uniqueComplaints.length, employees.length, tasks.length, posts.length],
  )

  const categoryChartData = useMemo(() => {
    const counts = uniqueComplaints.reduce((acc, item) => {
      const raw = item.category ?? item.type ?? item.issueType ?? item.complaintType ?? 'Other'
      const key = String(raw).trim() || 'Other'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [uniqueComplaints])

  const monthlyTrendData = useMemo(() => {
    const monthCounts = new Map()

    uniqueComplaints.forEach((item) => {
      const rawDate = item.createdAt ?? item.created_at ?? item.date ?? item.submittedAt ?? item.time
      if (!rawDate) return

      const date = new Date(rawDate)
      if (Number.isNaN(date.getTime())) return

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1)
    })

    return Array.from(monthCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [year, monthNum] = month.split('-')
        const label = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
        })

        return { month: label, count }
      })
  }, [uniqueComplaints])

  const employeeUsers = useMemo(
    () => users.filter((item) => item.role === 'EMPLOYEE'),
    [users],
  )

  const employeeOptions = useMemo(() => {
    if (employees.length > 0) {
      return employees.map((item) => ({ id: item.id, name: item.name, email: item.email }))
    }
    return employeeUsers.map((item) => ({ id: item.id, name: item.name, email: item.email }))
  }, [employees, employeeUsers])

  const taskByComplaintId = useMemo(() => {
    const map = new Map()

    tasks.forEach((task) => {
      const complaintId = Number(task.complaint?.id)
      if (!Number.isFinite(complaintId)) return

      const existing = map.get(complaintId)
      if (!existing) {
        map.set(complaintId, task)
        return
      }

      const currentTime = new Date(task.assignedAt ?? task.updatedAt ?? 0).getTime()
      const existingTime = new Date(existing.assignedAt ?? existing.updatedAt ?? 0).getTime()
      if (currentTime >= existingTime) {
        map.set(complaintId, task)
      }
    })

    return map
  }, [tasks])

  const getComplaintBackendStatus = (item) =>
    getStatusValue(item.status)

  const getEmployeeLabel = (employeeId) => {
    if (!employeeId) return 'Unassigned'
    const matchedEmployee = employees.find((item) => String(item.id) === String(employeeId))
    if (matchedEmployee) return `${matchedEmployee.name} (${matchedEmployee.email})`

    const matched = employeeOptions.find((item) => String(item.id) === String(employeeId))
    if (!matched) return `Employee #${employeeId}`
    return `${matched.name} (${matched.email})`
  }

  const getAssignedEmployeeLabel = (item) => {
    const linkedTask = taskByComplaintId.get(Number(item.id))
    if (linkedTask?.employee) {
      const name = linkedTask.employee.name ?? `Employee #${linkedTask.employee.id}`
      const email = linkedTask.employee.email ? ` (${linkedTask.employee.email})` : ''
      return `${name}${email}`
    }
    return getEmployeeLabel(item.assignedEmployeeId)
  }

  const getAssignedEmployeeName = (item) => {
    const linkedTask = taskByComplaintId.get(Number(item.id))
    if (linkedTask?.employee?.name) return linkedTask.employee.name

    const fallbackId = linkedTask?.employee?.id ?? item.assignedEmployeeId
    if (!fallbackId) return ''

    const matchedEmployee = employees.find((emp) => String(emp.id) === String(fallbackId))
    if (matchedEmployee?.name) return matchedEmployee.name

    const matchedOption = employeeOptions.find((emp) => String(emp.id) === String(fallbackId))
    return matchedOption?.name ?? ''
  }

  const isComplaintAssigned = (item) => {
    const linkedTask = taskByComplaintId.get(Number(item.id))
    return Boolean(linkedTask?.employee?.id || item.assignedEmployeeId)
  }

  const getExistingTaskForComplaint = (complaintId) =>
    taskByComplaintId.get(Number(complaintId))

  const resolveEmployeeCatalogId = async (selectedEmployeeId) => {
    const selectedId = String(selectedEmployeeId)

    const existingById = employees.find((item) => String(item.id) === selectedId)
    if (existingById) return Number(existingById.id)

    const selectedUser = employeeUsers.find((item) => String(item.id) === selectedId)
    if (!selectedUser) {
      throw new Error('Invalid employee selection')
    }

    const existingByEmail = employees.find(
      (item) => item.email?.toLowerCase() === selectedUser.email?.toLowerCase(),
    )
    if (existingByEmail) return Number(existingByEmail.id)

    await addEmployee({ name: selectedUser.name, email: selectedUser.email })
    const refetchedEmployees = await getAllEmployees()
    const refreshedList = refetchedEmployees.data ?? []
    setEmployees(refreshedList)

    const newlyCreated = refreshedList.find(
      (item) => item.email?.toLowerCase() === selectedUser.email?.toLowerCase(),
    )
    if (!newlyCreated) {
      throw new Error('Employee catalog record not found')
    }

    return Number(newlyCreated.id)
  }

  const getComplaintStatusLabel = (item) => {
    const status = getComplaintBackendStatus(item)
    if (status === 'RESOLVED' && !item.adminApproved) return 'WAITING_FOR_APPROVAL'
    return status
  }

  const canApproveComplaint = (item) =>
    getComplaintBackendStatus(item) === 'RESOLVED' && !item.adminApproved

  const getApprovalLabel = (item) => {
    if (item.adminApproved) return 'APPROVED'
    if (getComplaintBackendStatus(item) === 'RESOLVED') return 'WAITING_FOR_APPROVAL'
    return 'NOT_READY'
  }

  const approveComplaintWithValidation = async (complaintId) => {
    const latestComplaintsResponse = await getAllComplaints()
    const latestList = latestComplaintsResponse.data ?? []
    const latestComplaint = latestList.find((item) => Number(item.id) === Number(complaintId))

    if (!latestComplaint) {
      throw new Error('Complaint not found')
    }

    const latestStatus = getStatusValue(latestComplaint.status)

    if (latestComplaint.adminApproved) {
      throw new Error('Already approved by another admin')
    }

    if (latestStatus !== 'RESOLVED') {
      throw new Error('Cannot approve before resolved')
    }

    await approveComplaint(complaintId)
  }

  const sidebarClass = (tab) =>
    `w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-500/20'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  const runWithRefresh = async (action, successMsg, errorMsg) => {
    try {
      await action()
      toast.success(successMsg)
      fetchAllData()
    } catch (error) {
      const rawData = error?.response?.data
      const backendMessage =
        (typeof rawData === 'string' ? rawData : null) || rawData?.message || rawData?.error
      const statusCode = error?.response?.status
      const fallbackMessage = error?.message
      const detail = backendMessage || fallbackMessage
      if (statusCode && detail) {
        toast.error(`${errorMsg} (${statusCode}): ${detail}`)
      } else if (detail) {
        toast.error(`${errorMsg}: ${detail}`)
      } else {
        toast.error(errorMsg)
      }
    }
  }

  // NEW: Handle location selection from map
  const handleLocationSelect = async (location) => {
    try {
      await axios.post('http://localhost:8086/api/locations', {
        lat: location.lat,
        lng: location.lng,
        latitude: location.lat,
        longitude: location.lng,
        type: location.type,
      })
      toast.success('Location added to map')
      await fetchAllData()
    } catch {
      throw new Error('Failed to add location')
    }
  }

  const handleViewMap = (complaint) => {
    const coords = getComplaintCoordinates(complaint)
    if (coords) {
      window.open(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, '_blank', 'noopener,noreferrer')
      return
    }

    const query = getComplaintAddressQuery(complaint)
    if (!query) {
      toast.error('Location not available for this complaint')
      return
    }

    window.open(`https://www.google.com/maps?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr] sm:px-6">
      <aside className="h-fit rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
        <h2 className="mb-6 px-2 text-xl font-extrabold text-slate-900">Admin Control</h2>
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
          <Loader label="Loading admin data..." />
        ) : (
          <>
            {activeTab === 'Dashboard Home' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryCards.map((card) => (
                    <article key={card.label} className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-sm backdrop-blur-md">
                      <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{card.value}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AdminCategoryPie data={categoryChartData} />
                  <AdminMonthlyTrendLine data={monthlyTrendData} />
                </div>

                <section>
                  <div className="mb-6">
                    <h3 className="mb-3 text-lg font-bold text-slate-900">Click on Map to Add Location</h3>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <MapComponent isAdminMode={true} onLocationSelect={handleLocationSelect} />
                    </div>
                  </div>

                  <h3 className="mb-3 text-lg font-bold text-slate-900">Recent Complaints</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="py-2">ID</th>
                          <th className="py-2">Title</th>
                          <th className="py-2">Place</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueComplaints.slice(0, 5).map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2">{item.id}</td>
                            <td className="py-2">{item.title}</td>
                            <td className="py-2">{item.place}</td>
                            <td className="py-2">{getComplaintStatusLabel(item)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">Recent Task Assignments</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="py-2">Complaint</th>
                          <th className="py-2">Employee</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Assigned At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.slice(0, 5).map((task) => (
                          <tr key={task.id} className="border-b border-slate-100">
                            <td className="py-2">{task.complaint?.title}</td>
                            <td className="py-2">{task.employee?.name}</td>
                            <td className="py-2">{getStatusValue(task.status)}</td>
                            <td className="py-2">{formatDateTime(task.assignedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Task Assignment' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Employee marks complaint as RESOLVED, then Admin must click Approve to finalize for citizen view.
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">ID</th>
                        <th className="py-2">Title</th>
                        <th className="py-2">Place</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Approval</th>
                        <th className="py-2">Assigned Employee</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueComplaints.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-2">{item.id}</td>
                          <td className="py-2">{item.title}</td>
                          <td className="py-2">{item.place}</td>
                          <td className="py-2 font-semibold text-slate-700">{getComplaintStatusLabel(item)}</td>
                          <td className="py-2 text-xs font-semibold text-slate-600">
                            {getApprovalLabel(item).replaceAll('_', ' ')}
                          </td>
                          <td className="py-2 text-slate-600">{getAssignedEmployeeLabel(item)}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={assignmentSelection[item.id] ?? taskByComplaintId.get(Number(item.id))?.employee?.id ?? item.assignedEmployeeId ?? ''}
                                onChange={(e) =>
                                  setAssignmentSelection((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                className="rounded-lg border border-slate-300 px-2 py-1"
                              >
                                <option value="">Select employee</option>
                                {employeeOptions.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const selectedEmployeeId = Number(
                                    assignmentSelection[item.id] ??
                                      taskByComplaintId.get(Number(item.id))?.employee?.id ??
                                      item.assignedEmployeeId,
                                  )
                                  if (!selectedEmployeeId) {
                                    toast.error('Select an employee before assigning')
                                    return
                                  }

                                  const existingTask = getExistingTaskForComplaint(item.id)
                                  if (existingTask?.id) {
                                    const existingEmployeeId = Number(existingTask.employee?.id)
                                    if (existingEmployeeId && existingEmployeeId === selectedEmployeeId) {
                                      toast.info('Complaint already assigned to this employee')
                                    } else {
                                      toast.error('Complaint already assigned. Resolve current assignment before reassigning.')
                                    }
                                    return
                                  }

                                  runWithRefresh(
                                    async () => {
                                      const employeeCatalogId = await resolveEmployeeCatalogId(selectedEmployeeId)
                                      await postTaskAssignment(Number(item.id), employeeCatalogId, Number(user.id))
                                    },
                                    'Complaint assigned to employee',
                                    'Failed to assign complaint',
                                  )
                                }}
                                className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white"
                              >
                                Assign
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewMap(item)}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                View Map
                              </button>
                              {canApproveComplaint(item) && (
                                <>
                                  <span className="text-xs font-semibold text-slate-600">
                                    {getAssignedEmployeeName(item)}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={Boolean(approvingComplaintIds[item.id])}
                                    onClick={() =>
                                      (async () => {
                                        setApprovingComplaintIds((prev) => ({ ...prev, [item.id]: true }))
                                        try {
                                          await runWithRefresh(
                                            () => approveComplaintWithValidation(item.id),
                                            'Complaint approved',
                                            'Failed to approve complaint',
                                          )
                                        } finally {
                                          setApprovingComplaintIds((prev) => ({ ...prev, [item.id]: false }))
                                        }
                                      })()
                                    }
                                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                                  >
                                    {approvingComplaintIds[item.id] ? 'Approving...' : 'Approve'}
                                  </button>
                                </>
                              )}
                              {!item.adminApproved && !canApproveComplaint(item) && isComplaintAssigned(item) && (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                  WAITING RESOLUTION
                                </button>
                              )}
                              {item.adminApproved && (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                  APPROVED
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'Employee Management' && (
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runWithRefresh(
                      () => addEmployee(employeeForm),
                      'Employee added',
                      'Failed to add employee',
                    )
                  }}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3"
                >
                  <input
                    placeholder="Name"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                    Add Employee
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">ID</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b border-slate-100">
                          <td className="py-2">{emp.id}</td>
                          <td className="py-2">{emp.name}</td>
                          <td className="py-2">{emp.email}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() =>
                                runWithRefresh(
                                  () => deleteEmployee(emp.id),
                                  'Employee deleted',
                                  'Failed to delete employee',
                                )
                              }
                              className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'Employee Performance' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  Performance is now calculated dynamically in real-time based on the task statuses.
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">Employee</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Assigned</th>
                        <th className="py-2">Completed</th>
                        <th className="py-2">Real-Time Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => {
                        const empTasks = tasks.filter((t) => t.employee?.id === emp.id)
                        const totalAssigned = empTasks.length
                        const totalCompleted = empTasks.filter((t) => t.status === 'RESOLVED').length
                        const rating = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 5 : 0

                        return (
                          <tr key={emp.id} className="border-b border-slate-100">
                            <td className="py-2 font-semibold text-slate-800">{emp.name}</td>
                            <td className="py-2 text-slate-600">{emp.email}</td>
                            <td className="py-2">{totalAssigned}</td>
                            <td className="py-2">{totalCompleted}</td>
                            <td className="py-2 text-amber-500">{renderStars(rating)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'City Info Management' && (
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runWithRefresh(
                      () => addCityInfo(cityInfoForm),
                      'City info added',
                      'Failed to add city info',
                    )
                  }}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3"
                >
                  <input
                    placeholder="Area"
                    value={cityInfoForm.area}
                    onChange={(e) => setCityInfoForm((prev) => ({ ...prev, area: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="Important Place"
                    value={cityInfoForm.placeImp}
                    onChange={(e) => setCityInfoForm((prev) => ({ ...prev, placeImp: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                    Add City Info
                  </button>
                </form>

                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2">Area</th>
                      <th className="py-2">Place Description</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityInfo.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2">{item.area}</td>
                        <td className="py-2">{item.placeImp}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              runWithRefresh(
                                () => deleteCityInfo(item.id),
                                'City info deleted',
                                'Failed to delete city info',
                              )
                            }
                            className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Weather Management' && (
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runWithRefresh(
                      () => addWeather({ temp: Number(weatherForm.temp), place: weatherForm.place }),
                      'Weather entry added',
                      'Failed to add weather',
                    )
                  }}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3"
                >
                  <input
                    type="number"
                    placeholder="Temp"
                    value={weatherForm.temp}
                    onChange={(e) => setWeatherForm((prev) => ({ ...prev, temp: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <input
                    placeholder="Place"
                    value={weatherForm.place}
                    onChange={(e) => setWeatherForm((prev) => ({ ...prev, place: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  />
                  <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                    Add Weather
                  </button>
                </form>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {weather.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="text-lg font-bold text-slate-900">{item.place}</h4>
                      <p className="text-2xl font-black text-teal-700">{item.temp}°C</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.time)}</p>
                      <button
                        type="button"
                        onClick={() =>
                          runWithRefresh(
                            () => deleteWeather(item.id),
                            'Weather entry deleted',
                            'Failed to delete weather entry',
                          )
                        }
                        className="mt-3 rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Delete
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Food Management' && (
              <div className="space-y-4">
                <AddRestaurant onAdded={() => setFoodRefreshToken((prev) => prev + 1)} />
                <AddFoodItem refreshToken={foodRefreshToken} />
              </div>
            )}

            {activeTab === 'Order Management' && <AdminOrders />}

            {activeTab === 'User Management' && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2">ID</th>
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2">{item.id}</td>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2">{item.email}</td>
                        <td className="py-2">{item.role}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              runWithRefresh(
                                () => deleteUser(item.id),
                                'User deleted',
                                'Failed to delete user',
                              )
                            }
                            className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
