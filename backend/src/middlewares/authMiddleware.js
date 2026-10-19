import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import authConfig from '../config/auth.js';
import AppError from '../utils/AppError.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.[authConfig.cookieName];
    if (!token) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token'));
    }

    const { sub, tv } = decoded;
    if (!sub || tv === undefined) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid token payload'));
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, class_name, must_change_password, is_active, token_version FROM users WHERE id = ?',
      [sub]
    );

    if (rows.length === 0) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'User does not exist'));
    }

    const user = rows[0];

    if (user.token_version !== tv) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Session invalidated'));
    }

    if (!user.is_active) {
      return next(new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled'));
    }

    // Attach user without password, normalizing booleans
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      class_name: user.class_name,
      must_change_password: Boolean(user.must_change_password),
      is_active: Boolean(user.is_active),
      token_version: user.token_version,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const enforcePasswordChange = (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }

  if (req.user.must_change_password) {
    const url = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const method = req.method.toUpperCase();

    if (
      (method === 'GET' && url === '/api/auth/me') ||
      (method === 'POST' && url === '/api/auth/logout') ||
      (method === 'POST' && url === '/api/auth/change-password')
    ) {
      return next();
    }

    return next(
      new AppError(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Password change required before accessing this resource'
      )
    );
  }

  next();
};

export default authenticate;
