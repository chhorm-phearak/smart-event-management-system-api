const express = require('express');
const authRoutes = require('./router/authRoutes');
const eventRoutes = require('./router/eventRoutes');
const groupRoutes = require('./router/groupRoutes');

const app = express();

app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management System API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/groups', groupRoutes);

module.exports = app;



