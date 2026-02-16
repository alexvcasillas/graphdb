import { describe, it, expect } from 'bun:test';
import { whereChecker } from '../src/utils/where-checker';
import type { Doc } from '@graphdb/types';

const doc = {
  _id: '1',
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
  createdAt: Date.now(),
  updatedAt: Date.now(),
} as Doc<{ name: string; lastName: string; age: number }>;

describe('where-checker', () => {
  // Numeric operators
  it('gt: true when property > value', () => {
    expect(whereChecker('age', { gt: 20 }, doc)).toBe(true);
  });
  it('gt: false when property <= value', () => {
    expect(whereChecker('age', { gt: 30 }, doc)).toBe(false);
  });
  it('gte: true when property >= value', () => {
    expect(whereChecker('age', { gte: 29 }, doc)).toBe(true);
  });
  it('gte: false when property < value', () => {
    expect(whereChecker('age', { gte: 30 }, doc)).toBe(false);
  });
  it('lt: true when property < value', () => {
    expect(whereChecker('age', { lt: 30 }, doc)).toBe(true);
  });
  it('lt: false when property >= value', () => {
    expect(whereChecker('age', { lt: 20 }, doc)).toBe(false);
  });
  it('lte: true when property <= value', () => {
    expect(whereChecker('age', { lte: 29 }, doc)).toBe(true);
  });
  it('lte: false when property > value', () => {
    expect(whereChecker('age', { lte: 28 }, doc)).toBe(false);
  });

  // Type mismatch
  it('returns false on type mismatch (string gt on number field)', () => {
    expect(whereChecker('age', { gte: '29' }, doc)).toBe(false);
  });

  // Unknown operator
  it('returns false on unknown operator', () => {
    expect(whereChecker('age', { wolo: '29' }, doc)).toBe(false);
  });

  // String operators
  it('eq: matches exact string', () => {
    expect(whereChecker('name', { eq: 'Alex' }, doc)).toBe(true);
  });
  it('notEq: true when different', () => {
    expect(whereChecker('name', { notEq: 'John' }, doc)).toBe(true);
  });
  it('includes: substring match', () => {
    expect(whereChecker('name', { includes: 'le' }, doc)).toBe(true);
  });
  it('startsWith: prefix match', () => {
    expect(whereChecker('name', { startsWith: 'Al' }, doc)).toBe(true);
  });
  it('endsWith: suffix match', () => {
    expect(whereChecker('name', { endsWith: 'ex' }, doc)).toBe(true);
  });

  // RegExp (v2 fix: top-level)
  it('top-level RegExp works', () => {
    expect(whereChecker('name', /Al/i, doc)).toBe(true);
  });
  it('top-level RegExp rejects non-match', () => {
    expect(whereChecker('name', /^Zz/, doc)).toBe(false);
  });

  // match operator
  it('match operator with RegExp', () => {
    expect(whereChecker('name', { match: /Al{1,1}/gi }, doc)).toBe(true);
  });

  // in operator
  it('in operator includes value', () => {
    expect(whereChecker('age', { in: [28, 29, 30] }, doc)).toBe(true);
  });
  it('in operator excludes value', () => {
    expect(whereChecker('age', { in: [1, 2, 3] }, doc)).toBe(false);
  });

  // Primitive equality
  it('primitive equality: number', () => {
    expect(whereChecker('age', 29, doc)).toBe(true);
  });
  it('primitive equality: string', () => {
    expect(whereChecker('name', 'Alex', doc)).toBe(true);
  });
  it('primitive inequality', () => {
    expect(whereChecker('name', 'Bob', doc)).toBe(false);
  });

  // Type mismatch: numeric operator on string field
  it('returns false for numeric operator on string field', () => {
    expect(whereChecker('name', { gt: 10 }, doc)).toBe(false);
  });

  // Type mismatch: string operator on numeric field
  it('returns false for string operator on numeric field', () => {
    expect(whereChecker('age', { includes: '29' }, doc)).toBe(false);
  });

  // Multiple operators in single clause
  it('multiple operators in single clause (gt + lt)', () => {
    expect(whereChecker('age', { gt: 10, lt: 50 }, doc)).toBe(true);
  });

  it('multiple operators in single clause: fails when one does not match', () => {
    expect(whereChecker('age', { gt: 10, lt: 25 }, doc)).toBe(false);
  });
});
