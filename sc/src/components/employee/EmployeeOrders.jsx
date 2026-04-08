import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { getAllEmployees, getEmployeeByUserId } from '../../api/employeeApi'
import { API_BASE_URL } from '../../api/axiosConfig'
import MapComponent from '../MapComponent'
import { useAuth } from '../../context/AuthContext'

const EmployeeOrders = () => {
  const { user: authUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem('employeeId'))
  const [selectedMapOrder, setSelectedMapOrder] = useState(null)
  const [startedDeliveryIds, setStartedDeliveryIds] = useState([])

  const isOrderAssignedToEmployee = useCallback(
    (order) => {
      const employeeIds = [
        order?.deliveryEmployee?.id,
        order?.assignedEmployee?.id,
        order?.delivery_employee_id,
        order?.deliveryEmployeeId,
        order?.assignedEmployeeId,
        order?.employeeId,
        order?.employee?.id,
      ]

      return employeeIds.some((value) => String(value ?? '') === String(employeeId ?? ''))
    },
    [employeeId],
  )

  const isAssignedOrder = (order) => {
    const status = String(order?.status ?? order?.orderStatus ?? '').toUpperCase()
    const assignedEmployeeIds = [
      order?.deliveryEmployee?.id,
      order?.assignedEmployee?.id,
      order?.delivery_employee_id,
      order?.deliveryEmployeeId,
      order?.assignedEmployeeId,
      order?.employeeId,
      order?.employee?.id,
    ]

    return (
      status === 'ASSIGNED' ||
      status === 'IN_PROGRESS' ||
      status === 'OUT_FOR_DELIVERY' ||
      assignedEmployeeIds.some((value) => value !== null && value !== undefined)
    )
  }

  useEffect(() => {
    const resolveEmployeeId = async () => {
      const storedId = localStorage.getItem('employeeId')
      if (storedId) {
        console.log('Employee ID:', storedId)
        setEmployeeId(storedId)
        return
      }

      try {
        if (authUser?.id) {
          try {
            const { data: employeeByUser } = await getEmployeeByUserId(authUser.id)
            if (employeeByUser?.id) {
              const resolvedId = String(employeeByUser.id)
              localStorage.setItem('employeeId', resolvedId)
              console.log('Employee ID:', resolvedId)
              setEmployeeId(resolvedId)
              return
            }
          } catch {
            // Fallback below.
          }
        }

        const rawUser = localStorage.getItem('smartcity_user') || localStorage.getItem('user')
        const loggedUser = rawUser ? JSON.parse(rawUser) : authUser ?? null
        const userEmail = loggedUser?.email?.toLowerCase()

        if (loggedUser?.id) {
          try {
            const { data: employeeByUser } = await getEmployeeByUserId(loggedUser.id)
            if (employeeByUser?.id) {
              const resolvedId = String(employeeByUser.id)
              localStorage.setItem('employeeId', resolvedId)
              console.log('Employee ID:', resolvedId)
              setEmployeeId(resolvedId)
              return
            }
          } catch {
            // Fallback below.
          }
        }

        if (!userEmail) {
          const fallbackId = String(authUser?.id ?? loggedUser?.id ?? '')
          if (fallbackId) {
            localStorage.setItem('employeeId', fallbackId)
            console.log('Employee ID (fallback):', fallbackId)
            setEmployeeId(fallbackId)
            return
          }

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

        const fallbackId = String(authUser?.id ?? loggedUser?.id ?? '')
        if (fallbackId) {
          localStorage.setItem('employeeId', fallbackId)
          console.log('Employee ID (fallback):', fallbackId)
          setEmployeeId(fallbackId)
          return
        }

        console.log('Employee ID: null')
        setEmployeeId(null)
      } catch (error) {
        console.error('Failed to resolve employeeId:', error)
        const fallbackId = String(authUser?.id ?? '')
        if (fallbackId) {
          localStorage.setItem('employeeId', fallbackId)
          setEmployeeId(fallbackId)
          return
        }

        setEmployeeId(null)
      }
    }

    resolveEmployeeId()
  }, [authUser?.id])

  // Fetch employee orders
  const fetchEmployeeOrders = useCallback(async () => {
    if (!employeeId) {
      console.warn('EmployeeOrders - No employeeId available, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/employee/${employeeId}`)
      const apiOrders = Array.isArray(response.data) ? response.data : []
      if (apiOrders.length > 0) {
        setOrders(apiOrders)
        return
      }

      throw new Error('Empty employee order response')
    } catch (error) {
      // Fallback: if dedicated endpoint fails or returns empty, show all assigned delivery orders.
      try {
        const allResponse = await axios.get(`${API_BASE_URL}/orders`)
        const allOrders = Array.isArray(allResponse.data) ? allResponse.data : []
        const filtered = allOrders.filter(isOrderAssignedToEmployee)
        setOrders(filtered.length > 0 ? filtered : allOrders.filter(isAssignedOrder))
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
      const url = `${API_BASE_URL}/orders/status/${orderId}`
      await axios.put(url, null, {
        params: { status: String(newStatus).toUpperCase() },
      })

      console.log('EmployeeOrders - Status updated successfully')
      toast.success(`Order status updated to ${newStatus}`)

      await fetchEmployeeOrders()
    } catch (error) {
      console.error('EmployeeOrders - Failed to update order status:', error)
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
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
            const hasStartedDelivery = startedDeliveryIds.includes(order.id)
            const showStartDelivery = status === 'ASSIGNED' && !hasStartedDelivery
            const showMarkDelivered = status === 'DELIVERED' || hasStartedDelivery
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

                  {showStartDelivery && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartedDeliveryIds((prev) =>
                          prev.includes(order.id) ? prev : [...prev, order.id],
                        )
                        toast.success('Delivery started')
                      }}
                      className="flex-1 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Start Delivery
                    </button>
                  )}

                  {showMarkDelivered && (
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
