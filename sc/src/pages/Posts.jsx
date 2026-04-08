import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../api/axiosConfig'
import { getPostsByCategory, getPostsByLocation, getPostsFeed, likePost } from '../api/cityPostApi'
import CreateCityPost from '../components/CreateCityPost'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/date'

const categories = ['ALL', 'FLOOD', 'EVENT', 'ROAD', 'POWER', 'GENERAL']
const FALLBACK_IMAGE_SRC =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'%3E%3Crect width='1200' height='700' fill='%23e2e8f0'/%3E%3Ctext x='600' y='340' text-anchor='middle' font-family='Arial, sans-serif' font-size='44' font-weight='700' fill='%23475569'%3ENo Image Available%3C/text%3E%3C/svg%3E"

const resolvePostImageCandidates = (post) => {
  const rawImageUrl = String(post?.imageUrl ?? post?.imagePath ?? post?.image ?? '').trim()
  if (!rawImageUrl) return []

  const candidateSet = new Set()
  const addCandidate = (value) => {
    if (value && typeof value === 'string') candidateSet.add(value)
  }

  addCandidate(rawImageUrl)

  if (rawImageUrl.startsWith('http')) {
    try {
      const parsedUrl = new URL(rawImageUrl)
      const apiOrigin = new URL(API_BASE_URL)
      const localhostHosts = ['localhost', '127.0.0.1', '::1']

      if (localhostHosts.includes(parsedUrl.hostname)) {
        addCandidate(parsedUrl.toString())

        parsedUrl.protocol = apiOrigin.protocol
        parsedUrl.hostname = apiOrigin.hostname
        parsedUrl.port = apiOrigin.port
        addCandidate(parsedUrl.toString())

        const alternatePort = parsedUrl.port === '8088' ? '8080' : '8088'
        parsedUrl.port = alternatePort
        addCandidate(parsedUrl.toString())
      }
    } catch {
      addCandidate(rawImageUrl)
    }
  } else {
    const normalizedPath = rawImageUrl.replace(/^\/+/, '')
    try {
      addCandidate(new URL(normalizedPath, API_BASE_URL).toString())
      addCandidate(new URL(normalizedPath, window.location.origin).toString())
    } catch {
      addCandidate(`${API_BASE_URL}/${normalizedPath}`)
      addCandidate(`/${normalizedPath}`)
    }
  }

  return [...candidateSet]
}

const PostImage = ({ post }) => {
  const imageSources = resolvePostImageCandidates(post)
  const [displaySrc, setDisplaySrc] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadImage = async () => {
      setDisplaySrc('')
      setIsLoading(true)

      for (const candidate of imageSources) {
        const loaded = await new Promise((resolve) => {
          const image = new Image()
          image.onload = () => resolve(candidate)
          image.onerror = () => resolve('')
          image.src = candidate
        })

        if (cancelled) return

        if (loaded) {
          setDisplaySrc(loaded)
          setIsLoading(false)
          return
        }
      }

      if (!cancelled) {
        setDisplaySrc(FALLBACK_IMAGE_SRC)
        setIsLoading(false)
      }
    }

    loadImage()

    return () => {
      cancelled = true
    }
  }, [imageSources.join('|')])

  return (
    <div className="relative h-[220px] w-full overflow-hidden bg-slate-100">
      {isLoading ? <div className="absolute inset-0 animate-pulse bg-slate-200" /> : null}
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={post?.title ? `${post.title} photo` : 'post photo'}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={FALLBACK_IMAGE_SRC}
          alt="No image"
          className="h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/25 to-transparent" />
    </div>
  )
}

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

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)),
    [posts],
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedPosts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-xl bg-white shadow-md transition duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="relative">
                <PostImage post={post} />
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                  {post.category}
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
                <p className="mt-2 min-h-12 text-sm text-slate-600">{(post.description ?? '').slice(0, 120)}{(post.description ?? '').length > 120 ? '...' : ''}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{post.location}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(post.postedAt)}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Likes: {post.likesCount ?? 0}</span>
                <button
                  type="button"
                  onClick={() => handleLike(post.id)}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Like
                </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <CreateCityPost
              userId={user?.id}
              onSuccess={() => {
                setShowModal(false)
                fetchFeed()
              }}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default Posts
