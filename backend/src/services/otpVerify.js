const bcrypt = require("bcrypt")
const prisma = require("../config/prisma.js")

const verifyOtpService = async ({ userId, otp }) => {
  try {
    const record = await prisma.emailOtp.findUnique({
      where: { userId }
    })

    if (!record) {
      throw new Error("OTP_NOT_FOUND")
    }

    if (record.expiresAt < new Date()) {
        await prisma.emailOtp.deleteMany({
            where: { userId }
        })
        throw new Error("OTP_EXPIRED")
    }

    const isValid = await bcrypt.compare(otp, record.otpHash)
    if (!isValid) {
      throw new Error("INVALID_OTP")
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true }
      }),
      prisma.emailOtp.delete({
        where: { userId }
      })
    ])

    return { verified: true }
  } catch (err) {
    throw err
  }
}

module.exports = verifyOtpService
