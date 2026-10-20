import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import usersConfig from '../config/users.js';

const userRowSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .max(150, 'Email must not exceed 150 characters')
    .email('Invalid email address'),
  role: z
    .string({ required_error: 'Role is required' })
    .trim()
    .superRefine((val, ctx) => {
      const lower = val.toLowerCase();
      if (lower === 'admin') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'admin accounts cannot be imported',
        });
        return;
      }
      if (lower !== 'teacher' && lower !== 'student') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role must be teacher or student',
        });
      }
    })
    .transform((val) => val.toLowerCase()),
  class: z
    .string()
    .trim()
    .max(50, 'Class must not exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' || val === undefined ? null : val)),
});

export function parseUsersCsv(buffer, maxRows = usersConfig.importMaxRows) {
  if (!buffer) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: 'No file content provided',
    };
  }

  // Check for XLSX / ZIP magic bytes ('PK')
  if (
    (Buffer.isBuffer(buffer) && buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) ||
    (typeof buffer === 'string' && buffer.startsWith('PK'))
  ) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: 'Excel (.xlsx) files are not supported. Please save or export your file as CSV (.csv) and try again.',
    };
  }

  // Check for binary / NUL bytes
  if (
    (Buffer.isBuffer(buffer) && buffer.includes(0x00)) ||
    (typeof buffer === 'string' && buffer.includes('\0'))
  ) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: 'Binary or non-text files are not supported. Please upload a valid CSV file.',
    };
  }

  let text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);

  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Detect delimiter from the first non-empty header line
  const lines = text.split(/\r\n|\r|\n/);
  const headerLine = lines.find((l) => l.trim().length > 0);

  if (!headerLine) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: 'CSV file contains zero data rows.',
    };
  }

  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  let detectedHeaders = [];
  let parsedRecords = [];

  try {
    parsedRecords = parse(text, {
      delimiter,
      bom: true,
      columns: (header) => {
        detectedHeaders = header.map((h) => h.trim().toLowerCase());
        return detectedHeaders;
      },
      skip_empty_lines: true,
      trim: true,
      info: true,
      relax_column_count: true,
    });
  } catch (err) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: `Malformed CSV file: ${err.message}`,
    };
  }

  // Validate required columns
  const requiredColumns = ['name', 'email', 'role'];
  const missingColumns = requiredColumns.filter((col) => !detectedHeaders.includes(col));
  if (missingColumns.length > 0) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: `Missing required column(s): ${missingColumns.join(', ')}`,
    };
  }

  // Check row count limits
  if (parsedRecords.length === 0) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: 'CSV file contains zero data rows.',
    };
  }

  if (parsedRecords.length > maxRows) {
    return {
      rows: [],
      rowErrors: [],
      duplicateRows: [],
      duplicates: [],
      fatalError: `CSV file contains ${parsedRecords.length} data rows, which exceeds the maximum limit of ${maxRows} rows.`,
    };
  }

  const rows = [];
  const rowErrors = [];
  const duplicateRows = [];
  const seenEmails = new Set();

  for (const item of parsedRecords) {
    const rawRecord = item.record || {};
    const lineNum = item.info?.lines || 0;

    const rowInput = {
      name: rawRecord.name !== undefined ? rawRecord.name : '',
      email: rawRecord.email !== undefined ? rawRecord.email : '',
      role: rawRecord.role !== undefined ? rawRecord.role : '',
      class: rawRecord.class !== undefined ? rawRecord.class : null,
    };

    const parseResult = userRowSchema.safeParse(rowInput);

    if (!parseResult.success) {
      const issues = parseResult.error.issues || parseResult.error.errors || [];
      const errors = issues.map((e) => e.message);
      rowErrors.push({
        row: lineNum,
        email: typeof rowInput.email === 'string' ? rowInput.email.trim().toLowerCase() : '',
        errors,
      });
      continue;
    }

    const validData = parseResult.data;
    if (seenEmails.has(validData.email)) {
      duplicateRows.push({
        row: lineNum,
        email: validData.email,
        reason: 'duplicate_in_file',
      });
      continue;
    }

    seenEmails.add(validData.email);
    rows.push({
      row: lineNum,
      name: validData.name,
      email: validData.email,
      role: validData.role,
      class_name: validData.class,
      class: validData.class,
    });
  }

  return {
    rows,
    rowErrors,
    duplicateRows,
    duplicates: duplicateRows,
    fatalError: null,
  };
}

export default { parseUsersCsv };
