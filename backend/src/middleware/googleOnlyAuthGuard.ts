import { Request, Response, NextFunction } from 'express';

/**
 * Checks whether Google-only authentication is enforced.
 * Defaults to TRUE in production, or when GOOGLE_ONLY_AUTH is explicitly set to 'true'.
 */
export function isGoogleOnlyAuthEnabled(): boolean {
  if (process.env.GOOGLE_ONLY_AUTH !== undefined) {
    return process.env.GOOGLE_ONLY_AUTH === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

/**
 * Express middleware that blocks non-Google authentication entry points
 * in production (password registration, password login, phone OTP, password reset).
 */
export function googleOnlyAuthGuard(req: Request, res: Response, next: NextFunction): void {
  if (isGoogleOnlyAuthEnabled()) {
    res.status(403).json({
      success: false,
      error: 'Alternate authentication methods (password, OTP, password recovery) are disabled. Google sign-in is the sole permitted authentication provider.',
      code: 'AUTH_METHOD_DISABLED',
    });
    return;
  }
  next();
}
