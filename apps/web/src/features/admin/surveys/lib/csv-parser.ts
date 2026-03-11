/**
 * RFC 4180-compliant CSV parser for recipient bulk import.
 * Validates emails, detects duplicates, and maps metadata columns.
 */

export interface ParsedRecipient {
  email: string;
  name?: string;
  segmentMetadata?: Record<string, string>;
}

export interface ParsedRow {
  email: string;
  name: string;
  department: string;
  role: string;
  location: string;
  tenure: string;
  valid: boolean;
  error: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 4180-compliant CSV field parser: splits on commas, respecting double-quoted fields. */
export function parseCsvFields(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCsvContent(content: string, existingEmails: string[]): ParsedRow[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  // Detect header row
  const firstLine = lines[0].toLowerCase().trim();
  const hasHeader = firstLine.includes('email') || firstLine.includes('name');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const seenEmails = new Set<string>();
  const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));

  return dataLines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = parseCsvFields(line);
      const email = (parts[0] ?? '').toLowerCase().trim();
      const name = (parts[1] ?? '').trim();
      const department = (parts[2] ?? '').trim();
      const role = (parts[3] ?? '').trim();
      const location = (parts[4] ?? '').trim();
      const tenure = (parts[5] ?? '').trim();

      let valid = true;
      let error: string | null = null;

      if (!email) {
        valid = false;
        error = 'Email is required';
      } else if (!EMAIL_REGEX.test(email)) {
        valid = false;
        error = 'Invalid email format';
      } else if (seenEmails.has(email)) {
        valid = false;
        error = 'Duplicate within import';
      } else if (existingSet.has(email)) {
        valid = false;
        error = 'Already added to this survey';
      }

      if (email) seenEmails.add(email);

      return { email, name, department, role, location, tenure, valid, error };
    });
}
