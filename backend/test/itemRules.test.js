import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayInTimezone,
  isOverdue,
  canView,
  canEdit,
  canReturn,
  canReopen,
  canDelete,
  permissionsFor,
} from '../src/services/itemRules.js';

describe('itemRules business logic tests', () => {
  const adminUser = { id: 1, role: 'admin' };
  const teacherUser = { id: 2, role: 'teacher' };
  const otherTeacherUser = { id: 3, role: 'teacher' };
  const studentUser = { id: 4, role: 'student' };

  describe('todayInTimezone', () => {
    test('formats a given UTC instant to Jakarta calendar date', () => {
      // 2026-10-20 18:00 UTC is 2026-10-21 01:00 in Asia/Jakarta (UTC+7)
      const date = new Date('2026-10-20T18:00:00Z');
      const result = todayInTimezone(date, 'Asia/Jakarta');
      assert.equal(result, '2026-10-21');
    });

    test('formats standard UTC day', () => {
      const date = new Date('2026-10-20T05:00:00Z');
      const result = todayInTimezone(date, 'Asia/Jakarta');
      assert.equal(result, '2026-10-20');
    });
  });

  describe('isOverdue and overdue boundary', () => {
    const today = '2026-10-20';

    test('item found 29 days ago is not overdue (boundary: day 29)', () => {
      const item = { status: 'found', date_found: '2026-09-21' };
      assert.equal(isOverdue(item, today, 30), false);
    });

    test('item found exactly 30 days ago is overdue (boundary: day 30)', () => {
      const item = { status: 'found', date_found: '2026-09-20' };
      assert.equal(isOverdue(item, today, 30), true);
    });

    test('item found 31 days ago is overdue', () => {
      const item = { status: 'found', date_found: '2026-09-19' };
      assert.equal(isOverdue(item, today, 30), true);
    });

    test('returned item is never considered overdue', () => {
      const item = { status: 'returned', date_found: '2026-09-01' };
      assert.equal(isOverdue(item, today, 30), false);
    });
  });

  describe('canView across roles and statuses', () => {
    const today = '2026-10-20';
    const activeItem = { id: 1, status: 'found', date_found: '2026-10-10' };
    const overdueItem = { id: 2, status: 'found', date_found: '2026-09-01' };
    const returnedItem = { id: 3, status: 'returned', date_found: '2026-10-10' };
    const deletedItem = { id: 4, status: 'found', date_found: '2026-10-10', deleted_at: new Date() };

    test('deleted items are never viewable by any role', () => {
      assert.equal(canView(studentUser, deletedItem, today), false);
      assert.equal(canView(teacherUser, deletedItem, today), false);
      assert.equal(canView(adminUser, deletedItem, today), false);
    });

    test('students can view only active, non-overdue found items', () => {
      assert.equal(canView(studentUser, activeItem, today), true);
      assert.equal(canView(studentUser, overdueItem, today), false);
      assert.equal(canView(studentUser, returnedItem, today), false);
    });

    test('teachers and admins can view active, overdue, and returned items', () => {
      for (const user of [teacherUser, adminUser]) {
        assert.equal(canView(user, activeItem, today), true);
        assert.equal(canView(user, overdueItem, today), true);
        assert.equal(canView(user, returnedItem, today), true);
      }
    });
  });

  describe('canEdit and canReturn', () => {
    const foundItem = { id: 1, status: 'found' };
    const returnedItem = { id: 2, status: 'returned' };
    const deletedItem = { id: 3, status: 'found', deleted_at: new Date() };

    test('canEdit allows teacher/admin on active found item only', () => {
      assert.equal(canEdit(adminUser, foundItem), true);
      assert.equal(canEdit(teacherUser, foundItem), true);
      assert.equal(canEdit(studentUser, foundItem), false);
      assert.equal(canEdit(teacherUser, returnedItem), false);
      assert.equal(canEdit(teacherUser, deletedItem), false);
    });

    test('canReturn allows teacher/admin on found item (including overdue)', () => {
      assert.equal(canReturn(adminUser, foundItem), true);
      assert.equal(canReturn(teacherUser, foundItem), true);
      assert.equal(canReturn(studentUser, foundItem), false);
      assert.equal(canReturn(teacherUser, returnedItem), false);
      assert.equal(canReturn(teacherUser, deletedItem), false);
    });
  });

  describe('canReopen and retention boundaries', () => {
    const baseReturnedAt = new Date('2026-10-15T12:00:00Z');
    const retentionDays = 5; // Window ends 2026-10-20T12:00:00Z

    const returnedItem = {
      id: 1,
      status: 'returned',
      returned_at: baseReturnedAt,
    };
    const foundItem = { id: 2, status: 'found' };
    const deletedItem = { id: 3, status: 'returned', returned_at: baseReturnedAt, deleted_at: new Date() };

    test('admin can reopen returned items at any time', () => {
      const farFuture = new Date('2026-11-01T12:00:00Z');
      assert.equal(canReopen(adminUser, returnedItem, farFuture, retentionDays), true);
    });

    test('teacher can reopen 1 second before retention window expires (boundary)', () => {
      const justBefore = new Date('2026-10-20T11:59:59Z');
      assert.equal(canReopen(teacherUser, returnedItem, justBefore, retentionDays), true);
    });

    test('teacher cannot reopen exactly at retention window expiration (boundary)', () => {
      const exactExpiry = new Date('2026-10-20T12:00:00Z');
      assert.equal(canReopen(teacherUser, returnedItem, exactExpiry, retentionDays), false);
    });

    test('teacher cannot reopen after retention window expires', () => {
      const afterExpiry = new Date('2026-10-20T12:00:01Z');
      assert.equal(canReopen(teacherUser, returnedItem, afterExpiry, retentionDays), false);
    });

    test('cannot reopen found or deleted items', () => {
      assert.equal(canReopen(adminUser, foundItem), false);
      assert.equal(canReopen(adminUser, deletedItem), false);
    });
  });

  describe('canDelete and self-delete 23h59m vs 24h01m boundaries', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    const today = '2026-10-20';

    test('students are never allowed to delete items', () => {
      const item = { id: 1, status: 'found', posted_by: studentUser.id, created_at: now };
      const res = canDelete(studentUser, item, now, today);
      assert.equal(res.allowed, false);
      assert.equal(res.reason, 'ROLE_NOT_AUTHORIZED');
    });

    test('admin is always allowed to delete non-deleted items', () => {
      const item = { id: 1, status: 'found', posted_by: teacherUser.id, created_at: now };
      const res = canDelete(adminUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'ADMIN_FULL_ACCESS');
    });

    test('already deleted items cannot be deleted again', () => {
      const item = { id: 1, status: 'found', deleted_at: new Date() };
      const res = canDelete(adminUser, item, now, today);
      assert.equal(res.allowed, false);
      assert.equal(res.reason, 'ALREADY_DELETED');
    });

    test('teacher deleting own fresh item at 23h 59m is allowed (boundary)', () => {
      const createdAt = new Date(now.getTime() - (23 * 60 + 59) * 60 * 1000);
      const item = { id: 1, status: 'found', posted_by: teacherUser.id, created_at: createdAt, date_found: '2026-10-20' };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'SELF_DELETE_WINDOW');
    });

    test('teacher deleting own item at exactly 24h 00m is allowed (boundary)', () => {
      const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const item = { id: 1, status: 'found', posted_by: teacherUser.id, created_at: createdAt, date_found: '2026-10-20' };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'SELF_DELETE_WINDOW');
    });

    test('teacher deleting own item at 24h 01m is rejected (boundary)', () => {
      const createdAt = new Date(now.getTime() - (24 * 60 + 1) * 60 * 1000);
      const item = { id: 1, status: 'found', posted_by: teacherUser.id, created_at: createdAt, date_found: '2026-10-20' };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, false);
      assert.equal(res.reason, 'SELF_DELETE_WINDOW_EXPIRED');
    });

    test('teacher cannot delete another teacher fresh item within 24h', () => {
      const createdAt = new Date(now.getTime() - 60 * 60 * 1000);
      const item = { id: 1, status: 'found', posted_by: otherTeacherUser.id, created_at: createdAt, date_found: '2026-10-20' };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, false);
      assert.equal(res.reason, 'NOT_POSTED_BY_USER');
    });

    test('teacher can delete overdue item regardless of owner', () => {
      const item = {
        id: 1,
        status: 'found',
        posted_by: otherTeacherUser.id,
        created_at: new Date('2026-08-01T00:00:00Z'),
        date_found: '2026-08-01',
      };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'ITEM_OVERDUE');
    });

    test('teacher deleting returned item within retention window is rejected (boundary)', () => {
      const returnedAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
      const item = { id: 1, status: 'returned', returned_at: returnedAt, posted_by: teacherUser.id };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, false);
      assert.equal(res.reason, 'RETURNED_WITHIN_RETENTION');
    });

    test('teacher deleting returned item at exactly retention expiry is allowed (boundary: exactly 5 days)', () => {
      const returnedAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // exactly 5 days
      const item = { id: 1, status: 'returned', returned_at: returnedAt, posted_by: teacherUser.id };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'RETENTION_EXPIRED');
    });

    test('teacher deleting returned item after retention window is allowed', () => {
      const returnedAt = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
      const item = { id: 1, status: 'returned', returned_at: returnedAt, posted_by: teacherUser.id };
      const res = canDelete(teacherUser, item, now, today);
      assert.equal(res.allowed, true);
      assert.equal(res.reason, 'RETENTION_EXPIRED');
    });
  });

  describe('permissionsFor summary object', () => {
    test('returns accurate boolean map', () => {
      const now = new Date('2026-10-20T12:00:00Z');
      const item = {
        id: 1,
        status: 'found',
        posted_by: teacherUser.id,
        created_at: now,
        date_found: '2026-10-20',
      };
      const perms = permissionsFor(teacherUser, item, now);
      assert.deepEqual(perms, {
        can_edit: true,
        can_return: true,
        can_reopen: false,
        can_delete: true,
      });
    });
  });
});
