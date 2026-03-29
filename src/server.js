require("dotenv").config(); 
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./config/socket');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO is ready for real-time connections`);
});