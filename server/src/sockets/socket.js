let ioInstance;

export const initSocket = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('session:join', ({ userId, companyId }) => {
      if (userId) socket.join(`user:${userId}`);
      if (companyId) socket.join(`company:${companyId}`);
    });
  });
};

export const getIo = () => ioInstance;
