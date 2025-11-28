// backend/middleware/rateLimiter.js
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Create rate limiters
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const strictRateLimiter = new RateLimiterMemory({
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

/**
 * General rate limiting middleware
 */
export const generalRateLimiter = async (req, res, next) => {
  try {
    const key = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
    });
  }
};

/**
 * Strict rate limiting for sensitive endpoints (like submit)
 */
export const strictRateLimiterMiddleware = async (req, res, next) => {
  try {
    const key = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    await strictRateLimiter.consume(key);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded for submissions. Please wait before submitting again.',
      retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
    });
  }
};
