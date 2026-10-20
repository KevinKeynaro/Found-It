import 'dotenv/config';

function parsePositiveInt(val, defaultValue, varName) {
  if (val === undefined || val === '') {
    return defaultValue;
  }
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid configuration: ${varName} must be a positive integer.`);
  }
  return parsed;
}

const OVERDUE_DAYS = parsePositiveInt(process.env.OVERDUE_DAYS, 30, 'OVERDUE_DAYS');
const RETURNED_RETENTION_DAYS = parsePositiveInt(
  process.env.RETURNED_RETENTION_DAYS,
  5,
  'RETURNED_RETENTION_DAYS'
);
const SELF_DELETE_HOURS = parsePositiveInt(process.env.SELF_DELETE_HOURS, 24, 'SELF_DELETE_HOURS');
const MAX_UPLOAD_MB = parsePositiveInt(process.env.MAX_UPLOAD_MB, 5, 'MAX_UPLOAD_MB');
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Jakarta';

try {
  Intl.DateTimeFormat(undefined, { timeZone: APP_TIMEZONE });
} catch {
  throw new Error(`Invalid configuration: APP_TIMEZONE "${APP_TIMEZONE}" is not a valid IANA time zone.`);
}

export const itemsConfig = {
  overdueDays: OVERDUE_DAYS,
  returnedRetentionDays: RETURNED_RETENTION_DAYS,
  selfDeleteHours: SELF_DELETE_HOURS,
  maxUploadMb: MAX_UPLOAD_MB,
  maxUploadBytes: MAX_UPLOAD_MB * 1024 * 1024,
  appTimezone: APP_TIMEZONE,
};

export default itemsConfig;
