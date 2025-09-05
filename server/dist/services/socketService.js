"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class SocketService {
    constructor(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        this.setupSocketAuth();
        this.setupEventHandlers();
    }
    setupSocketAuth() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }
                // For master password system, we just verify the JWT token
                jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                next();
            }
            catch (err) {
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);
            socket.on('join-tracking', (trackingNumber) => {
                socket.join(`tracking-${trackingNumber}`);
            });
            socket.on('leave-tracking', (trackingNumber) => {
                socket.leave(`tracking-${trackingNumber}`);
            });
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });
    }
    // Emit tracking progress updates
    emitTrackingProgress(trackingNumber, step, message, progress) {
        this.io.to(`tracking-${trackingNumber}`).emit('tracking-progress', {
            step,
            message,
            progress,
            timestamp: new Date()
        });
    }
    // Emit tracking updates
    emitTrackingUpdate(trackingNumber, data) {
        this.io.to(`tracking-${trackingNumber}`).emit('tracking-update', {
            trackingNumber,
            data,
            timestamp: new Date()
        });
    }
    getIO() {
        return this.io;
    }
}
exports.SocketService = SocketService;
exports.default = SocketService;
//# sourceMappingURL=socketService.js.map