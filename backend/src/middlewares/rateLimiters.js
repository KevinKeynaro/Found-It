import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    const ip = ipKeyGenerator(req);
    return `${email}_${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed login attempts for this account. Please try again in 15 minutes.',
      },
    });
  },
});

export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many requests from this IP address. Please try again in 15 minutes.',
      },
    });
  },
});
