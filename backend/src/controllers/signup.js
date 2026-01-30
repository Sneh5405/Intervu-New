const bcrypt = require("bcrypt");
const sendOtpService = require("../services/sendEmailOtp");
const prisma = require("../config/prisma");


const signupController = async (req, res) => {
    const { email, password, name, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role
        }
    })

    try {
        await sendOtpService(user)
        res.status(201).json({ message: "OTP sent to email", userId: user.id })
    } catch (err) {
        console.error("SIGNUP CONTROLLER ERROR:", err);
        if (err.message === "OTP_EMAIL_FAILED") {
            return res.status(500).json({
                message: "Unable to send verification email. Please try again."
            })
        }
        res.status(500).json({ message: "Internal Server Error" });
    }

}

module.exports = signupController;