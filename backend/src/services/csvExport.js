import { stringify } from 'csv-stringify/sync';

export function neutralizeCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function buildUsersCsv(users = [], delimiter = ',') {
  const delim = delimiter === ';' ? ';' : ',';

  const records = users.map((u) => {
    const rawClass = u.class_name !== undefined ? u.class_name : u.class;
    let isActiveStr = '';
    if (u.is_active !== undefined) {
      isActiveStr = u.is_active ? 'true' : 'false';
    } else if (u.active !== undefined) {
      isActiveStr = u.active ? 'true' : 'false';
    }

    let createdAtStr = '';
    if (u.created_at) {
      createdAtStr =
        u.created_at instanceof Date
          ? u.created_at.toISOString()
          : String(u.created_at);
    }

    return [
      neutralizeCell(u.name || ''),
      neutralizeCell(u.email || ''),
      neutralizeCell(u.role || ''),
      neutralizeCell(rawClass || ''),
      neutralizeCell(isActiveStr),
      neutralizeCell(createdAtStr),
    ];
  });

  const columns = ['name', 'email', 'role', 'class', 'active', 'created_at'];

  const csvBody = stringify(records, {
    header: true,
    columns,
    delimiter: delim,
  });

  // Include UTF-8 BOM for spreadsheet compatibility
  return '\uFEFF' + csvBody;
}

export default {
  neutralizeCell,
  buildUsersCsv,
};
