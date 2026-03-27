import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getAllCityInfo } from '../../api/cityInfoApi'
import { getAllComplaints, postComplaint } from '../../api/complaintsApi'
import { getPostsFeed } from '../../api/cityPostApi'
import Loader from '../../components/Loader'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/date'
import { STATUS_STYLES } from '../../utils/constants'

const tabs = ['Home', 'Submit Complaint', 'My Complaints', 'City Info', 'City Posts Feed']

const CitizenDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Home')
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState([])
  const [cityInfo, setCityInfo] = useState([])
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState({ title: '', description: '', place: '', imageUrl: '' })

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

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmitComplaint = async (event) => {
    event.preventDefault()
    try {
      await postComplaint({ ...form, status: 'PENDING' })
      toast.success('Complaint submitted successfully')
      setForm({ title: '', description: '', place: '', imageUrl: '' })
      fetchData()
      setActiveTab('My Complaints')
    } catch {
      toast.error('Failed to submit complaint')
    }
  }

  const latestPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 5),
    [posts],
  )

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
              </div>
            )}

            {activeTab === 'Submit Complaint' && (
              <form onSubmit={handleSubmitComplaint} className="grid gap-3">
                <h3 className="text-xl font-bold text-slate-900">Submit Complaint</h3>
                <input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-4 py-2"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-4 py-2"
                  rows={4}
                  required
                />
                <input
                  placeholder="Place"
                  value={form.place}
                  onChange={(e) => setForm((prev) => ({ ...prev, place: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-4 py-2"
                  required
                />
                <input
                  placeholder="Image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-4 py-2"
                />
                <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white">
                  Submit Complaint
                </button>
              </form>
            )}

            {activeTab === 'My Complaints' && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">My Complaints</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">Title</th>
                        <th className="py-2">Place</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-2 font-medium text-slate-800">{item.title}</td>
                          <td className="py-2 text-slate-600">{item.place}</td>
                          <td className="py-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[item.status] ?? ''}`}>
                              {item.status}
                            </span>
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
          </>
        )}
      </main>
    </div>
  )
}

export default CitizenDashboard
