import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { addCityInfo, deleteCityInfo, getAllCityInfo } from '../../api/cityInfoApi'
import { getAllComplaints, updateComplaintStatus, deleteComplaint } from '../../api/complaintsApi'
import { addEmployee, deleteEmployee, getAllEmployees } from '../../api/employeeApi'
import { getAllPerformance, postPerformance } from '../../api/performanceApi'
import { getAllPosts } from '../../api/cityPostApi'
import { deleteTask, getAllTasks, postTaskAssignment, updateTaskStatus } from '../../api/taskApi'
import { getAllUsers, deleteUser } from '../../api/userApi'
import { addWeather, deleteWeather, getAllWeather } from '../../api/weatherApi'
import Loader from '../../components/Loader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'

const tabs = [
  'Dashboard Home',
  'Complaints Management',
  'Task Assignment',
  'Employee Management',
  'Employee Performance',
  'City Info Management',
  'Weather Management',
  'User Management',
]

const renderStars = (rating = 0) => {
  const filled = Math.round(Number(rating))
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled)
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
  const [taskForm, setTaskForm] = useState({ complaintId: '', employeeId: '' })

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

  const summaryCards = useMemo(
    () => [
      { label: 'Total Complaints', value: complaints.length },
      { label: 'Total Employees', value: employees.length },
      { label: 'Active Tasks', value: tasks.length },
      { label: 'Total Posts', value: posts.length },
    ],
    [complaints.length, employees.length, tasks.length, posts.length],
  )

  const employeeUsers = useMemo(
    () => users.filter((item) => item.role === 'EMPLOYEE'),
    [users],
  )

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
    } catch {
      toast.error(errorMsg)
    }
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

                <section>
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
                        {complaints.slice(0, 5).map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2">{item.id}</td>
                            <td className="py-2">{item.title}</td>
                            <td className="py-2">{item.place}</td>
                            <td className="py-2">{item.status}</td>
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
                            <td className="py-2">{task.status}</td>
                            <td className="py-2">{formatDateTime(task.assignedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Complaints Management' && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2">ID</th>
                      <th className="py-2">Title</th>
                      <th className="py-2">Place</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2">{item.id}</td>
                        <td className="py-2">{item.title}</td>
                        <td className="py-2">{item.place}</td>
                        <td className="py-2">
                          <select
                            value={item.status ?? ''}
                            onChange={(e) =>
                              runWithRefresh(
                                () => updateComplaintStatus(item.id, e.target.value),
                                'Complaint status updated',
                                'Failed to update complaint status',
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1"
                          >
                            <option value="" disabled>
                              Select status
                            </option>
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              runWithRefresh(
                                () => deleteComplaint(item.id),
                                'Complaint deleted',
                                'Failed to delete complaint',
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

            {activeTab === 'Task Assignment' && (
              <div className="space-y-5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!taskForm.complaintId || !taskForm.employeeId) {
                      toast.error('Please select both complaint and employee')
                      return
                    }

                    const selectedUser = employeeUsers.find((u) => String(u.id) === String(taskForm.employeeId))
                    if (!selectedUser) {
                      toast.error('Invalid employee user selected')
                      return
                    }

                    let targetEmployeeId = null

                    const existingEmployee = employees.find(
                      (emp) => emp.email?.toLowerCase() === selectedUser.email?.toLowerCase()
                    )

                    if (existingEmployee) {
                      targetEmployeeId = existingEmployee.id
                    } else {
                      try {
                        await addEmployee({ name: selectedUser.name, email: selectedUser.email })
                        const refetched = await getAllEmployees()
                        const newlyCreated = refetched.data.find(
                          (emp) => emp.email?.toLowerCase() === selectedUser.email?.toLowerCase()
                        )
                        if (newlyCreated) targetEmployeeId = newlyCreated.id
                      } catch (err) {
                        toast.error('Failed to link employee account in catalog')
                        return
                      }
                    }

                    if (!targetEmployeeId) {
                      toast.error('Could not resolve Employee Catalog ID')
                      return
                    }

                    runWithRefresh(
                      () => postTaskAssignment(Number(taskForm.complaintId), Number(targetEmployeeId), Number(user.id)),
                      'Task assigned successfully',
                      'Task assignment failed',
                    )
                  }}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3"
                >
                  <select
                    value={taskForm.complaintId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, complaintId: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  >
                    <option value="">Select Complaint</option>
                    {complaints.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={taskForm.employeeId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employeeUsers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                    Assign
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">Complaint</th>
                        <th className="py-2">Employee</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Assigned At</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b border-slate-100">
                          <td className="py-2">{task.complaint?.title}</td>
                          <td className="py-2">{task.employee?.name}</td>
                          <td className="py-2">
                            <select
                              value={task.status ?? ''}
                              onChange={(e) =>
                                runWithRefresh(
                                  () => updateTaskStatus(task.id, e.target.value),
                                  'Task status updated',
                                  'Failed to update task status',
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1"
                            >
                              <option value="" disabled>
                                Select status
                              </option>
                              <option value="PENDING">PENDING</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="RESOLVED">RESOLVED</option>
                            </select>
                          </td>
                          <td className="py-2">{formatDateTime(task.assignedAt)}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() =>
                                runWithRefresh(() => deleteTask(task.id), 'Task deleted', 'Failed to delete task')
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
