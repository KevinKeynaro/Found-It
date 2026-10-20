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

const IMPORT_MAX_ROWS = parsePositiveInt(process.env.IMPORT_MAX_ROWS, 500, 'IMPORT_MAX_ROWS');
const IMPORT_MAX_MB = parsePositiveInt(process.env.IMPORT_MAX_MB, 1, 'IMPORT_MAX_MB');
const IMPORT_BCRYPT_ROUNDS = parsePositiveInt(
  process.env.IMPORT_BCRYPT_ROUNDS,
  10,
  'IMPORT_BCRYPT_ROUNDS'
);

export const usersConfig = {
  importMaxRows: IMPORT_MAX_ROWS,
  importMaxMb: IMPORT_MAX_MB,
  importMaxBytes: IMPORT_MAX_MB * 1024 * 1024,
  importBcryptRounds: IMPORT_BCRYPT_ROUNDS,
};

export default usersConfig;
