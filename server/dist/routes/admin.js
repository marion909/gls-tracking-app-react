"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Apply admin authorization to all routes
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('ADMIN'));
// Get all users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { packages: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
        });
        const total = await prisma.user.count({ where });
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Get all packages with detailed info
router.get('/packages', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { trackingNumber: { contains: search, mode: 'insensitive' } },
                { recipientName: { contains: search, mode: 'insensitive' } },
                { senderName: { contains: search, mode: 'insensitive' } }
            ];
        }
        const packages = await prisma.package.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                _count: {
                    select: { trackingEvents: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
        });
        const total = await prisma.package.count({ where });
        res.json({
            success: true,
            data: {
                packages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get admin packages error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isActive } = req.body;
        const updateData = {};
        if (role)
            updateData.role = role;
        if (typeof isActive === 'boolean')
            updateData.isActive = isActive;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user has packages
        const packageCount = await prisma.package.count({ where: { userId: id } });
        if (packageCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete user with existing packages. Deactivate user instead.'
            });
        }
        await prisma.user.delete({ where: { id } });
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalPackages, packagesByStatus, recentPackages] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.package.count(),
            prisma.package.groupBy({
                by: ['status'],
                _count: { status: true }
            }),
            prisma.package.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { firstName: true, lastName: true }
                    }
                }
            })
        ]);
        const statusStats = packagesByStatus.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {});
        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalPackages,
                packagesByStatus: statusStats,
                recentPackages
            }
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map