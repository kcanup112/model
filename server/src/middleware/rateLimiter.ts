import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

// Tell Express to respect X-Forwarded-For
app.set('trust proxy', true);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use the first IP in X-Forwarded-For if present
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      return xff.split(',')[0].trim();
    }
    return req.ip;
  }
});

const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      return xff.split(',')[0].trim();
    }
    return req.ip;
  }
});

app.use('/api/auth', strictRateLimiter);
app.use('/api/users', rateLimiter);

