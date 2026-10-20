import pool from '../config/db.js';
import itemsConfig from '../config/items.js';
import AppError from '../utils/AppError.js';
import {
  todayInTimezone,
  isOverdue,
  canView,
  canEdit,
  canReopen,
  canDelete,
  permissionsFor,
} from '../services/itemRules.js';
import { uploadImage, deleteImage, thumbnailUrl } from '../services/imageService.js';
import { listQuerySchema } from '../schemas/items.schema.js';

function escapeLike(str) {
  return str.replace(/[\\%_]/g, '\\$&');
}

function formatItem(row, user, now = new Date(), today = todayInTimezone(now)) {
  const itemModel = {
    id: row.id,
    status: row.status,
    date_found: row.date_found,
    posted_by: row.posted_by,
    created_at: row.created_at,
    returned_at: row.returned_at,
    deleted_at: row.deleted_at,
  };

  const overdue = isOverdue(itemModel, today);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location_found: row.location_found,
    date_found: typeof row.date_found === 'string' ? row.date_found : todayInTimezone(row.date_found),
    image_url: row.image_url,
    thumbnail_url: thumbnailUrl(row.image_public_id),
    status: row.status,
    is_overdue: overdue,
    posted_by: {
      id: row.posted_by,
      name: row.posted_by_name || null,
    },
    returned_at: row.returned_at,
    returned_by: row.returned_by
      ? {
          id: row.returned_by,
          name: row.returned_by_name || null,
        }
      : null,
    returned_to: row.returned_to,
    created_at: row.created_at,
    permissions: permissionsFor(user, itemModel, now, today),
  };
}

const BASE_ITEM_SELECT = `
  SELECT 
    i.id, i.title, i.description, i.location_found, i.date_found,
    i.image_url, i.image_public_id, i.status,
    i.posted_by, u_post.name AS posted_by_name,
    i.returned_at, i.returned_by, u_ret.name AS returned_by_name,
    i.returned_to, i.created_at, i.updated_at, i.deleted_at, i.deleted_by
  FROM items i
  LEFT JOIN users u_post ON i.posted_by = u_post.id
  LEFT JOIN users u_ret ON i.returned_by = u_ret.id
`;

export const listItems = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { view, q, page, limit } = query;
    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    if (req.user.role === 'student' && view !== 'active') {
      return next(new AppError(403, 'FORBIDDEN', 'Students may only view active items'));
    }

    const whereConditions = ['i.deleted_at IS NULL'];
    const params = [];

    // View filter
    if (view === 'active') {
      whereConditions.push("i.status = 'found' AND i.date_found > DATE_SUB(?, INTERVAL ? DAY)");
      params.push(today, itemsConfig.overdueDays);
    } else if (view === 'overdue') {
      whereConditions.push("i.status = 'found' AND i.date_found <= DATE_SUB(?, INTERVAL ? DAY)");
      params.push(today, itemsConfig.overdueDays);
    } else if (view === 'archive') {
      whereConditions.push("i.status = 'returned'");
    }

    // Search query
    if (q) {
      const words = q.trim().split(/\s+/).filter(Boolean).slice(0, 5);
      for (const word of words) {
        whereConditions.push("(i.title LIKE ? ESCAPE '\\\\' OR i.description LIKE ? ESCAPE '\\\\')");
        const pattern = `%${escapeLike(word)}%`;
        params.push(pattern, pattern);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) AS total FROM items i ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;
    const total_pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Items list query
    const itemsSql = `
      ${BASE_ITEM_SELECT}
      ${whereClause}
      ORDER BY i.date_found DESC, i.id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(itemsSql, [...params, limit, offset]);

    const items = rows.map((row) => formatItem(row, req.user, now, today));

    return res.status(200).json({
      items,
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

export const getItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const [rows] = await pool.query(
      `${BASE_ITEM_SELECT} WHERE i.id = ? AND i.deleted_at IS NULL`,
      [itemId]
    );

    if (rows.length === 0) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const row = rows[0];
    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    const itemModel = {
      id: row.id,
      status: row.status,
      date_found: row.date_found,
      deleted_at: row.deleted_at,
    };

    if (!canView(req.user, itemModel, today)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    return res.status(200).json({
      item: formatItem(row, req.user, now, today),
    });
  } catch (err) {
    next(err);
  }
};

export const createItem = async (req, res, next) => {
  let uploadedPublicId = null;
  try {
    if (!req.file) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'A photo is required to post a found item', {
          photo: 'Photo is required',
        })
      );
    }

    const { title, description, location_found, date_found } = req.body;

    const { url, publicId } = await uploadImage(req.file.buffer);
    uploadedPublicId = publicId;

    const [insertResult] = await pool.query(
      `INSERT INTO items (
        title, description, location_found, date_found, image_url, image_public_id, status, posted_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'found', ?)`,
      [title, description || null, location_found, date_found, url, publicId, req.user.id]
    );

    const newItemId = insertResult.insertId;
    const [rows] = await pool.query(`${BASE_ITEM_SELECT} WHERE i.id = ?`, [newItemId]);

    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    return res.status(201).json({
      item: formatItem(rows[0], req.user, now, today),
    });
  } catch (err) {
    if (uploadedPublicId) {
      await deleteImage(uploadedPublicId);
    }
    next(err);
  }
};

export const updateItem = async (req, res, next) => {
  let newUploadedPublicId = null;
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const [rows] = await pool.query(
      `${BASE_ITEM_SELECT} WHERE i.id = ? AND i.deleted_at IS NULL`,
      [itemId]
    );

    if (rows.length === 0) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const item = rows[0];

    if (item.status === 'returned') {
      return next(
        new AppError(
          409,
          'INVALID_STATE',
          'Returned items cannot be edited. Reopen the item first if corrections are needed.'
        )
      );
    }

    if (!canEdit(req.user, item)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this item'));
    }

    const hasFields =
      req.body.title !== undefined ||
      req.body.description !== undefined ||
      req.body.location_found !== undefined ||
      req.body.date_found !== undefined;

    if (!hasFields && !req.file) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'At least one field or a new photo is required to update'
        )
      );
    }

    let imageUrl = item.image_url;
    let imagePublicId = item.image_public_id;
    const oldPublicId = item.image_public_id;

    if (req.file) {
      const uploaded = await uploadImage(req.file.buffer);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
      newUploadedPublicId = uploaded.publicId;
    }

    const updatedTitle = req.body.title !== undefined ? req.body.title : item.title;
    const updatedDescription =
      req.body.description !== undefined ? req.body.description : item.description;
    const updatedLocation =
      req.body.location_found !== undefined ? req.body.location_found : item.location_found;
    const updatedDateFound =
      req.body.date_found !== undefined ? req.body.date_found : item.date_found;

    await pool.query(
      `UPDATE items 
       SET title = ?, description = ?, location_found = ?, date_found = ?, image_url = ?, image_public_id = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updatedTitle,
        updatedDescription,
        updatedLocation,
        updatedDateFound,
        imageUrl,
        imagePublicId,
        itemId,
      ]
    );

    // If update succeeded and a new photo was uploaded, purge the old photo
    if (newUploadedPublicId && oldPublicId) {
      await deleteImage(oldPublicId);
    }

    const [updatedRows] = await pool.query(`${BASE_ITEM_SELECT} WHERE i.id = ?`, [itemId]);
    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    return res.status(200).json({
      item: formatItem(updatedRows[0], req.user, now, today),
    });
  } catch (err) {
    if (newUploadedPublicId) {
      await deleteImage(newUploadedPublicId);
    }
    next(err);
  }
};

