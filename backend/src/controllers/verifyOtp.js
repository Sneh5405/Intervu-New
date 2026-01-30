const verifyOtpService = require("../services/otpVerify");

const verifyOtpController = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ message: "UserId and OTP are required" });
    }

    try {
        await verifyOtpService({ userId, otp });
        res.status(200).json({ message: "OTP verified successfully" });
    } catch (err) {
        if (err.message === "OTP_NOT_FOUND") {
            return res.status(400).json({ message: "OTP not found" });
        }
        if (err.message === "OTP_EXPIRED") {
            return res.status(400).json({ message: "OTP expired" });
        }
        if (err.message === "INVALID_OTP") {
            return res.status(400).json({ message: "Invalid OTP" });
        }
        throw err;
    }
}

module.exports = verifyOtpController;
