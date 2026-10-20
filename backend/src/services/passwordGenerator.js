import crypto from 'node:crypto';

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'; // no l
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O
const DIGITS = '23456789'; // no 0, 1
const UNAMBIGUOUS_ALPHABET = LOWERCASE + UPPERCASE + DIGITS;

export function generatePassword(length = 12) {
  const targetLength = Math.max(8, length);

  // Guarantee at least 1 lower, 1 upper, 1 digit to satisfy password requirements
  const chars = [
    LOWERCASE[crypto.randomInt(0, LOWERCASE.length)],
    UPPERCASE[crypto.randomInt(0, UPPERCASE.length)],
    DIGITS[crypto.randomInt(0, DIGITS.length)],
  ];

  for (let i = chars.length; i < targetLength; i++) {
    const idx = crypto.randomInt(0, UNAMBIGUOUS_ALPHABET.length);
    chars.push(UNAMBIGUOUS_ALPHABET[idx]);
  }

  // Fisher-Yates shuffle using crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export default { generatePassword };
