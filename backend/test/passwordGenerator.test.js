import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from '../src/services/passwordGenerator.js';

describe('passwordGenerator unit tests', () => {
  test('generates password with default length 12', () => {
    const pwd = generatePassword();
    assert.equal(pwd.length, 12);
  });

  test('respects custom length and enforces minimum 8 characters', () => {
    const pwd16 = generatePassword(16);
    assert.equal(pwd16.length, 16);

    const pwdMin = generatePassword(4);
    assert.equal(pwdMin.length, 8);
  });

  test('does not contain ambiguous characters (0, O, 1, l, I)', () => {
    const ambiguousChars = ['0', 'O', '1', 'l', 'I'];
    for (let i = 0; i < 100; i++) {
      const pwd = generatePassword(14);
      for (const char of ambiguousChars) {
        assert.equal(
          pwd.includes(char),
          false,
          `Password "${pwd}" contains ambiguous character "${char}"`
        );
      }
    }
  });

  test('satisfies password policy (lowercase, uppercase, digit)', () => {
    for (let i = 0; i < 100; i++) {
      const pwd = generatePassword(12);
      assert.ok(/[a-z]/.test(pwd), `Missing lowercase: ${pwd}`);
      assert.ok(/[A-Z]/.test(pwd), `Missing uppercase: ${pwd}`);
      assert.ok(/[0-9]/.test(pwd), `Missing digit: ${pwd}`);
      assert.ok(Buffer.byteLength(pwd, 'utf8') <= 72);
    }
  });

  test('generates unique passwords across multiple calls', () => {
    const set = new Set();
    const count = 500;
    for (let i = 0; i < count; i++) {
      set.add(generatePassword(12));
    }
    assert.equal(set.size, count);
  });
});
