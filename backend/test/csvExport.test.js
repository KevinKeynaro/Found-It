import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { neutralizeCell, buildUsersCsv } from '../src/services/csvExport.js';

describe('csvExport unit tests', () => {
  describe('neutralizeCell formula injection defense', () => {
    test('neutralizes formulas starting with =, +, -, @, \\t, \\r', () => {
      assert.equal(neutralizeCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
      assert.equal(neutralizeCell('+12345'), "'+12345");
      assert.equal(neutralizeCell('-cmd|...'), "'-cmd|...");
      assert.equal(neutralizeCell('@evil.com'), "'@evil.com");
      assert.equal(neutralizeCell('\talert(1)'), "'\talert(1)");
      assert.equal(neutralizeCell('\rcarriage'), "'\rcarriage");
    });

    test('leaves regular values untouched', () => {
      assert.equal(neutralizeCell('John Doe'), 'John Doe');
      assert.equal(neutralizeCell('john@school.test'), 'john@school.test');
      assert.equal(neutralizeCell('Class 10-A'), 'Class 10-A');
      assert.equal(neutralizeCell(123), '123');
      assert.equal(neutralizeCell(null), '');
      assert.equal(neutralizeCell(undefined), '');
    });
  });

  describe('buildUsersCsv', () => {
    const testUsers = [
      {
        id: 1,
        name: 'Teacher One',
        email: 't1@school.test',
        role: 'teacher',
        class_name: null,
        is_active: 1,
        created_at: new Date('2026-10-20T10:00:00Z'),
        password: 'SHOULD_NOT_LEAK',
        token_version: 3,
      },
      {
        id: 2,
        name: '=Dangerous Name',
        email: 's1@school.test',
        role: 'student',
        class_name: '10-A',
        is_active: 0,
        created_at: '2026-10-20 10:00:00',
      },
    ];

    test('includes UTF-8 BOM at the start of generated CSV', () => {
      const csv = buildUsersCsv(testUsers);
      assert.equal(csv.charCodeAt(0), 0xfeff);
    });

    test('contains exact required headers and no password data', () => {
      const csv = buildUsersCsv(testUsers);
      const lines = csv.replace(/^\ufeff/, '').trim().split('\n');
      assert.equal(lines[0].trim(), 'name,email,role,class,active,created_at');

      assert.equal(csv.includes('SHOULD_NOT_LEAK'), false);
      assert.equal(csv.includes('password'), false);
      assert.equal(csv.includes('token_version'), false);
    });

    test('applies cell neutralization to exported rows', () => {
      const csv = buildUsersCsv(testUsers);
      assert.ok(csv.includes("''=Dangerous Name") || csv.includes("'=Dangerous Name"));
    });

    test('supports semicolon delimiter', () => {
      const csv = buildUsersCsv(testUsers, ';');
      const lines = csv.replace(/^\ufeff/, '').trim().split('\n');
      assert.equal(lines[0].trim(), 'name;email;role;class;active;created_at');
    });
  });
});
