import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeDatabase } from './database/connection.js';
import { WebSocketService } from './services/websocketService.js';
import { SeedService } from './services/seedService.js';
import { apiRateLimit } from './middleware/auth.js';
import filesRouter from './routes/files.js';
import projectsRouter from './routes/projects.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import patternsRouter from './routes/patterns.js';
import tolerancesRouter from './routes/tolerances.js';
import exportRouter from './routes/export.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env['PORT'] || 3000;

// Initialize WebSocket service
const webSocketService = new WebSocketService();

// Middleware
app.use(cors({
  origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env['SESSION_SECRET'] || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Apply rate limiting to API routes
app.use('/api', apiRateLimit);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/tolerances', tolerancesRouter);
app.use('/api/export', exportRouter);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'P&ID Digitizer Server is running!' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Run database seeds
    const seedService = new SeedService();
    await seedService.runAllSeeds();
    
    // Initialize WebSocket server
    webSocketService.initialize(server);
    
    server.listen(PORT, () => {
      console.log(`🚀 P&ID Digitizer Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env['NODE_ENV']}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  webSocketService.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  webSocketService.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();