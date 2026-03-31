import axios from 'axios'

const Cart = ({ cartItems, onClearCart }) => {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty')
      return
    }

    try {
      await axios.post('http://localhost:8086/orders/create', {
        order: {
          userId: 1,
          totalAmount,
          address: 'User address',
        },
        items: cartItems,
      })

      alert('Order placed successfully')
      if (onClearCart) onClearCart()
    } catch (error) {
      console.error('Failed to place order:', error)
      alert('Failed to place order')
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Cart</h3>

      {cartItems.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No items in cart.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div>
                <p className="font-semibold text-slate-800">{item.name}</p>
                <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <p className="text-base font-bold text-slate-900">Total</p>
            <p className="text-base font-bold text-slate-900">${totalAmount.toFixed(2)}</p>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
          >
            Place Order
          </button>
        </div>
      )}
    </div>
  )
}

export default Cart
