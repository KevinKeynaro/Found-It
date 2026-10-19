import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters long.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const COOKIE_NAME = process.env.COOKIE_NAME || 'found_it_token';
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

function parseDurationMs(duration) {
  if (typeof duration === 'number') return duration;
  const match = String(duration).trim().match(/^(\d+)([smhd]?)$/i);
  if (!match) return 8 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'ms').toLowerCase();
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value;
  }
}

const jwtExpiresInMs = parseDurationMs(JWT_EXPIRES_IN);

export const authConfig = {
  nodeEnv: NODE_ENV,
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  jwtExpiresInMs,
  bcryptRounds: BCRYPT_ROUNDS,
  cookieName: COOKIE_NAME,
  cookieSameSite: COOKIE_SAME_SITE,
  cookieDomain: COOKIE_DOMAIN,
  cookieOptions: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: jwtExpiresInMs,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  },
  clearCookieOptions: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  },
};

export default authConfig;
