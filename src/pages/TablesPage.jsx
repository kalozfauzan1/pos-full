import React, { useState, useEffect, useCallback } from 'react'
import OrderDrawer from '../components/common/OrderDrawer'

export default function TablesPage() {
  const [tables, setTables] = useState([])
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/tables')
    const d = await r.json()
    setTables(d)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t) }, [load])

  const statusColor = (t) => {
    if (t.active_order) return t.active_order.status === 'pending' ? 'bg-amber-500' : t.active_order.status === 'preparing' ? 'bg-blue-500' : t.active_order.status === 'ready' ? 'bg-green-500' : 'bg-gray-500'
    return 'bg-teal-500'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tables</h1>
          <p className="text-gray-500 text-sm mt-1">{tables.length} tables · Click a table to take an order</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className="relative bg-[#1a1a2e] border border-gray-700 rounded-xl p-5 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-900/20 transition-all text-left group">
            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${statusColor(t)}`} />
            <div className="text-3xl mb-2">🍽️</div>
            <div className="text-lg font-bold text-gray-100">Table {t.number}</div>
            <div className="text-sm text-gray-500">{t.capacity} seats</div>
            {t.active_order ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 capitalize">{t.active_order.status}</span>
                <span className="text-xs text-gray-400">{new Date(t.active_order.id.split('-')[1]).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            ) : (
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-600/30 text-teal-300">Available</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <OrderDrawer table={selected} onClose={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}
