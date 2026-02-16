---
title: Quick Start
description: Create your first GraphDB database, add documents, and run queries.
---

This guide walks you through the core concepts of GraphDB in a few minutes.

## Create a database

```typescript
import { GraphDB } from '@graphdb/core';

const db = GraphDB();
```

`GraphDB()` is a factory function that returns a database instance. It holds a map of named collections.

## Define your model

GraphDB is TypeScript-first. Define your document shape as a plain type:

```typescript
interface User {
  name: string;
  email: string;
  age: number;
}
```

## Create a collection

```typescript
db.createCollection<User>('users', {
  indexes: ['email'], // optional: hash index for fast equality lookups
});

const users = db.getCollection<User>('users')!;
```

The generic `<User>` parameter gives you full type safety on all operations.

## Create a document

```typescript
const id = await users.create({
  name: 'Alex',
  email: 'alex@example.com',
  age: 29,
});

console.log(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

`create()` is async (to support syncers) and returns the generated `_id`.

## Read a document

```typescript
const user = users.read(id);
console.log(user);
// {
//   _id: "550e8400-...",
//   name: "Alex",
//   email: "alex@example.com",
//   age: 29,
//   createdAt: 1700000000000,
//   updatedAt: 1700000000000
// }
```

Every document is wrapped in `Doc<T>`, which adds `_id`, `createdAt`, and `updatedAt` (epoch milliseconds).

## Query documents

```typescript
// Find all users over 25
const results = users.query({ age: { gt: 25 } });

// Find one user by email
const user = users.findOne({ email: 'alex@example.com' });
```

`query()` always returns `Doc<T>[]` (never null). `findOne()` returns `Doc<T> | null`.

## Update a document

```typescript
const updated = await users.update(id, { age: 30 });
console.log(updated.age); // 30
console.log(updated.updatedAt); // new timestamp
```

Only the fields you pass in the patch are changed. `updatedAt` is automatically refreshed.

## Remove a document

```typescript
const result = await users.remove(id);
console.log(result); // { removedId: "550e8400-...", acknowledge: true }
```

## Listen to changes

```typescript
// Collection-level events
const cancel = users.on('create', ({ doc }) => {
  console.log('New user:', doc.name);
});

// Per-document listener
const cancelDoc = users.listen(id, (payload) => {
  console.log('Document changed:', payload);
});

// Unsubscribe
cancel();
cancelDoc();
```

## Next steps

- [CRUD Operations](/guides/crud-operations/) — Full details on create, read, update, and remove
- [Querying](/guides/querying/) — All where clause operators and query options
- [Indexes](/guides/indexes/) — When and how to use hash indexes
- [Listeners & Events](/guides/listeners-events/) — Real-time event system
- [Syncers](/guides/syncers/) — Backend synchronization
