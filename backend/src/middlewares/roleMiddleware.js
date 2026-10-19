import AppError from '../utils/AppError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
  }

  next();
};

export default requireRole;
