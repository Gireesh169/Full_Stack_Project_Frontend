import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { createPost, getPostsByCategory, getPostsByLocation, getPostsFeed, likePost } from '../api/cityPostApi'
import Loader from '../components/Loader'
import PostModal from '../components/PostModal'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/date'

const categories = ['ALL', 'FLOOD', 'EVENT', 'ROAD', 'POWER', 'GENERAL']

const Posts = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const { data } = await getPostsFeed()
      setPosts(data)
    } catch {
      toast.error('Unable to load posts feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
  }, [])

  const handleCategory = async (category) => {
    setActiveCategory(category)
    setLocationFilter('')
    setLoading(true)

    try {
      if (category === 'ALL') {
        await fetchFeed()
        return
      }
      const { data } = await getPostsByCategory(category)
      setPosts(data)
    } catch {
      toast.error('Unable to filter posts by category')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSearch = async (event) => {
    event.preventDefault()
    if (!locationFilter.trim()) {
      fetchFeed()
      return
    }

    setLoading(true)
    try {
      const { data } = await getPostsByLocation(locationFilter.trim())
      setPosts(data)
    } catch {
      toast.error('No posts found for that location')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId) => {
    try {
      await likePost(postId, user.id)
      toast.success('Post liked')
      fetchFeed()
    } catch {
      toast.error('Unable to like post')
    }
  }

  const handleCreate = async (payload) => {
    try {
      await createPost(user.id, payload)
      toast.success('Post created successfully')
      setShowModal(false)
      fetchFeed()
    } catch {
      toast.error('Unable to create post')
    }
  }

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
    [posts],
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">City Posts Feed</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          Create Post
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategory(category)}
            className={`rounded-full px-4 py-2 text-xs font-bold sm:text-sm ${
              activeCategory === category ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <form onSubmit={handleLocationSearch} className="mb-6 flex gap-2">
        <input
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Filter by location"
          className="w-full rounded-xl border border-slate-300 px-4 py-2"
        />
        <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-900">
          Search
        </button>
      </form>

      {loading ? (
        <Loader label="Loading city posts..." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPosts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
                {post.category}
              </p>
              <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{post.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{post.location}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(post.postedAt)}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Likes: {post.likesCount ?? 0}</span>
                <button
                  type="button"
                  onClick={() => handleLike(post.id)}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
                >
                  Like
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <PostModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreate} />
    </section>
  )
}

export default Posts
