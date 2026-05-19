import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { requirePermission } from '../middleware/requirePermission.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const paymentMethodEnum = z.enum(['cash', 'card', 'mobile', 'split']);

const singlePaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be positive'),
  method: paymentMethodEnum.optional().default('card'),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const splitPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be positive').optional(),
  method: z.literal('split'),
  splitPayments: z
    .array(
      z.object({
        method: paymentMethodEnum,
        amount: z.number().positive('Split amount must be positive'),
        reference: z.string().optional().nullable(),
      }),
    )
    .nonempty('At least one split payment is required'),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const createPaymentSchema = z.discriminatedUnion('method', [
  singlePaymentSchema,
  splitPaymentSchema,
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateReceiptNumber(orderId: string): string {
  const hex = orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RCP-${datePart}-${timePart}-${hex}-${rand}`;
}

function buildReceiptData(params: {
  order: {
    id: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    cancelledAt?: Date | null;
    table?: { number: number } | null;
    items: Array<{
      quantity: number;
      unitPrice: number;
      subtotal: number;
      note: string | null;
      menuItem: { name: string };
    }>;
  };
  payment: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    recordedBy: string;
    createdAt: Date;
  } | null;
}): Record<string, unknown> {
  const { order, payment } = params;
  const lineItems = order.items.map((item) => ({
    name: item.menuItem.name,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice.toFixed(2)),
    subtotal: Number(item.subtotal.toFixed(2)),
    note: item.note,
  }));

  return {
    receiptNumber: '',
    orderId: order.id,
    orderStatus: order.status,
    tableNumber: order.table?.number ?? null,
    createdAt: order.createdAt,
    cancelledAt: order.cancelledAt ?? null,
    items: lineItems,
    payment: payment
      ? {
          id: payment.id,
          amount: Number(payment.amount.toFixed(2)),
          method: payment.method,
          reference: payment.reference,
          recordedBy: payment.recordedBy,
          paidAt: payment.createdAt,
        }
      : null,
    totals: {
      orderTotal: Number(order.totalAmount.toFixed(2)),
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/payments  – record a payment for an order, mark order completed
// ---------------------------------------------------------------------------

router.post(
  '/',
  requirePermission('payments:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: 'Invalid request body', details: parsed.error.flatten() });
      }

      const body = parsed.data;
      const recordedBy = req.user?.email ?? 'unknown';

      // Validate method
      if (!paymentMethodEnum.safeParse(body.method).success) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }

      // ----- Check order -----
      const order = await prisma.order.findUnique({
        where: { id: body.orderId },
        include: {
          table: { select: { id: true, number: true } },
          items: { include: { menuItem: { select: { name: true } } } },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'cancelled') {
        return res.status(409).json({ error: 'Cannot process payment for a cancelled order' });
      }

      // ----- Compute amount -----
      let paymentAmount: number;
      if (body.method === 'split') {
        paymentAmount = (body as { splitPayments: Array<{ amount: number }> }).splitPayments.reduce(
          (sum: number, p: { amount: number }) => sum + p.amount,
          0,
        );
      } else {
        paymentAmount = body.amount;
      }

      // Narrow body to the split variant before accessing splitPayments
      const splitBody = body as { method: 'split'; splitPayments: unknown[] };

      // ----- Create payment + complete order in a transaction -----
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: body.orderId,
            amount: paymentAmount,
            method: body.method,
            reference: body.reference ?? null,
            recordedBy: recordedBy,
            splitPayments: body.method === 'split' ? JSON.stringify(splitBody.splitPayments) : undefined,
            note: body.note ?? null,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: body.orderId },
          data: { status: 'completed' },
          include: {
            table: true,
            items: { include: { menuItem: true } },
          },
        });

        // Build receipt data
        const receiptData = buildReceiptData({
          order: updatedOrder,
          payment,
        });

        const receiptNumber = generateReceiptNumber(updatedOrder.id);
        const receipt = await tx.receipt.create({
          data: {
            paymentId: payment.id,
            orderId: updatedOrder.id,
            orderStatus: updatedOrder.status,
            receiptNumber,
            receiptData: JSON.stringify(buildReceiptData({ order: updatedOrder, payment })),
          },
        });

        return { payment, order: updatedOrder, receipt };
      });

      res.status(201).json({
        message: 'Payment recorded successfully',
        payment: {
          id: result.payment.id,
          orderId: result.payment.orderId,
          amount: result.payment.amount,
          method: result.payment.method,
          reference: result.payment.reference,
          recordedBy: result.payment.recordedBy,
          createdAt: result.payment.createdAt,
        },
        order: result.order,
        receipt: result.receipt,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
