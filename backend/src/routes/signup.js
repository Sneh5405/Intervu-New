const express = require("express");
const signup = express.Router();
const signupMiddleware = require("../middleware/signup");
const signupController = require("../controllers/signup");

signup.post("/signup",signupMiddleware,signupController);

module.exports = signup;