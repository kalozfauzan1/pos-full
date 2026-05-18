import React, { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../lib/utils'

export default function PaymentsPage() {
  const [tables, setTables] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([]) // orders selected for checkout
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [recentDone, setRecentDone] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [modalReceipt, setModalReceipt] = useState(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/tables')
    const d = await r.json()
    setTables(d)
  }, [])

  useEffect(() => { load() }, [load])

  const activeTables = tables.filter(t => t.active_order)
  const unselectAll = () => setSelectedOrders([])

  const toggleOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const handlePay = async () => {
    if (!selectedOrders.length) return
    setProcessing(true)
    try {
      const subtotal = selectedOrders.reduce((s, oid) => s + (tables.find(t => t.active_order?.id === oid)?.active_order?.total || 0), 0)
      const total = subtotal // already includes tax
      for (const oid of selectedOrders) {
        const amountPaid = total / selectedOrders.length
        await fetch(`/api/orders/${oid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid', payment_method: paymentMethod, amount_paid: Math.round(amountPaid * 100) / 100 }),
        })
      }
      setRecentDone({ orders: selectedOrders.length, total, method: paymentMethod })
      setTimeout(() => { setRecentDone(null); load() }, 3000)
      setSelectedOrders([])
    } finally {
      setProcessing(false)
    }
  }

  const totalAmount = selectedOrders.reduce((s, oid) => {
    const t = tables.find(t => t.active_order?.id === oid)?.active_order
    return s + (t?.total || 0)
  }, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        {selectedOrders.length > 0 && (
          <button onClick={unselectAll} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Clear ({selectedOrders.length})</button>
        )}
      </div>

      {recentDone && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-pulse font-bold">
          ✅ {recentDone.orders} order{recentDone.orders > 1 ? 's' : ''} paid — {formatCurrency(recentDone.total)}
        </div>
      )}

      {selectedOrders.length > 0 && (
        <div className="fixed bottom-0 left-56 right-0 bg-[#1a1a2e] border-t border-indigo-500 p-6 shadow-2xl z-40">
          <div className="flex items-end gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">{selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} to checkout</p>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="flex gap-1 mb-1">
              {['card', 'cash', 'mobile'].map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${paymentMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
                  {m === 'card' ? '💳 Card' : m === 'cash' ? '💵 Cash' : '📱 Mobile'}
                </button>
              ))}
            </div>
            <button onClick={handlePay} disabled={processing} className="ml-auto px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-xl font-bold text-white transition-colors text-lg">
              {processing ? 'Processing...' : `Recieve ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeTables.length === 0 && !selectedOrders.length && <div className="text-center text-gray-500 py-20">No active orders to pay</div>}
        {activeTables.map(t => {
          const order = t.active_order
          const checked = selectedOrders.includes(order.id)
          return (
            <div key={t.id} className={`bg-[#1a1a2e] border rounded-2xl overflow-hidden transition-all ${checked ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-800 hover:border-gray-700'}`}>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleOrder(order.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-gray-400'}`}>
                    {checked && <span className="text-black text-xs">✓</span>}
                  </button>
                  <div>
                    <span className="text-sm text-gray-500">Table {t.number}</span>
                    <span className={`ml-3 text-xs px-2 py-0.5 rounded-full capitalize`} style={{
                      background: order.status === 'pending' ? '#f59e0b33' : order.status === 'preparing' ? '#3b82f633' : order.status === 'ready' ? '#22c55e33' : '#6b728033',
                      color: order.status === 'pending' ? '#fbbf24' : order.status === 'preparing' ? '#60a5fa' : order.status === 'ready' ? '#4ade80' : '#9ca3af',
                    }}>{order.status}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-green-400">{formatCurrency(order.total)}</div>
              </div>
              <div className="p-4">
                <div className="space-y-1 text-sm mb-3">
                  {order.items?.map(it => (
                    <div key={it.id} className="flex justify-between text-gray-300">
                      <span>{it.name || 'Item'} × {it.quantity}</span>
                      <span className="text-gray-500">{formatCurrency(it.price * it.quantity)}</span>
                    </div>
                  ))}
                  {order.items?.length === 0 && <span className="text-gray-500">No items</span>}
                </div>
                <div className="text-xs text-gray-500 flex justify-between border-t border-gray-800 pt-2">
                  <span>Subtotal: {formatCurrency(order.subtotal)}</span>
                  <span>Tax: {formatCurrency(order.tax)}</span>
                </div>
                <button onClick={async () => {
                  const r = await fetch(`/api/orders/${order.id}/receipt`)
                  const d = await r.json()
                  setModalReceipt(d)
                }} className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-xl transition-colors">
                  🧾 View Receipt
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modalReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModalReceipt(null)}>
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🧾</div>
              <h3 className="font-bold">Receipt</h3>
              <p className="text-xs text-gray-500">Gastown Restaurant</p>
            </div>
            <div className="space-y-1 text-sm border-y border-gray-800 py-4 my-4">
              {modalReceipt.items?.map(it => (
                <div key={it.id} className="flex justify-between text-gray-300">
                  <span>{it.name} × {it.quantity}</span>
                  <span>{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(modalReceipt.order.subtotal)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Tax (10%)</span><span>{formatCurrency(modalReceipt.order.tax)}</span></div>
              <div className="flex justify-between font-bold text-green-400 pt-2 border-t border-gray-800"><span>Total</span><span>{formatCurrency(modalReceipt.order.total)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Paid</span><span>{formatCurrency(modalReceipt.order.amount_paid)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Change</span><span>{formatCurrency(modalReceipt.order.change)}</span></div>
            </div>
            <button onClick={() => setModalReceipt(null)} className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
