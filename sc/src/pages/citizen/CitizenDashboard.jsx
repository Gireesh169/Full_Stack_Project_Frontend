import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getAllCityInfo } from '../../api/cityInfoApi'
import { getAllComplaints, updateComplaint } from '../../api/complaintsApi'
import { getPostsFeed } from '../../api/cityPostApi'
import Loader from '../../components/Loader'
import MapComponent from '../../components/MapComponent'
import SubmitComplaint from '../../components/SubmitComplaint'
import RestaurantList from '../../components/food/RestaurantList'
import { CitizenComplaintStatusPie } from '../../components/charts/DashboardCharts'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'
import { STATUS_STYLES } from '../../utils/constants'

const tabs = ['Home', 'Submit Complaint', 'My Complaints', 'City Info', 'City Posts Feed', 'Food Ordering']

const getCitizenVisibleStatus = (complaint) => {
  if (!complaint?.adminApproved) return 'WAITING_FOR_APPROVAL'
  return 'RESOLVED'
}

const CitizenDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Home')
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState([])
  const [complaintEdits, setComplaintEdits] = useState({})
  const [cityInfo, setCityInfo] = useState([])
  const [posts, setPosts] = useState([])
  const [destinationInput, setDestinationInput] = useState('')
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const parseLatLngInput = (value) => {
    const matched = value.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (!matched) return null

    const lat = Number(matched[1])
    const lng = Number(matched[2])

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

    return { lat, lng }
  }

  const resolveDestination = async (query) => {
    const directCoords = parseLatLngInput(query)
    if (directCoords) return directCoords

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const result = await response.json()
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Destination not found')
    }

    return {
      lat: Number(result[0].lat),
      lng: Number(result[0].lon),
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [complaintsRes, cityInfoRes, postsRes] = await Promise.all([
        getAllComplaints(),
        getAllCityInfo(),
        getPostsFeed(),
      ])
      setComplaints(complaintsRes.data)
      setCityInfo(cityInfoRes.data)
      setPosts(postsRes.data)
    } catch {
      toast.error('Failed to load citizen dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getComplaintDisplayValue = (item, field) => {
    const edit = complaintEdits[String(item?.id)]
    if (edit && edit[field] !== undefined) return edit[field]
    return item?.[field]
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'My Complaints') {
      fetchData()
    }
  }, [activeTab])

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'My Complaints') {
        fetchData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [activeTab])

  const handleComplaintSuccess = () => {
    toast.success('Complaint submitted successfully')
    fetchData()
    setActiveTab('My Complaints')
  }

  const handleUpdateComplaint = async (complaint) => {
    if (getCitizenVisibleStatus(complaint) === 'RESOLVED') {
      toast.info('Resolved complaints cannot be updated')
      return
    }

    const nextTitle = window.prompt('Update title', complaint?.title ?? '')
    if (nextTitle === null) return

    const nextPlace = window.prompt('Update place', complaint?.place ?? '')
    if (nextPlace === null) return

    const trimmedTitle = nextTitle.trim()
    const trimmedPlace = nextPlace.trim()

    if (!trimmedTitle || !trimmedPlace) {
      toast.error('Title and place are required')
      return
    }

    try {
      const updateResponse = await updateComplaint(complaint.id, {
        title: trimmedTitle,
        place: trimmedPlace,
        description: complaint?.description,
        status: complaint?.status,
        latitude: complaint?.latitude,
        longitude: complaint?.longitude,
      })

      const responseComplaint = updateResponse?.data
      const responseId = responseComplaint?.id

      setComplaints((prev) =>
        prev.map((item) => {
          const sameOriginalId = String(item.id) === String(complaint.id)
          const sameResponseId = responseId !== undefined && String(item.id) === String(responseId)

          if (!sameOriginalId && !sameResponseId) return item

          return {
            ...item,
            ...responseComplaint,
            id: item.id,
            title: trimmedTitle,
            place: trimmedPlace,
          }
        }),
      )

      setComplaintEdits((prev) => ({
        ...prev,
        [String(complaint.id)]: {
          title: trimmedTitle,
          place: trimmedPlace,
        },
      }))

      toast.success('Complaint updated')
    } catch (error) {
      const backendMessage =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : error?.response?.data?.message || error?.response?.data?.error
      toast.error(backendMessage || 'Failed to update complaint')
    }
  }

  const handleRouteSubmit = async (event) => {
    event.preventDefault()

    const query = destinationInput.trim()
    if (!query) {
      toast.error('Enter a destination or coordinates')
      return
    }

    setRouteLoading(true)
    try {
      const coords = await resolveDestination(query)
      setDestinationCoords(coords)
      toast.success('Route updated')
    } catch {
      toast.error('Unable to resolve destination')
    } finally {
      setRouteLoading(false)
    }
  }

  const clearRoute = () => {
    setDestinationInput('')
    setDestinationCoords(null)
  }

  const latestPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 5),
    [posts],
  )

  const statusChartData = useMemo(() => {
    const counts = {
      PENDING: 0,
      WAITING_FOR_APPROVAL: 0,
      RESOLVED: 0,
    }

    complaints.forEach((item) => {
      const status = getCitizenVisibleStatus(item)
      if (counts[status] !== undefined) counts[status] += 1
    })

    return [
      { name: 'Pending', value: counts.PENDING },
      { name: 'Waiting for Approval', value: counts.WAITING_FOR_APPROVAL },
      { name: 'Resolved', value: counts.RESOLVED },
    ]
  }, [complaints])

  const sidebarClass = (tab) =>
    `w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
      activeTab === tab
        ? 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-md shadow-teal-500/20'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-[260px_1fr] sm:px-6">
      <aside className="h-fit rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
        <h2 className="mb-6 px-2 text-xl font-extrabold text-slate-900">Citizen Panel</h2>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button key={tab} type="button" className={sidebarClass(tab)} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </aside>

      <main className="rounded-[2.5rem] border border-white/60 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-3xl sm:p-8">
        {loading ? (
          <Loader label="Loading dashboard..." />
        ) : (
          <>
            {activeTab === 'Home' && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
                  <h1 className="text-2xl font-black">Welcome, {user.name}</h1>
                  <p className="mt-2 text-sm text-white/90">Use this dashboard to report and track city issues.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-sm backdrop-blur-md">
                    <p className="text-sm font-semibold text-slate-500">Complaints Submitted</p>
                    <p className="mt-2 text-4xl font-black text-slate-900">{complaints.length}</p>
                  </div>
                  <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-sm backdrop-blur-md">
                    <p className="text-sm text-slate-500">Quick Links</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => setActiveTab('Submit Complaint')} className="rounded-lg bg-slate-100 px-3 py-1 text-sm">
                        Submit
                      </button>
                      <button onClick={() => setActiveTab('My Complaints')} className="rounded-lg bg-slate-100 px-3 py-1 text-sm">
                        My Complaints
                      </button>
                      <Link to="/posts" className="rounded-lg bg-slate-100 px-3 py-1 text-sm">
                        Full Posts Feed
                      </Link>
                    </div>
                  </div>
                </div>
                <CitizenComplaintStatusPie data={statusChartData} />
                <div className="space-y-3 rounded-3xl border border-white/50 bg-white/40 p-5 shadow-sm backdrop-blur-md">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">City Safety Map</h3>
                    <p className="text-sm text-slate-600">Live location markers from the city control backend.</p>
                  </div>
                  <form onSubmit={handleRouteSubmit} className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      placeholder="Enter destination name or lat,lng (e.g. 17.385, 78.487)"
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={routeLoading}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {routeLoading ? 'Routing...' : 'Show Route'}
                    </button>
                    <button
                      type="button"
                      onClick={clearRoute}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Clear
                    </button>
                  </form>
                  <MapComponent destination={destinationCoords} />
                </div>
              </div>
            )}

            {activeTab === 'Submit Complaint' && (
              <SubmitComplaint onSuccess={handleComplaintSuccess} />
            )}

            {activeTab === 'My Complaints' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">My Complaints</h3>
                <p className="text-sm font-medium text-slate-500">
                  Complaints remain IN REVIEW until admin approval after employee resolution.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">Title</th>
                        <th className="py-2">Place</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-2 font-medium text-slate-800">{getComplaintDisplayValue(item, 'title')}</td>
                          <td className="py-2 text-slate-600">{getComplaintDisplayValue(item, 'place')}</td>
                          <td className="py-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[getCitizenVisibleStatus(item)] ?? ''}`}
                            >
                              {getCitizenVisibleStatus(item).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateComplaint(item)}
                              disabled={getCitizenVisibleStatus(item) === 'RESOLVED'}
                              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'City Info' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">City Info</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {cityInfo.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="font-bold text-slate-900">{item.area}</h4>
                      <p className="mt-2 text-sm text-slate-600">{item.placeImp}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'City Posts Feed' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">Latest City Posts</h3>
                <div className="space-y-2">
                  {latestPosts.map((post) => (
                    <article key={post.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-semibold text-slate-900">{post.title}</p>
                      <p className="text-sm text-slate-600">{post.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(post.postedAt)}</p>
                    </article>
                  ))}
                </div>
                <Link to="/posts" className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Open Full Posts Page
                </Link>
              </div>
            )}

            {activeTab === 'Food Ordering' && <RestaurantList />}
          </>
        )}
      </main>
    </div>
  )
}

export default CitizenDashboard
