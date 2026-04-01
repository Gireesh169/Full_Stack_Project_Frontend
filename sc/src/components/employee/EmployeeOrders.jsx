import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { getAllEmployees } from '../../api/employeeApi'
import MapComponent from '../MapComponent'

const EmployeeOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem('employeeId'))
  const [selectedMapOrder, setSelectedMapOrder] = useState(null)

  useEffect(() => {
    const resolveEmployeeId = async () => {
      const storedId = localStorage.getItem('employeeId')
      if (storedId) {
        console.log('Employee ID:', storedId)
        setEmployeeId(storedId)
        return
      }

      try {
        const rawUser = localStorage.getItem('smartcity_user') || localStorage.getItem('user')
        const loggedUser = rawUser ? JSON.parse(rawUser) : null
        const userEmail = loggedUser?.email?.toLowerCase()

        if (!userEmail) {
          console.log('Employee ID: null')
          setEmployeeId(null)
          return
        }

        const { data } = await getAllEmployees()
        const matched = Array.isArray(data)
          ? data.find((emp) => emp.email?.toLowerCase() === userEmail)
          : null

        if (matched?.id) {
          const resolvedId = String(matched.id)
          localStorage.setItem('employeeId', resolvedId)
          console.log('Employee ID:', resolvedId)
          setEmployeeId(resolvedId)
          return
        }

        console.log('Employee ID: null')
        setEmployeeId(null)
      } catch (error) {
        console.error('Failed to resolve employeeId:', error)
        setEmployeeId(null)
      }
    }

    resolveEmployeeId()
  }, [])

  // Fetch employee orders
  const fetchEmployeeOrders = useCallback(async () => {
    if (!employeeId) {
      console.warn('EmployeeOrders - No employeeId available, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(`http://localhost:8086/orders/employee/${employeeId}`)
      setOrders(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      // Bonus fallback: if dedicated endpoint fails, use all orders and filter by deliveryEmployee.id
      try {
        const allResponse = await axios.get('http://localhost:8086/orders')
        const allOrders = Array.isArray(allResponse.data) ? allResponse.data : []
        const filtered = allOrders.filter(
          (order) =>
            String(order?.deliveryEmployee?.id) === String(employeeId) ||
            String(order?.delivery_employee_id) === String(employeeId),
        )
        setOrders(filtered)
      } catch (fallbackError) {
        console.error('EmployeeOrders - Failed to load orders:', fallbackError)
        const backendMessage =
          fallbackError?.response?.data?.message ||
          (typeof fallbackError?.response?.data === 'string' ? fallbackError.response.data : null) ||
          'Failed to load orders'
        if (fallbackError?.response?.status !== 404) {
          toast.error(backendMessage)
        }
        setOrders([])
      }
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    fetchEmployeeOrders()

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchEmployeeOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchEmployeeOrders])

  const updateStatus = async (orderId, newStatus) => {
    console.log('EmployeeOrders - Updating order:', { orderId, newStatus })
    setUpdatingOrderId(orderId)
    try {
      const url = `http://localhost:8086/orders/status/${orderId}`
      console.log('EmployeeOrders - Status update URL:', url)

      await axios.put(url, null, {
        params: { status: newStatus },
      })

      console.log('EmployeeOrders - Status updated successfully')
      toast.success(`Order status updated to ${newStatus}`)

      await fetchEmployeeOrders()
    } catch (error) {
      console.error('EmployeeOrders - Failed to update order status:', error)
      const backendMessage =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'Failed to update status'
      toast.error(backendMessage)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getOrderStatus = (order) => {
    return order.status ?? order.orderStatus ?? 'PENDING'
  }

  const getRestaurantName = (order) => {
    return order.restaurant?.name ?? order.restaurantName ?? `Restaurant #${order.restaurantId}`
  }

  const getFoodName = (order) => {
    return order.food?.name ?? order.foodName ?? order.itemName ?? (order.foodId ? `Food #${order.foodId}` : 'Food item')
  }

  const getDeliveryAddress = (order) => {
    return order.deliveryAddress ?? order.address ?? 'Address unavailable'
  }

  const getCoordinates = (order) => {
    const lat = Number(order.latitude)
    const lng = Number(order.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null
    }
    return { lat, lng }
  }

  const canStartDelivery = (status) => {
    const s = String(status).toUpperCase()
    return s === 'PENDING' || s === 'ASSIGNED'
  }

  const canMarkDelivered = (status) => {
    const s = String(status).toUpperCase()
    return s === 'OUT_FOR_DELIVERY' || s === 'OUT FOR DELIVERY'
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">My Orders For Delivery</h2>

      {!employeeId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Unable to load orders</p>
          <p className="mt-1 text-xs text-amber-700">Employee ID not found. Please log in again.</p>
        </div>
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-semibold text-slate-600">No orders assigned</p>
          <p className="mt-1 text-xs text-slate-500">Orders will appear here once admin assigns them to you.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const status = getOrderStatus(order).toUpperCase()
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Order #{order.id}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{getRestaurantName(order)}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {status}
                  </span>
                </div>

                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Food:</span>
                    <span className="text-sm font-bold text-slate-900">{getFoodName(order)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Amount:</span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{Number(order.totalAmount ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm">
                      <span className="font-semibold text-slate-600">Address:</span>
                      <p className="text-xs text-slate-600">{getDeliveryAddress(order)}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {getCoordinates(order) && (
                    <button
                      type="button"
                      onClick={() => setSelectedMapOrder(order)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      View Location
                    </button>
                  )}

                  {canStartDelivery(status) && (
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')}
                      disabled={updatingOrderId === order.id}
                      className="flex-1 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {updatingOrderId === order.id ? 'Updating...' : 'Start Delivery'}
                    </button>
                  )}

                  {canMarkDelivered(status) && (
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, 'DELIVERED')}
                      disabled={updatingOrderId === order.id}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {updatingOrderId === order.id ? 'Updating...' : 'Mark Delivered'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedMapOrder && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4"
          role="presentation"
          onClick={() => setSelectedMapOrder(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Order #{selectedMapOrder.id}</p>
                <p className="text-base font-bold text-slate-900">Delivery Location</p>
                <p className="text-xs text-slate-600">{getDeliveryAddress(selectedMapOrder)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMapOrder(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <MapComponent
              destination={getCoordinates(selectedMapOrder)}
              readOnly
              mapHeight={360}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeOrders
