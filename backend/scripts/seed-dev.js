import bcrypt from 'bcrypt';
import 'dotenv/config';
import pool from '../src/config/db.js';
import authConfig from '../src/config/auth.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Error: Dev seed script cannot be executed in production environment.');
    process.exit(1);
  }

  const DEV_PASSWORD = 'DevPassword123!';

  console.log('Seeding development accounts...');
  console.log(`Known dev password for accounts: "${DEV_PASSWORD}"`);

  try {
    const hashedPassword = await bcrypt.hash(DEV_PASSWORD, authConfig.bcryptRounds);

    const devAccounts = [
      {
        name: 'Dev Teacher',
        email: 'teacher@found-it.test',
        role: 'teacher',
        class_name: null,
        must_change_password: 0,
      },
      {
        name: 'Dev Student',
        email: 'student@found-it.test',
        role: 'student',
        class_name: '12-IPA-1',
        must_change_password: 1,
      },
    ];

    for (const acc of devAccounts) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [acc.email]);
      if (existing.length > 0) {
        console.log(`  [SKIPPED] Account "${acc.email}" already exists.`);
        continue;
      }

      await pool.query(
        'INSERT INTO users (name, email, password, role, class_name, must_change_password, is_active, token_version) VALUES (?, ?, ?, ?, ?, ?, 1, 0)',
        [acc.name, acc.email, hashedPassword, acc.role, acc.class_name, acc.must_change_password]
      );
      console.log(`  [CREATED] Account "${acc.email}" (${acc.role}) created successfully.`);
    }

    console.log('Development accounts seed complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed script error:', err.message || err);
  process.exit(1);
});
