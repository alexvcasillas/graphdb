import type { Doc, WhereClause } from '@graphdb/types';

export function whereChecker<T>(
  property: string,
  clause: unknown,
  doc: Doc<T>,
): boolean {
  const value = (doc as Record<string, unknown>)[property];

  // RegExp at top level: { name: /re/i }
  if (clause instanceof RegExp) {
    return clause.test(String(value));
  }

  // Primitive equality: { name: 'Alex' } or { age: 29 }
  if (typeof clause !== 'object' || clause === null) {
    return value === clause;
  }

  // Object clause: { gt, gte, lt, lte, eq, notEq, includes, startsWith, endsWith, match, in }
  const where = clause as WhereClause;
  for (const [op, operand] of Object.entries(where)) {
    if (operand === undefined) continue;

    if (op === 'match' && operand instanceof RegExp) {
      if (!operand.test(String(value))) return false;
      continue;
    }

    if (op === 'in' && Array.isArray(operand)) {
      if (!operand.includes(value)) return false;
      continue;
    }

    if (op === 'eq') {
      if (value !== operand) return false;
      continue;
    }
    if (op === 'notEq') {
      if (value === operand) return false;
      continue;
    }

    // Numeric operators
    if (typeof operand === 'number' && typeof value === 'number') {
      if (op === 'gt' && !(value > operand)) return false;
      else if (op === 'gte' && !(value >= operand)) return false;
      else if (op === 'lt' && !(value < operand)) return false;
      else if (op === 'lte' && !(value <= operand)) return false;
      continue;
    }

    // String operators
    if (typeof operand === 'string' && typeof value === 'string') {
      if (op === 'includes' && !value.includes(operand)) return false;
      else if (op === 'startsWith' && !value.startsWith(operand)) return false;
      else if (op === 'endsWith' && !value.endsWith(operand)) return false;
      continue;
    }

    // Type mismatch or unknown operator
    return false;
  }

  return true;
}
