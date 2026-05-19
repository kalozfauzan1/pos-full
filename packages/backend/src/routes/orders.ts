import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const createOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  tableNumber: z.number().int().positive().optional(),
  customerName: z.string().max(255).optional(),
  customerCount: z.number().int().positive().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .nonempty('At least one item is required'),
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'cooking',
    'ready',
    'served',
    'completed',
    'cancelled',
  ]),
});

const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .nonempty('At least one item is required'),
});

const removeItemSchema = z.object({
  orderItemId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Status transition rules
// pending → confirmed → cooking → ready → served → completed
// cancelled from any non-terminal status
// ---------------------------------------------------------------------------

const allowedTransitions: Record<string, string[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['cooking', 'cancelled'],
  cooking:    ['ready', 'cancelled'],
  ready:      ['served', 'cancelled'],
  served:     ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
};

function isAllowedTransition(current: string, next: string): boolean {
  return allowedTransitions[current]?.includes(next) ?? false;
}

// ---------------------------------------------------------------------------
// Singleton Socket.IO – replaced / initialised in index.ts
// ---------------------------------------------------------------------------
let io:
  | {
      to(room: string): { emit: (event: string, data: unknown) => void };
      emit: (event: string, data: unknown) => void;
    }
  | null = null;

export function setSocketIO(
  instance: typeof io,
): void {
  io = instance;
}

function emitOrderEvent(event: string, order: unknown): void {
  if (!io) return;
  io.emit(event, order);
  const id = (order as { id?: string }).id;
  if (id) io.to(`order-${id}`).emit(event, order);
}

// ---------------------------------------------------------------------------
// GET /api/orders  – list with filters + pagination
// ---------------------------------------------------------------------------

router.get(
  '/',
  requirePermission('orders:read'),
  async (req: Request, res: Response) => {
    try {
      const { status, tableId, page = '1', limit = '20' } = req.query as Record<string, string>;

      const pageNum = Math.max(1, Number(page));
      const pageSize = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * pageSize;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (tableId) where.tableId = tableId;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            table: { select: { id: true, number: true, capacity: true, status: true } },
            items: {
              include: { menuItem: { include: { category: { select: { id: true, name: true } } } } },
            },
          },
        }),
        prisma.order.count({ where }),
      ]);

      res.status(200).json({
        orders,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/orders/:id  – single order detail
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requirePermission('orders:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          table: true,
          items: { include: { menuItem: { include: { category: true } } } },
        },
      });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.status(200).json({ order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/orders  – create a new order
// ---------------------------------------------------------------------------

router.post(
  '/',
  requirePermission('orders:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid request body', details: parsed.error.flatten() });
      }

      const { tableId, tableNumber, customerName, customerCount, notes, items } = parsed.data;

      // Validate associated table
      if (tableId) {
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) return res.status(404).json({ error: 'Table not found' });
      }

      // Fetch live menu-item prices
      const menuItemIds = items.map((i) => i.menuItemId);
      const dbItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds } },
      });
      if (dbItems.length !== menuItemIds.length) {
        return res.status(404).json({ error: 'One or more menu items not found' });
      }
      const priceMap = new Map(dbItems.map((m) => [m.id, m.price]));

      // Build order items with computed subtotals
      const orderItemsData = items.map((item) => ({

        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: priceMap.get(item.menuItemId)!,
        subtotal: calculateItemSubtotal(priceMap.get(item.menuItemId)!, item.quantity),
        note: item.note || null,
      }));

      const totalAmount = orderItemsData.reduce((s, oi) => s + oi.subtotal, 0);

      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            tableId: tableId ?? null,
            tableNumber: tableNumber ?? null,
            customerName: customerName ?? null,
            customerCount: customerCount ?? null,
            notes: notes ?? null,
            totalAmount,
          },
        });

        await tx.orderItem.createMany({
          data: orderItemsData.map((oi) => ({ ...oi, orderId: createdOrder.id })),
        });

        return tx.order.findUnique({
          where: { id: createdOrder.id },
          include: {
            table: true,
            items: { include: { menuItem: { include: { category: true } } } },
          },
        });
      });

      const fullOrder = order!;
      emitOrderEvent('order:created', order);
      res.status(201).json({ order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/status  – transition order status
// ---------------------------------------------------------------------------

router.patch(
  '/:id/status',
  requirePermission('orders:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = statusUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid status value', details: parsed.error.flatten() });
      }

      const { status } = parsed.data;

      const existing = await prisma.order.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Order not found' });

      // Idempotent: same status is a no-op
      if (existing.status === status) {
        const current = await prisma.order.findUnique({
          where: { id },
          include: {
            table: true,
            items: { include: { menuItem: true } },
          },
        });
        return res.status(200).json({ order: current });
      }

      if (!isAllowedTransition(existing.status, status)) {
        return res.status(409).json({
          error: `Cannot transition order from "${existing.status}" to "${status}"`,
          currentStatus: existing.status,
        });
      }

      const data: Record<string, unknown> = { status };
      if (status === 'cancelled') {
        data.cancelledAt = new Date();
        data.cancelledBy = req.user?.email ?? null;
      }

      const order = await prisma.order.update({
        where: { id },
        data,
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      emitOrderEvent('order:updated', order);
      res.status(200).json({ order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/orders/:id/items  – add items or remove a single item
// ---------------------------------------------------------------------------

router.patch(
  '/:id/items',
  requirePermission('orders:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const hasAddItems    = !!req.body?.items;
      const hasRemoveId    = !!req.body?.orderItemId;

      if (!hasAddItems && !hasRemoveId) {
        return res.status(400).json({ error: 'Provide either items[] or orderItemId' });
      }

      if (hasAddItems && hasRemoveId) {
        return res.status(400).json({ error: 'Cannot add and remove items in the same request' });
      }

      // ======== ADD ITEMS ========
      if (hasAddItems) {
        const addParsed = addItemsSchema.safeParse(req.body);
        if (!addParsed.success) {
          return res
            .status(400)
            .json({ error: 'Invalid request body', details: addParsed.error.flatten() });
        }

        const { items } = addParsed.data;

        const existingOrder = await prisma.order.findUnique({ where: { id } });
        if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
        if (existingOrder.status === 'cancelled' || existingOrder.status === 'completed') {
          return res.status(409).json({ error: `Cannot modify items for a ${existingOrder.status} order` });
        }

        const dbMenuItems = await prisma.menuItem.findMany({
          where: { id: { in: items.map((i) => i.menuItemId) } },
        });
        if (dbMenuItems.length !== items.length) {
          return res.status(404).json({ error: 'One or more menu items not found' });
        }
        const priceMap = new Map(dbMenuItems.map((m) => [m.id, m.price]));

        const orderItemsData = items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: priceMap.get(item.menuItemId)!,
          subtotal: calculateItemSubtotal(priceMap.get(item.menuItemId)!, item.quantity),
          note: item.note || null,
        }));

        const addedTotal = orderItemsData.reduce((s, oi) => s + oi.subtotal, 0);

        const orderAfterAdd = await prisma.$transaction(async (tx) => {
          await tx.orderItem.createMany({ data: orderItemsData.map((oi) => ({ ...oi, orderId: id })) });
          await tx.order.update({
            where: { id },
            data: { totalAmount: { increment: addedTotal } },
          });
          return tx.order.findUnique({
            where: { id },
            include: {
              table: true,
              items: {
                include: { menuItem: { include: { category: true } } },
              },
            },
          });
        });

        const order = orderAfterAdd!;

        emitOrderEvent('order:updated', order);
        return res.status(200).json({
          message: 'Items added',
          addedCount: Number(items.length),
          order,
        });
      }

      // ======== REMOVE ITEM ========
      const removeParsed = removeItemSchema.safeParse(req.body);
      if (!removeParsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid request body', details: removeParsed.error.flatten() });
      }

      const { orderItemId } = removeParsed.data;

      const itemToRemove = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: { order: { select: { id: true, status: true } } },
      });

      if (!itemToRemove || itemToRemove.order.id !== id) {
        return res.status(404).json({ error: 'Order item not found in this order' });
      }

      if (itemToRemove.order.status === 'cancelled' || itemToRemove.order.status === 'completed') {
        return res.status(409).json({ error: `Cannot modify items for a ${itemToRemove.order.status} order` });
      }

      const orderAfterRemove = await prisma.$transaction(async (tx) => {
        await tx.orderItem.delete({ where: { id: orderItemId } });
        const updated = await tx.order.update({
          where: { id },
          data: { totalAmount: { decrement: itemToRemove.subtotal } },
        });
        return tx.order.findUnique({
          where: { id },
          include: {
            table: true,
            items: {
              include: { menuItem: { include: { category: true } } },
            },
          },
        });
      });

      const order = orderAfterRemove!;

      emitOrderEvent('order:updated', order);
      res.status(200).json({ message: 'Item removed', order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /api/orders/:id  – cancel order
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requirePermission('orders:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await prisma.order.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Order not found' });

      if (existing.status === 'cancelled') {
        return res.status(409).json({ error: 'Order is already cancelled' });
      }

      const order = await prisma.order.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: req.user?.email ?? null,
        },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });

      emitOrderEvent('order:updated', order);
      res.status(200).json({ order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function calculateItemSubtotal(price: number, quantity: number): number {
  return Number((price * quantity).toFixed(2));
}

export default router;
