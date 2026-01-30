const express = require("express");
const verifyOtp = express.Router();
const verifyOtpController = require("../controllers/verifyOtp");

verifyOtp.post("/verify-otp", verifyOtpController);

module.exports = verifyOtp;
