const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const transporter = require("../utils/mailer");

const forgotPasswordController = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Provide a generic message for security? 
            // The prompt says "the forgot password endpoint is not working", meaning either the user gets an error or is expecting a specific functionality.
            // Returning 404 might be okay for this project context.
            return res.status(404).json({ message: "User with this email not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.emailOtp.upsert({
            where: { userId: user.id },
            update: {
                otpHash,
                expiresAt
            },
            create: {
                otpHash,
                expiresAt,
                userId: user.id
            }
        });

        await transporter.sendMail({
            from: `"InterVue" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Reset your password",
            text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`
        });

        res.status(200).json({ message: "OTP sent to your email", userId: user.id });
    } catch (err) {
        console.error("FORGOT PASSWORD ERROR:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = forgotPasswordController;
