const prisma = require("../config/prisma");
const crypto = require("crypto");

exports.createAssessment = async (req, res) => {
    try {
        const { title, description, duration, startTime, endTime } = req.body;
        const assessment = await prisma.assessment.create({
            data: {
                title,
                description,
                duration,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                hrId: req.user.id
            }
        });
        res.status(201).json(assessment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create assessment" });
    }
};

exports.getAssessments = async (req, res) => {
    try {
        const assessments = await prisma.assessment.findMany({
            where: { hrId: req.user.id },
            include: { _count: { select: { candidates: true, questions: true } } }
        });
        
        const now = new Date();
        const activeAssessments = assessments.filter(a => {
            if (a.startTime) {
                const end = new Date(a.startTime.getTime() + a.duration * 60000);
                return end > now;
            }
            return true;
        });

        res.json(activeAssessments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
};

exports.getAssessmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const assessment = await prisma.assessment.findUnique({
            where: { id: parseInt(id) },
            include: { questions: { include: { question: true } }, candidates: { include: { candidate: true } } }
        });
        res.json(assessment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch assessment" });
    }
};

exports.addQuestionsToAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const { questionIds } = req.body; 
        
        const assessment = await prisma.assessment.findUnique({ where: { id: parseInt(id) }});
        if (!assessment || assessment.hrId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        const data = questionIds.map((qId, index) => ({
            assessmentId: parseInt(id),
            questionId: qId,
            order: index + 1
        }));

        await prisma.assessmentQuestion.createMany({
            data,
            skipDuplicates: true
        });

        res.json({ message: "Questions added successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add questions" });
    }
};

exports.inviteCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        const { candidateId } = req.body;
        
        const inviteToken = crypto.randomBytes(32).toString('hex');

        const invite = await prisma.assessmentCandidate.create({
            data: {
                assessmentId: parseInt(id),
                candidateId,
                inviteToken
            }
        });

        res.json({ inviteUrl: `http://localhost:5173/oa/invite/${inviteToken}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to invite candidate" });
    }
};

exports.getInviteDetails = async (req, res) => {
    try {
        const { token } = req.params;
        const assessment = await prisma.assessment.findUnique({
            where: { shareableToken: token }
        });

        if (!assessment) return res.status(404).json({ error: "Invalid or expired link" });
        
        // Return assessment info directly from token
        res.json({
            assessmentId: assessment.id,
            assessmentTitle: assessment.title,
            duration: assessment.duration,
            startTime: assessment.startTime,
            endTime: assessment.endTime,
            status: 'INVITED' // default frontend status view
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch invite details" });
    }
};

exports.acceptInvite = async (req, res) => {
    try {
        const { token } = req.params;
        const assessment = await prisma.assessment.findUnique({ where: { shareableToken: token } });
        
        if (!assessment) return res.status(404).json({ error: "Invalid link" });

        const candidate = await prisma.assessmentCandidate.upsert({
            where: {
                assessmentId_candidateId: {
                    assessmentId: assessment.id,
                    candidateId: req.user.id
                }
            },
            update: { status: 'ACCEPTED' },
            create: {
                assessmentId: assessment.id,
                candidateId: req.user.id,
                status: 'ACCEPTED'
            }
        });

        res.json({ message: "Invite accepted", assessmentId: assessment.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to accept invite" });
    }
};

exports.getUpcomingAssessments = async (req, res) => {
    try {
        const upcoming = await prisma.assessmentCandidate.findMany({
            where: {
                candidateId: req.user.id,
                status: { not: 'COMPLETED' }
            },
            include: { assessment: true }
        });
        
        const now = new Date();
        const activeUpcoming = upcoming.filter(u => {
            const a = u.assessment;
            if (a.startTime) {
                const end = new Date(a.startTime.getTime() + a.duration * 60000);
                return end > now;
            }
            return true;
        });

        res.json(activeUpcoming);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch upcoming assessments" });
    }
};

exports.startAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const invite = await prisma.assessmentCandidate.findUnique({
            where: { assessmentId_candidateId: { assessmentId: parseInt(id), candidateId: req.user.id } }
        });

        if (!invite || (invite.status !== 'ACCEPTED' && invite.status !== 'IN_PROGRESS')) {
            return res.status(400).json({ error: "Cannot start or resume assessment" });
        }

        const assessment = await prisma.assessment.findUnique({ where: { id: parseInt(id) } });

        let remainingSeconds = assessment.duration * 60;
        let actualStart = invite.startedAt || new Date();

        // Strict timer logic based on fixed schedule
        if (assessment.startTime) {
            const now = new Date();
            const start = new Date(assessment.startTime);
            const diffSeconds = Math.floor((now - start) / 1000);
            
            if (diffSeconds < 0) {
                return res.status(403).json({ 
                    error: "Assessment has not started yet",
                    isEarly: true,
                    startTime: assessment.startTime
                });
            }
            
            remainingSeconds = (assessment.duration * 60) - diffSeconds;
            
            if (remainingSeconds <= 0) {
                return res.status(400).json({ error: "Assessment time has expired" });
            }
            if (invite.status === 'ACCEPTED') actualStart = now;
        } else if (invite.status === 'IN_PROGRESS') {
            // For flexible assessments, calculate remaining time based on when they actually started
            const diffSeconds = Math.floor((new Date() - invite.startedAt) / 1000);
            remainingSeconds = (assessment.duration * 60) - diffSeconds;
            if (remainingSeconds <= 0) {
                return res.status(400).json({ error: "Assessment time has expired" });
            }
        }

        const updated = await prisma.assessmentCandidate.update({
            where: { id: invite.id },
            data: { status: 'IN_PROGRESS', startedAt: actualStart }
        });

        const questions = await prisma.assessmentQuestion.findMany({
            where: { assessmentId: parseInt(id) },
            include: { question: true }
        });

        res.json({ startedAt: updated.startedAt, duration: remainingSeconds, questions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to start assessment" });
    }
};

exports.submitAnswer = async (req, res) => {
    try {
        const { id } = req.params; 
        const { questionId, answer } = req.body;

        const invite = await prisma.assessmentCandidate.findUnique({
            where: { assessmentId_candidateId: { assessmentId: parseInt(id), candidateId: req.user.id } }
        });

        if (!invite || invite.status !== 'IN_PROGRESS') return res.status(400).json({ error: "Assessment not in progress" });

        await prisma.assessmentAnswer.upsert({
            where: { assessmentCandidateId_questionId: { assessmentCandidateId: invite.id, questionId } },
            update: { candidateAnswer: answer, submittedAt: new Date() },
            create: { assessmentCandidateId: invite.id, questionId, candidateAnswer: answer, submittedAt: new Date() }
        });

        res.json({ message: "Answer saved" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to submit answer" });
    }
};

exports.finishAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invite = await prisma.assessmentCandidate.findUnique({
            where: { assessmentId_candidateId: { assessmentId: parseInt(id), candidateId: req.user.id } }
        });

        if (!invite) return res.status(404).json({ error: "Assessment not found" });

        await prisma.assessmentCandidate.update({
            where: { id: invite.id },
            data: { status: 'COMPLETED', completedAt: new Date() }
        });

        res.json({ message: "Assessment completed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to finish assessment" });
    }
};
