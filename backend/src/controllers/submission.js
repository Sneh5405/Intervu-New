const prisma = require("../config/prisma");
const { addCodeExecutionJob } = require("../services/queue");
const { runInSandbox } = require("../services/sandbox");

const submitCodeForExecution = async (req, res) => {
    const { code, language, input, questionId } = req.body;
    // user ID can come from JWT
    const userId = req.user.id; 

    try {
        // 1. Create a submission in Database
        const submission = await prisma.submission.create({
            data: {
                code,
                language,
                status: "PENDING",
                userId,
                ...(questionId && { questionId })
            }
        });

        // 2. Add it to our Redis Worker Queue
        await addCodeExecutionJob(submission.id, code, language, input || "");

        // 3. Immediately respond with Pending status
        res.status(202).json({ 
            message: "Submission queued successfully", 
            submissionId: submission.id,
            status: "PENDING"
        });
    } catch (err) {
        console.error("Submission API Error:", err);
        res.status(500).json({ error: "Failed to submit code" });
    }
};

const getSubmissionResult = async (req, res) => {
    const { id } = req.params;

    try {
        const submission = await prisma.submission.findUnique({
            where: { id: parseInt(id, 10) }
        });

        if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
        }

        res.status(200).json({ submission });
    } catch (err) {
        console.error("Submission Search Error:", err);
        res.status(500).json({ error: "Failed to fetch submission details" });
    }
};

const submitBatchCodeForExecution = async (req, res) => {
    const { code, language, testCases, questionId } = req.body;
    const userId = req.user.id;

    if (!code || !language || !Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({ error: "Code, language, and non-empty testCases array are required" });
    }

    try {
        const results = [];
        let passedCount = 0;

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const input = tc.input || "";
            const expectedOutput = (tc.output || tc.expectedOutput || "").trim();

            const startTime = Date.now();
            const { error, stdout, stderr } = await runInSandbox(code, language, input);
            const duration = (Date.now() - startTime) / 1000;

            let status = "COMPLETED";
            let actualOutput = (stdout || "").trim();

            if (error) {
                if (error.killed) {
                    status = "TIMEOUT";
                    actualOutput = (stderr || "").trim() || `Execution timed out after ${duration}s`;
                } else {
                    status = "FAILED";
                    actualOutput = (stderr || "").trim() || error.message || "Runtime Error";
                }
            } else if (stderr && stderr.trim()) {
                actualOutput = actualOutput ? `${actualOutput}\n${stderr.trim()}` : stderr.trim();
            }

            const passed = status === "COMPLETED" && actualOutput === expectedOutput;
            if (passed) passedCount++;

            results.push({
                testCaseIndex: i + 1,
                input,
                expectedOutput,
                actualOutput,
                passed,
                status,
                executionTime: duration
            });
        }

        await prisma.submission.create({
            data: {
                code,
                language,
                status: passedCount === testCases.length ? "COMPLETED" : "FAILED",
                output: `Passed ${passedCount}/${testCases.length} test cases`,
                userId,
                ...(questionId && { questionId: parseInt(questionId, 10) })
            }
        });

        res.status(200).json({
            results,
            passedCount,
            totalCount: testCases.length,
            allPassed: passedCount === testCases.length
        });
    } catch (err) {
        console.error("Batch Submission API Error:", err);
        res.status(500).json({ error: "Failed to process batch submission" });
    }
};

module.exports = {
    submitCodeForExecution,
    getSubmissionResult,
    submitBatchCodeForExecution
};

