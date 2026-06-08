import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import examRoutes from './routes/exams';
import cmsRoutes from './routes/cms';
import adminRoutes from './routes/admin';
import levelRoutes from './routes/levels';
import mockExamRoutes from './routes/mockexam';
import specialExamRoutes from './routes/specialexams';
import { rateLimiter } from './middleware/rateLimiter';
import { initRedis } from './services/redis';
import { setupSocket } from './services/socket';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use('/api/auth', rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/mock-exam', mockExamRoutes);
app.use('/api/special-exams', specialExamRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
setupSocket(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

async function start() {
  await initRedis();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;
