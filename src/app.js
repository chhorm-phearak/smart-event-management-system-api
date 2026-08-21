const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./router/authRoutes');
const eventRoutes = require('./router/eventRoutes');
const groupRoutes = require('./router/groupRoutes');
const organizationRoutes = require('./router/organizationRoutes');
const uploadRoutes = require('./router/uploadRoutes');
const notificationRoutes = require('./router/notificationRoutes');
const invitationRoutes = require('./router/invitationRoutes');
const userRoutes = require('./router/userRoutes');
const inviteLinkRoutes = require('./router/inviteLinkRoutes');
const attendeeRoutes = require('./router/attendeeRoutes');
const userAdminRoutes = require('./router/userAdminRoutes');
const organizerAdminRoutes = require('./router/organizerAdminRoutes');
const organizationAdminRoutes = require('./router/organizationAdminRoutes');
const organizationApplicationAdminRoutes = require('./router/organizationApplicationAdminRoutes');
const eventAdminRoutes = require('./router/eventAdminRoutes');
const globalChatRoutes = require('./router/globalChatRoutes');

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

// Serve QR codes with CORS headers for downloads
app.use('/qr-codes', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'public/qr-codes')));

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management System API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/users', userRoutes);
app.use('/api', inviteLinkRoutes);
app.use('/api/attendees', attendeeRoutes);
app.use('/api/admin/users', userAdminRoutes);
app.use('/api/admin/organizers', organizerAdminRoutes);
app.use('/api/admin/organizations', organizationAdminRoutes);
app.use('/api/admin/organization-applications', organizationApplicationAdminRoutes);
app.use('/api/admin/events', eventAdminRoutes);
app.use('/api/global-chat', globalChatRoutes);

app.use((err, _req, res, next) => {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      // Chat allows up to 10MB; image uploads are 5MB. Use a generic, accurate message.
      return res.status(400).json({ message: 'File too large. Max 5MB for images, 10MB for chat files.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 5 files per chat message.' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err && err.message === 'Only jpeg, png, and webp image uploads are allowed') {
    return res.status(400).json({ message: err.message });
  }

  if (err && typeof err.message === 'string' && err.message.startsWith('Unsupported chat file type')) {
    return res.status(400).json({ message: err.message });
  }

  return next(err);
});

module.exports = app;



