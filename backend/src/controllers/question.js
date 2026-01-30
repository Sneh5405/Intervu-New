const prisma = require('../config/prisma');

// Create a new question
const createQuestion = async (req, res) => {
    try {
        const { text, type, options, correctAnswer, testCases, difficulty, tags } = req.body;
        const createdById = req.user.id; // From auth middleware

        if (!text || !type) {
            return res.status(400).json({ error: "Text and Type are required" });
        }

        const question = await prisma.question.create({
            data: {
                text,
                type,
                options,
                correctAnswer,
                testCases,
                difficulty: difficulty || 'MEDIUM', // Default to MEDIUM if not provided
                tags: tags || [],
                createdById
            }
        });

        res.status(201).json(question);
    } catch (error) {
        console.error("Create Question Error:", error);
        res.status(500).json({ error: "Failed to create question" });
    }
};

// Get all questions with filtering and pagination
const getQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10, difficulty, tags, search, type } = req.query;
        const offset = (page - 1) * limit;

        const where = {
            deletedAt: null // Only active questions
        };

        if (difficulty) {
            where.difficulty = difficulty;
        }

        if (type) {
            where.type = type;
        }

        if (tags) {
            // Assuming tags is passed as comma-separated string "tag1,tag2"
            // And we want questions that have AT LEAST one of these tags? 
            // Or maybe exact match? array-contains?
            // PostgreSQL array operations in Prisma:
            // where: { tags: { hasSome: ['tag1', 'tag2'] } }

            const tagsArray = tags.split(',').map(t => t.trim());
            where.tags = { hasSome: tagsArray };
        }

        if (search) {
            where.text = { contains: search, mode: 'insensitive' };
        }

        const questions = await prisma.question.findMany({
            where,
            skip: parseInt(offset),
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { name: true, email: true } }
            }
        });

        const totalCount = await prisma.question.count({ where });

        res.json({
            questions,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: parseInt(page),
            totalCount
        });
    } catch (error) {
        console.error("Get Questions Error:", error);
        res.status(500).json({ error: "Failed to fetch questions" });
    }
};

// Get single question by ID
const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await prisma.question.findUnique({
            where: { id: parseInt(id) },
            include: {
                createdBy: { select: { name: true, email: true } }
            }
        });

        if (!question || question.deletedAt) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json(question);
    } catch (error) {
        console.error("Get Question By ID Error:", error);
        res.status(500).json({ error: "Failed to fetch question" });
    }
};

// Update question
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated manually
        delete updates.id;
        delete updates.createdAt;
        delete updates.updatedAt;
        delete updates.deletedAt;
        delete updates.createdById;

        const question = await prisma.question.update({
            where: { id: parseInt(id) },
            data: updates
        });

        res.json(question);
    } catch (error) {
        console.error("Update Question Error:", error);
        res.status(500).json({ error: "Failed to update question" });
    }
};

// Soft delete question
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.question.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });

        res.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.error("Delete Question Error:", error);
        res.status(500).json({ error: "Failed to delete question" });
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
};
