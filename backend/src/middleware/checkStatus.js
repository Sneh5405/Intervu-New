const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkStatus = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "User not authenticated." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true }
        });

        if (!user) {
            console.log(`CheckStatus: User ${req.user.id} not found in DB`);
            return res.status(404).json({ error: "User not found." });
        }

        if (user.status !== 'ACTIVE') {
            console.log(`CheckStatus: User ${req.user.id} status is ${user.status} (Expected ACTIVE)`);
            return res.status(403).json({ error: "Account is blocked or inactive." });
        }

        next();
    } catch (error) {
        console.error("Check status error:", error);
        return res.status(500).json({ error: "Internal server error during status check." });
    }
};

module.exports = checkStatus;
