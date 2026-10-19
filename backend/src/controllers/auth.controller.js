import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import authConfig from '../config/auth.js';
import AppError from '../utils/AppError.js';

// Precomputed constant dummy hash to prevent timing attacks when an email does not exist
const DUMMY_HASH = bcrypt.hashSync('dummy_timing_protection_password', authConfig.bcryptRounds);

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      'SELECT id, name, email, password, role, class_name, must_change_password, is_active, token_version FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Run dummy compare to match timing
      await bcrypt.compare(password, DUMMY_HASH);
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    const user = rows[0];

    // If account has no password (e.g., future SSO only), reject
    if (!user.password) {
      await bcrypt.compare(password, DUMMY_HASH);
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    if (!user.is_active) {
      return next(new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled'));
    }

    const token = jwt.sign(
      { sub: user.id, tv: user.token_version },
      authConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: authConfig.jwtExpiresIn }
    );

    res.cookie(authConfig.cookieName, token, authConfig.cookieOptions);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        class_name: user.class_name,
        must_change_password: Boolean(user.must_change_password),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.clearCookie(authConfig.cookieName, authConfig.clearCookieOptions);
  return res.status(204).send();
};

export const getMe = (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      class_name: req.user.class_name,
      must_change_password: req.user.must_change_password,
    },
  });
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const [rows] = await pool.query(
      'SELECT password, token_version FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0 || !rows[0].password) {
      return next(new AppError(400, 'PASSWORD_NOT_SET', 'Account does not have a local password configured'));
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password);
    if (!isMatch) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect'));
    }

    const hashedPassword = await bcrypt.hash(new_password, authConfig.bcryptRounds);
    const newTokenVersion = req.user.token_version + 1;

    await pool.query(
      'UPDATE users SET password = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    const token = jwt.sign(
      { sub: req.user.id, tv: newTokenVersion },
      authConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: authConfig.jwtExpiresIn }
    );

    res.cookie(authConfig.cookieName, token, authConfig.cookieOptions);

    req.user.must_change_password = false;
    req.user.token_version = newTokenVersion;

    return res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        class_name: req.user.class_name,
        must_change_password: false,
      },
    });
  } catch (err) {
    next(err);
  }
};
