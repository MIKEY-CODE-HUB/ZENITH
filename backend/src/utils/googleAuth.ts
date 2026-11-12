import jwt from 'jsonwebtoken';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export const TEST_GOOGLE_SECRET = 'zenith-test-google-signing-secret-2026';

/**
 * Creates a signed test Google ID token for automated test suites.
 */
export function createTestGoogleIdToken(payload: {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  email_verified?: boolean;
}): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload = {
    iss: payload.iss ?? 'https://accounts.google.com',
    sub: payload.sub,
    aud: payload.aud ?? (process.env.GOOGLE_CLIENT_ID || 'zenith-google-client-id-2026'),
    email: payload.email,
    email_verified: payload.email_verified ?? true,
    name: payload.name ?? 'Google Verified Scholar',
    picture: payload.picture ?? `https://api.dicebear.com/7.x/bottts/svg?seed=${payload.sub}`,
    iat: nowSec,
    exp: payload.exp ?? (nowSec + 3600),
  };

  return jwt.sign(fullPayload, TEST_GOOGLE_SECRET, { algorithm: 'HS256' });
}

/**
 * Verifies a Google ID token server-side.
 * Enforces valid issuer, audience, expiry, verified email, and provider subject (sub).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required');
  }

  const parts = idToken.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google ID token: expected 3 segments');
  }

  let decodedPayload: any;
  try {
    decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('Failed to decode Google ID token payload');
  }

  // 1. Validate Issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!decodedPayload.iss || !validIssuers.includes(decodedPayload.iss)) {
    throw new Error(`Invalid token issuer: ${decodedPayload.iss}. Expected accounts.google.com`);
  }

  // 2. Validate Expiration
  const nowSec = Math.floor(Date.now() / 1000);
  if (!decodedPayload.exp || decodedPayload.exp < nowSec) {
    throw new Error('Google ID token is expired');
  }

  // 3. Validate Audience
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  if (expectedAudience && decodedPayload.aud !== expectedAudience) {
    throw new Error(`Token audience mismatch. Expected: ${expectedAudience}, Got: ${decodedPayload.aud}`);
  }

  // 4. Validate Verified Email
  const isEmailVerified = decodedPayload.email_verified === true || decodedPayload.email_verified === 'true';
  if (!isEmailVerified || !decodedPayload.email) {
    throw new Error('Google account email is not verified');
  }

  // 5. Validate Provider Subject (sub)
  if (!decodedPayload.sub || typeof decodedPayload.sub !== 'string' || decodedPayload.sub.trim() === '') {
    throw new Error('Google ID token missing valid subject (sub)');
  }

  // 6. Signature Verification
  // In non-production environments (test/development), support local test tokens signed with TEST_GOOGLE_SECRET
  if (process.env.NODE_ENV !== 'production') {
    try {
      jwt.verify(idToken, TEST_GOOGLE_SECRET, { algorithms: ['HS256'] });
      return {
        googleId: decodedPayload.sub,
        email: decodedPayload.email.trim().toLowerCase(),
        name: decodedPayload.name || decodedPayload.email.split('@')[0],
        avatarUrl: decodedPayload.picture,
        emailVerified: true,
      };
    } catch (e: any) {
      // If test secret didn't verify, continue to check if live verification applies
    }
  }

  // Live verification via Google tokeninfo endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error_description || errData.error || `Google tokeninfo returned HTTP ${res.status}`);
    }

    const tokenInfo = await res.json();
    if (tokenInfo.sub !== decodedPayload.sub) {
      throw new Error('Subject mismatch in Google tokeninfo verification');
    }

    return {
      googleId: tokenInfo.sub,
      email: tokenInfo.email.trim().toLowerCase(),
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      avatarUrl: tokenInfo.picture,
      emailVerified: tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true,
    };
  } catch (err: any) {
    throw new Error(`Google ID token signature verification failed: ${err.message}`);
  }
}
