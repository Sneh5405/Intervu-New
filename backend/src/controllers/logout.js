const prisma = require("../config/prisma");

const logoutController = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        // If no token provided, just say logged out (idempotent)
        return res.sendStatus(204);
    }

    try {
        await prisma.refreshToken.delete({
            where: { token: refreshToken }
        });
    } catch (err) {
        // Build robustly: if token not found, it's already "logged out"
        if (err.code !== 'P2025') { // P2025 = Record to delete does not exist
            console.error("Logout Error:", err);
        }
    }

    res.sendStatus(204); // No content
};

module.exports = logoutController;
