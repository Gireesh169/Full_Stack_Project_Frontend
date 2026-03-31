import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cart from './Cart'

const getId = (item) => item?.id ?? item?.foodId ?? item?.itemId

const FoodMenu = ({ restaurantId: restaurantIdProp }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const restaurantId = useMemo(() => {
    if (restaurantIdProp) return restaurantIdProp
    if (location.state?.restaurantId) return location.state.restaurantId

    const queryParams = new URLSearchParams(location.search)
    return queryParams.get('restaurantId')
  }, [location.search, location.state, restaurantIdProp])

  const [foodItems, setFoodItems] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!restaurantId) return

    const fetchFoodItems = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`http://localhost:8086/food?restaurantId=${restaurantId}`)
        setFoodItems(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        console.error('Failed to fetch food items:', error)
        setFoodItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchFoodItems()
  }, [restaurantId])

  const addToCart = (item) => {
    const normalizedId = getId(item)
    if (normalizedId === undefined || normalizedId === null) return

    setCartItems((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === normalizedId)

      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === normalizedId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }

      return [
        ...prev,
        {
          id: normalizedId,
          name: item.name ?? item.foodName ?? 'Unnamed item',
          price: Number(item.price ?? item.cost ?? 0),
          quantity: 1,
        },
      ]
    })
  }

  if (!restaurantId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">No restaurant selected.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Food Menu</h2>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Back to Restaurants
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading food items...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {foodItems.map((item) => {
            const itemId = getId(item)
            return (
              <div key={itemId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src={item.imagePath}
                  alt={item.name ?? item.foodName ?? 'Food item'}
                  className="h-36 w-full rounded-lg object-cover"
                />
                <h3 className="mt-3 text-base font-bold text-slate-900">{item.name ?? item.foodName}</h3>
                <p className="mt-1 text-sm text-slate-600">${Number(item.price ?? item.cost ?? 0).toFixed(2)}</p>
                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  className="mt-3 w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Add to Cart
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Cart cartItems={cartItems} onClearCart={() => setCartItems([])} />
    </div>
  )
}

export default FoodMenu
