import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

export class SocketService {
  private io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketAuth();
    this.setupEventHandlers();
  }

  private setupSocketAuth() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        // For master password system, we just verify the JWT token
        jwt.verify(token, process.env.JWT_SECRET!);
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join-tracking', (trackingNumber: string) => {
        socket.join(`tracking-${trackingNumber}`);
      });

      socket.on('leave-tracking', (trackingNumber: string) => {
        socket.leave(`tracking-${trackingNumber}`);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  // Emit tracking progress updates
  public emitTrackingProgress(trackingNumber: string, step: string, message: string, progress: number) {
    this.io.to(`tracking-${trackingNumber}`).emit('tracking-progress', {
      step,
      message,
      progress,
      timestamp: new Date()
    });
  }

  // Emit general progress updates (for loading shipments etc.)
  public emitProgress(step: string, message: string, progress: number) {
    this.io.emit('progress', {
      step,
      message,
      progress,
      timestamp: new Date()
    });
  }

  // Emit tracking updates
  public emitTrackingUpdate(trackingNumber: string, data: any) {
    this.io.to(`tracking-${trackingNumber}`).emit('tracking-update', {
      trackingNumber,
      data,
      timestamp: new Date()
    });
  }

  public getIO() {
    return this.io;
  }
}

export default SocketService;
