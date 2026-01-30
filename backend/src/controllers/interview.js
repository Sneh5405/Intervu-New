const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create Interview (By Email)
const createInterview = async (req, res) => {
    try {
        const { startTime, endTime, hrId, interviewerEmail, candidateEmail, type } = req.body;

        if (!startTime || !endTime || !hrId || !interviewerEmail || !candidateEmail) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const hr = await prisma.user.findUnique({ where: { id: hrId } });
        const interviewer = await prisma.user.findUnique({ where: { email: interviewerEmail } });
        const interviewee = await prisma.user.findUnique({ where: { email: candidateEmail } });

        if (!hr || hr.role !== 'HR') return res.status(400).json({ error: "Invalid HR ID" });
        if (!interviewer) return res.status(404).json({ error: `Interviewer not found: ${interviewerEmail}` });
        if (!interviewee) return res.status(404).json({ error: `Candidate not found: ${candidateEmail}` });

        const interview = await prisma.interview.create({
            data: {
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                hrId,
                interviewerId: interviewer.id,
                intervieweeId: interviewee.id,
                status: 'PENDING'
            }
        });

        // Send Emails (TODO: Integrate with Email Service)
        // console.log(`Sending invites to ${interviewerEmail} and ${candidateEmail}`);

        res.status(201).json(interview);
    } catch (error) {
        console.error("Create Interview Error:", error);
        res.status(500).json({ error: "Failed to create interview" });
    }
};

