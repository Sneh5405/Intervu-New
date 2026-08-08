const prisma = require("../config/prisma");
const crypto = require("crypto");
const cache = require("../utils/cache");
const { runInSandbox } = require("../services/sandbox");

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
        await cache.del(`assessments:hr:${req.user.id}`);
        res.status(201).json(assessment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create assessment" });
    }
};

exports.getAssessments = async (req, res) => {
    try {
        const cacheKey = `assessments:hr:${req.user.id}`;
        const cachedAssessments = await cache.get(cacheKey);
        if (cachedAssessments) {
            return res.json(cachedAssessments);
        }

        const assessments = await prisma.assessment.findMany({
            where: { hrId: req.user.id },
            include: { _count: { select: { candidates: true, questions: true } } },
            orderBy: { createdAt: 'desc' }
        });

        await cache.set(cacheKey, assessments, 300);

        res.json(assessments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
};

exports.getAssessmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `assessment:id:${id}`;
        const cachedAssessment = await cache.get(cacheKey);
        if (cachedAssessment) {
            return res.json(cachedAssessment);
        }

        const assessment = await prisma.assessment.findUnique({
            where: { id: parseInt(id) },
            include: { questions: { include: { question: true } }, candidates: { include: { candidate: true } } }
        });

        if (assessment) {
            await cache.set(cacheKey, assessment, 300);
        }

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

        // Check ownership of all questions being added
        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds.map(qId => parseInt(qId)) } }
        });

        const unowned = questions.some(q => q.createdById !== req.user.id);
        if (unowned || questions.length !== questionIds.length) {
            return res.status(403).json({ error: "Forbidden: You can only add questions created by you" });
        }

        const data = questionIds.map((qId, index) => ({
            assessmentId: parseInt(id),
            questionId: qId,
            order: index + 1
        }));

        await prisma.assessmentQuestion.createMany({
            data,
            skipDuplicates: true
        });

        await cache.del(`assessment:id:${id}`);
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

        await cache.del(`assessment:id:${id}`);
        await cache.del(`assessments:candidate:${candidateId}`);

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
        
        let status = 'INVITED';

        // Check if user is authenticated (optional auth)
        const authHeader = req.headers['authorization'];
        let authToken = authHeader && authHeader.split(' ')[1];
        if (!authToken && req.cookies) {
            authToken = req.cookies.accessToken;
        }
        if (authToken) {
            try {
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(authToken, process.env.JWT_ACCESS_SECRET);
                if (decoded && decoded.id) {
                    const candidate = await prisma.assessmentCandidate.findUnique({
                        where: {
                            assessmentId_candidateId: {
                                assessmentId: assessment.id,
                                candidateId: decoded.id
                            }
                        }
                    });
                    if (candidate) {
                        status = candidate.status;
                    }
                }
            } catch (jwtError) {
                // Ignore JWT errors and treat as guest/invited
            }
        }
        
        // Return assessment info directly from token
        res.json({
            assessmentId: assessment.id,
            assessmentTitle: assessment.title,
            duration: assessment.duration,
            startTime: assessment.startTime,
            endTime: assessment.endTime,
            status: status
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

        await cache.del(`assessment:id:${assessment.id}`);
        await cache.del(`assessments:candidate:${req.user.id}`);

        res.json({ message: "Invite accepted", assessmentId: assessment.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to accept invite" });
    }
};

exports.getUpcomingAssessments = async (req, res) => {
    try {
        const cacheKey = `assessments:candidate:${req.user.id}`;
        const cachedUpcoming = await cache.get(cacheKey);
        if (cachedUpcoming) {
            return res.json(cachedUpcoming);
        }

        const upcoming = await prisma.assessmentCandidate.findMany({
            where: {
                candidateId: req.user.id
            },
            include: { assessment: true },
            orderBy: { createdAt: 'desc' }
        });

        await cache.set(cacheKey, upcoming, 300);

        res.json(upcoming);
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

        if (!invite) {
            return res.status(404).json({ error: "Assessment candidate not found" });
        }

        if (invite.status === 'CHEATED') {
            return res.status(403).json({ error: "You have been disqualified from this assessment due to cheating detected.", cheated: true });
        }

        if (invite.status !== 'ACCEPTED' && invite.status !== 'IN_PROGRESS') {
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

        await cache.del(`assessment:id:${id}`);
        await cache.del(`assessments:candidate:${req.user.id}`);

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
        const assessmentId = parseInt(id);
        
        const invite = await prisma.assessmentCandidate.findUnique({
            where: { assessmentId_candidateId: { assessmentId, candidateId: req.user.id } },
            include: { answers: true }
        });

        if (!invite) return res.status(404).json({ error: "Assessment not found" });

        const assessmentQuestions = await prisma.assessmentQuestion.findMany({
            where: { assessmentId },
            include: { question: true }
        });

        let totalScore = 0;
        const answerMap = new Map();
        invite.answers.forEach(ans => answerMap.set(ans.questionId, ans));

        for (const aq of assessmentQuestions) {
            const q = aq.question;
            const maxPoints = aq.points || 10;
            const candidateAnsRecord = answerMap.get(q.id);
            const rawAns = candidateAnsRecord?.candidateAnswer ? candidateAnsRecord.candidateAnswer.trim() : "";
            let qScore = 0;

            if (rawAns) {
                if (q.type === 'MCQ') {
                    if (q.correctAnswer && rawAns.toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
                        qScore = maxPoints;
                    }
                } else if (q.type === 'CODE') {
                    const testCases = q.testCases;
                    if (Array.isArray(testCases) && testCases.length > 0) {
                        let passedCases = 0;
                        let lang = 'javascript';
                        if (rawAns.includes('def ') || rawAns.includes('import ') || rawAns.includes('print(')) {
                            lang = 'python';
                        }
                        
                        for (const tc of testCases) {
                            const input = tc.input || "";
                            const expected = (tc.output || tc.expectedOutput || "").trim();
                            const { error, stdout } = await runInSandbox(rawAns, lang, input);
                            if (!error && (stdout || "").trim() === expected) {
                                passedCases++;
                            }
                        }

                        qScore = (passedCases / testCases.length) * maxPoints;
                    }
                } else if (q.type === 'SCENARIO') {
                    if (q.correctAnswer && rawAns.toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
                        qScore = maxPoints;
                    }
                }
            }

            if (candidateAnsRecord) {
                await prisma.assessmentAnswer.update({
                    where: { id: candidateAnsRecord.id },
                    data: { score: qScore }
                });
            }

            totalScore += qScore;
        }

        const finalScore = Math.round(totalScore * 100) / 100;

        await prisma.assessmentCandidate.update({
            where: { id: invite.id },
            data: { 
                status: 'COMPLETED', 
                score: finalScore, 
                completedAt: new Date() 
            }
        });

        await cache.del(`assessment:id:${id}`);
        await cache.del(`assessments:candidate:${req.user.id}`);

        res.json({ message: "Assessment completed", score: finalScore });
    } catch (error) {
        console.error("Finish Assessment Error:", error);
        res.status(500).json({ error: "Failed to finish assessment" });
    }
};

exports.markCheated = async (req, res) => {
    try {
        const { id } = req.params;
        const invite = await prisma.assessmentCandidate.findUnique({
            where: { assessmentId_candidateId: { assessmentId: parseInt(id), candidateId: req.user.id } }
        });

        if (!invite) return res.status(404).json({ error: "Assessment candidate not found" });

        await prisma.assessmentCandidate.update({
            where: { id: invite.id },
            data: { status: 'CHEATED', completedAt: new Date() }
        });

        await cache.del(`assessment:id:${id}`);
        await cache.del(`assessments:candidate:${req.user.id}`);

        res.json({ message: "Disqualified due to cheating detected" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to process security flag" });
    }
};
