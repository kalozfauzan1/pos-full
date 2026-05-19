import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import ordersRouter, { setSocketIO } from './routes/orders.js';
import paymentsRouter from './routes/payments.js';

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Inject Socket.IO into the orders route for real-time event emission
setSocketIO(io as SocketIOServer & { to(room: string): { emit(event: string, data: unknown): void } });

// Attach a connected/disconnected room helper so clients can join their table
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join:table', (tableId: string) => {
    socket.join(`table-${tableId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;