import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { token, user } = useAuth();

    useEffect(() => {
        if (token && user) {
            // Initialize socket connection
            const newSocket = io('http://localhost:3000', { // Ensure this matches backend URL
                auth: {
                    token: token
                }
            });

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            // Cleanup if logged out
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
