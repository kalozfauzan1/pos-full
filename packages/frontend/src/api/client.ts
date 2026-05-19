import type { Order, OrderSummary } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Tables
  getTables: (): Promise<{ tables: any[] }> =>
    request('/tables'),

  // Menu
  getCategories: (): Promise<{ categories: any[] }> =>
    request('/menu/categories'),
  getMenuItems: (): Promise<{ items: any[] }> =>
    request('/menu/items'),

  // Orders
  getOrders: (params?: { status?: string; tableId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.tableId) qs.set('tableId', params.tableId);
    const query = qs.toString() ? `?${qs}` : '';
    return request<{ orders: OrderSummary[] }>(`/orders${query}`);
  },
  getOrder: (id: string): Promise<{ order: any }> =>
    request(`/orders/${id}`),
  createOrder: (body: {
    tableId?: string;
    tableNumber?: number;
    customerName?: string;
    customerCount?: number;
    notes?: string;
    items: { menuItemId: string; quantity: number; note?: string }[];
  }): Promise<{ order: any }> =>
    request('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateOrderStatus: (
    id: string,
    status: string,
  ): Promise<{ order: any }> =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addOrderItems: (
    id: string,
    items: { menuItemId: string; quantity: number; note?: string }[],
  ): Promise<{ order: any }> =>
    request(`/orders/${id}/items`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),
  removeOrderItem: (
    id: string,
    orderItemId: string,
  ): Promise<{ order: any }> =>
    request(`/orders/${id}/items`, {
      method: 'PATCH',
      body: JSON.stringify({ orderItemId }),
    }),
};