// Get All Interviews (with Filtering)
const getAllInterviews = async (req, res) => {
    try {
        const { role, id } = req.user;
        const where = { deletedAt: null }; // Soft delete filter

        if (role === 'INTERVIEWER') {
            where.interviewerId = id;
        } else if (role === 'INTERVIEWEE') {
            where.intervieweeId = id;
        }
        // HR sees all (subject to deletedAt)

        const interviews = await prisma.interview.findMany({
            where,
            include: {
                hr: { select: { name: true, email: true } },
                interviewer: { select: { name: true, email: true } },
                interviewee: { select: { name: true, email: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        res.json(interviews);
    } catch (error) {
        console.error("Get Interviews Error:", error);
        res.status(500).json({ error: "Failed to fetch interviews" });
    }
};

// Get Single Interview
const getInterviewById = async (req, res) => {
    try {
        const { id } = req.params;
        const interview = await prisma.interview.findUnique({
            where: { id: parseInt(id) },
            include: {
                hr: { select: { name: true, email: true } },
                interviewer: { select: { name: true, email: true } },
                interviewee: { select: { name: true, email: true } },
                questions: {
                    include: {
                        question: true
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!interview || interview.deletedAt) {
            return res.status(404).json({ error: "Interview not found" });
        }

        // Ownership check is nominally handled by middleware, but good to be safe/granular here?
        // Middleware `checkOwnership` with model 'interview' checks if user owns it.
        // But interview has 3 owners (hr, interviewer, interviewee).
        // Our generic middleware might be too simple for this if it only checks one field.
        // Actually, we should probably rely on this controller logic or custom middleware for multi-owner.
        // Let's implement specific check here for now.

        const { role, id: userId } = req.user;
        if (role !== 'HR' && interview.interviewerId !== userId && interview.intervieweeId !== userId) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch interview" });
    }
};

// Update Interview
const updateInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { role } = req.user;

        // Prevent updating immutable fields or ID/Relations if not HR?
        // For now, allow HR to update everything.
        // Interviewer can only update status.

        if (role === 'INTERVIEWER') {
            // Can only update status or feedback?
            // Let's restrict to status for now.
            if (updates.status) {
                await prisma.interview.update({
                    where: { id: parseInt(id) },
                    data: { status: updates.status }
                });
                return res.json({ message: "Status updated" });
            }
            return res.status(403).json({ error: "Interviewers can only update status" });
        }

        if (role !== 'HR') {
            return res.status(403).json({ error: "Only HR can edit interview details" });
        }

        const interview = await prisma.interview.update({
            where: { id: parseInt(id) },
            data: updates
        });

        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: "Failed to update interview" });
    }
};

// Soft Delete Interview
const deleteInterview = async (req, res) => {
    try {
        const { id } = req.params;
        // Only HR. Middleware should cover this check but double check.

        await prisma.interview.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });

        res.json({ message: "Interview deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete interview" });
    }
};

// Save Candidate Answer
const saveAnswer = async (req, res) => {
    try {
        const { id } = req.params; // Interview ID
        const { questionId, answer } = req.body;
        const candidateId = req.user.id;

        // Verify candidate belongs to interview? 
        // Middleware checks if user has access to interview, but let's ensure it's the interviewee modifying.
        const interview = await prisma.interview.findUnique({ where: { id: parseInt(id) } });
        if (!interview) return res.status(404).json({ error: "Interview not found" });

        if (interview.intervieweeId !== candidateId && req.user.role !== 'INTERVIEWER' && req.user.role !== 'HR') {
            // Allow Interviewer/HR to dry run or modify if needed? For now strict.
            // Actually, maybe Interviewer wants to save notes? 
            // Schema has 'feedback' for notes. 'candidateAnswer' is for candidate.
            // Only candidate should write to candidateAnswer nominally.
            if (interview.intervieweeId !== candidateId) {
                return res.status(403).json({ error: "Only candidate can submit answers" });
            }
        }

        // Upsert logic for InterviewQuestion
        // We need to find the specific connection.
        // Assuming the question is already assigned.

        // Check if assigned?
        const existing = await prisma.interviewQuestion.findUnique({
            where: {
                interviewId_questionId: {
                    interviewId: parseInt(id),
                    questionId: parseInt(questionId)
                }
            }
        });

        if (!existing) {
            // If not assigned, maybe auto-assign? Or error?
            // Error to be safe.
            return res.status(404).json({ error: "Question not assigned to this interview" });
        }

        const updated = await prisma.interviewQuestion.update({
            where: {
                interviewId_questionId: {
                    interviewId: parseInt(id),
                    questionId: parseInt(questionId)
                }
            },
            data: {
                candidateAnswer: answer,
                submittedAt: new Date() // Updates every save? Or only on explicit submit? 
                // For auto-save, maybe we don't update submittedAt? 
                // Let's say submittedAt is last activity time.
            }
        });

        res.json(updated);
    } catch (error) {
        console.error("Save Answer Error:", error);
        res.status(500).json({ error: "Failed to save answer" });
    }
};

// Accept Interview Invite
const acceptInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const interview = await prisma.interview.findUnique({
            where: { id: parseInt(id) }
        });

        if (!interview) return res.status(404).json({ error: "Interview not found" });

        let updateData = {};

        if (interview.interviewerId === userId) {
            updateData.interviewerAccepted = true;
        } else if (interview.intervieweeId === userId) {
            updateData.intervieweeAccepted = true;
        } else {
            return res.status(403).json({ error: "You are not a participant in this interview" });
        }

        // Check if logic needs to flip status
        // We need to fetch the *updated* state or assume current state + change
        // Safest is to update and check result, or check current + change
        const isInterviewerDone = updateData.interviewerAccepted || interview.interviewerAccepted;
        const isCandidateDone = updateData.intervieweeAccepted || interview.intervieweeAccepted;

        if (isInterviewerDone && isCandidateDone) {
            updateData.status = 'SCHEDULED';
        }

        const updatedInterview = await prisma.interview.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(updatedInterview);
    } catch (error) {
        console.error("Accept Interview Error:", error);
        res.status(500).json({ error: "Failed to accept interview" });
    }
};

const createNextRound = async (req, res) => {
    try {
        const { id } = req.params;

        const currentInterview = await prisma.interview.findUnique({
            where: { id: parseInt(id) }
        });

        if (!currentInterview) return res.status(404).json({ error: "Interview not found" });

        // Logic: Clone participants, new time (default 1 hr from now?), increment round.
        // Or maybe user provides new time in body?
        const { startTime, endTime } = req.body; // Optional new times

        const nextRoundNumber = (currentInterview.round || 1) + 1;

        // Default time: Next day same time? Or 1 hour later?
        // Let's require time or default to 24h later.
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() + 1);
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setHours(defaultEnd.getHours() + 1);

        const nextRound = await prisma.interview.create({
            data: {
                hrId: currentInterview.hrId,
                interviewerId: currentInterview.interviewerId, // Keep same interviewer by default?
                intervieweeId: currentInterview.intervieweeId,
                startTime: startTime ? new Date(startTime) : defaultStart,
                endTime: endTime ? new Date(endTime) : defaultEnd,
                status: 'PENDING', // Next round starts pending acceptance? Or auto-scheduled? Let's say pending.
                round: nextRoundNumber,
                meetLink: currentInterview.meetLink,
                interviewerAccepted: false,
                intervieweeAccepted: false
            }
        });

        // Update current interview status?
        await prisma.interview.update({
            where: { id: parseInt(id) },
            data: { status: 'MOVED_TO_NEXT_ROUND' }
        });

        res.status(201).json(nextRound);
    } catch (error) {
        console.error("Create Next Round Error:", error);
        res.status(500).json({ error: "Failed to create next round" });
    }
};

module.exports = {
    createInterview,
    getAllInterviews,
    getInterviewById,
    updateInterview,
    deleteInterview,
    saveAnswer,
    createNextRound,
    acceptInterview
};
