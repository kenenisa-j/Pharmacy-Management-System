import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Fallback secrets for development if not provided in .env
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'pharmacy_access_secret_key_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pharmacy_refresh_secret_key_change_me';

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};