import { useEffect, useState } from 'react'
import axios from 'axios'

const getRestaurantId = (restaurant) => restaurant?.id ?? restaurant?.restaurantId
const RESTAURANTS_CACHE_KEY = 'food_restaurants_cache'
const FOOD_CACHE_KEY = 'food_items_cache'

const getOrderUserId = (order) => {
  return order?.citizen?.id ?? order?.user?.id ?? order?.citizenId ?? order?.userId ?? order?.user_id
}

const normalizeRestaurant = (raw) => {
  if (!raw || typeof raw !== 'object') return null

  const source = raw.restaurant ?? raw.data ?? raw.result ?? raw
  if (!source || typeof source !== 'object') return null

  const name = source.name ?? source.restaurantName ?? ''
  const location = source.location ?? source.place ?? ''
  const imagePath = source.imagePath ?? source.imageUrl ?? source.image ?? ''
  const id = source.id ?? source.restaurantId ?? null

  if (!name && !location && !imagePath) return null
  return { id, name, location, imagePath }
}

const normalizeRestaurantsResponse = (data) => {
  const source =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.restaurants) && data.restaurants) ||
    []

  return source.map(normalizeRestaurant).filter(Boolean)
}

const readRestaurantsCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESTAURANTS_CACHE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeRestaurant).filter(Boolean)
  } catch {
    return []
  }
}

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(false)
  const [sourceLabel, setSourceLabel] = useState('')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [foodItems, setFoodItems] = useState([])
  const [loadingFood, setLoadingFood] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [placingOrderId, setPlacingOrderId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true)
      try {
        const candidates = [
          'http://localhost:8086/restaurants',
          'http://localhost:8086/restaurants/getAll',
          'http://localhost:8086/restaurants/all',
        ]

        for (const url of candidates) {
          try {
            const response = await axios.get(url)
            const list = normalizeRestaurantsResponse(response.data)
            if (list.length > 0) {
              setRestaurants(list)
              setSourceLabel('api')
              localStorage.setItem(RESTAURANTS_CACHE_KEY, JSON.stringify(list))
              return
            }
          } catch {
            // Try next candidate endpoint.
          }
        }

        const cached = readRestaurantsCache()
        setRestaurants(cached)
        setSourceLabel(cached.length > 0 ? 'cache' : 'none')
      } catch (error) {
        console.error('Failed to fetch restaurants:', error)
        const cached = readRestaurantsCache()
        setRestaurants(cached)
        setSourceLabel(cached.length > 0 ? 'cache' : 'none')
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [])

  useEffect(() => {
    const syncFromCache = () => {
      const cached = readRestaurantsCache()
      if (cached.length > 0) {
        setRestaurants(cached)
        setSourceLabel('cache')
      }
    }

    const handleStorage = (event) => {
      if (event.key && event.key !== RESTAURANTS_CACHE_KEY) return
      syncFromCache()
    }

    const handleFocus = () => syncFromCache()

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchUserOrders = async () => {
    const rawUser = localStorage.getItem('user') || localStorage.getItem('smartcity_user')
    const user = rawUser ? JSON.parse(rawUser) : null
    if (!user?.id) {
      setOrders([])
      return
    }

    setLoadingOrders(true)
    try {
      const directEndpoints = [
        `/api/orders/user/${user.id}`,
        `http://localhost:8086/orders/user/${user.id}`,
      ]

      for (const url of directEndpoints) {
        try {
          const response = await axios.get(url)
          const list = Array.isArray(response.data) ? response.data : []
          setOrders(list)
          return
        } catch {
          // Try next endpoint.
        }
      }

      // Fallback: fetch all orders and filter by logged user.
      const allEndpoints = ['/api/orders', 'http://localhost:8086/orders']
      for (const url of allEndpoints) {
        try {
          const response = await axios.get(url)
          const list = Array.isArray(response.data) ? response.data : []
          const filtered = list.filter((order) => String(getOrderUserId(order)) === String(user.id))
          setOrders(filtered)
          return
        } catch {
          // Try next endpoint.
        }
      }

      setOrders([])
    } catch (error) {
      console.error('Failed to fetch user orders:', error)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchUserOrders()
  }, [])

  const readCachedFood = (restaurant) => {
    const restaurantId = getRestaurantId(restaurant)
    const restaurantName = String(restaurant?.name ?? '').trim().toLowerCase()

    try {
      const parsed = JSON.parse(localStorage.getItem(FOOD_CACHE_KEY) ?? '[]')
      if (!Array.isArray(parsed)) return []

      const matchedById = parsed.filter(
        (item) => String(item.restaurantId ?? item.restaurant?.id ?? item.restaurantID ?? '') === String(restaurantId),
      )

      const matchedByName =
        matchedById.length > 0
          ? matchedById
          : parsed.filter(
              (item) =>
                restaurantName &&
                String(item.restaurantName ?? item.restaurant?.name ?? '').trim().toLowerCase() === restaurantName,
            )

      return matchedByName
        .map((item, index) => ({
          id: item.id ?? item.foodId ?? `${item.name ?? item.foodName ?? 'item'}-${restaurantId}-${index}`,
          name: item.name ?? item.foodName ?? 'Unnamed item',
          price: Number(item.price ?? item.cost ?? 0),
          imagePath: item.imagePath ?? item.imageUrl ?? item.image ?? '',
        }))
    } catch {
      return []
    }
  }

  const viewMenu = async (restaurant) => {
    const id = getRestaurantId(restaurant)
    if (id === undefined || id === null) return

    setSelectedRestaurantId(String(id))
    setSelectedRestaurant(restaurant)
    setLoadingFood(true)

    try {
      const response = await axios.get(`http://localhost:8086/food?restaurantId=${id}`)
      const list = Array.isArray(response.data) ? response.data : []

      const normalized = list.map((item, index) => ({
        id: item.id ?? item.foodId ?? `${item.name ?? item.foodName ?? 'item'}-${id}-${index}`,
        name: item.name ?? item.foodName ?? 'Unnamed item',
        price: Number(item.price ?? item.cost ?? 0),
        imagePath: item.imagePath ?? item.imageUrl ?? item.image ?? '',
      }))

      setFoodItems(normalized)
    } catch (error) {
      console.error('Failed to fetch food items:', error)
      setFoodItems(readCachedFood(restaurant))
    } finally {
      setLoadingFood(false)
    }
  }

  const filteredFoodItems = foodItems.filter((item) =>
    item.name.toLowerCase().includes(foodSearch.trim().toLowerCase()),
  )

  const placeOrder = async (item) => {
    if (!selectedRestaurant) return
    setPlacingOrderId(item.id)

    try {
      const rawUser = localStorage.getItem('user') || localStorage.getItem('smartcity_user')
      const user = rawUser ? JSON.parse(rawUser) : null
      const userId = user?.id
      const restaurantId = getRestaurantId(selectedRestaurant)

      if (!userId) {
        alert('Please log in again to place an order')
        return
      }

      const createEndpoints = ['/api/orders/create', 'http://localhost:8086/orders/create']
      let placed = false

      for (const url of createEndpoints) {
        try {
          await axios.post(url, null, {
            params: {
              userId,
              restaurantId,
              totalAmount: item.price,
            },
          })
          placed = true
          break
        } catch {
          // Try next endpoint.
        }
      }

      if (!placed) {
        throw new Error('Unable to place order at this time')
      }

      alert('Order placed successfully!')
      await fetchUserOrders()
    } catch (error) {
      console.error('Failed to place order:', error)
      const backendMessage =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'Failed to place order'
      alert(backendMessage)
    } finally {
      setPlacingOrderId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Restaurants</h2>
      {sourceLabel === 'cache' && (
        <p className="text-xs font-medium text-amber-700">
          Showing locally added restaurants because list API endpoint is unavailable.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading restaurants...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => {
            const restaurantId = getRestaurantId(restaurant)
            const isSelected = String(restaurantId) === String(selectedRestaurantId)
            return (
              <div key={restaurantId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src={restaurant.imagePath}
                  alt={restaurant.name ?? 'Restaurant'}
                  className="h-36 w-full rounded-lg object-cover"
                />
                <h3 className="mt-3 text-base font-bold text-slate-900">{restaurant.name}</h3>
                <button
                  type="button"
                  onClick={() => viewMenu(restaurant)}
                  className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  View Menu
                </button>

                {isSelected && (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Food Items</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {filteredFoodItems.length} items
                      </span>
                    </div>
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      placeholder="Search food"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    {loadingFood ? (
                      <p className="text-sm text-slate-500">Loading food items...</p>
                    ) : filteredFoodItems.length === 0 ? (
                      <p className="text-sm text-slate-500">No food items found for this restaurant.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredFoodItems.map((item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <img src={item.imagePath} width="120" alt={item.name} className="rounded-md object-cover" />
                              <div>
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="text-sm text-slate-600">${Number(item.price).toFixed(2)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => placeOrder(item)}
                              disabled={placingOrderId === item.id}
                              className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {placingOrderId === item.id ? 'Placing...' : 'Order'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {restaurants.length === 0 && (
            <p className="text-sm text-slate-500">
              No restaurants found yet. Add one from Admin - Food Management.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">My Orders</h3>
        {loadingOrders ? (
          <p className="text-sm text-slate-500">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const status = String(order.status ?? 'PLACED').toUpperCase()
              const statusClass =
                status === 'DELIVERED'
                  ? 'text-emerald-700'
                  : status === 'ASSIGNED' || status === 'OUT_FOR_DELIVERY'
                    ? 'text-amber-700'
                    : 'text-slate-600'

              return (
                <div key={order.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">Order #{order.id}</p>
                  <p className="text-sm text-slate-700">Amount: ₹{Number(order.totalAmount ?? 0).toFixed(2)}</p>
                  <p className={`text-sm ${statusClass}`}>
                    Status: <b>{status}</b>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default RestaurantList
