const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Replace with specific frontend URL in production
            methods: ["GET", "POST"]
        }
    });

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
        socket.on("join-room", (interviewId) => {
            socket.join(interviewId);
            console.log(`User ${socket.user.id} joined room ${interviewId}`);

            // Notify others in the room
            socket.to(interviewId).emit("user-connected", socket.user.id);
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

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user.id}`);
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
