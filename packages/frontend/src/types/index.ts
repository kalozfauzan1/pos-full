export interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
  category?: Category;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  orders?: Order[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note: string | null;
  createdAt: string;
  menuItem?: MenuItem;
}

export interface Order {
  id: string;
  tableId: string | null;
  tableNumber: number | null;
  customerName: string | null;
  customerCount: number | null;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  table?: Table;
  items: OrderItem[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'cooking'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled';

export interface OrderSummary {
  id: string;
  tableId: string | null;
  tableNumber: number | null;
  customerName: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}