export const returnItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const { returned_to } = req.body;

    const [result] = await pool.query(
      `UPDATE items 
       SET status = 'returned', returned_at = NOW(), returned_by = ?, returned_to = ?
       WHERE id = ? AND status = 'found' AND deleted_at IS NULL`,
      [req.user.id, returned_to || null, itemId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.query(
        'SELECT id, status, deleted_at FROM items WHERE id = ?',
        [itemId]
      );
      if (existing.length === 0 || existing[0].deleted_at !== null) {
        return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
      }
      return next(
        new AppError(409, 'INVALID_STATE', 'Item is not in found status or cannot be returned')
      );
    }

    const [rows] = await pool.query(`${BASE_ITEM_SELECT} WHERE i.id = ?`, [itemId]);
    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    return res.status(200).json({
      item: formatItem(rows[0], req.user, now, today),
    });
  } catch (err) {
    next(err);
  }
};

export const reopenItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const [rows] = await pool.query(
      'SELECT id, status, returned_at, deleted_at FROM items WHERE id = ? AND deleted_at IS NULL',
      [itemId]
    );

    if (rows.length === 0) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const item = rows[0];

    if (item.status !== 'returned') {
      return next(new AppError(409, 'INVALID_STATE', 'Only returned items can be reopened'));
    }

    const now = new Date();
    if (!canReopen(req.user, item, now)) {
      return next(
        new AppError(
          403,
          'RETENTION_WINDOW_EXPIRED',
          'The retention window to reopen this item has expired'
        )
      );
    }

    const [result] = await pool.query(
      `UPDATE items 
       SET status = 'found', returned_at = NULL, returned_by = NULL, returned_to = NULL
       WHERE id = ? AND status = 'returned' AND deleted_at IS NULL`,
      [itemId]
    );

    if (result.affectedRows === 0) {
      return next(
        new AppError(409, 'INVALID_STATE', 'Item could not be reopened in its current state')
      );
    }

    const [updatedRows] = await pool.query(`${BASE_ITEM_SELECT} WHERE i.id = ?`, [itemId]);
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    return res.status(200).json({
      item: formatItem(updatedRows[0], req.user, now, today),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const [rows] = await pool.query(
      'SELECT id, status, date_found, posted_by, created_at, returned_at, deleted_at FROM items WHERE id = ? AND deleted_at IS NULL',
      [itemId]
    );

    if (rows.length === 0) {
      return next(new AppError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    }

    const item = rows[0];
    const now = new Date();
    const today = todayInTimezone(now, itemsConfig.appTimezone);

    const deleteCheck = canDelete(req.user, item, now, today);
    if (!deleteCheck.allowed) {
      return next(
        new AppError(403, 'DELETE_NOT_ALLOWED', `Cannot delete item: ${deleteCheck.reason}`, {
          reason: deleteCheck.reason,
        })
      );
    }

    await pool.query(
      'UPDATE items SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL',
      [req.user.id, itemId]
    );

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export default {
  listItems,
  getItem,
  createItem,
  updateItem,
  returnItem,
  reopenItem,
  deleteItem,
};
