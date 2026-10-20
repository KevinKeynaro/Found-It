import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseUsersCsv } from '../src/services/csvImport.js';

describe('csvImport unit tests', () => {
  test('parses standard comma-delimited CSV with UTF-8 BOM', () => {
    const csvWithBom = '\ufeffname,email,role,class\nAlice,alice@school.test,teacher,\nBob,bob@school.test,student,10A';
    const res = parseUsersCsv(Buffer.from(csvWithBom));

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 2);
    assert.equal(res.rows[0].name, 'Alice');
    assert.equal(res.rows[0].email, 'alice@school.test');
    assert.equal(res.rows[0].role, 'teacher');
    assert.equal(res.rows[0].class_name, null);
    assert.equal(res.rows[1].name, 'Bob');
    assert.equal(res.rows[1].role, 'student');
    assert.equal(res.rows[1].class_name, '10A');
  });

  test('auto-detects semicolon delimiter and strips whitespace', () => {
    const csvSemicolon = ' name ; email ; role ; class \n Charlie ; charlie@school.test ; Teacher ; 11B ';
    const res = parseUsersCsv(csvSemicolon);

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].name, 'Charlie');
    assert.equal(res.rows[0].email, 'charlie@school.test');
    assert.equal(res.rows[0].role, 'teacher');
    assert.equal(res.rows[0].class_name, '11B');
  });

  test('handles blank lines and preserves correct spreadsheet row numbering', () => {
    // Row 1: header
    // Row 2: empty
    // Row 3: Alice
    // Row 4: empty
    // Row 5: Bob
    const csv = 'name,email,role,class\n\nAlice,alice@school.test,teacher,\n\nBob,bob@school.test,student,10A';
    const res = parseUsersCsv(csv);

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 2);
    assert.equal(res.rows[0].row, 3);
    assert.equal(res.rows[1].row, 5);
  });

  test('rejects missing required columns with fatal error', () => {
    const csvMissingRole = 'name,email,class\nAlice,alice@test.com,10A';
    const res = parseUsersCsv(csvMissingRole);

    assert.ok(res.fatalError);
    assert.match(res.fatalError, /Missing required column\(s\): role/);
  });

  test('rejects admin role with specific error message', () => {
    const csv = 'name,email,role,class\nSuperAdmin,admin@school.test,admin,';
    const res = parseUsersCsv(csv);

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 0);
    assert.equal(res.rowErrors.length, 1);
    assert.equal(res.rowErrors[0].row, 2);
    assert.ok(
      res.rowErrors[0].errors.some((msg) => msg === 'admin accounts cannot be imported')
    );
  });

  test('normalizes case-insensitive roles (Teacher -> teacher, STUDENT -> student)', () => {
    const csv = 'name,email,role\nT1,t1@school.test,Teacher\nS1,s1@school.test,STUDENT';
    const res = parseUsersCsv(csv);

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 2);
    assert.equal(res.rows[0].role, 'teacher');
    assert.equal(res.rows[1].role, 'student');
  });

  test('identifies duplicate emails inside the file and tags duplicate_in_file', () => {
    const csv = 'name,email,role\nFirst,dupe@school.test,teacher\nSecond,dupe@school.test,student';
    const res = parseUsersCsv(csv);

    assert.equal(res.fatalError, null);
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].name, 'First');

    assert.equal(res.duplicateRows.length, 1);
    assert.equal(res.duplicateRows[0].row, 3);
    assert.equal(res.duplicateRows[0].email, 'dupe@school.test');
    assert.equal(res.duplicateRows[0].reason, 'duplicate_in_file');
  });

  test('rejects empty file or zero data rows', () => {
    const emptyRes = parseUsersCsv('');
    assert.ok(emptyRes.fatalError);

    const headerOnly = parseUsersCsv('name,email,role,class\n');
    assert.ok(headerOnly.fatalError);
    assert.match(headerOnly.fatalError, /zero data rows/);
  });

  test('rejects file exceeding max row limit', () => {
    const lines = ['name,email,role'];
    for (let i = 1; i <= 10; i++) {
      lines.push(`User${i},user${i}@school.test,student`);
    }
    const csv = lines.join('\n');
    const res = parseUsersCsv(csv, 5); // limit = 5

    assert.ok(res.fatalError);
    assert.match(res.fatalError, /exceeds the maximum limit of 5 rows/);
  });

  test('rejects XLSX file signature (PK) with message to save as CSV', () => {
    const xlsxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const res = parseUsersCsv(xlsxBuffer);

    assert.ok(res.fatalError);
    assert.match(res.fatalError, /Excel \(\.xlsx\) files are not supported/);
  });

  test('rejects binary file containing NUL bytes', () => {
    const binBuffer = Buffer.from('name,email,role\nAlice\0,alice@school.test,teacher');
    const res = parseUsersCsv(binBuffer);

    assert.ok(res.fatalError);
    assert.match(res.fatalError, /Binary or non-text files are not supported/);
  });
});
