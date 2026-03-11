import { describe, test, expect } from 'bun:test';
import { parseCsvFields, parseCsvContent } from './csv-parser';

describe('parseCsvFields', () => {
  test('splits simple comma-separated values', () => {
    expect(parseCsvFields('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  test('handles quoted field with comma inside', () => {
    expect(parseCsvFields('"a,b",c')).toEqual(['a,b', 'c']);
  });

  test('handles escaped double quotes inside quoted field', () => {
    expect(parseCsvFields('"say ""hi"""')).toEqual(['say "hi"']);
  });

  test('handles empty middle field', () => {
    expect(parseCsvFields('a,,c')).toEqual(['a', '', 'c']);
  });

  test('handles trailing comma', () => {
    expect(parseCsvFields('a,b,')).toEqual(['a', 'b', '']);
  });

  test('trims whitespace from fields', () => {
    expect(parseCsvFields(' a , b ')).toEqual(['a', 'b']);
  });
});

describe('parseCsvContent', () => {
  test('parses valid 2-row CSV with header', () => {
    const csv = 'email,name\njane@example.com,Jane Doe\njohn@example.com,John Smith';
    const rows = parseCsvContent(csv, []);

    expect(rows).toHaveLength(2);
    expect(rows[0].email).toBe('jane@example.com');
    expect(rows[0].name).toBe('Jane Doe');
    expect(rows[0].valid).toBe(true);
    expect(rows[1].email).toBe('john@example.com');
    expect(rows[1].name).toBe('John Smith');
    expect(rows[1].valid).toBe(true);
  });

  test('marks invalid email with error', () => {
    const csv = 'email,name\nnot-an-email,Bob';
    const rows = parseCsvContent(csv, []);

    expect(rows).toHaveLength(1);
    expect(rows[0].valid).toBe(false);
    expect(rows[0].error).toBe('Invalid email format');
  });

  test('marks duplicate email within CSV as error', () => {
    const csv = 'email,name\na@b.com,First\na@b.com,Second';
    const rows = parseCsvContent(csv, []);

    expect(rows[0].valid).toBe(true);
    expect(rows[1].valid).toBe(false);
    expect(rows[1].error).toBe('Duplicate within import');
  });

  test('marks email already in existingEmails as error', () => {
    const csv = 'email,name\na@b.com,First';
    const rows = parseCsvContent(csv, ['a@b.com']);

    expect(rows[0].valid).toBe(false);
    expect(rows[0].error).toBe('Already added to this survey');
  });

  test('maps metadata columns to department, role, location, tenure', () => {
    const csv = 'email,name,department,role,location,tenure\na@b.com,Alice,Eng,Dev,NYC,3yr';
    const rows = parseCsvContent(csv, []);

    expect(rows[0].department).toBe('Eng');
    expect(rows[0].role).toBe('Dev');
    expect(rows[0].location).toBe('NYC');
    expect(rows[0].tenure).toBe('3yr');
  });

  test('returns empty array for empty string content', () => {
    const rows = parseCsvContent('', []);
    expect(rows).toEqual([]);
  });
});
