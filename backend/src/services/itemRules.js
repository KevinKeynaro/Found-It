import itemsConfig from '../config/items.js';

export function todayInTimezone(now = new Date(), tz = itemsConfig.appTimezone) {
  const dateObj = now instanceof Date ? now : new Date(now);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateObj);
}

function parseDateStringToUtc(dateStr) {
  if (dateStr instanceof Date) {
    return Date.UTC(dateStr.getUTCFullYear(), dateStr.getUTCMonth(), dateStr.getUTCDate());
  }
  const parts = String(dateStr).split('T')[0].split('-').map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

export function isOverdue(item, today = todayInTimezone(), overdueDays = itemsConfig.overdueDays) {
  if (!item || item.status !== 'found' || !item.date_found) {
    return false;
  }
  const dateFoundUtc = parseDateStringToUtc(item.date_found);
  const todayUtc = parseDateStringToUtc(today);
  const thresholdUtc = dateFoundUtc + overdueDays * 24 * 60 * 60 * 1000;
  return todayUtc >= thresholdUtc;
}

export function canView(user, item, today = todayInTimezone(), overdueDays = itemsConfig.overdueDays) {
  if (!item || item.deleted_at) {
    return false;
  }
  if (!user) {
    return false;
  }
  if (user.role === 'admin' || user.role === 'teacher') {
    return true;
  }
  if (user.role === 'student') {
    return item.status === 'found' && !isOverdue(item, today, overdueDays);
  }
  return false;
}

export function canEdit(user, item) {
  if (!item || item.deleted_at || item.status !== 'found') {
    return false;
  }
  if (!user) {
    return false;
  }
  return user.role === 'teacher' || user.role === 'admin';
}

export function canReturn(user, item) {
  if (!item || item.deleted_at || item.status !== 'found') {
    return false;
  }
  if (!user) {
    return false;
  }
  return user.role === 'teacher' || user.role === 'admin';
}

export function canReopen(
  user,
  item,
  now = new Date(),
  retentionDays = itemsConfig.returnedRetentionDays
) {
  if (!item || item.deleted_at || item.status !== 'returned') {
    return false;
  }
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  if (user.role === 'teacher') {
    if (!item.returned_at) {
      return false;
    }
    const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
    const returnedAtMs =
      item.returned_at instanceof Date
        ? item.returned_at.getTime()
        : new Date(item.returned_at).getTime();
    const windowMs = retentionDays * 24 * 60 * 60 * 1000;
    return nowMs < returnedAtMs + windowMs;
  }
  return false;
}

export function canDelete(
  user,
  item,
  now = new Date(),
  today = todayInTimezone(now),
  overdueDays = itemsConfig.overdueDays,
  retentionDays = itemsConfig.returnedRetentionDays,
  selfDeleteHours = itemsConfig.selfDeleteHours
) {
  if (!item) {
    return { allowed: false, reason: 'ITEM_NOT_FOUND' };
  }
  if (item.deleted_at) {
    return { allowed: false, reason: 'ALREADY_DELETED' };
  }
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return { allowed: false, reason: 'ROLE_NOT_AUTHORIZED' };
  }
  if (user.role === 'admin') {
    return { allowed: true, reason: 'ADMIN_FULL_ACCESS' };
  }

  // Teacher deletion rules
  if (isOverdue(item, today, overdueDays)) {
    return { allowed: true, reason: 'ITEM_OVERDUE' };
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (item.status === 'returned') {
    if (!item.returned_at) {
      return { allowed: false, reason: 'INVALID_RETURNED_STATE' };
    }
    const returnedAtMs =
      item.returned_at instanceof Date
        ? item.returned_at.getTime()
        : new Date(item.returned_at).getTime();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    if (returnedAtMs + retentionMs <= nowMs) {
      return { allowed: true, reason: 'RETENTION_EXPIRED' };
    }
    return { allowed: false, reason: 'RETURNED_WITHIN_RETENTION' };
  }

  if (item.status === 'found') {
    if (item.posted_by !== user.id) {
      return { allowed: false, reason: 'NOT_POSTED_BY_USER' };
    }
    const createdAtMs =
      item.created_at instanceof Date
        ? item.created_at.getTime()
        : new Date(item.created_at).getTime();
    const windowMs = selfDeleteHours * 60 * 60 * 1000;
    if (nowMs - createdAtMs <= windowMs) {
      return { allowed: true, reason: 'SELF_DELETE_WINDOW' };
    }
    return { allowed: false, reason: 'SELF_DELETE_WINDOW_EXPIRED' };
  }

  return { allowed: false, reason: 'DELETE_NOT_PERMITTED' };
}

export function permissionsFor(user, item, now = new Date(), today = todayInTimezone(now)) {
  return {
    can_edit: canEdit(user, item),
    can_return: canReturn(user, item),
    can_reopen: canReopen(user, item, now),
    can_delete: canDelete(user, item, now, today).allowed,
  };
}

export default {
  todayInTimezone,
  isOverdue,
  canView,
  canEdit,
  canReturn,
  canReopen,
  canDelete,
  permissionsFor,
};
