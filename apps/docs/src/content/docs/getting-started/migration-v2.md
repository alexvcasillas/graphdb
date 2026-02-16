---
title: Migration to v2
description: All breaking changes in GraphDB v2 with before/after code comparisons.
---

GraphDB v2 is a ground-up rewrite. This guide covers every breaking change with migration examples.

## Timestamp field rename

The `updateAt` field has been renamed to `updatedAt` (with the "d").

```typescript
// v1
doc.updateAt; // Date object

// v2
doc.updatedAt; // number (epoch ms)
```

## Timestamps are numbers

Timestamps are now epoch milliseconds (`number`), not `Date` objects. This removes the `date-fns` dependency.

```typescript
// v1
doc.createdAt; // Date
doc.updateAt;  // Date

// v2
doc.createdAt; // 1700000000000
doc.updatedAt; // 1700000000000

// Convert to Date if needed
new Date(doc.createdAt);
```

## query() always returns an array

In v1, `query()` could return a single document or `null`. In v2, it always returns `Doc<T>[]`.

```typescript
// v1
const result = col.query({ name: 'Alex' }); // Doc<T> | Doc<T>[] | null

// v2
const result = col.query({ name: 'Alex' }); // Doc<T>[] (always)
```

Use the new `findOne()` method to get a single document:

```typescript
// v2 — get a single document
const user = col.findOne({ name: 'Alex' }); // Doc<T> | null
```

## Zero runtime dependencies

GraphDB v2 has no runtime dependencies:

- **Removed `uuid`**: Uses `crypto.randomUUID()` (Node 18+, all Bun versions)
- **Removed `date-fns`**: Uses `Date.now()` for epoch milliseconds

## Listener payloads changed

Event payloads are now typed objects instead of positional arguments.

```typescript
// v1
col.on('create', (doc) => { ... });
col.on('update', (before, after) => { ... });
col.on('remove', (doc) => { ... });

// v2
col.on('create', ({ doc }) => { ... });
col.on('update', ({ before, after, patch }) => { ... });
col.on('remove', ({ doc }) => { ... });
col.on('populate', ({ count }) => { ... });      // new
col.on('syncError', ({ op, error, docId }) => { ... }); // new
```

## Skip edge cases fixed

```typescript
// v1 — skip: 0 might have been treated as falsy
col.query({}, { skip: 0 }); // inconsistent

// v2 — skip: 0 is valid, returns all results
col.query({}, { skip: 0 }); // returns all docs

// v2 — skip >= length returns empty array
col.query({}, { skip: 100 }); // [] (not undefined/error)
```

## Query pipeline order fixed

The query pipeline is now consistently: **filter -> sort -> skip -> limit**.

```typescript
// v2 — sort happens before skip/limit
col.query({}, {
  orderBy: { age: 'ASC' },
  skip: 1,
  limit: 2,
});
// Filters first, sorts by age, then skips 1 and takes 2
```

## Multi-field sort fixed

Multi-field sort now correctly evaluates keys in order. The first non-zero comparison decides the order.

```typescript
col.query({}, {
  orderBy: { lastName: 'ASC', age: 'ASC' },
});
// Sorts by lastName first, then by age within same lastName
```

## Top-level RegExp in where clause

RegExp now works at the top level of where clauses:

```typescript
// v2 — both forms work
col.query({ name: /^al/i });              // top-level RegExp
col.query({ name: { match: /^al/i } });   // operator form
```

## Async/sync error handling

Sync errors are no longer swallowed. Failed syncs properly revert the optimistic write and throw.

```typescript
// v2 — sync failures throw and revert
try {
  await col.create({ name: 'Alex', ... });
} catch (err) {
  // Document was NOT persisted (reverted)
  // syncError event was also emitted
}
```

## Populate validates _id

`populate()` now validates that every document has an `_id` field. Duplicates overwrite (last wins).

```typescript
// v2 — throws if any doc is missing _id
col.populate([
  { _id: '1', name: 'Alex', ... }, // ok
  { name: 'No ID', ... },          // throws!
]);
```

## Map/Set for listeners

Listeners use `Map` and `Set` internally for O(1) unsubscribe performance instead of arrays.

```typescript
// v2 — cancel function removes listener in O(1)
const cancel = col.on('create', handler);
cancel(); // O(1) removal, no array splice
```

## New APIs

These methods are new in v2:

| Method | Description |
|--------|-------------|
| `findOne(where)` | Returns `Doc<T> \| null` |
| `count(where?)` | Returns number of matching documents |
| `exists(id)` | Returns `boolean` |
| `clear()` | Removes all documents from collection |
| `updateMany(where, patch)` | Updates all matching documents |
| `removeMany(where)` | Removes all matching documents |
| `on('populate', fn)` | Listen for bulk populate events |
| `on('syncError', fn)` | Listen for sync errors |
