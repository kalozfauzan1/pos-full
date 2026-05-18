import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const DB_PATH = join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// ---- File-based DB ----
function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) } catch { return mkDb() }
}
function save(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)) }
function mkDb() {
  const db = { categories: [], items: [], tables: [], orders: [], orderItems: [] }
  db.categories = [
    { id: 'cat-1', name: 'Appetizers', color: '#f97316' },
    { id: 'cat-2', name: 'Main Courses', color: '#6366f1' },
    { id: 'cat-3', name: 'Desserts', color: '#ec4899' },
    { id: 'cat-4', name: 'Beverages', color: '#10b981' },
  ]
  db.items = [
    { id: 'item-1', name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 6.99, category_id: 'cat-1' },
    { id: 'item-2', name: 'Caesar Salad', description: 'Romaine, croutons, parmesan, caesar dressing', price: 9.99, category_id: 'cat-1' },
    { id: 'item-3', name: 'Soup of the Day', description: "Ask your server for today's selection", price: 7.99, category_id: 'cat-1' },
    { id: 'item-4', name: 'Grilled Salmon', description: 'Fresh Atlantic salmon with lemon herb sauce', price: 24.99, category_id: 'cat-2' },
    { id: 'item-5', name: 'Ribeye Steak', description: '12oz ribeye with mashed potatoes & seasonal veggies', price: 34.99, category_id: 'cat-2' },
    { id: 'item-6', name: 'Chicken Parmesan', description: 'Breaded chicken with marinara and mozzarella', price: 19.99, category_id: 'cat-2' },
    { id: 'item-7', name: 'Penne Ala Vodka', description: 'Penne pasta in creamy tomato vodka sauce', price: 17.99, category_id: 'cat-2' },
    { id: 'item-8', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 9.99, category_id: 'cat-3' },
    { id: 'item-9', name: 'Tiramisu', description: 'Classic Italian coffee-flavoured dessert', price: 8.99, category_id: 'cat-3' },
    { id: 'item-10', name: 'Cheesecake', description: 'New York style cheesecake with berry compote', price: 8.99, category_id: 'cat-3' },
    { id: 'item-11', name: 'Cola', description: 'Classic cola', price: 2.99, category_id: 'cat-4' },
    { id: 'item-12', name: 'Sparkling Water', description: 'Fresh sparkling water', price: 2.49, category_id: 'cat-4' },
    { id: 'item-13', name: 'Fresh Juice', description: 'Orange / Apple / Cranberry', price: 4.99, category_id: 'cat-4' },
    { id: 'item-14', name: 'Coffee', description: 'Freshly brewed coffee', price: 3.49, category_id: 'cat-4' },
  ]
  for (let i = 1; i <= 10; i++) db.tables.push({ id: `tbl-${i}`, number: i, capacity: i % 2 === 0 ? 2 : 4, status: 'available' })
  save(db)
  return db
}

// ---- MENU ---- //

app.get('/api/menu', (_, res) => {
  const db = load()
  res.json({ items: db.items.filter(i => i.available !== false), categories: db.categories })
})

app.get('/api/menu/items', (req, res) => {
  const db = load()
  res.json(req.query.available ? db.items.filter(i => i.available !== false) : db.items)
})

app.get('/api/menu/categories', (_, res) => res.json(load().categories))

app.get('/api/menu/categories/:id', (req, res) => {
  const db = load(); const c = db.categories.find(c => c.id === req.params.id)
  c ? res.json(c) : res.status(404).json({ error: 'Not found' })
})

app.post('/api/menu/categories', (req, res) => {
  const db = load(); const { id, name, color } = req.body
  db.categories.push({ id: id || `cat-${Date.now()}`, name, color: color || '#6366f1' })
  save(db); res.json(db.categories.find(c => c.name === name))
})

app.put('/api/menu/categories/:id', (req, res) => {
  const db = load(); const cat = db.categories.find(c => c.id === req.params.id)
  if (cat) { Object.assign(cat, req.body); save(db) }
  res.json(db.categories.find(c => c.id === req.params.id))
})

app.delete('/api/menu/categories/:id', (req, res) => {
  const db = load(); db.categories = db.categories.filter(c => c.id !== req.params.id); save(db)
  res.json({ success: true })
})

app.get('/api/menu/items/:id', (req, res) => {
  const db = load(); const item = db.items.find(i => i.id === req.params.id)
  item ? res.json(item) : res.status(404).json({ error: 'Not found' })
})

app.post('/api/menu/items', (req, res) => {
  const db = load(); const { id, name, description, price, category_id } = req.body
  db.items.push({ id: id || `item-${Date.now()}`, name, description: description || '', price, category_id: category_id || null, available: true })
  save(db); res.json(db.items.find(i => i.id === id || i.name === name))
})

