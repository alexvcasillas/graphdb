---
title: Bulk Operations
description: Populate, update, and remove documents in bulk.
---

GraphDB provides several methods for working with documents in bulk: `populate()` for loading data, `updateMany()` and `removeMany()` for batch mutations, and `clear()` for resetting a collection.

## Setup

All examples use the following setup:

```typescript
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();
const users = db.createCollection<User>('users', {
  indexes: ['email', 'age'],
});
```

## `populate(docs)`

Load an array of pre-existing documents into a collection. This is useful for hydrating the store from an API response, local storage, or a server-side snapshot.

```typescript
const docs: Doc<User>[] = [
  { _id: 'u1', name: 'Alice', email: 'alice@example.com', age: 30, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { _id: 'u2', name: 'Bob', email: 'bob@example.com', age: 25, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { _id: 'u3', name: 'Carol', email: 'carol@example.com', age: 35, createdAt: 1700000000000, updatedAt: 1700000000000 },
];

users.populate(docs);
```

### Validation

Every document passed to `populate()` must have an `_id` field. If any document is missing `_id`, the operation will throw an error.

### Duplicate handling

If multiple documents share the same `_id`, the last one wins. This also applies when populating over existing data: documents with matching IDs are overwritten.

```typescript
users.populate([
  { _id: 'u1', name: 'Alice V1', email: 'v1@example.com', age: 30, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { _id: 'u1', name: 'Alice V2', email: 'v2@example.com', age: 31, createdAt: 1700000000000, updatedAt: 1700000000000 },
]);

const alice = users.read('u1');
// alice.name === 'Alice V2'
```

### Index rebuilding

After population, all indexes defined on the collection are rebuilt to reflect the new data. You do not need to manage indexes manually.

### Populate event

The `populate` event fires once after all documents are loaded, with the count of documents that were populated.

```typescript
users.on('populate', (payload) => {
  console.log(`Loaded ${payload.count} users`);
});

users.populate(docs); // Logs: "Loaded 3 users"
```

### Typical use case: hydrating from an API

```typescript
const response = await fetch('/api/users');
const data: Doc<User>[] = await response.json();
users.populate(data);
```

## `updateMany(where, patch)`

Find all documents matching a query and apply a patch to each one. Documents are updated sequentially. Returns an array of the updated documents.

```typescript
// Give everyone over 30 an age bump
const updated: Doc<User>[] = await users.updateMany(
  { age: { gt: 30 } },
  { age: 36 }
);

console.log(updated.length); // Number of documents updated
```

Each update triggers individual `update` events and per-document listeners, and each update goes through the syncer if one is configured.

### Use case: batch status changes

```typescript
type Task = { title: string; status: string; assignee: string };

const tasks = db.createCollection<Task>('tasks');

// Mark all of Alice's tasks as complete
await tasks.updateMany(
  { assignee: 'Alice', status: 'in-progress' },
  { status: 'complete' }
);
```

## `removeMany(where)`

Find all documents matching a query and remove each one sequentially. Returns an array of `RemoveResult` objects.

```typescript
// Remove all users under 18
const results: RemoveResult[] = await users.removeMany({ age: { lt: 18 } });

for (const result of results) {
  console.log(`Removed: ${result.removedId}, acknowledged: ${result.acknowledge}`);
}
```

Each removal triggers individual `remove` events and per-document listeners, and each removal goes through the syncer if one is configured.

### Use case: cleanup expired records

```typescript
type Session = { userId: string; expiresAt: number };

const sessions = db.createCollection<Session>('sessions');

const now = Date.now();
await sessions.removeMany({ expiresAt: { lt: now } });
```

## `clear()`

Remove all documents from the collection and reset all indexes. No events are emitted.

```typescript
users.clear();

console.log(users.count()); // 0
```

### Use case: resetting state

`clear()` is useful for tests, logout flows, or any scenario where you need to start fresh without destroying and recreating the collection.

```typescript
// In a test
beforeEach(() => {
  users.clear();
});

// On logout
function logout() {
  users.clear();
  sessions.clear();
}
```

## Summary

| Method       | Returns           | Emits events | Goes through syncers |
| ------------ | ----------------- | ------------ | -------------------- |
| `populate`   | `void`            | `populate`   | No                   |
| `updateMany` | `Doc<T>[]`        | `update` per doc | Yes              |
| `removeMany` | `RemoveResult[]`  | `remove` per doc | Yes              |
| `clear`      | `void`            | None         | No                   |
