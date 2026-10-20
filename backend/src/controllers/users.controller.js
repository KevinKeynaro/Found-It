import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { authConfig } from '../config/auth.js';
import itemsConfig from '../config/items.js';
import usersConfig from '../config/users.js';
import AppError from '../utils/AppError.js';
import { todayInTimezone } from '../services/itemRules.js';
import { generatePassword } from '../services/passwordGenerator.js';
import { parseUsersCsv } from '../services/csvImport.js';
import { buildUsersCsv } from '../services/csvExport.js';
import {
  listQuerySchema,
  exportQuerySchema,
} from '../schemas/users.schema.js';

function escapeLike(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    class_name: row.class_name,
    is_active: Boolean(row.is_active),
    must_change_password: Boolean(row.must_change_password),
    created_at: row.created_at,
  };
}

const BASE_USER_SELECT = `
  SELECT id, name, email, role, class_name, is_active, must_change_password, created_at
  FROM users
`;

async function findTargetUser(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, class_name, is_active, must_change_password, token_version, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export const listUsers = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { q, role, is_active, page, limit } = query;

    const whereConditions = [];
    const params = [];

    if (q) {
      whereConditions.push("(name LIKE ? ESCAPE '\\\\' OR email LIKE ? ESCAPE '\\\\')");
      const pattern = `%${escapeLike(q)}%`;
      params.push(pattern, pattern);
    }

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined) {
      whereConditions.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;
    const total_pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const usersSql = `
      ${BASE_USER_SELECT}
      ${whereClause}
      ORDER BY name ASC, id ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(usersSql, [...params, limit, offset]);

    return res.status(200).json({
      users: rows.map(formatUser),
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const [rows] = await pool.query(`${BASE_USER_SELECT} WHERE id = ?`, [userId]);
    if (rows.length === 0) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    return res.status(200).json({
      user: formatUser(rows[0]),
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, role, class_name } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return next(new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists'));
    }

    const initialPassword = generatePassword(12);
    const hashedPassword = await bcrypt.hash(initialPassword, authConfig.bcryptRounds || 12);

    try {
      const [insertResult] = await pool.query(
        `INSERT INTO users (
          name, email, password, role, class_name, must_change_password, is_active, token_version
        ) VALUES (?, ?, ?, ?, ?, 1, 1, 0)`,
        [name, email, hashedPassword, role, class_name || null]
      );

      const [newRows] = await pool.query(`${BASE_USER_SELECT} WHERE id = ?`, [insertResult.insertId]);

      return res.status(201).json({
        user: formatUser(newRows[0]),
        initial_password: initialPassword,
      });
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
        return next(new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists'));
      }
      throw insertErr;
    }
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const targetUser = await findTargetUser(userId);
    if (!targetUser) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    if (targetUser.role === 'admin') {
      return next(
        new AppError(
          403,
          'ADMIN_MANAGED_VIA_CLI',
          'Admin accounts cannot be modified via API. Use administrative CLI scripts.'
        )
      );
    }

    const { name, email, role, class_name } = req.body;

    if (email && email !== targetUser.email) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [
        email,
        userId,
      ]);
      if (existing.length > 0) {
        return next(
          new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists')
        );
      }
    }

    const updatedName = name !== undefined ? name : targetUser.name;
    const updatedEmail = email !== undefined ? email : targetUser.email;
    const updatedRole = role !== undefined ? role : targetUser.role;
    const updatedClass = class_name !== undefined ? class_name : targetUser.class_name;

    try {
      await pool.query(
        'UPDATE users SET name = ?, email = ?, role = ?, class_name = ? WHERE id = ?',
        [updatedName, updatedEmail, updatedRole, updatedClass, userId]
      );

      const [updatedRows] = await pool.query(`${BASE_USER_SELECT} WHERE id = ?`, [userId]);

      return res.status(200).json({
        user: formatUser(updatedRows[0]),
      });
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.errno === 1062) {
        return next(
          new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists')
        );
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const targetUser = await findTargetUser(userId);
    if (!targetUser) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    if (targetUser.role === 'admin') {
      return next(
        new AppError(
          403,
          'ADMIN_MANAGED_VIA_CLI',
          'Admin accounts cannot be modified via API. Use administrative CLI scripts.'
        )
      );
    }

    if (targetUser.is_active === 0) {
      return res.status(200).json({
        user: formatUser(targetUser),
      });
    }

    await pool.query(
      'UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE id = ?',
      [userId]
    );

    const [updatedRows] = await pool.query(`${BASE_USER_SELECT} WHERE id = ?`, [userId]);

    return res.status(200).json({
      user: formatUser(updatedRows[0]),
    });
  } catch (err) {
    next(err);
  }
};

export const activateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const targetUser = await findTargetUser(userId);
    if (!targetUser) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    if (targetUser.role === 'admin') {
      return next(
        new AppError(
          403,
          'ADMIN_MANAGED_VIA_CLI',
          'Admin accounts cannot be modified via API. Use administrative CLI scripts.'
        )
      );
    }

    if (targetUser.is_active === 1) {
      return res.status(200).json({
        user: formatUser(targetUser),
      });
    }

    await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [userId]);

    const [updatedRows] = await pool.query(`${BASE_USER_SELECT} WHERE id = ?`, [userId]);

    return res.status(200).json({
      user: formatUser(updatedRows[0]),
    });
  } catch (err) {
    next(err);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    const targetUser = await findTargetUser(userId);
    if (!targetUser) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'User not found'));
    }

    if (targetUser.role === 'admin') {
      return next(
        new AppError(
          403,
          'ADMIN_MANAGED_VIA_CLI',
          'Admin accounts cannot be modified via API. Use administrative CLI scripts.'
        )
      );
    }

    const initialPassword = generatePassword(12);
    const hashedPassword = await bcrypt.hash(initialPassword, authConfig.bcryptRounds || 12);

    await pool.query(
      'UPDATE users SET password = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
      [hashedPassword, userId]
    );

    return res.status(200).json({
      initial_password: initialPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const getImportTemplate = (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="users-template.csv"');
  return res.status(200).send('\uFEFFname,email,role,class\r\n');
};

export const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError(400, 'INVALID_FILE', 'A CSV file is required'));
    }

    const parseResult = parseUsersCsv(req.file.buffer);
    if (parseResult.fatalError) {
      return next(new AppError(400, 'INVALID_FILE', parseResult.fatalError));
    }

    const { rows, rowErrors, duplicateRows } = parseResult;

    let dbDuplicates = [];
    let validRows = [];

    if (rows.length > 0) {
      const emailsToCheck = rows.map((r) => r.email);
      const [existingRows] = await pool.query(
        'SELECT email FROM users WHERE email IN (?)',
        [emailsToCheck]
      );
      const existingInDb = new Set(existingRows.map((r) => r.email.toLowerCase()));

      for (const row of rows) {
        if (existingInDb.has(row.email)) {
          dbDuplicates.push({
            row: row.row,
            email: row.email,
            reason: 'exists_in_database',
          });
        } else {
          validRows.push({
            row: row.row,
            name: row.name,
            email: row.email,
            role: row.role,
            class_name: row.class_name,
          });
        }
      }
    }

    const allDuplicates = [...duplicateRows, ...dbDuplicates].sort((a, b) => a.row - b.row);
    const sortedInvalidRows = rowErrors.sort((a, b) => a.row - b.row);

    const total = validRows.length + sortedInvalidRows.length + allDuplicates.length;

    return res.status(200).json({
      summary: {
        total,
        valid: validRows.length,
        invalid: sortedInvalidRows.length,
        duplicates: allDuplicates.length,
      },
      valid_rows: validRows,
      invalid_rows: sortedInvalidRows.map((r) => ({ row: r.row, errors: r.errors })),
      duplicate_rows: allDuplicates,
    });
  } catch (err) {
    next(err);
  }
};

async function hashPasswordsWithConcurrency(items, concurrency = 8) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      const initialPassword = generatePassword(12);
      const hashedPassword = await bcrypt.hash(initialPassword, usersConfig.importBcryptRounds);
      results[idx] = {
        name: item.name,
        email: item.email,
        role: item.role,
        class_name: item.class_name,
        initial_password: initialPassword,
        hashed_password: hashedPassword,
      };
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

export const importUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError(400, 'INVALID_FILE', 'A CSV file is required'));
    }

    const parseResult = parseUsersCsv(req.file.buffer);
    if (parseResult.fatalError) {
      return next(new AppError(400, 'INVALID_FILE', parseResult.fatalError));
    }

    const { rows, rowErrors, duplicateRows } = parseResult;

    let dbDuplicates = [];
    let validRows = [];

    if (rows.length > 0) {
      const emailsToCheck = rows.map((r) => r.email);
      const [existingRows] = await pool.query(
        'SELECT email FROM users WHERE email IN (?)',
        [emailsToCheck]
      );
      const existingInDb = new Set(existingRows.map((r) => r.email.toLowerCase()));

      for (const row of rows) {
        if (existingInDb.has(row.email)) {
          dbDuplicates.push({
            row: row.row,
            email: row.email,
            reason: 'exists_in_database',
          });
        } else {
          validRows.push(row);
        }
      }
    }

    const skipped = [
      ...rowErrors.map((r) => ({ row: r.row, email: r.email, reason: 'validation_error' })),
      ...duplicateRows.map((r) => ({ row: r.row, email: r.email, reason: r.reason })),
      ...dbDuplicates.map((r) => ({ row: r.row, email: r.email, reason: r.reason })),
    ].sort((a, b) => a.row - b.row);

    if (validRows.length === 0) {
      return res.status(201).json({
        summary: {
          created: 0,
          skipped_invalid: rowErrors.length,
          skipped_duplicates: duplicateRows.length + dbDuplicates.length,
        },
        created: [],
        skipped,
      });
    }

    // Generate passwords and hash with IMPORT_BCRYPT_ROUNDS with concurrency ~8
    const preparedUsers = await hashPasswordsWithConcurrency(validRows, 8);

    // Insert all in ONE transaction on a dedicated connection
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const chunkSize = 100;
      for (let i = 0; i < preparedUsers.length; i += chunkSize) {
        const chunk = preparedUsers.slice(i, i + chunkSize);
        const placeholders = [];
        const values = [];

        for (const user of chunk) {
          placeholders.push('(?, ?, ?, ?, ?, 1, 1, 0)');
          values.push(
            user.name,
            user.email,
            user.hashed_password,
            user.role,
            user.class_name || null
          );
        }

        const sql = `
          INSERT INTO users (
            name, email, password, role, class_name, must_change_password, is_active, token_version
          ) VALUES ${placeholders.join(', ')}
        `;
        await conn.query(sql, values);
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      return next(
        new AppError(
          409,
          'IMPORT_CONFLICT',
          'A conflicting record was detected during import. All changes have been rolled back. Please retry the import.'
        )
      );
    } finally {
      conn.release();
    }

    return res.status(201).json({
      summary: {
        created: preparedUsers.length,
        skipped_invalid: rowErrors.length,
        skipped_duplicates: duplicateRows.length + dbDuplicates.length,
      },
      created: preparedUsers.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        class_name: u.class_name,
        initial_password: u.initial_password,
      })),
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

export const exportUsers = async (req, res, next) => {
  try {
    const query = exportQuerySchema.parse(req.query);
    const { q, role, is_active, delimiter } = query;

    const whereConditions = [];
    const params = [];

    if (q) {
      whereConditions.push("(name LIKE ? ESCAPE '\\\\' OR email LIKE ? ESCAPE '\\\\')");
      const pattern = `%${escapeLike(q)}%`;
      params.push(pattern, pattern);
    }

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined) {
      whereConditions.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `
      SELECT name, email, role, class_name, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY name ASC, id ASC
    `;
    const [rows] = await pool.query(sql, params);

    const delimChar = delimiter === 'semicolon' ? ';' : ',';
    const csvContent = buildUsersCsv(rows, delimChar);

    const today = todayInTimezone(new Date(), itemsConfig.appTimezone);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${today}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
  getImportTemplate,
  previewImport,
  importUsers,
  exportUsers,
};
