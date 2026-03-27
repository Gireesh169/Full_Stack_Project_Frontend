import { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { getAllEmployees } from '../../api/employeeApi'
import { getPerformanceByEmployeeId } from '../../api/performanceApi'
import { getTasksByEmployee, updateTaskStatus } from '../../api/taskApi'
import Loader from '../../components/Loader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'
import { STATUS_STYLES } from '../../utils/constants'

const tabs = ['My Assigned Tasks', 'My Performance']

const renderStars = (rating = 0) => {
  const filled = Math.round(Number(rating))
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled)
}

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('My Assigned Tasks')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [performance, setPerformance] = useState(null)

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
  }, [user.id, resolveEmployeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusUpdate = async (taskId, status) => {
    try {
      await updateTaskStatus(taskId, status)
      toast.success('Task status updated')
      fetchData()
    } catch {
      toast.error('Failed to update task status')
    }
  }

  const sidebarClass = (tab) =>
    `w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-500/20'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  const realTotalAssigned = tasks.length
  const realTotalCompleted = tasks.filter((t) => t.status === 'RESOLVED').length
  const realRating = realTotalAssigned > 0 ? (realTotalCompleted / realTotalAssigned) * 5 : 0

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
                {tasks.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                    No assigned tasks found.
                  </div>
                ) : (
                  tasks.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-lg font-bold text-slate-900">{task.complaint?.title ?? 'Untitled Complaint'}</h3>
                    <p className="mt-1 text-sm text-slate-600">{task.complaint?.description}</p>
                    <p className="mt-1 text-sm text-slate-600">Place: {task.complaint?.place}</p>
                    {task.complaint?.imageUrl && (
                      <img
                        src={task.complaint.imageUrl}
                        alt={task.complaint.title}
                        className="mt-3 h-36 w-full rounded-xl object-cover sm:w-64"
                      />
                    )}
                    <p className="mt-3 text-xs text-slate-500">Assigned at: {formatDateTime(task.assignedAt)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[task.status] ?? ''}`}>
                        {task.status}
                      </span>
                      <select
                        value={task.status ?? ''}
                        onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                      >
                        <option value="" disabled>
                          Select status
                        </option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>
                  </article>
                  ))
                )}
              </div>
            )}

            {activeTab === 'My Performance' && (
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
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default EmployeeDashboard
