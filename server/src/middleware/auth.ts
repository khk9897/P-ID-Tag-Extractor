import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { User } from '../types/index.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authService = new AuthService();

// Authentication middleware - checks if user is logged in
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.session as any)?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in.' 
      });
    }

    // Get user from database
    const user = await authService.getUserById(userId);
    
    if (!user) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      return res.status(401).json({ 
        error: 'Invalid session. Please log in again.' 
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Optional authentication - doesn't block if not authenticated
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.session as any)?.userId;
    
    if (userId) {
      const user = await authService.getUserById(userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't block request, just continue without user
    next();
  }
};

// Admin role requirement
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin privileges required' 
    });
  }
  
  next();
};

// Check if user owns resource or is admin
export const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    const resourceUserId = parseInt(req.params[userIdParam]);
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User can access their own resources
    if (req.user.id === resourceUserId) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied. You can only access your own resources.' 
    });
  };
};

// Department-based access control
export const requireSameDepartmentOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  // Admin can access everything
  if (req.user.role === 'admin') {
    return next();
  }
  
  // For now, just allow same user access
  // This can be extended for department-based logic
  next();
};

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const createRateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = rateLimitMap.get(key);
    
    if (!record || now > record.resetTime) {
      // First request or window expired
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
};

// Login rate limiting (5 attempts per 15 minutes)
export const loginRateLimit = createRateLimit(5, 15 * 60 * 1000);

// General API rate limiting (100 requests per minute)
export const apiRateLimit = createRateLimit(100, 60 * 1000);