import React, { useState, useEffect, useCallback } from 'react'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    const r = await fetch('/api/kitchen/orders')
    const d = await r.json()
    setOrders(d)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 3000); return () => clearInterval(t) }, [load])

  const sendToKitchen = async (orderId, itemIds) => {
    await fetch(`/api/orders/${orderId}/send-to-kitchen`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: itemIds }) })
    load()
  }

  const complete = async (orderId) => {
    await fetch(`/api/orders/${orderId}/complete-kitchen`, { method: 'PUT' })
    load()
  }

  if (orders.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-gray-400 text-lg">All caught up!</p>
        <p className="text-gray-600 text-sm mt-1">No orders in the kitchen queue</p>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <p className="text-gray-500 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} in queue</p>
      </div>
      <div className="space-y-4">
        {orders.map((order, idx) => (
          <div key={order.id} className="bg-[#1a1a2e] border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#22223a]">
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold font-mono text-indigo-400">#{order.id.split('-')[1]}</span>
                <span className="text-sm text-gray-400">Table {order.table_id ? order.table_id.replace('tbl-', '') : 'Takeaway'}</span>
                <span className="text-xs text-gray-500">{new Date(order.created_at + 'Z').toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}</span>
                {order.notes && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">📝 {order.notes}</span>}
              </div>
              <div className="text-xs font-bold tracking-wider text-gray-400 rounded-full bg-gray-700/50 px-3 py-1">#{idx + 1}</div>
            </div>
            <div className="p-4 space-y-1">
              {order.items?.map((it, i) => {
                const categoryColors = { 'cat-1': 'bg-orange-500/20 border-orange-500', 'cat-2': 'bg-indigo-500/20 border-indigo-400', 'cat-3': 'bg-pink-500/20 border-pink-400', 'cat-4': 'bg-emerald-500/20 border-emerald-400' }
                const cc = categoryColors[it.category_id] || 'bg-gray-500/20 border-gray-500'
                const unsent = order.status === 'pending' && !it.sent_to_kitchen
                return (
                  <div key={it.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${unsent ? 'bg-[#0f1117] border-gray-700' : cc + ' border-opacity-30'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${unsent ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                        {it.quantity}
                      </span>
                      <span className={`font-medium ${unsent ? 'text-gray-200' : 'text-gray-300'}`}>{it.name || 'Item'}</span>
                      {it.notes && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">{it.notes}</span>}
                      {!unsent && <span className="text-green-400">✔</span>}
                    </div>
                    {unsent && order.status === 'pending' && (
                      <button onClick={() => sendToKitchen(order.id, [it.id])} className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                        Send
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {order.status === 'preparing' && (
              <div className="px-4 pb-4">
                <button onClick={() => complete(order.id)} className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-white transition-colors">
                  ✅ Mark as Ready
                </button>
              </div>
            )}
            {order.status === 'pending' && (
              <div className="px-4 pb-4">
                <button onClick={() => sendToKitchen(order.id, order.items?.map(i => i.id) || [])} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white transition-colors">
                  📤 Send All to Kitchen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
