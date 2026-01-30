const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// All routes require authentication
router.use(authenticateToken);

// Only HR and INTERVIEWER can manage questions
// You might want to allow INTERVIEWEE to view questions in some context (like during an interview), 
// but typically they don't browse the question bank.
const allowedRoles = ['HR', 'INTERVIEWER'];

router.post('/', checkRole(allowedRoles), questionController.createQuestion);
router.get('/', checkRole(allowedRoles), questionController.getQuestions);
router.get('/:id', checkRole(allowedRoles), questionController.getQuestionById);
router.put('/:id', checkRole(allowedRoles), questionController.updateQuestion);
router.delete('/:id', checkRole(allowedRoles), questionController.deleteQuestion);

module.exports = router;
