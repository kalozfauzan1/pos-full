import React, { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../lib/utils'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/orders?status=${filter === 'all' ? '' : filter}`)
    const d = await r.json()
    setOrders(d)
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t) }, [load])

  const statusBadge = (s) => {
    const map = {
      pending: 'bg-amber-500/20 text-amber-300',
      preparing: 'bg-blue-500/20 text-blue-300',
      ready: 'bg-green-500/20 text-green-300',
      paid: 'bg-teal-500/20 text-teal-300',
      cancelled: 'bg-red-500/20 text-red-300',
    }
    return map[s] || 'bg-gray-500/20 text-gray-300'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-1 bg-[#1a1a2e] rounded-lg p-1">
          {['all', 'pending', 'preparing', 'ready', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-center text-gray-500 py-20">No orders yet</div>}
        {orders.map(o => (
          <div key={o.id} className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Order #</span>
                  <span className="text-sm font-mono font-bold text-indigo-400">{o.id.split('-')[1]}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Table</span>
                  <span className="text-sm font-bold">{o.table_id ? `#${o.table_id.replace('tbl-', '')}` : 'Takeaway'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Time</span>
                  <span className="text-sm">{new Date(o.created_at + 'Z').toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusBadge(o.status)}`}>{o.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-green-400">{formatCurrency(o.total)}</span>
                <span className={`text-gray-500 transition-transform ${expanded === o.id ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
            {expanded === o.id && (
              <div className="mt-3 pt-3 border-t border-gray-800 text-sm">
                <div className="text-gray-400 mb-2">Items:</div>
                <div className="space-y-1">
                  {o.items?.map(it => (
                    <div key={it.id} className="flex justify-between text-gray-300">
                      <span>{it.name || 'Item'} × {it.quantity}</span>
                      <span className="text-gray-500">{formatCurrency(it.price * it.quantity)}</span>
                    </div>
                  ))}
                  {o.items?.length === 0 && <div className="text-gray-500 italic">No items</div>}
                </div>
                {(o.notes || o.payment_method) && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-6 text-xs">
                    {o.notes && <span className="text-amber-400">📝 {o.notes}</span>}
                    {o.payment_method && <span className="text-teal-400">💳 {o.payment_method} · Paid {formatCurrency(o.amount_paid)}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
