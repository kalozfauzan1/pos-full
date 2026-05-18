# Gastown POS — Restaurant Point of Sale

A full-featured restaurant POS system built with React + Vite (frontend) and Express (backend) with a JSON file database.

## Features

- **Tables** — Visual table management with real-time order status indicators. Click a table to open an order drawer.
- **Orders** — Filterable order list with expandable item details, status tracking, and notes.
- **Menu** — Full CRUD for menu items and categories with filter-by-category, add/edit/delete items.
- **Kitchen** — Kitchen Display System (KDS) with per-item send-to-kitchen, item-level status badges by category, and "mark as ready" completion.
- **Payments** — Multi-order checkout with card/cash/mobile payment methods, selectable tables, and printable receipt view.
- **Reports** — Sales reports with revenue, order count, average ticket, top-selling items, and recent transaction history.

## Quick Start

```bash
# Install dependencies
npm install

# Run backend server (port 3001)
npm run server

# Run frontend dev server (port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express API server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/menu` | GET | All available menu items + categories |
| `/api/menu/items` | GET/POST/PUT/DELETE | CRUD for menu items |
| `/api/menu/categories` | GET/POST/PUT/DELETE | CRUD for categories |
| `/api/tables` | GET/POST/PUT | Tables with active order status |
| `/api/orders` | GET/POST | List / create orders |
| `/api/orders/:id` | GET/PUT/DELETE | Order detail, update status, cancel |
| `/api/orders/:id/items` | POST/PUT/DELETE | Add / modify / remove order items |
| `/api/orders/:id/receipt` | GET | Receipt data |
| `/api/kitchen/orders` | GET | Pending/preparing orders for KDS |
| `/api/reports/sales` | GET | Sales report with date range filter |

## Tech Stack

- React 18 · React Router 6 · Vite 5
- Express 4 · Node.js ESM
- Tailwind CSS · JSON file database
