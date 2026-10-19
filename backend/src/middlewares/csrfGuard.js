import AppError from '../utils/AppError.js';

export const csrfGuard = (req, res, next) => {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChangingMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  const requestedWith = req.get('x-requested-with');
  if (requestedWith !== 'XMLHttpRequest') {
    return next(
      new AppError(
        403,
        'CSRF_REJECTED',
        'CSRF validation failed: missing or invalid X-Requested-With header'
      )
    );
  }

  const origin = req.get('origin');
  if (origin) {
    const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (normalizedOrigin !== clientUrl) {
      return next(
        new AppError(
          403,
          'CSRF_REJECTED',
          'CSRF validation failed: Origin header does not match allowed CLIENT_URL'
        )
      );
    }
  }

  next();
};

export default csrfGuard;
