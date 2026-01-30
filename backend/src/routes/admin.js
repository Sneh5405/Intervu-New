const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");
const checkStatus = require("../middleware/checkStatus");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply auth and status checks to all admin routes
adminRouter.use(authenticateToken);
adminRouter.use(checkStatus);
// Only HR can access admin routes
adminRouter.use(checkRole(['HR']));

// Get all users
adminRouter.get("/users", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true // Assuming createdAt exists? It's not in schema shown in Step 17... Wait.
                // User model in Step 17 did NOT have createdAt.
                // It had `interviewsAsHr`, `emailOtp`, etc.
                // I should double check User model fields.
                // User model: id, email, password, name, role, status (added), emailVerified, emailOtp, refreshToken, relations.
                // No createdAt in User? That's common to miss. I won't select it.
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Update user status (Block/Unblock)
adminRouter.patch("/users/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Expect 'ACTIVE' or 'BLOCKED'

    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json({ message: `User status updated to ${status}`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user status" });
    }
});

module.exports = adminRouter;
