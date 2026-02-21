const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./router/authRoutes');
const eventRoutes = require('./router/eventRoutes');
const groupRoutes = require('./router/groupRoutes');
const organizationRoutes = require('./router/organizationRoutes');
const uploadRoutes = require('./router/uploadRoutes');

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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management System API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, _req, res, next) => {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Each image must be smaller than 5MB' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err && err.message === 'Only jpeg, png, and webp image uploads are allowed') {
    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

module.exports = app;



