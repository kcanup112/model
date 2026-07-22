import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      return xff.split(',')[0].trim();
    }
    return req.ip;
  },
});

export const strictRateLimiter = rateLimit({
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
  },
});

