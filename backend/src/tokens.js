const jwt = require("jsonwebtoken")

const generateAccessToken = user =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
  )

const generateRefreshToken = user =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  )

module.exports = { generateAccessToken, generateRefreshToken }
