"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const packages_1 = __importDefault(require("./routes/packages"));
const shipments_1 = __importDefault(require("./routes/shipments"));
// Import services
const socketService_1 = __importDefault(require("./services/socketService"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Initialize socket service
const socketService = new socketService_1.default(server);
exports.socketService = socketService;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/packages', packages_1.default);
app.use('/api/shipments', shipments_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'GLS Tracking Server is running'
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
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
//# sourceMappingURL=index.js.map