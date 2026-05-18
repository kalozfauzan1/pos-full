import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { TokenPayload } from '../types/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}