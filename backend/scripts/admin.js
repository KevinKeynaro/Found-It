import { parseArgs } from 'node:util';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import pool from '../src/config/db.js';
import authConfig from '../src/config/auth.js';

function generateRandomPassword(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function main() {
  const args = process.argv.slice(2);
  let command = 'create';
  let restArgs = args;

  if (
    args[0] === 'create' ||
    args[0] === 'reset' ||
    args[0] === 'deactivate' ||
    args[0] === 'activate'
  ) {
    command = args[0];
    restArgs = args.slice(1);
  }

  const { values } = parseArgs({
    args: restArgs,
    options: {
      name: { type: 'string' },
      email: { type: 'string' },
    },
    strict: false,
  });

  if (process.argv.some((arg) => arg.startsWith('--password'))) {
    console.error('Error: Setting passwords via command-line arguments is strictly prohibited for security.');
    process.exit(1);
  }

  try {
    if (command === 'create') {
      if (!values.name || !values.email) {
        console.error('Usage: npm run admin:create -- --name="Admin Name" --email="admin@example.com"');
        process.exit(1);
      }

      const name = values.name.trim();
      const email = values.email.trim().toLowerCase();

      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        console.error(`Error: User with email "${email}" already exists.`);
        process.exit(1);
      }

      const generatedPassword = generateRandomPassword(16);
      const hashedPassword = await bcrypt.hash(generatedPassword, authConfig.bcryptRounds);

      await pool.query(
        'INSERT INTO users (name, email, password, role, must_change_password, is_active, token_version) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, 'admin', 1, 1, 0]
      );

      console.log('------------------------------------------------------------');
      console.log('Admin account created successfully.');
      console.log(`Name : ${name}`);
      console.log(`Email: ${email}`);
      console.log(`Generated Password: ${generatedPassword}`);
      console.log('WARNING: Store this password securely now. It will NEVER be shown again.');
      console.log('must_change_password flag is set to 1. Admin must change password upon first login.');
      console.log('------------------------------------------------------------');

      const [countResult] = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
      );
      const activeAdmins = countResult[0].count;
      if (activeAdmins <= 1) {
        console.log('Operational Reminder: At least two active admin accounts are recommended for redundancy.');
      }
    } else if (command === 'reset') {
      if (!values.email) {
        console.error('Usage: npm run admin:reset -- --email="admin@example.com"');
        process.exit(1);
      }

      const email = values.email.trim().toLowerCase();

      const [existing] = await pool.query(
        'SELECT id, name, role FROM users WHERE email = ?',
        [email]
      );

      if (existing.length === 0) {
        console.error(`Error: User with email "${email}" not found.`);
        process.exit(1);
      }

      const generatedPassword = generateRandomPassword(16);
      const hashedPassword = await bcrypt.hash(generatedPassword, authConfig.bcryptRounds);

      await pool.query(
        'UPDATE users SET password = ?, must_change_password = 1, token_version = token_version + 1 WHERE email = ?',
        [hashedPassword, email]
      );

      console.log('------------------------------------------------------------');
      console.log(`Password reset successfully for user: ${email}`);
      console.log(`New Generated Password: ${generatedPassword}`);
      console.log('WARNING: Store this password securely now. It will NEVER be shown again.');
      console.log('token_version incremented (active sessions invalidated).');
      console.log('must_change_password flag is set to 1. User must change password upon next login.');
      console.log('------------------------------------------------------------');
    } else if (command === 'deactivate') {
      if (!values.email) {
        console.error('Usage: npm run admin:deactivate -- --email="admin@example.com"');
        process.exit(1);
      }

      const email = values.email.trim().toLowerCase();
      const [existing] = await pool.query(
        'SELECT id, name, role, is_active FROM users WHERE email = ?',
        [email]
      );

      if (existing.length === 0) {
        console.error(`Error: User with email "${email}" not found.`);
        process.exit(1);
      }

      const target = existing[0];
      if (target.role !== 'admin') {
        console.error('Error: This command only operates on admin accounts.');
        process.exit(1);
      }

      const [countResult] = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
      );
      const activeAdmins = countResult[0].count;

      if (target.is_active === 1 && activeAdmins <= 1) {
        console.error('Error: Cannot deactivate the last remaining active admin account.');
        process.exit(1);
      }

      if (target.is_active === 0) {
        console.log(`Admin account "${email}" is already inactive.`);
        return;
      }

      await pool.query(
        'UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE id = ?',
        [target.id]
      );

      console.log(`Admin account "${email}" has been deactivated. Active sessions invalidated.`);
    } else if (command === 'activate') {
      if (!values.email) {
        console.error('Usage: npm run admin:activate -- --email="admin@example.com"');
        process.exit(1);
      }

      const email = values.email.trim().toLowerCase();
      const [existing] = await pool.query(
        'SELECT id, name, role, is_active FROM users WHERE email = ?',
        [email]
      );

      if (existing.length === 0) {
        console.error(`Error: User with email "${email}" not found.`);
        process.exit(1);
      }

      const target = existing[0];
      if (target.role !== 'admin') {
        console.error('Error: This command only operates on admin accounts.');
        process.exit(1);
      }

      if (target.is_active === 1) {
        console.log(`Admin account "${email}" is already active.`);
        return;
      }

      await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [target.id]);
      console.log(`Admin account "${email}" has been activated.`);
    } else {
      console.error(`Unknown command "${command}". Available commands: create, reset, deactivate, activate`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Admin script error:', err.message || err);
  process.exit(1);
});
