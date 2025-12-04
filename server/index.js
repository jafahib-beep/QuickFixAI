const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');
const toolboxRoutes = require('./routes/toolbox');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const communityRoutes = require('./routes/community');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/toolbox', toolboxRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/community', communityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/categories', (req, res) => {
  res.json([
    { key: 'all', label: 'All' },
    { key: 'home', label: 'Home' },
    { key: 'car', label: 'Car' },
    { key: 'electronics', label: 'Electronics' },
    { key: 'tools', label: 'Tools' },
    { key: 'cleaning', label: 'Cleaning' },
    { key: 'garden', label: 'Garden' },
    { key: 'plumbing', label: 'Plumbing' },
    { key: 'electrical', label: 'Electrical' },
    { key: 'appliances', label: 'Appliances' },
    { key: 'other', label: 'Other' }
  ]);
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
