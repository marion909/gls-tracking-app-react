import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare class SocketService {
    private io;
    constructor(server: HttpServer);
    private setupSocketAuth;
    private setupEventHandlers;
    emitTrackingProgress(trackingNumber: string, step: string, message: string, progress: number): void;
    emitProgress(step: string, message: string, progress: number): void;
    emitTrackingUpdate(trackingNumber: string, data: any): void;
    getIO(): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
}
export default SocketService;
//# sourceMappingURL=socketService.d.ts.map