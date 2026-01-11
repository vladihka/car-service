import jwt from 'jsonwebtoken';
import { config } from '../config';
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
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign({ userId: payload.userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
