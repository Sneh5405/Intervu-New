import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import Button from '../ui/Button';

const VideoChat = ({ interviewId, isInterviewer }) => {
    const socket = useSocket();
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
        ],
    };

    useEffect(() => {
        const startCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // If joining, tell others we are ready?
                // Actually socket logic handles signaling.
            } catch (error) {
                console.error("Error accessing media devices:", error);
                alert("Could not access camera/microphone.");
            }
        };

        startCall();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (!socket || !localStream) return;

        // Socket Event Listeners
        socket.on('user-connected', async (userId) => {
            console.log("Peer connected, initiating offer...");
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            // Add local tracks
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            // Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('offer', { roomId: interviewId, offer });
        });

        socket.on('offer', async ({ offer, userId }) => {
            console.log("Received offer from", userId);
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            // Add local tracks
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer', { roomId: interviewId, answer });
        });

        socket.on('answer', async ({ answer }) => {
            console.log("Received answer");
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('ice-candidate', async ({ candidate }) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        });

        socket.on('force-disconnect', (reason) => {
            alert(`Disconnected: ${reason}`);
            // Force reload or redirect
            window.location.reload();
        });

        return () => {
            socket.off('user-connected');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('force-disconnect');
        };

    }, [socket, localStream, interviewId]);

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { roomId: interviewId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            console.log("Received remote track");
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        return pc;
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        window.location.reload(); // Simple way to reset state/view
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700 shadow-2xl w-64 md:w-80">
            {/* Header / Role Badge */}
            <div className="flex justify-between items-center px-1 mb-1">
                <span className="text-xs font-semibold text-slate-400">
                    {isInterviewer ? 'Candidate View' : 'Interviewer View'}
                </span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Connected"></div>
            </div>

            {/* Remote Video (Main) */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
                {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                        Waiting for peer...
                    </div>
                )}

                {/* Local Video (PiP) */}
                <div className="absolute bottom-2 right-2 w-20 aspect-video bg-slate-800 rounded border border-slate-600 overflow-hidden shadow-lg">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-2">
                <button
                    onClick={toggleMute}
                    className={`p-2 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? "🔇" : "🎤"}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white transition-colors`}
                    title={isVideoOff ? "Start Video" : "Stop Video"}
                >
                    {isVideoOff ? "📷" : "📸"}
                </button>
                <button
                    onClick={endCall}
                    className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="End Call"
                >
                    📞
                </button>
            </div>
        </div>
    );
};

export default VideoChat;
