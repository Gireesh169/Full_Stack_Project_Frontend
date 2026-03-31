import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const AdminOrders = () => {
  const [orders, setOrders] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningOrderId, setAssigningOrderId] = useState(null)
  const [assignmentSelection, setAssignmentSelection] = useState({})

  const fetchOrdersAndEmployees = async () => {
    setLoading(true)
    try {
      const [ordersRes, employeesRes] = await Promise.all([
        axios.get('http://localhost:8086/orders'),
        axios.get('http://localhost:8086/Employee/getAllEmployees'),
      ])

      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : [])
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : [])
    } catch (error) {
      console.error('Failed to fetch orders and employees:', error)
      toast.error('Failed to load orders')
      setOrders([])
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrdersAndEmployees()
  }, [])

  const handleAssignEmployee = async (orderId) => {
    const employeeId = assignmentSelection[orderId]
    if (!employeeId) {
      toast.error('Select an employee to assign')
      return
    }

    setAssigningOrderId(orderId)
    try {
      await axios.put(`http://localhost:8086/orders/assign/${orderId}`, null, {
        params: { employeeId },
      })

      toast.success('Employee assigned successfully')
      await fetchOrdersAndEmployees()
      setAssignmentSelection((prev) => ({ ...prev, [orderId]: '' }))
    } catch (error) {
      console.error('Failed to assign employee:', error)
      const backendMessage =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'Failed to assign employee'
      toast.error(backendMessage)
    } finally {
      setAssigningOrderId(null)
    }
  }

  const getOrderStatus = (order) => {
    return order.status ?? order.orderStatus ?? 'PENDING'
  }

  const getRestaurantName = (order) => {
    return order.restaurant?.name ?? order.restaurantName ?? `Restaurant #${order.restaurantId}`
  }

  const getAssignedEmployeeName = (order) => {
    if (order.deliveryEmployee?.name) {
      return order.deliveryEmployee.name
    }
    if (order.assignedEmployee?.name) {
      return order.assignedEmployee.name
    }
    const matched = employees.find(
      (emp) =>
        String(emp.id) === String(order.assignedEmployeeId) ||
        String(emp.id) === String(order.delivery_employee_id) ||
        String(emp.id) === String(order.deliveryEmployee?.id),
    )
    return matched?.name ?? 'Unassigned'
  }

  const isAlreadyAssigned = (order) => {
    return Boolean(order.deliveryEmployee?.id || order.assignedEmployeeId || order.delivery_employee_id)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">All Orders</h2>

      {loading ? (
        <p className="text-sm text-slate-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-slate-500">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Assign Employee</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-bold text-slate-900">{order.id}</td>
                  <td className="py-3 px-4 text-slate-700">{getRestaurantName(order)}</td>
                  <td className="py-3 px-4 text-slate-700">₹{Number(order.totalAmount ?? 0).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      {getOrderStatus(order)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{getAssignedEmployeeName(order)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={assignmentSelection[order.id] ?? ''}
                        onChange={(e) =>
                          setAssignmentSelection((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                        disabled={isAlreadyAssigned(order)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">Select employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignEmployee(order.id)}
                        disabled={assigningOrderId === order.id || isAlreadyAssigned(order)}
                        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {assigningOrderId === order.id ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminOrders
