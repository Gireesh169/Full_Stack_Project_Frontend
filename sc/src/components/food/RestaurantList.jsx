import { useEffect, useState } from 'react'
import axios from 'axios'
import './food-ordering.css'
import MapComponent from '../MapComponent'
import { cancelOrder as cancelOrderApi, getUserOrders } from '../../api/orderApi'
import { API_BASE_URL, resolveImageUrl } from '../../api/axiosConfig'

const getRestaurantId = (restaurant) => restaurant?.id ?? restaurant?.restaurantId
const RESTAURANTS_CACHE_KEY = 'food_restaurants_cache'
const FOOD_CACHE_KEY = 'food_items_cache'

const getOrderUserId = (order) => {
  return order?.citizen?.id ?? order?.user?.id ?? order?.citizenId ?? order?.userId ?? order?.user_id
}

const getOrderStatus = (order) => String(order?.status ?? 'PENDING').toUpperCase()

const getStatusClassName = (status) => {
  if (status === 'PENDING') return 'food-order-status-pending'
  if (status === 'ASSIGNED') return 'food-order-status-assigned'
  if (status === 'DELIVERED') return 'food-order-status-delivered'
  if (status === 'CANCELLED') return 'food-order-status-cancelled'
  return 'food-order-status-pending'
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

const fallbackImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='420' viewBox='0 0 800 420'%3E%3Crect width='800' height='420' fill='%23e2e8f0'/%3E%3Ctext x='400' y='220' text-anchor='middle' font-family='Arial, sans-serif' font-size='30' font-weight='700' fill='%23475569'%3ENo Image%3C/text%3E%3C/svg%3E"

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
  const [ordersError, setOrdersError] = useState('')
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationDraft, setLocationDraft] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [resolvingAddress, setResolvingAddress] = useState(false)

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true)
      try {
        const candidates = [
          `${API_BASE_URL}/restaurants`,
          `${API_BASE_URL}/restaurants/getAll`,
          `${API_BASE_URL}/restaurants/all`,
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
      setOrdersError('')
      return
    }

    setLoadingOrders(true)
    setOrdersError('')
    try {
      const response = await getUserOrders(user.id)
      const list = Array.isArray(response.data) ? response.data : []
      const filtered = list.filter((order) => String(getOrderUserId(order)) === String(user.id))
      setOrders(filtered)
    } catch (error) {
      console.error('Failed to fetch user orders:', error)
      setOrders([])
      setOrdersError('Unable to load your orders right now.')
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchUserOrders()
  }, [])

  const handleCancelOrder = async (orderId, status) => {
    if (status !== 'PENDING') return

    setCancellingOrderId(orderId)
    try {
      await cancelOrderApi(orderId)
      await fetchUserOrders()
    } catch (error) {
      console.error('Failed to cancel order:', error)
      const message =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'Failed to cancel order. Please try again.'
      alert(message)
    } finally {
      setCancellingOrderId(null)
    }
  }

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
      const response = await axios.get(`${API_BASE_URL}/food?restaurantId=${id}`)
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

  const reverseGeocode = async (lat, lng) => {
    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'jsonv2',
          lat,
          lon: lng,
        },
      })

      return data?.display_name || `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
    } catch {
      return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
    }
  }

  const handleLocationPick = async (point) => {
    const latitude = Number(point?.lat)
    const longitude = Number(point?.lng)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    setResolvingAddress(true)
    try {
      const address = await reverseGeocode(latitude, longitude)
      const nextLocation = { lat: latitude, lng: longitude, address }
      setLocationDraft(nextLocation)
      setSelectedLocation(nextLocation)
    } finally {
      setResolvingAddress(false)
    }
  }

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

      if (!selectedLocation?.lat || !selectedLocation?.lng || !selectedLocation?.address) {
        alert('Please select a delivery location before placing the order')
        return
      }

      const createEndpoints = ['/api/orders/create', `${API_BASE_URL}/orders/create`]
      let placed = false
      const orderPayload = {
        userId,
        foodId: item.id,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        deliveryAddress: selectedLocation.address,
        address: selectedLocation.address,
        deliveryLocation: selectedLocation.address,
        restaurantId,
        totalAmount: item.price,
      }

      for (const url of createEndpoints) {
        try {
          await axios.post(url, orderPayload, {
            params: orderPayload,
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
    <div className="food-ordering space-y-5">
      <h2 className="food-ordering-title">Restaurants</h2>
      {sourceLabel === 'cache' && (
        <p className="food-ordering-note">
          Showing locally added restaurants because list API endpoint is unavailable.
        </p>
      )}

      {loading ? (
        <p className="food-ordering-muted">Loading restaurants...</p>
      ) : (
        <>
          <div className="food-restaurant-grid">
            {restaurants.map((restaurant) => {
              const restaurantId = getRestaurantId(restaurant)
              const isSelected = String(restaurantId) === String(selectedRestaurantId)
              return (
                <div
                  key={restaurantId}
                  className={`food-restaurant-card ${isSelected ? 'food-restaurant-card-active' : ''}`.trim()}
                >
                <img
                  src={resolveImageUrl(restaurant.imagePath) || fallbackImage}
                  alt={restaurant.name ?? 'Restaurant'}
                  className="food-restaurant-image"
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = fallbackImage
                  }}
                />
                <h3 className="food-restaurant-name">{restaurant.name}</h3>
                <button
                  type="button"
                  onClick={() => viewMenu(restaurant)}
                  className="food-btn-primary"
                >
                  {isSelected ? 'Menu Open' : 'View Menu'}
                </button>

                </div>
              )
            })}
            {restaurants.length === 0 && (
              <p className="food-ordering-muted">
                No restaurants found yet. Add one from Admin - Food Management.
              </p>
            )}
          </div>

          {selectedRestaurantId && (
            <div className="food-items-panel">
              <div className="food-items-header">
                <h4 className="food-items-title">Food Items</h4>
                <span className="food-items-count">
                  {filteredFoodItems.length} items
                </span>
              </div>

              <div className="food-location-bar">
                <div className="food-location-info">
                  <p className="food-location-label">Delivery Location</p>
                  <p className="food-location-address">
                    {selectedLocation?.address || 'No location selected. Please choose delivery location.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="food-btn-secondary"
                  onClick={() => {
                    setLocationDraft(selectedLocation)
                    setShowLocationModal(true)
                  }}
                >
                  {selectedLocation ? 'Change Location' : 'Select Location'}
                </button>
              </div>

              <p className="food-menu-heading">{selectedRestaurant?.name ?? 'Selected Restaurant'}</p>
              <input
                type="text"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder="Search food"
                className="food-search-input"
              />
              {loadingFood ? (
                <p className="food-ordering-muted">Loading food items...</p>
              ) : filteredFoodItems.length === 0 ? (
                <p className="food-ordering-muted">No food items found for this restaurant.</p>
              ) : (
                <div className="food-items-list">
                  {filteredFoodItems.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="food-item-row"
                    >
                      <div className="food-item-main">
                        <img
                          src={resolveImageUrl(item.imagePath) || fallbackImage}
                          width="120"
                          alt={item.name}
                          className="food-item-image"
                          onError={(event) => {
                            event.currentTarget.onerror = null
                            event.currentTarget.src = fallbackImage
                          }}
                        />
                        <div className="food-item-info">
                          <p className="food-item-name">{item.name}</p>
                          <p className="food-item-price">${Number(item.price).toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => placeOrder(item)}
                        disabled={placingOrderId === item.id}
                        className="food-btn-order"
                      >
                        {placingOrderId === item.id ? 'Placing...' : 'Order'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="food-orders-card">
        <h3 className="food-orders-title">My Orders</h3>
        {loadingOrders ? (
          <p className="food-ordering-muted">Loading your orders...</p>
        ) : ordersError ? (
          <p className="food-ordering-muted">{ordersError}</p>
        ) : orders.length === 0 ? (
          <p className="food-ordering-muted">No orders yet.</p>
        ) : (
          <div className="food-orders-list">
            {orders.map((order) => {
              const status = getOrderStatus(order)
              const statusClass = getStatusClassName(status)

              return (
                <div key={order.id} className="food-order-row">
                  <div className="food-order-top">
                    <p className="food-order-id">Order #{order.id}</p>
                    <span className={`food-order-status-badge ${statusClass}`}>{status}</span>
                  </div>
                  <p className="food-order-food">Food: {order?.food?.name ?? order?.foodName ?? 'Food item'}</p>
                  <p className="food-order-amount">Amount: ₹{Number(order.totalAmount ?? 0).toFixed(2)}</p>
                  <p className="food-order-address">
                    Delivery: {order.deliveryAddress ?? order.address ?? 'Address unavailable'}
                  </p>
                  {status === 'PENDING' && (
                    <button
                      type="button"
                      className="food-btn-cancel"
                      disabled={cancellingOrderId === order.id}
                      onClick={() => handleCancelOrder(order.id, status)}
                    >
                      {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLocationModal && (
        <div className="food-location-modal-backdrop" role="presentation" onClick={() => setShowLocationModal(false)}>
          <div className="food-location-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="food-location-modal-header">
              <h4 className="food-location-modal-title">Select Delivery Location</h4>
              <button
                type="button"
                className="food-modal-close"
                onClick={() => setShowLocationModal(false)}
              >
                Close
              </button>
            </div>
            <p className="food-ordering-muted">Click on map to set your delivery point.</p>
            <MapComponent
              destination={
                locationDraft
                  ? { lat: locationDraft.lat, lng: locationDraft.lng }
                  : null
              }
              onLocationSelect={handleLocationPick}
              onDestinationSelect={handleLocationPick}
              mapHeight={360}
            />
            <div className="food-location-preview">
              <p className="food-location-label">Selected Address</p>
              <p className="food-location-address">
                {resolvingAddress
                  ? 'Resolving address...'
                  : locationDraft?.address || 'Click on map to pick location'}
              </p>
            </div>
            <div className="food-location-modal-actions">
              <button
                type="button"
                className="food-btn-secondary"
                onClick={() => setShowLocationModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="food-btn-primary food-btn-primary-inline"
                disabled={!locationDraft || resolvingAddress}
                onClick={() => {
                  if (!locationDraft) return
                  setSelectedLocation(locationDraft)
                  setShowLocationModal(false)
                }}
              >
                Use This Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantList
