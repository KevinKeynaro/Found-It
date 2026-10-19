import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pool from './config/db.js';
import AppError from './utils/AppError.js';
import csrfGuard from './middlewares/csrfGuard.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(csrfGuard);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
    });
  }
});

app.use('/api/auth', authRoutes);

// 404 JSON handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Not Found',
    },
  });
});

// Global JSON error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Zod validation errors
  if (err.name === 'ZodError' || err.issues) {
    const details = {};
    for (const issue of err.issues || []) {
      const field = issue.path.join('.') || 'body';
      details[field] = issue.message;
    }
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
  }

  // AppError instances
  if (err instanceof AppError || (err.statusCode && err.code)) {
    const errorBody = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      errorBody.details = err.details;
    }
    return res.status(err.statusCode).json({ error: errorBody });
  }

  // Unexpected internal errors
  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
    },
  });
});

export default app;
export { app };
