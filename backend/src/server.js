const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const choreRoutes = require('./routes/chores');
const assignmentRoutes = require('./routes/assignments');
const childrenRoutes = require('./routes/children');
const dashboardRoutes = require('./routes/dashboard');
const { securityHeaders, sanitizeObject, logAuditEvent } = require('./middleware/security');
const { runSecurityMigrations } = require('./db/security-migrate');

const app = express();
const PORT = process.env.PORT || 3001;

// Run security migrations on startup
runSecurityMigrations();

// Security headers (helmet + custom)
app.use(helmet({
  contentSecurityPolicy: false, // We set our own CSP
  crossOriginEmbedderPolicy: false,
}));

// CORS — strict origin list
const allowedOrigins = [
  'http://localhost:19006',  // Expo web
  'http://localhost:3000',   // Dev
  'exp://localhost:19000',   // Expo mobile
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Global input sanitization
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
});

// Rate limiting — global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Rate limiting — strict for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/child-login', authLimiter);

// Rate limiting — file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many uploads. Please wait.' },
});
app.use('/api/evidence', uploadLimiter);

// Health check (no rate limit)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FamilyOS API',
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler — don't reveal route structure
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — never leak stack traces
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);

  // Don't expose internal errors to client
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  // Log the error
  logAuditEvent(null, 'server_error', {
    path: req.path,
    method: req.method,
    error: err.message,
  });

  res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`FamilyOS API running on port ${PORT}`);
  console.log(`Security: helmet, CORS, rate limiting, input sanitization active`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
