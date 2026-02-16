import { describe, it, expect } from 'bun:test';
import { sortDocuments } from '../src/utils/sort-documents';
import type { Doc } from '@graphdb/types';

type TestDoc = { name: string; lastName: string; age: number };

const now = Date.now();
const docs: Doc<TestDoc>[] = [
  { _id: '1', name: 'Alex', lastName: 'Casillas', age: 29, createdAt: now - 5000, updatedAt: now },
  { _id: '2', name: 'Daniel', lastName: 'Casillas', age: 22, createdAt: now - 3000, updatedAt: now },
  { _id: '3', name: 'Antonio', lastName: 'Cobos', age: 35, createdAt: now - 8000, updatedAt: now },
  { _id: '4', name: 'John', lastName: 'Snow', age: 19, createdAt: now - 10000, updatedAt: now },
  { _id: '5', name: 'John', lastName: 'Doe', age: 40, createdAt: now - 7000, updatedAt: now },
  { _id: '6', name: 'Jane', lastName: 'Doe', age: 50, createdAt: now - 7500, updatedAt: now },
];

describe('sort-documents', () => {
  it('sorts by number ASC', () => {
    const sorted = sortDocuments(docs, { age: 'ASC' });
    expect(sorted.map(d => d.age)).toEqual([19, 22, 29, 35, 40, 50]);
  });

  it('sorts by number DESC', () => {
    const sorted = sortDocuments(docs, { age: 'DESC' });
    expect(sorted.map(d => d.age)).toEqual([50, 40, 35, 29, 22, 19]);
  });

  it('sorts by string ASC', () => {
    const sorted = sortDocuments(docs, { name: 'ASC' });
    expect(sorted[0].name).toBe('Alex');
    expect(sorted[sorted.length - 1].name).toBe('John');
  });

  it('sorts by numeric timestamp ASC', () => {
    const sorted = sortDocuments(docs, { createdAt: 'ASC' });
    // Earliest timestamp first
    expect(sorted[0]._id).toBe('4'); // -10000 (earliest)
    expect(sorted[sorted.length - 1]._id).toBe('2'); // -3000 (latest)
  });

  it('multi-field sort: lastName ASC then age ASC', () => {
    const sorted = sortDocuments(docs, { lastName: 'ASC', age: 'ASC' });
    // Casillas(22, 29), Cobos(35), Doe(40, 50), Snow(19)
    expect(sorted[0].lastName).toBe('Casillas');
    expect(sorted[0].age).toBe(22);
    expect(sorted[1].lastName).toBe('Casillas');
    expect(sorted[1].age).toBe(29);
    expect(sorted[2].lastName).toBe('Cobos');
    expect(sorted[3].lastName).toBe('Doe');
    expect(sorted[3].age).toBe(40);
    expect(sorted[4].lastName).toBe('Doe');
    expect(sorted[4].age).toBe(50);
    expect(sorted[5].lastName).toBe('Snow');
  });

  it('empty orderBy returns same order', () => {
    const sorted = sortDocuments(docs, {});
    expect(sorted.map(d => d._id)).toEqual(docs.map(d => d._id));
  });

  it('sorts with undefined values (docs missing the field)', () => {
    type Partial = { name: string; score?: number };
    const mixed: Doc<Partial>[] = [
      { _id: '1', name: 'A', score: 10, createdAt: now, updatedAt: now } as Doc<Partial>,
      { _id: '2', name: 'B', createdAt: now, updatedAt: now } as Doc<Partial>,
      { _id: '3', name: 'C', score: 5, createdAt: now, updatedAt: now } as Doc<Partial>,
    ];
    const sorted = sortDocuments(mixed, { score: 'ASC' });
    // Should not crash; docs with undefined score treated as equal via fallback
    expect(sorted.length).toBe(3);
  });

  it('sort stability: equal elements preserve insertion order', () => {
    type Simple = { group: string; seq: number };
    const items: Doc<Simple>[] = [
      { _id: '1', group: 'A', seq: 1, createdAt: now, updatedAt: now } as Doc<Simple>,
      { _id: '2', group: 'A', seq: 2, createdAt: now, updatedAt: now } as Doc<Simple>,
      { _id: '3', group: 'A', seq: 3, createdAt: now, updatedAt: now } as Doc<Simple>,
    ];
    const sorted = sortDocuments(items, { group: 'ASC' });
    // All have the same group, so insertion order should be preserved
    expect(sorted.map(d => d._id)).toEqual(['1', '2', '3']);
  });

  it('sorts with mixed/unsupported types without crashing', () => {
    type Mixed = { value: unknown };
    const items: Doc<Mixed>[] = [
      { _id: '1', value: true, createdAt: now, updatedAt: now } as Doc<Mixed>,
      { _id: '2', value: null, createdAt: now, updatedAt: now } as Doc<Mixed>,
      { _id: '3', value: { nested: 1 }, createdAt: now, updatedAt: now } as Doc<Mixed>,
    ];
    const sorted = sortDocuments(items, { value: 'ASC' });
    // Should not crash; unsupported types treated as equal
    expect(sorted.length).toBe(3);
  });
});
