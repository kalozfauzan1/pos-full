import React, { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../../lib/utils'

export default function OrderDrawer({ table, onClose }) {
  const [items, setItems] = useState([])
  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [order, setOrder] = useState(null)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState(0) // 0: items grid, 1: review & confirm
  const [subtotal, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [total, setTotal] = useState(0)

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/menu')
    const d = await r.json()
    setMenu(d.items)
    setCategories(d.categories)
  }, [])

  const loadOrder = async () => {
    const t = await fetch(`/api/tables/${table.id}`)
    const td = await t.json()
    if (td.active_order) {
      const r = await fetch(`/api/orders/${td.active_order.id}`)
      const od = await r.json()
      setOrder(od)
      setNotes(od.notes || '')
      const st = od.items.reduce((s, i) => s + i.price * i.quantity, 0)
      setSubtotal(st); setTax(st * 0.10); setTotal(st * 1.10)
    }
  }

  useEffect(() => { loadMenu(); loadOrder() }, [])

  const addItem = async (menuItem) => {
    if (!order) {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table_id: table.id, items: [{ menu_item_id: menuItem.id, quantity: 1 }] }) })
      const od = await r.json()
      setOrder(od)
      const st = od.items.reduce((s, i) => s + i.price * i.quantity, 0)
      setSubtotal(st); setTax(st * 0.10); setTotal(st * 1.10)
    } else {
      const r = await fetch(`/api/orders/${order.id}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menu_item_id: menuItem.id, quantity: 1 }) })
      const newItem = await r.json()
      const allItems = [...order.items, { ...newItem, name: menuItem.name }]
      setOrder({ ...order, items: allItems })
      updateTotals(allItems)
    }
  }

  const updateQuantities = async (itemId, newQty) => {
    if (newQty < 1) {
      await fetch(`/api/orders/${order.id}/items/${itemId}`, { method: 'DELETE' })
      const remaining = order.items.filter(i => i.id !== itemId)
      setOrder({ ...order, items: remaining })
      updateTotals(remaining)
    } else {
      await fetch(`/api/orders/${order.id}/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: newQty }) })
      setOrder(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i) }))
      const updated = order.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
      updateTotals(updated)
    }
  }

  const updateTotals = (its) => {
    const st = its.reduce((s, i) => s + i.price * i.quantity, 0)
    setSubtotal(st); setTax(st * 0.10); setTotal(st * 1.10)
  }

  const confirmOrder = async () => {
    if (!order) await addItem(menu.find(m => (m.price || 0) === 0) || menu[0])
    await fetch(`/api/orders/${order.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
    setOrder({ ...order, notes })
    onClose()
  }

  const filtered = activeCat === 'all' ? menu : menu.filter(i => i.category_id === activeCat)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex" onClick={onClose}>
      <div className="ml-auto w-full max-w-4xl bg-[#0f1117] border-l border-gray-800 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a2e]">
          <div>
            <h2 className="text-xl font-bold">Table {table.number}</h2>
            <p className="text-sm text-gray-500">{table.capacity} seats · {order ? `Order #${order.id.split('-')[1]}` : 'New order'}</p>
          </div>
          <div className="flex items-center gap-3">
            {step === 1 && <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">← Add Items</button>}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-full">✕</button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-[#1a1a2e]/50 flex items-center gap-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= 0 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>1</div>
            <span className="text-sm font-medium">Select Items</span>
          </div>
          <div className="h-px flex-1 bg-gray-800" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>2</div>
            <span className="text-sm font-medium">Review & Confirm</span>
          </div>
        </div>

        {step === 0 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Cat buttons */}
            <div className="flex gap-1 px-6 py-3 overflow-x-auto border-b border-gray-800">
              <button onClick={() => setActiveCat('all')} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-colors ${activeCat === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-colors ${activeCat === c.id ? 'text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}
                  style={activeCat === c.id ? { background: c.color } : {}}>
                  {c.name}
                </button>
              ))}
            </div>
            {/* Items grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filtered.map(item => (
                  <button key={item.id} onClick={() => addItem(item)}
                    className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-3 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-900/20 transition-all text-left">
                    <div className="text-sm font-semibold text-gray-100 leading-tight">{item.name}</div>
                    <div className="text-xs text-green-400 font-bold mt-1">{formatCurrency(item.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Order Notes</label>
              <textarea className="w-full bg-[#1a1a2e] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" placeholder="Allergies, special requests..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-500 font-medium">Items</div>
              {order?.items?.length === 0 && <div className="text-gray-500 text-sm">No items yet</div>}
              {order?.items?.map(it => {
                const mi = menu.find(m => m.id === it.menu_item_id)
                return (
                  <div key={it.id} className="flex items-center gap-3 p-3 bg-[#1a1a2e] border border-gray-800 rounded-xl">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-200">{mi?.name || it.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(it.price)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantities(it.id, it.quantity - 1)} className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-md text-sm">−</button>
                      <span className="w-6 text-center text-sm font-bold">{it.quantity}</span>
                      <button onClick={() => updateQuantities(it.id, it.quantity + 1)} className="w-7 h-7 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-md text-sm">+</button>
                      <button onClick={async () => { await updateQuantities(it.id, 0) }} className="ml-2 w-7 h-7 flex items-center justify-center bg-red-900/50 hover:bg-red-800 text-red-300 rounded-md text-xs">×</button>
                    </div>
                    <span className="text-sm font-bold text-green-400 w-16 text-right">{formatCurrency(it.price * it.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1 p-4 bg-[#1a1a2e] rounded-xl border border-gray-800">
              <div className="flex justify-between text-sm text-gray-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-400"><span>Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-lg font-bold text-green-400 pt-2 border-t border-gray-800"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#1a1a2e]">
          {step === 0 && (
            order ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current Total</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(total)}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-400 py-2">{order.items?.length || 0} items</span>
                  <button onClick={() => setStep(1)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors">
                    Review Order →
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm">Tap items to add to the order</p>
            )
          )}
          {step === 1 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors">← Add More</button>
              <button onClick={confirmOrder} className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold text-white transition-colors text-lg">
                ✅ Confirm Order — {formatCurrency(total)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
