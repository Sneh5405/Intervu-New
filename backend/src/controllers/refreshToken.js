const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { generateAccessToken, generateRefreshToken } = require("../tokens");

const refreshTokenController = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh Token is required" });
    }

    try {
        // 1. Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // 2. Check if it exists in DB (and verify user ownership)
        const savedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!savedToken || savedToken.userId !== decoded.id) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // 3. Token Rotation: Delete valid used token, issue new pair
        // Transaction to ensure atomicity
        const newAccessToken = generateAccessToken(savedToken.user);
        const newRefreshToken = generateRefreshToken(savedToken.user);

        await prisma.$transaction([
            prisma.refreshToken.delete({ where: { token: refreshToken } }),
            prisma.refreshToken.create({
                data: {
                    token: newRefreshToken,
                    userId: savedToken.userId,
                    device: req.headers['user-agent'] || 'Unknown',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days match usually
                }
            })
        ]);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        console.error("Refresh Token Error:", err);
        return res.status(403).json({ message: "Invalid or expired refresh token" });
    }
};

module.exports = refreshTokenController;
