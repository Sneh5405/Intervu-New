const express = require("express");
const loginRouter = express.Router();
const loginMiddleware = require("../middleware/login");
const loginController = require("../controllers/login");

loginRouter.post("/login", loginMiddleware, loginController);

module.exports = loginRouter;
