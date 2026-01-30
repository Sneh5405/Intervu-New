const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const validateTimeWindow = async (req, res, next) => {
    try {
        const { id } = req.params; // Interview ID
        const interview = await prisma.interview.findUnique({
            where: { id: parseInt(id) }
        });

        if (!interview) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const now = new Date();
        const startTime = new Date(interview.startTime);
        const endTime = new Date(interview.endTime);

        // Allow 30 mins buffer before and after
        const bufferMs = 30 * 60 * 1000;

        if (now < new Date(startTime.getTime() - bufferMs)) {
            return res.status(403).json({ error: "Interview has not started yet" });
        }

        if (now > new Date(endTime.getTime() + bufferMs)) {
            return res.status(403).json({ error: "Interview has finished" });
        }

        req.interview = interview; // Attach for downstream use
        next();
    } catch (error) {
        console.error("Time Window Validation Error:", error);
        res.status(500).json({ error: "Failed to validate time window" });
    }
};

module.exports = validateTimeWindow;
