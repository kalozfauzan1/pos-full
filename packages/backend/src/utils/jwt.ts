import jwt from 'jsonwebtoken';
import { TokenPayload, AuthTokens } from '../types/auth.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function signTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'access-secret', {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET || 'access-secret') as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as TokenPayload;
}