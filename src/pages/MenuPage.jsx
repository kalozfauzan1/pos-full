import React, { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../lib/utils'

export default function MenuPage() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState('all')
  const [modal, setModal] = useState(null) // null | 'item' | 'cat'

  const load = useCallback(async () => {
    const ri = await fetch('/api/menu/items?available=0')
    const r = await fetch('/api/menu/categories')
    setItems(await ri.json())
    setCategories(await r.json())
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = activeCat === 'all' ? items : items.filter(i => i.category_id === activeCat)

  const handleSaveItem = async (data) => {
    const isNew = !data.id
    const url = isNew ? '/api/menu/items' : `/api/menu/items/${data.id}`
    const method = isNew ? 'POST' : 'PUT'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setModal(null)
    load()
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Remove this item?')) return
    await fetch(`/api/menu/items/${id}`, { method: 'DELETE' })
    load()
  }

  const handleSaveCat = async (data) => {
    const isNew = !data.id
    const url = isNew ? '/api/menu/categories' : `/api/menu/categories/${data.id}`
    const method = isNew ? 'POST' : 'PUT'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setModal(null)
    load()
  }

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return
    await fetch(`/api/menu/categories/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal('cat')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">+ Category</button>
          <button onClick={() => setModal('item')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">+ Item</button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        <button onClick={() => setActiveCat('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCat === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-gray-200'}`}>
          All Items ({items.length})
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCat === c.id ? 'text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-gray-200'}`}
            style={activeCat === c.id ? { backgroundColor: c.color } : {}}
            onDoubleClick={() => { setModal('cat'); setTimeout(() => {/* pre-fill */}, 0) }}>
            {c.name} ({items.filter(i => i.category_id === c.id).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(item => {
          const cat = categories.find(c => c.id === item.category_id)
          return (
            <div key={item.id} className="bg-[#1a1a2e] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-bold text-gray-100">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-green-400">{formatCurrency(item.price)}</span>
                    {cat && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cat.color + '33', color: cat.color }}>{cat.name}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.available ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'}`}>
                      {item.available ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal({ type: 'item', data: item })}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-md">Edit</button>
                  <button onClick={() => handleDeleteItem(item.id)}
                    className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 rounded-md">×</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(modal === 'item' || modal === 'cat') && (
        <Modal type={modal} onSave={modal === 'item' ? handleSaveItem : handleSaveCat}
          onClose={() => setModal(null)} categories={categories} data={modal === 'item' ? (modal?.data || {}) : {}} />
      )}
    </div>
  )
}

function Modal({ type, onSave, onClose, categories, data }) {
  const [form, setForm] = useState(type === 'item'
    ? { id: data.id || `item-${Date.now()}`, name: data.name || '', description: data.description || '', price: data.price || 0, category_id: data.category_id || (categories[0]?.id || ''), available: data.available ?? 1 }
    : { id: data.id || `cat-${Date.now()}`, name: data.name || '', color: data.color || '#6366f1' }
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{type === 'item' ? (data.id ? 'Edit Item' : 'New Item') : (data.id ? 'Edit Category' : 'New Category')}</h2>
        {type === 'item' ? (
          <div className="space-y-3">
            <input className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Item name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <textarea className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Description" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <input className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm" type="number" step="0.01" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} />
            <select className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={!!form.available} onChange={e => setForm({...form, available: e.target.checked ? 1 : 0})} />
              Active / Available
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="w-full bg-[#0f1117] border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Category name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <span>Color:</span>
              <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-10 h-8 rounded border-0 bg-transparent" />
              <code className="text-xs text-gray-500">{form.color}</code>
            </label>
          </div>
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}
