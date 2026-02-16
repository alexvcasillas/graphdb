import { describe, it, expect } from 'bun:test';
import { isEmptyObject } from '../src/utils/empty-object';

describe('isEmptyObject', () => {
  it('returns true for empty object', () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it('returns false for non-empty object', () => {
    expect(isEmptyObject({ name: 'Alex' })).toBe(false);
  });
});
