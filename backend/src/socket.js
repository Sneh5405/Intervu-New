const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Replace with specific frontend URL in production
            methods: ["GET", "POST"]
        }
    });

    const activeSessions = new Map(); // userId -> socketId

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
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
            // Broadcast to all rooms this socket was part of? 
            // Ideally we track which room they were in or loop through simple rooms.
            // For now, simpler approach: client handles peer disconnection via ICE state.
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