app.put('/api/menu/items/:id', (req, res) => {
  const db = load(); const item = db.items.find(i => i.id === req.params.id)
  if (item) { Object.assign(item, req.body); save(db) }
  res.json(db.items.find(i => i.id === req.params.id))
})

app.delete('/api/menu/items/:id', (req, res) => {
  const db = load(); const item = db.items.find(i => i.id === req.params.id)
  if (item) { item.available = false; save(db) }
  res.json({ success: true })
})

// ---- TABLES ----
app.get('/api/tables', (_, res) => {
  const db = load()
  res.json(db.tables.map(t => {
    const order = db.orders.find(o => o.table_id === t.id && !['paid', 'cancelled'].includes(o.status))
    return { ...t, active_order: order ? { id: order.id, status: order.status, total: order.total } : null }
  }))
})

app.get('/api/tables/:id', (req, res) => {
  const db = load(); const t = db.tables.find(t => t.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  const order = db.orders.find(o => o.table_id === t.id && !['paid', 'cancelled'].includes(o.status))
  res.json({ ...t, active_order: order ? { id: order.id, status: order.status, total: order.total } : null })
})

app.post('/api/tables', (req, res) => {
  const db = load(); const { id, number, capacity } = req.body
  db.tables.push({ id: id || `tbl-${Date.now()}`, number, capacity: capacity || 4, status: 'available' })
  save(db); res.json(db.tables.find(t => t.id === id || t.number === number))
})

app.put('/api/tables/:id', (req, res) => {
  const db = load(); const t = db.tables.find(t => t.id === req.params.id)
  if (t) { Object.assign(t, req.body); save(db) }
  res.json(db.tables.find(t => t.id === req.params.id))
})

// ---- ORDERS ----
app.get('/api/orders', (req, res) => {
  const db = load(); let list = db.orders
  if (req.query.status) list = list.filter(o => o.status === req.query.status)
  if (req.query.table_id) list = list.filter(o => o.table_id === req.query.table_id)
  res.json(list.sort((a, b) => b.created_at.localeCompare(a.created_at)))
})

app.get('/api/orders/:id', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.id)
  if (!o) return res.status(404).json({ error: 'Not found' })
  o.items = db.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
    const mi = db.items.find(m => m.id === oi.menu_item_id)
    return { ...oi, name: mi?.name, description: mi?.description }
  })
  res.json(o)
})

app.get('/api/orders/:id/receipt', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.id)
  if (!o) return res.status(404).json({ error: 'Not found' })
  const items = db.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
    const mi = db.items.find(m => m.id === oi.menu_item_id)
    return { ...oi, name: mi?.name }
  })
  const table = o.table_id ? db.tables.find(t => t.id === o.table_id) : null
  res.json({ order: o, items, table })
})

