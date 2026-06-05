import { Server as SocketServer } from 'socket.io';

export function setupSocket(io: SocketServer) {
  io.on('connection', (socket) => {
    // Join exam room for live leaderboard
    socket.on('join:exam', (examId: string) => {
      socket.join(`exam:${examId}`);
    });

    socket.on('leave:exam', (examId: string) => {
      socket.leave(`exam:${examId}`);
    });

    socket.on('join:leaderboard', (examId: string) => {
      socket.join(`leaderboard:${examId}`);
    });

    socket.on('disconnect', () => {
      // cleanup handled by Socket.IO automatically
    });
  });
}

export function broadcastLeaderboardUpdate(io: SocketServer, examId: string, data: unknown) {
  io.to(`leaderboard:${examId}`).emit('leaderboard:update', data);
}
