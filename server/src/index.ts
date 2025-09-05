import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import packageRoutes from './routes/packages';
import shipmentRoutes from './routes/shipments';

// Import services
import SocketService from './services/socketService';

const app = express();
const server = createServer(app);

// Initialize socket service
const socketService = new SocketService(server);

// Export socket service instance for use in other modules
export { socketService };

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/shipments', shipmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'GLS Tracking Server is running'
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Interner Server-Fehler'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`� Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔌 Socket.IO initialized`);
});