app.post('/api/orders', (req, res) => {
  const db = load(); const { table_id, order_type, items, notes } = req.body
  const id = `ord-${Date.now()}`
  let subtotal = 0
  for (const it of items || []) {
    const item = db.items.find(m => m.id === it.menu_item_id)
    if (!item) continue
    subtotal += item.price * (it.quantity || 1)
    db.orderItems.push({ id: `oi-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, order_id: id, menu_item_id: it.menu_item_id, quantity: it.quantity || 1, price: item.price, notes: it.notes || '', sent_to_kitchen: false })
  }
  const tax = subtotal * 0.10, total = subtotal + tax
  db.orders.push({ id, table_id: table_id || null, order_type: order_type || 'dine_in', subtotal, tax, total, payment_method: null, amount_paid: 0, change: 0, notes: notes || '', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  save(db)
  const o = db.orders.find(o => o.id === id)
  o.items = db.orderItems.filter(oi => oi.order_id === id).map(oi => {
    const mi = db.items.find(m => m.id === oi.menu_item_id)
    return { ...oi, name: mi?.name, description: mi?.description }
  })
  res.json(o)
})

app.put('/api/orders/:id', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.id)
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (req.body.status) o.status = req.body.status
  if (req.body.notes !== undefined) o.notes = req.body.notes
  if (req.body.payment_method) o.payment_method = req.body.payment_method
  if (req.body.amount_paid !== undefined) {
    const paid = parseFloat(req.body.amount_paid)
    o.amount_paid = paid; o.change = Math.max(0, paid - o.total)
  }
  o.updated_at = new Date().toISOString()
  save(db)
  o.items = db.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
    const mi = db.items.find(m => m.id === oi.menu_item_id)
    return { ...oi, name: mi?.name }
  })
  res.json(o)
})

app.delete('/api/orders/:id', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.id)
  if (o) { o.status = 'cancelled'; o.updated_at = new Date().toISOString(); save(db) }
  res.json({ success: true })
})

// ---- ORDER ITEMS ----
app.post('/api/orders/:orderId/items', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.orderId)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  const item = db.items.find(m => m.id === req.body.menu_item_id)
  if (!item) return res.status(404).json({ error: 'Menu item not found' })
  const oi = { id: `oi-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, order_id: req.params.orderId, menu_item_id: item.id, quantity: req.body.quantity || 1, price: item.price, notes: req.body.notes || '', sent_to_kitchen: false }
  db.orderItems.push(oi)
  // recalc order
  const items = db.orderItems.filter(x => x.order_id === req.params.orderId)
  o.subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  o.tax = o.subtotal * 0.10; o.total = o.subtotal + o.tax
  o.updated_at = new Date().toISOString()
  save(db)
  res.json({ ...oi, name: item.name })
})

app.put('/api/orders/:orderId/items/:itemId', (req, res) => {
  const db = load(); const oi = db.orderItems.find(i => i.id === req.params.itemId)
  if (!oi) return res.status(404).json({ error: 'Not found' })
  if (req.body.quantity !== undefined) oi.quantity = req.body.quantity
  if (req.body.notes !== undefined) oi.notes = req.body.notes
  const order = db.orders.find(o => o.id === req.params.orderId)
  const items = db.orderItems.filter(x => x.order_id === req.params.orderId)
  order.subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  order.tax = order.subtotal * 0.10; order.total = order.subtotal + order.tax
  order.updated_at = new Date().toISOString()
  save(db)
  res.json(oi)
})

app.delete('/api/orders/:orderId/items/:itemId', (req, res) => {
  const db = load()
  db.orderItems = db.orderItems.filter(i => i.id !== req.params.itemId)
  const order = db.orders.find(o => o.id === req.params.orderId)
  const items = db.orderItems.filter(x => x.order_id === req.params.orderId)
  order.subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  order.tax = order.subtotal * 0.10; order.total = order.subtotal + order.tax
  save(db)
  res.json({ success: true })
})

// ---- KITCHEN ----
app.put('/api/orders/:orderId/send-to-kitchen', (req, res) => {
  const db = load(); const { items } = req.body
  for (const iid of items || []) {
    const oi = db.orderItems.find(i => i.id === iid)
    if (oi) oi.sent_to_kitchen = true
  }
  const o = db.orders.find(o => o.id === req.params.orderId)
  if (o) { o.status = 'preparing'; o.updated_at = new Date().toISOString() }
  save(db); res.json({ success: true })
})

app.put('/api/orders/:orderId/complete-kitchen', (req, res) => {
  const db = load(); const o = db.orders.find(o => o.id === req.params.orderId)
  if (o) { o.status = 'ready'; o.updated_at = new Date().toISOString() }
  save(db); res.json({ success: true })
})

app.get('/api/kitchen/orders', (_, res) => {
  const db = load()
  res.json(db.orders.filter(o => ['pending', 'preparing'].includes(o.status)).map(o => ({
    ...o, items: db.orderItems.filter(oi => oi.order_id === o.id).map(oi => {
      const mi = db.items.find(m => m.id === oi.menu_item_id)
      return { ...oi, name: mi?.name, description: mi?.description, category_id: mi?.category_id }
    })
  })).sort((a, b) => a.created_at.localeCompare(b.created_at)))
})

// ---- REPORTS ----
app.get('/api/reports/sales', (req, res) => {
  const db = load(); const { start, end } = req.query
  let orders = db.orders.filter(o => o.status === 'paid')
  if (start) orders = orders.filter(o => o.created_at.split('T')[0] >= start)
  if (end) orders = orders.filter(o => o.created_at.split('T')[0] <= end)
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalOrders = orders.length
  const avgTicket = totalOrders ? totalRevenue / totalOrders : 0
  const itemMap = new Map()
  for (const o of orders) {
    for (const oi of db.orderItems.filter(x => x.order_id === o.id)) {
      const mi = db.items.find(m => m.id === oi.menu_item_id)
      if (!mi) continue
      if (!itemMap.has(oi.menu_item_id)) itemMap.set(oi.menu_item_id, { name: mi.name, total_qty: 0, revenue: 0 })
      const it = itemMap.get(oi.menu_item_id)
      it.total_qty += oi.quantity; it.revenue += oi.price * oi.quantity
    }
  }
  res.json({
    orders, totalRevenue, totalOrders, avgTicket,
    topItems: [...itemMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  })
})

// ---- Shutdown ----
process.on('SIGINT', () => { save(load()); process.exit(0) })

app.listen(PORT, () => console.log(`POS Server at http://localhost:${PORT}`))
