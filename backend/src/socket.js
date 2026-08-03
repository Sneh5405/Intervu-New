const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const Y = require("yjs");

let io;

const prisma = require('./config/prisma');

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Replace with specific frontend URL in production
            methods: ["GET", "POST"]
        }
    });

    const activeSessions = new Map(); // userId -> socketId
    const roomYDocs = new Map(); // key: `${roomId}_${questionId}` -> Y.Doc
    const saveTimeouts = new Map(); // key: `${roomId}_${questionId}` -> setTimeout ID

    const getOrCreateYDoc = async (roomId, questionId) => {
        const key = `${roomId}_${questionId}`;
        if (roomYDocs.has(key)) {
            return roomYDocs.get(key);
        }

        const ydoc = new Y.Doc();
        const ytext = ydoc.getText('codex');

        // Populate initial content from database if available
        try {
            const interviewIdInt = parseInt(roomId);
            const questionIdInt = parseInt(questionId);
            if (!isNaN(interviewIdInt) && !isNaN(questionIdInt)) {
                const iq = await prisma.interviewQuestion.findUnique({
                    where: {
                        interviewId_questionId: {
                            interviewId: interviewIdInt,
                            questionId: questionIdInt
                        }
                    }
                });
                if (iq && iq.candidateAnswer) {
                    ytext.insert(0, iq.candidateAnswer);
                }
            }
        } catch (err) {
            console.error("Error initializing YDoc from DB:", err);
        }

        roomYDocs.set(key, ydoc);
        return ydoc;
    };

    const scheduleDBSave = (roomId, questionId, textContent) => {
        const key = `${roomId}_${questionId}`;
        if (saveTimeouts.has(key)) {
            clearTimeout(saveTimeouts.get(key));
        }

        const timeoutId = setTimeout(async () => {
            try {
                const interviewIdInt = parseInt(roomId);
                const questionIdInt = parseInt(questionId);
                if (!isNaN(interviewIdInt) && !isNaN(questionIdInt)) {
                    await prisma.interviewQuestion.update({
                        where: {
                            interviewId_questionId: {
                                interviewId: interviewIdInt,
                                questionId: questionIdInt
                            }
                        },
                        data: {
                            candidateAnswer: textContent,
                            submittedAt: new Date()
                        }
                    });
                    console.log(`Saved CRDT document state to DB for room ${roomId}, question ${questionId}`);
                }
            } catch (err) {
                console.error("Failed to persist CRDT state to DB:", err);
            } finally {
                saveTimeouts.delete(key);
            }
        }, 3000); // 3-second debounce

        saveTimeouts.set(key, timeoutId);
    };

    // Authentication Middleware
    io.use((socket, next) => {
        let token = socket.handshake.auth.token;

        // If not in auth payload, parse from handshake headers cookies
        if (!token && socket.handshake.headers.cookie) {
            const rawCookies = socket.handshake.headers.cookie;
            const cookies = {};
            rawCookies.split(';').forEach(c => {
                const [name, ...val] = c.split('=');
                if (name) {
                    cookies[name.trim()] = val.join('=').trim();
                }
            });
            token = cookies.accessToken;
        }

        if (!token) {
            return next(new Error("Authentication error"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            socket.user = decoded; // Attach user info to socket
            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.id} (${socket.user.role})`);

        // Join Interview Room
        socket.on("join-room", async (interviewId) => {
            const userId = socket.user.id;
            const interviewIdInt = parseInt(interviewId);

            // 1. Validation: Verify Access
            try {
                const interview = await prisma.interview.findUnique({
                    where: { id: interviewIdInt }
                });

                if (!interview) {
                    socket.emit("error", "Interview not found");
                    return;
                }

                // Check participation
                const isParticipant =
                    interview.hrId === userId ||
                    interview.interviewerId === userId ||
                    interview.intervieweeId === userId;

                if (!isParticipant) {
                    socket.emit("error", "Access denied");
                    return;
                }

                // 2. Single Session Enforcement
                if (activeSessions.has(userId)) {
                    const oldSocketId = activeSessions.get(userId);
                    if (oldSocketId !== socket.id) {
                        const oldSocket = io.sockets.sockets.get(oldSocketId);
                        if (oldSocket) {
                            oldSocket.emit("force-disconnect", "New login detected");
                            oldSocket.disconnect();
                        }
                    }
                }
                activeSessions.set(userId, socket.id);

                // 3. Join Room
                socket.join(interviewId);
                socket.roomId = interviewId; // Track room ID on the socket for cleanup on disconnect
                console.log(`User ${userId} joined room ${interviewId}`);

                // 4. Session Tracking (DB)
                try {
                    const session = await prisma.interviewSession.create({
                        data: {
                            interviewId: interviewIdInt,
                            userId: userId,
                        }
                    });
                    socket.sessionId = session.id;
                } catch (dbErr) {
                    console.error("Failed to track session", dbErr);
                }

                // Notify others
                socket.to(interviewId).emit("user-connected", userId);

            } catch (err) {
                console.error("Join room error", err);
                socket.emit("error", "Internal server error");
            }
        });

        // CRDT Sync Request (Initial State Fetch)
        socket.on("crdt-sync", async ({ roomId, questionId }) => {
            if (!roomId || !questionId) return;
            const ydoc = await getOrCreateYDoc(roomId, questionId);
            const stateVector = Y.encodeStateAsUpdate(ydoc);
            socket.emit("crdt-init", {
                roomId,
                questionId,
                update: Array.from(stateVector),
                content: ydoc.getText('codex').toString()
            });
        });

        // CRDT Delta Update (Live Editing Event)
        socket.on("crdt-update", async ({ roomId, questionId, update }) => {
            if (!roomId || !questionId || !update) return;

            try {
                const ydoc = await getOrCreateYDoc(roomId, questionId);
                const updateBuffer = new Uint8Array(update);
                Y.applyUpdate(ydoc, updateBuffer);

                // Broadcast binary update to all other room members
                socket.to(roomId).emit("crdt-update", {
                    roomId,
                    questionId,
                    update: Array.from(updateBuffer),
                    senderId: socket.user.id
                });

                // Debounce saving text representation to Postgres DB
                const currentText = ydoc.getText('codex').toString();
                scheduleDBSave(roomId, questionId, currentText);
            } catch (err) {
                console.error("CRDT update error:", err);
            }
        });

        // WebRTC Signaling Events
        socket.on("offer", ({ roomId, offer }) => {
            socket.to(roomId).emit("offer", { offer, userId: socket.user.id });
        });

        socket.on("answer", ({ roomId, answer }) => {
            socket.to(roomId).emit("answer", { answer, userId: socket.user.id });
        });

        socket.on("ice-candidate", ({ roomId, candidate }) => {
            socket.to(roomId).emit("ice-candidate", { candidate, userId: socket.user.id });
        });

        socket.on("disconnect", async () => {
            const userId = socket.user.id;
            console.log(`User disconnected: ${userId}`);

            if (activeSessions.get(userId) === socket.id) {
                activeSessions.delete(userId);
            }

            // Broadcast user disconnection to the room
            if (socket.roomId) {
                socket.to(socket.roomId).emit("user-disconnected", userId);
            }

            // Update Session in DB
            if (socket.sessionId) {
                try {
                    await prisma.interviewSession.update({
                        where: { id: socket.sessionId },
                        data: { leftAt: new Date() }
                    });
                } catch (e) {
                    console.error("Failed to update session leave time", e);
                }
            }
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIo };

