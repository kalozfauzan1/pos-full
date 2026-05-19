import { create } from 'zustand';
import type { Order, OrderSummary, Table, MenuItem, Category } from '../types';
import { api } from '../api/client';

type OrderStatusFilter = OrderSummary['status'] | 'all';

interface POSStore {
  tables: Table[];
  categories: Category[];
  menuItems: MenuItem[];
  allOrders: OrderSummary[];
  activeOrder: Order | null;

  loading: boolean;
  activeCategoryId: string | null;

  setTables: (tables: Table[]) => void;
  setCategories: (categories: Category[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
  setActiveCategoryId: (id: string | null) => void;

  fetchTables: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchMenuItems: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  selectOrder: (id: string | null) => Promise<void>;

  createOrder: (tableId: string) => Promise<Order>;
  addItem: (menuItemId: string) => void;
  removeItem: (orderItemId: string) => Promise<void>;
  updateQuantity: (orderItemId: string, quantity: number) => Promise<void>;

  hold: () => void;
  kitchen: () => void;
  finish: () => void;
  serve: () => void;
  complete: () => void;
  cancel: () => void;

  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
}

const STATUS_ORDER: Record<string, number> = {
  pending: 0, confirmed: 1, cooking: 2, ready: 3, served: 4, completed: 5, cancelled: 99,
};

function sortOrders(a: OrderSummary, b: OrderSummary): number {
  const diff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  if (diff !== 0) return diff;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function activeOrderForTable(table: any): any {
  return table.orders?.length ? table.orders[0] : null;
}

async function updateActiveStatus(set: (s: Partial<POSStore>) => void, get: () => POSStore, status: string) {
  const { activeOrder } = get();
  if (!activeOrder) return;
  try {
    const { order } = await api.updateOrderStatus(activeOrder.id, status);
    set({ activeOrder: order, error: null });
    get().fetchOrders();
  } catch (err: any) {
    set({ error: err.message });
  }
}

export const usePOSStore = create<POSStore>((set, get) => ({
  tables: [],
  categories: [],
  menuItems: [],
  allOrders: [],
  activeOrder: null,
  loading: false,
  activeCategoryId: null,
  error: null,

  setTables: (tables) => set({ tables }),
  setCategories: (categories) => set({ categories }),
  setMenuItems: (items) => set({ menuItems: items }),
  setActiveCategoryId: (id) => set({ activeCategoryId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchTables: async () => {
    try {
      const { tables } = await api.getTables();
      set({ tables });
    } catch (err: any) { set({ error: err.message }); }
  },

  fetchCategories: async () => {
    try {
      const { categories } = await api.getCategories();
      set({
        categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
        activeCategoryId: categories[0]?.id ?? null,
      });
    } catch (err: any) { set({ error: err.message }); }
  },

  fetchMenuItems: async () => {
    try {
      const { items } = await api.getMenuItems();
      set({ menuItems: items });
    } catch (err: any) { set({ error: err.message }); }
  },

  fetchOrders: async () => {
    try {
      const { orders } = await api.getOrders();
      set({ allOrders: orders.sort(sortOrders) });
    } catch (err: any) { set({ error: err.message }); }
  },

  selectOrder: async (id) => {
    if (!id) { set({ activeOrder: null }); return; }
    set({ loading: true, error: null });
    try {
      const { order } = await api.getOrder(id);
      set({ activeOrder: order, loading: false });
    } catch (err: any) { set({ error: err.message, loading: false }); }
  },

  createOrder: async (tableId) => {
    const { tables } = get();
    const table = tables.find((t) => t.id === tableId);
    set({ loading: true, error: null });
    try {
      const { order } = await api.createOrder({
        tableId, tableNumber: table?.number, customerName: '', items: [],
      });
      set({ activeOrder: order, loading: false });
      get().fetchOrders();
      return order;
    } catch (err: any) { set({ error: err.message, loading: false }); throw err; }
  },

  addItem: (menuItemId) => {
    const { activeOrder, menuItems } = get();
    if (!activeOrder) return;
    const item = menuItems.find((m) => m.id === menuItemId);
    if (!item) return;

    const existing = activeOrder.items.find((i) => i.menuItemId === menuItemId);
    let newItems: Order['items'];
    let totalDelta: number;

    if (existing) {
      const newQty = existing.quantity + 1;
      newItems = activeOrder.items.map((i) =>
        i.menuItemId === menuItemId
          ? { ...i, quantity: newQty, subtotal: +(item.price * newQty).toFixed(2) }
          : i
      );
      totalDelta = item.price;
    } else {
      const newOrderItem: any = {
        id: crypto.randomUUID(),
        orderId: activeOrder.id,
        menuItemId: item.id,
        quantity: 1,
        unitPrice: item.price,
        subtotal: +item.price.toFixed(2),
        note: null,
        createdAt: new Date().toISOString(),
        menuItem: item,
      };
      newItems = [...activeOrder.items, newOrderItem];
      totalDelta = item.price;
    }

    set({
      activeOrder: {
        ...activeOrder,
        items: newItems,
        totalAmount: +(activeOrder.totalAmount + totalDelta).toFixed(2),
      },
    });

    api.addOrderItems(activeOrder.id, [{ menuItemId, quantity: 1 }])
      .then(({ order }) => { set({ activeOrder: order }); get().fetchOrders(); })
      .catch((err: any) => { set({ error: err.message }); get().fetchOrders(); });
  },

  removeItem: async (orderItemId) => {
    const { activeOrder } = get();
    if (!activeOrder) return;
    try {
      const { order } = await api.removeOrderItem(activeOrder.id, orderItemId);
      set({ activeOrder: order });
      get().fetchOrders();
    } catch (err: any) { set({ error: err.message }); }
  },

  updateQuantity: async (orderItemId, quantity) => {
    const { activeOrder, menuItems } = get();
    if (!activeOrder) return;
    if (quantity < 1) { await get().removeItem(orderItemId); return; }

    const orderItem = activeOrder.items.find((i) => i.id === orderItemId);
    const item = orderItem ? menuItems.find((m) => m.id === orderItem.menuItemId) : null;
    if (!item) return;

    const newItems = activeOrder.items.map((i) =>
      i.id === orderItemId
        ? { ...i, quantity, subtotal: +(item.price * quantity).toFixed(2) }
        : i
    );
    const newTotal = newItems.reduce((s, i) => s + i.subtotal, 0);
    set({ activeOrder: { ...activeOrder, items: newItems, totalAmount: +newTotal.toFixed(2) } });

    try {
      await api.removeOrderItem(activeOrder.id, orderItemId);
      await api.addOrderItems(activeOrder.id, [{ menuItemId: item.id, quantity }]);
      get().selectOrder(activeOrder.id);
      get().fetchOrders();
    } catch (err: any) {
      set({ error: err.message });
      get().selectOrder(activeOrder.id);
    }
  },

  hold: () => { updateActiveStatus(set, get, 'confirmed'); },
  kitchen: () => { updateActiveStatus(set, get, 'cooking'); },
  finish: () => { updateActiveStatus(set, get, 'ready'); },
  serve: () => { updateActiveStatus(set, get, 'served'); },
  complete: () => { updateActiveStatus(set, get, 'completed'); },
  cancel: () => { updateActiveStatus(set, get, 'cancelled'); },
}));
