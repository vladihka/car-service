import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  branchId?: string;
  role: string;
  permissions: string[];
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtAccessExpiry,
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign({ userId: payload.userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiry,
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, env.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, env.jwtRefreshSecret) as { userId: string };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
