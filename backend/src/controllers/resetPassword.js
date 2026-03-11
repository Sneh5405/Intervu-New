const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

const resetPasswordController = async (req, res) => {
    const { userId, otp, newPassword } = req.body;
    try {
        const record = await prisma.emailOtp.findUnique({ where: { userId: parseInt(userId, 10) } });
        if (!record) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        if (record.expiresAt < new Date()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        const isValid = await bcrypt.compare(otp, record.otpHash);
        if (!isValid) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: parseInt(userId, 10) },
            data: { password: hashedPassword }
        });

        await prisma.emailOtp.delete({ where: { id: record.id } });

        res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("RESET PASSWORD ERROR:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = resetPasswordController;
