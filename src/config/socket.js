const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { findById } = require('../repository/userRepository');
const { isTokenBlacklisted } = require('../controllers/authController');

let io = null;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      ],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      if (isTokenBlacklisted(token)) {
        return next(new Error('Token has been revoked'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const user = await findById(decoded.sub);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.user = { id: user.id, email: user.email, role_id: user.role_id };
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token has expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.user.email})`);
    
    // Join user to their personal room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Handle joining organization rooms
    socket.on('join:organization', (organizationId) => {
      socket.join(`organization:${organizationId}`);
      console.log(`User ${socket.user.id} joined organization:${organizationId}`);
    });

    // Handle leaving organization rooms
    socket.on('leave:organization', (organizationId) => {
      socket.leave(`organization:${organizationId}`);
      console.log(`User ${socket.user.id} left organization:${organizationId}`);
    });

    // Handle joining event rooms
    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`User ${socket.user.id} joined event:${eventId}`);
    });

    // Handle leaving event rooms
    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
      console.log(`User ${socket.user.id} left event:${eventId}`);
    });

    // Handle joining group rooms
    socket.on('join:group', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.user.id} joined group:${groupId}`);
    });

    // Handle leaving group rooms
    socket.on('leave:group', (groupId) => {
      socket.leave(`group:${groupId}`);
      console.log(`User ${socket.user.id} left group:${groupId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user.id} - Reason: ${reason}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

// Emit notification to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit notification to organization members
const emitToOrganization = (organizationId, event, data) => {
  if (io) {
    io.to(`organization:${organizationId}`).emit(event, data);
  }
};

// Emit notification to event participants
const emitToEvent = (eventId, event, data) => {
  if (io) {
    io.to(`event:${eventId}`).emit(event, data);
  }
};

// Emit notification to group members
const emitToGroup = (groupId, event, data) => {
  if (io) {
    io.to(`group:${groupId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToOrganization,
  emitToEvent,
  emitToGroup
};
