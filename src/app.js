const express = require('express');
const authRoutes = require('./router/authRoutes');

const app = express();

app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management System API' });
});

app.use('/api/auth', authRoutes);

module.exports = app;



