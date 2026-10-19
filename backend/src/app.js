import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
      error: err.message,
    });
  }
});

// 404 JSON handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global JSON error handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
export { app };
