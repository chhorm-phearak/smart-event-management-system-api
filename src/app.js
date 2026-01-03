const express = require('express');
const cors = require('cors');
const authRoutes = require('./router/authRoutes');
const eventRoutes = require('./router/eventRoutes');
const groupRoutes = require('./router/groupRoutes');

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management System API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/groups', groupRoutes);

module.exports = app;



