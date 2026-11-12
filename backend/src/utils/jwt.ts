import jwt from 'jsonwebtoken';

export const INSECURE_DEFAULT_JWT_SECRET = 'trapbreaker-super-secret-jwt-key-2026';

export interface TokenPayload {
  userId: string;
  email?: string;
  username: string;
  phoneNumber?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || secret.trim() === '' || secret === INSECURE_DEFAULT_JWT_SECRET) {
    if (isProduction) {
      throw new Error(
        'FATAL: A strong, uncommitted JWT_SECRET environment variable is required in production. Default secret rejected.'
      );
    }
    // Return dev fallback only in non-production
    return secret || INSECURE_DEFAULT_JWT_SECRET;
  }

  return secret;
}

export function validateJwtSecret(): void {
  // Throws in production if invalid/insecure
  getJwtSecret();
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch (error) {
    return null;
  }
}
