const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkOwnership = (model, idParam = 'id', userIdField = 'userId') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        const resourceId = parseInt(req.params[idParam]);
        if (isNaN(resourceId)) {
            return res.status(400).json({ error: "Invalid resource ID." });
        }

        try {
            // Dynamically query the model
            // This assumes 'model' is the lowercase name of the prisma model helper, e.g., prisma.interview
            if (!prisma[model]) {
                return res.status(500).json({ error: "Invalid model configuration." });
            }

            const resource = await prisma[model].findUnique({
                where: { id: resourceId }
            });

            if (!resource) {
                return res.status(404).json({ error: "Resource not found." });
            }

            // Check if the current user is the owner
            // We might need more complex logic here if resources have multiple owners or relation names
            // For now, simple standard field check.

            // Special case for 'User' model (self-access)
            if (model === 'user' && resource.id === req.user.id) {
                return next();
            }

            if (resource[userIdField] !== req.user.id) {
                // Check if user is ADMIN/HR, maybe they can override?
                if (req.user.role === 'HR') {
                    // HR might have access to everything? Or specific logic.
                    // For now, let's say HR can access.
                    return next();
                }
                return res.status(403).json({ error: "Access denied. You do not own this resource." });
            }

            next();
        } catch (error) {
            console.error("Ownership check error:", error);
            return res.status(500).json({ error: "Internal server error during ownership check." });
        }
    };
};

module.exports = checkOwnership;
