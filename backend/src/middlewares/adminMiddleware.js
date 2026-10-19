import { requireRole } from './roleMiddleware.js';

export const adminMiddleware = requireRole('admin');
export default adminMiddleware;
