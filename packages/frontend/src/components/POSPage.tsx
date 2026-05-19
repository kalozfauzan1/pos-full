import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePOSStore } from '../store/orderStore';
import type { OrderStatus } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cooking: 'Cooking',
  ready: 'Ready',
  serve: 'Ready',
  served: 'Served',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#eab308',
  confirmed: '#3b82f6',
  cooking: '#f97316',
  ready: '#22c55e',
  served: '#14b8a6',
  completed: '#64748b',
  cancelled: '#ef4444',
};

const STATUS_SORT: Record<string, number> = {
  pending: 0, confirmed: 1, cooking: 2, ready: 3, served: 4, completed: 5, cancelled: 99,
};

function activeOrdersFromTables(tables: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const t of tables) {
    if (t.orders?.length)
      map[t.id] = t.orders[0];
  }
  return map;
}

// ─── icons ───────────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
);

const MinusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
);

// ─── TableGrid ────────────────────────────────────────────────────────────────

const TABLE_FILTERS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Taken', value: 'occupied' },
  { label: 'Free', value: 'available' },
];

function TableGrid({ tables, activeOrder, activeTableId, onSelectTable, onCreateOrder }: {
  tables: any[];
  activeOrder: any;
  activeTableId: string | null;
  onSelectTable: (id: string) => void;
  onCreateOrder: () => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);

  const filteredTables = useMemo(() => {
    if (!filter) return tables;
    if (filter === 'occupied') return tables.filter((t) => !!activeOrderForTable(t, tables));
    return tables.filter((t) => !activeOrderForTable(t, tables));
  }, [tables, filter]);

  const counts = useMemo(() => {
    const occupied = tables.filter((t) => !!activeOrderForTable(t, tables)).length;
    return { total: tables.length, occupied, available: tables.length - occupied };
  }, [tables]);

  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <span style={styles.sidebarTitle}>Tables</span>
        <span style={styles.sidebarSubtitle}>
          {counts.occupied} occupied / {counts.available} free
        </span>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterRow}>
        {TABLE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            style={{
              ...styles.filterBtn,
              ...(filter === f.value ? styles.filterBtnActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div style={styles.tableGridScroll}>
        <div style={styles.tableGrid}>
          {filteredTables.length === 0 && (
            <div style={styles.emptyState}>No tables match filter</div>
          )}
          {filteredTables.map((table) => {
            const order = activeOrderForTable(table, tables);
            const isActive = table.id === activeTableId;
            const dotColor = order
              ? STATUS_COLOR[order.status] || STATUS_COLOR.pending
              : '#4ade80';
            return (
              <button
                key={table.id}
                onClick={() => onSelectTable(table.id)}
                title={`Table ${table.number}${order ? ` — ${STATUS_LABEL[order.status]}` : ''}`}
                style={{
                  ...styles.tableCell,
                  ...(isActive ? styles.tableCellActive : {}),
                }}
              >
                <span
                  style={{
                    ...styles.tableDot,
                    background: dotColor,
                  }}
                />
                <span style={styles.tableNumber}>{table.number}</span>
                {order?.customerName && (
                  <span style={styles.tableLabel} title={order.customerName}>
                    {order.customerName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={onCreateOrder} style={styles.newOrderBtn}>
        + New Order
      </button>
    </div>
  );
}

function activeOrderForTable(table: any, tables: any[]): any {
  return table.orders?.length ? table.orders[0] : null;
}

// ─── OrderPanel ──────────────────────────────────────────────────────────────

function OrderPanel({ children }: { children: React.ReactNode }) {
  return <div style={styles.orderPanel}>{children}</div>;
}

// ─── MenuCategories ──────────────────────────────────────────────────────────

function MenuCategories({ categories, activeId, onSelect }: {
  categories: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={styles.catTabs}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          style={{
            ...styles.catTab,
            ...(cat.id === activeId ? styles.catTabActive : {}),
          }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

// ─── MenuGrid ────────────────────────────────────────────────────────────────

function MenuGrid({ items, onAddItem }: {
  items: any[];
  onAddItem: (id: string) => void;
}) {
  return (
    <div style={styles.menuScroll}>
      <div style={styles.menuGrid}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onAddItem(item.id)}
            style={styles.menuCard}
          >
            <span style={styles.menuCardName}>{item.name}</span>
            {item.description && (
              <span style={styles.menuCardDesc}>{item.description}</span>
            )}
            <span style={styles.menuCardPrice}>{fmt(item.price)}</span>
          </button>
        ))}
        {items.length === 0 && (
          <div style={styles.menuEmpty}>No items in this category</div>
        )}
      </div>
    </div>
  );
}

// ─── OrderSummary ────────────────────────────────────────────────────────────

function OrderSummary({ order, total }: {
  order: any;
  total: number;
}) {
  const statusColor = STATUS_COLOR[order.status] || STATUS_COLOR.pending;
  const isTerminal = order.status === 'completed' || order.status === 'cancelled';

  return (
    <div style={styles.summary}>
      <div>
        <span style={{ ...styles.summaryBadge, background: statusColor }}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span style={styles.summaryTable}>
          Table {order.tableNumber ?? '—'}
        </span>
        {order.customerName && (
          <span style={styles.summaryLabel}> · {order.customerName}</span>
        )}
      </div>
      <span style={styles.summaryTotal}>{fmt(total)}</span>
    </div>
  );
}

// ─── OrderItemRow ────────────────────────────────────────────────────────────

function OrderItemRow({ item, onIncr, onDecr }: {
  item: any;
  onIncr: () => void;
  onDecr: () => void;
}) {
  return (
    <div style={styles.orderItem}>
      <div style={styles.orderItemInfo}>
        <span style={styles.orderItemName}>{item.menuItem?.name ?? 'Item'}</span>
        {item.note && <span style={styles.orderItemNote}>{item.note}</span>}
        <span style={styles.orderItemPrice}>{fmt(item.subtotal)}</span>
      </div>
      <div style={styles.qtyControls}>
        <button onClick={onDecr} style={styles.qtyBtn} aria-label="Decrease quantity">
          {item.quantity <= 1 ? '✕' : <MinusIcon />}
        </button>
        <span style={styles.qtyValue}>{item.quantity}</span>
        <button onClick={onIncr} style={styles.qtyBtn} aria-label="Increase quantity">
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

// ─── OrderItemsList ──────────────────────────────────────────────────────────

function OrderItemsList({ order, onAddItem, onUpdateQty, onRemove }: {
  order: any;
  onAddItem: (menuItemId: string) => void;
  onUpdateQty: (orderItemId: string, qty: number) => void;
  onRemove: (orderItemId: string) => void;
}) {
  if (!order.items?.length) {
    return (
      <div style={styles.emptyOrder}>
        <span style={styles.emptyOrderIcon}>📋</span>
        <span>Order is empty — tap menu items to add</span>
      </div>
    );
  }

  return (
    <div style={styles.orderItemsList}>
      {order.items.map((item: any) => (
        <OrderItemRow
          key={item.id}
          item={item}
          onIncr={() => onAddItem(item.menuItemId)}
          onDecr={() => onUpdateQty(item.id, item.quantity - 1)}
        />
      ))}
    </div>
  );
}

// ─── ActionBar ───────────────────────────────────────────────────────────────

type ActionBarStatus = OrderStatus;

function ActionButtons({ order, disabled, onHold, onKitchen, onFinish, onServe, onComplete, onCancel }: {
  order: any;
  disabled: boolean;
  onHold: () => void;
  onKitchen: () => void;
  onFinish: () => void;
  onServe: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  // Transition map: pending → hold, confirmed → kitchen, cooking → finish, ready → serve, served → complete
  const status = order.status as ActionBarStatus;
  const isTerminal = status === 'completed' || status === 'cancelled';
  const isNewOrPending = status === 'pending';
  const canConfirm = status === 'pending' && order.items?.length > 0;

  const BTN: Record<string, string> = {
    blue:    '#3b82f6',
    orange:  '#f97316',
    teal:    '#0d9488',
    green:   '#22c55e',
    gray:    '#64748b',
    red:     '#ef4444',
    cancel:  '#dc2626',
  };

  const makeBtn = (colorKey: string, extra?: React.CSSProperties): React.CSSProperties => ({
    ...styles.actionBtn,
    background: BTN[colorKey] ?? '#64748b',
    ...(extra ?? {}),
  });

  const makeCancelBtn = (): React.CSSProperties => ({
    ...styles.actionBtnCancel,
    background: BTN.cancel,
  });

  return (
    <div style={styles.actionBar}>
      <div style={styles.actionGroup}>
        {isNewOrPending && (
          <button
            onClick={onHold}
            disabled={disabled || !canConfirm}
            style={makeBtn('blue')}
            title={canConfirm ? undefined : 'Add items before confirming'}
          >
            Hold
          </button>
        )}
        {status === 'confirmed' && (
          <button onClick={onKitchen} disabled={disabled} style={makeBtn('orange')}>
            Kitchen
          </button>
        )}
        {status === 'cooking' && (
          <button onClick={onFinish} disabled={disabled} style={makeBtn('teal')}>
            Finish
          </button>
        )}
        {status === 'ready' && (
          <button onClick={onServe} disabled={disabled} style={makeBtn('teal')}>
            Serve
          </button>
        )}
        {status === 'served' && (
          <button onClick={onComplete} disabled={disabled} style={makeBtn('green')}>
            Complete
          </button>
        )}
        {isTerminal && (
          <span style={styles.actionTerminal}>
            {status === 'completed' ? '✓ Order completed' : '✕ Order cancelled'}
          </span>
        )}
      </div>
      <div style={styles.actionGroup}>
        {!isTerminal && (
          <button onClick={onCancel} disabled={disabled} style={makeCancelBtn()}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── POSPage ─────────────────────────────────────────────────────────────────

export function POSPage() {
  const store = usePOSStore();
  const {
    tables, categories, menuItems, allOrders, activeOrder, loading,
    activeCategoryId, error, setTables, setCategories, setMenuItems, setActiveCategoryId,
    fetchTables, fetchCategories, fetchMenuItems, fetchOrders, selectOrder, createOrder,
    addItem, removeItem, updateQuantity, hold, kitchen, finish, serve, complete, cancel,
  } = store;

  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchTables(), fetchCategories(), fetchMenuItems(), fetchOrders()]);
    })();
  }, [fetchTables, fetchCategories, fetchMenuItems, fetchOrders]);

  const ordersByTable = useMemo(
    () => allOrders.reduce<Record<string, string>>((m, o) => {
      if (o.tableId) m[o.tableId] = o.id;
      return m;
    }, {}),
    [allOrders],
  );

  const handleSelectTable = useCallback(
    async (tableId: string) => {
      setActiveTableId(tableId);
      const orderId = ordersByTable[tableId];
      if (orderId) {
        await selectOrder(orderId);
      } else {
        setActiveTableId(tableId);
        void selectOrder(null);
      }
    },
    [ordersByTable, selectOrder],
  );

  const handleCreateOrder = useCallback(async () => {
    if (!activeTableId) return;
    try {
      const order = await createOrder(activeTableId);
      setActiveTableId(activeTableId);
      fetchOrders();
    } catch {}
  }, [activeTableId, createOrder, fetchOrders]);

  const activeCategoryItems = useMemo(
    () => menuItems.filter((m) => m.categoryId === activeCategoryId && m.isActive),
    [menuItems, activeCategoryId],
  );

  const isTerminal = activeOrder
    ? activeOrder.status === 'completed' || activeOrder.status === 'cancelled'
    : false;

  const handleQtyUpdate = useCallback(
    async (orderItemId: string, qty: number) => {
      if (qty < 1) { await removeItem(orderItemId); return; }
      await updateQuantity(orderItemId, qty);
    },
    [removeItem, updateQuantity],
  );

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === activeTableId) ?? null,
    [tables, activeTableId],
  );

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* ── Left sidebar: Table grid ── */}
      <TableGrid
        tables={tables}
        activeOrder={activeOrder}
        activeTableId={activeTableId}
        onSelectTable={handleSelectTable}
        onCreateOrder={handleCreateOrder}
      />

      {/* ── Right panel ── */}
      <div style={styles.mainPanel}>
        {/* ── Top: menu section ── */}
        <div style={styles.menuSection}>
          <MenuCategories
            categories={categories}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
          <MenuGrid
            items={activeCategoryItems}
            onAddItem={addItem}
          />
        </div>

        {/* ── Bottom: order + actions ── */}
        <div style={styles.orderSection}>
          {activeOrder ? (
            <>
              <OrderSummary order={activeOrder} total={activeOrder.totalAmount} />
              <OrderItemsList
                order={activeOrder}
                onAddItem={addItem}
                onUpdateQty={handleQtyUpdate}
                onRemove={removeItem}
              />
              <ActionButtons
                order={activeOrder}
                disabled={loading || isTerminal}
                onHold={hold}
                onKitchen={kitchen}
                onFinish={finish}
                onServe={serve}
                onComplete={complete}
                onCancel={cancel}
              />
            </>
          ) : (
            <div style={styles.noOrder}>
              <span style={styles.noOrderText}>
                {selectedTable
                  ? `Table ${selectedTable.number} has no active order — tap "New Order" to begin`
                  : 'Select a table to start'}
              </span>
              <button onClick={handleCreateOrder} style={styles.noOrderBtn} disabled={!selectedTable}>
                + New Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },

  // sidebar
  sidebar: {
    width: 200,
    minWidth: 200,
    background: 'var(--bg-mid)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '14px 14px 8px',
  },
  sidebarTitle: {
    display: 'block',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sidebarSubtitle: {
    display: 'block',
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  filterRow: {
    display: 'flex',
    gap: 4,
    padding: '4px 8px 10px',
  },
  filterBtn: {
    flex: 1,
    padding: '4px 6px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'var(--surface)',
    borderRadius: 4,
    transition: 'background 0.15s',
    border: 'none',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
  },
  tableGridScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 10px 10px',
  },
  tableGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  tableCell: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 6px 10px',
    background: 'var(--surface)',
    borderRadius: 8,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.15s, background 0.15s',
    minHeight: 72,
  },
  tableCellActive: {
    borderColor: 'var(--accent)',
    background: 'rgba(255,107,53,0.12)',
  },
  tableDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  tableNumber: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  tableLabel: {
    fontSize: 9,
    color: 'var(--text-secondary)',
    marginTop: 2,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    padding: '20px 0',
    fontSize: 13,
  },
  newOrderBtn: {
    padding: '12px 16px',
    margin: '8px 10px 12px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },

  // main panel
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  menuSection: {
    display: 'flex',
    height: '55%',
    minHeight: 200,
    overflow: 'hidden',
  },
  catTabs: {
    width: 120,
    minWidth: 120,
    background: 'var(--bg-mid)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '8px 6px',
    gap: 3,
  },
  catTab: {
    padding: '10px 10px',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    borderRadius: 6,
    textAlign: 'left',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  catTabActive: {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  menuScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: 8,
  },
  menuCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: 'var(--surface)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s, transform 0.1s',
    border: '1px solid transparent',
    textAlign: 'left' as const,
    minHeight: 70,
  },
  menuCardName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  menuCardDesc: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 2,
    lineHeight: 1.3,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    flex: 1,
  },
  menuCardPrice: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--accent)',
    marginTop: 6,
  },
  menuEmpty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    padding: '24px 0',
    fontSize: 14,
  },

  // order section
  orderSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderTop: '2px solid var(--border)',
    minHeight: 0,
    overflow: 'hidden',
  },

  // summary bar
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'var(--bg-mid)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  summaryBadge: {
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    textTransform: 'capitalize',
  },
  statusBadge: {},
  summaryTable: {
    fontSize: 13,
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  summaryLabel: {
    color: 'var(--text-secondary)',
    fontSize: 13,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent)',
  },

  // order items list
  orderItemsList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '4px 10px',
  },
  orderItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 6,
    marginBottom: 4,
    background: 'var(--bg-mid)',
  },
  orderItemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orderItemNote: {
    fontSize: 11,
    fontStyle: 'italic' as const,
    color: 'var(--text-secondary)',
    borderLeft: '2px solid var(--border)',
    paddingLeft: 8,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent)',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    marginLeft: 8,
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface)',
    borderRadius: 4,
    fontSize: 14,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.1s',
    flexShrink: 0,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: 700,
    minWidth: 20,
    textAlign: 'center' as const,
    color: 'var(--text-primary)',
  },

  // action bar
  actionBar: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
    padding: '10px 12px',
    borderTop: '2px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg-mid)',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 6,
    flex: 1,
  },
  actionBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.05s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center' as const,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCancel: {
    flex: 0.7,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.05s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center' as const,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTerminal: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    padding: '10px 16px',
    borderRadius: 8,
    background: 'var(--surface)',
    textAlign: 'center' as const,
  },

  // empty states
  noOrder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: 'var(--text-secondary)',
    padding: 20,
  },
  noOrderText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  noOrderBtn: {
    padding: '10px 24px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },

  emptyOrder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: 'var(--text-secondary)',
    fontSize: 13,
  },
  emptyOrderIcon: { fontSize: 30 },
};

function fmt(n: number): string {
  return '$' + n.toFixed(2);
}

export default POSPage;
