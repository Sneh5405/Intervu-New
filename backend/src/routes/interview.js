const express = require("express");
const interviewRouter = express.Router();
const authenticateToken = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");
const checkStatus = require("../middleware/checkStatus");
const controller = require("../controllers/interview");

interviewRouter.use(authenticateToken);
interviewRouter.use(checkStatus);

// Create: Only HR
interviewRouter.post("/", checkRole(['HR']), controller.createInterview);

// Read All: All roles (filtered by controller)
interviewRouter.get("/", controller.getAllInterviews);

// Read One: All roles (ownership checked in controller)
interviewRouter.get("/:id", controller.getInterviewById);

// Update: HR (full), Interviewer (status)
interviewRouter.patch("/:id", checkRole(['HR', 'INTERVIEWER']), controller.updateInterview);

// Delete: Only HR
interviewRouter.delete("/:id", checkRole(['HR']), controller.deleteInterview);

const validateTimeWindow = require("../middleware/validateTimeWindow");

// Save Answer: Authenticated (Time window validated)
interviewRouter.post("/:id/answer", validateTimeWindow, controller.saveAnswer);

// Next Round: HR Only
interviewRouter.post("/:id/next-round", checkRole(['HR']), controller.createNextRound);

// Accept Interview: Interviewer and Interviewee
interviewRouter.post("/:id/accept", controller.acceptInterview);

module.exports = interviewRouter;
