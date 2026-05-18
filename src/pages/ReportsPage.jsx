import React, { useState, useEffect } from 'react'
import { formatCurrency } from '../lib/utils'

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const today = new Date().toISOString().split('T')[0]
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)

  const load = async () => {
    const r = await fetch(`/api/reports/sales?start=${start}&end=${end}`)
    setData(await r.json())
  }

  useEffect(() => { load() }, [start, end])

  if (!data) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <div className="flex gap-2 items-center">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
          <span className="text-gray-500">to</span>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
          <button onClick={load} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">{data.totalOrders}</p>
        </div>
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Avg Ticket</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{formatCurrency(data.avgTicket)}</p>
        </div>
      </div>

      <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-5 mb-8">
        <h2 className="text-lg font-bold mb-4">Top Selling Items</h2>
        {data.topItems.length === 0 ? <p className="text-sm text-gray-500">No sales in range</p> : (
          <div className="space-y-3">
            {data.topItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700 text-gray-400'}`}>{i + 1}</span>
                  <span className="text-sm font-medium">{it.name}</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-500">{it.total_qty} sold</span>
                  <span className="text-green-400 font-bold">{formatCurrency(it.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-4">Recent Sales</h2>
        {data.orders.length === 0 ? <p className="text-sm text-gray-500">No sales in range</p> : (
          <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
            {data.orders.map(o => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-mono">{o.id.split('-')[1]}</span>
                  <span className="text-gray-400">Table {o.table_id ? o.table_id.replace('tbl-', '') : '─'}</span>
                  <span className="text-xs text-gray-600">{new Date(o.created_at + 'Z').toLocaleDateString()}</span>
                </div>
                <span className="font-bold text-green-400">{formatCurrency(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
