import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function main() {
  const isStatus = process.argv[2] === 'status';
  const dbName = process.env.DB_DATABASE;

  if (!dbName) {
    console.error('Error: DB_DATABASE is not defined in environment variables.');
    process.exit(1);
  }

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = Number(process.env.DB_PORT) || 3306;

  let connection;
  try {
    // 1. Connect without database
    connection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      multipleStatements: true,
      timezone: 'Z',
    });

    // 2. Ensure database exists and select it
    const escapedDb = dbName.replace(/`/g, '``');
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${escapedDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${escapedDb}\`;`);

    // 3. Ensure schema_migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        checksum CHAR(64) NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Fetch applied migrations
    const [rows] = await connection.query(
      `SELECT version, name, checksum, executed_at FROM schema_migrations ORDER BY version ASC;`
    );
    const appliedMap = new Map();
    for (const row of rows) {
      appliedMap.set(row.version, row);
    }

    // 5. Read migration files
    let dirEntries = [];
    try {
      dirEntries = await fs.readdir(MIGRATIONS_DIR);
    } catch (err) {
      if (err.code === 'ENOENT') {
        dirEntries = [];
      } else {
        throw err;
      }
    }

    const migrationFiles = dirEntries
      .filter((file) => /^\d{3}_.+\.sql$/.test(file))
      .sort((a, b) => parseInt(a.slice(0, 3), 10) - parseInt(b.slice(0, 3), 10));

    // 6. Verify checksums of applied files
    for (const file of migrationFiles) {
      const version = file.slice(0, 3);
      if (appliedMap.has(version)) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const checksum = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
        const recorded = appliedMap.get(version);

        if (recorded.checksum !== checksum) {
          console.error(
            `Error: Migration file "${file}" has been altered after being applied!\n` +
            `Recorded checksum : ${recorded.checksum}\n` +
            `Current checksum  : ${checksum}`
          );
          process.exit(1);
        }
      }
    }

    // 7. Status command handling
    if (isStatus) {
      console.log('Migration Status:');
      if (migrationFiles.length === 0) {
        console.log('  No migration files found.');
      }
      for (const file of migrationFiles) {
        const version = file.slice(0, 3);
        const recorded = appliedMap.get(version);
        if (recorded) {
          const executedAt = recorded.executed_at
            ? new Date(recorded.executed_at).toISOString()
            : 'unknown';
          console.log(`  [APPLIED] ${file} (executed at: ${executedAt})`);
        } else {
          console.log(`  [PENDING] ${file}`);
        }
      }
      return;
    }

    // 8. Migration execution
    let appliedCount = 0;
    for (const file of migrationFiles) {
      const version = file.slice(0, 3);
      if (appliedMap.has(version)) {
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

      console.log(`Applying migration: ${file}...`);
      try {
        await connection.query(content);
      } catch (err) {
        console.error(`Migration failed in file "${file}":`, err.message || err);
        process.exit(1);
      }

      await connection.query(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?);`,
        [version, file, checksum]
      );
      console.log(`Applied migration: ${file}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('No pending migrations to apply.');
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }
  } catch (err) {
    console.error('Migration runner error:', err.message || err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
