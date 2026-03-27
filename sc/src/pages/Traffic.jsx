import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { createPost, getPostsByCategory } from '../api/cityPostApi'
import Loader from '../components/Loader'
import PostModal from '../components/PostModal'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/date'

const Traffic = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchRoadPosts = async () => {
    setLoading(true)
    try {
      const { data } = await getPostsByCategory('ROAD')
      setPosts(data)
    } catch {
      toast.error('Unable to load traffic reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoadPosts()
  }, [])

  const handleCreateTrafficPost = async (payload) => {
    try {
      await createPost(user.id, { ...payload, category: 'ROAD' })
      toast.success('Traffic issue posted')
      setShowModal(false)
      fetchRoadPosts()
    } catch {
      toast.error('Unable to post traffic issue')
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Traffic Report</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-900"
        >
          Report Traffic Issue
        </button>
      </div>

      {loading ? (
        <Loader label="Loading road incidents..." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-amber-500"
            >
              <h3 className="text-lg font-bold text-slate-900">{post.location}</h3>
              <p className="mt-2 text-sm text-slate-600">{post.description}</p>
              <p className="mt-2 text-xs text-slate-500">{formatDateTime(post.postedAt)}</p>
            </article>
          ))}
        </div>
      )}

      <PostModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateTrafficPost}
        presetCategory="ROAD"
      />
    </section>
  )
}

export default Traffic
