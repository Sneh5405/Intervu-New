const express = require("express");
const authRouter = express.Router();
const loginMiddleware = require("../middleware/login");
const loginController = require("../controllers/login");
const refreshTokenController = require("../controllers/refreshToken");
const logoutController = require("../controllers/logout");

// Login
authRouter.post("/login", loginMiddleware, loginController);

// Refresh Token
authRouter.post("/refresh-token", refreshTokenController);

// Logout
authRouter.post("/logout", logoutController);

module.exports = authRouter;
