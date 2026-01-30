const bcrypt = require("bcrypt")
const prisma = require("../config/prisma.js")
const transporter = require("../utils/mailer.js")

const sendOtpService = async user => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  console.log("GENERATED OTP:", otp)
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
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
    })

    await transporter.sendMail({
      from: `"InterVue" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify your email",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    })
  } catch (err) {
    console.error("SEND OTP SERVICE ERROR:", err);
    await prisma.$transaction([
      prisma.emailOtp.deleteMany({
        where: { userId: user.id }
      }),
      prisma.user.delete({
        where: { id: user.id }
      })
    ])

    throw new Error("OTP_EMAIL_FAILED")
  }
}

module.exports = sendOtpService
