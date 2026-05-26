import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true }
  });

  console.log('[Socket] Initialized ✅'); 
  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('join-show', (showId) => {
      socket.join(showId);
      console.log(`[Socket] ${socket.id} joined show: ${showId}`);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => io;