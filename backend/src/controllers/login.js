const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { generateAccessToken, generateRefreshToken } = require("../tokens");

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.status === 'BLOCKED') {
            return res.status(403).json({ message: "Account is blocked" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token in DB (Upsert)
        await prisma.refreshToken.upsert({
            where: { userId: user.id },
            update: {
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            },
            create: {
                token: refreshToken,
                userId: user.id,
                device: req.headers['user-agent'] || 'Unknown',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        res.json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Login Controller Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = loginController;
