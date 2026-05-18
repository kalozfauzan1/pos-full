import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import TablesPage from './pages/TablesPage'
import OrdersPage from './pages/OrdersPage'
import MenuPage from './pages/MenuPage'
import KitchenPage from './pages/KitchenPage'
import ReportsPage from './pages/ReportsPage'
import PaymentsPage from './pages/PaymentsPage'

const navItems = [
  { path: '/', label: 'Tables', icon: '🍽️' },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/menu', label: 'Menu', icon: '📜' },
  { path: '/kitchen', label: 'Kitchen', icon: '👨‍🍳' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/reports', label: 'Reports', icon: '📊' },
]

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(true)

  return (
    <div className="flex h-screen bg-[#0f1117] text-gray-200 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${drawerOpen ? 'w-56' : 'w-16'} bg-[#1a1a2e] border-r border-gray-800 flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-gray-800">
          <h1 className={`text-lg font-bold text-indigo-400 ${!drawerOpen && 'hidden'}`}>🍴 Gastown POS</h1>
          {!drawerOpen && <h1 className="text-lg">🍴</h1>}
        </div>
        <nav className="flex-1 py-3 space-y-1">
          {navItems.map(n => (
            <NavLink key={n.path} to={n.path} end={n.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <span className="text-lg">{n.icon}</span>
              <span className={`text-sm font-medium ${!drawerOpen && 'hidden'}`}>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-3 mx-2 mb-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          {drawerOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<TablesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  )
}
