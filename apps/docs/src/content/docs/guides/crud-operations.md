---
title: CRUD Operations
description: Create, read, update, and remove documents in GraphDB.
---

GraphDB provides a straightforward API for managing documents. Read operations are **synchronous** while write operations (create, update, remove) are **asynchronous** to support syncer integration.

All examples below use this setup:

```ts
import { GraphDB } from "@graphdb/core";

type User = {
  name: string;
  email: string;
  age: number;
};

const db = GraphDB();
const users = db.createCollection<User>("users");
```

## Create

`create()` is async. It generates a unique `_id` via `crypto.randomUUID()`, sets `createdAt` and `updatedAt` timestamps (epoch milliseconds), and returns the new document's ID.

```ts
const id = await users.create({
  name: "Alex",
  email: "alex@example.com",
  age: 30,
});

console.log(id); // "a1b2c3d4-..."
```

The stored document has the shape `Doc<User>`:

```ts
{
  _id: "a1b2c3d4-...",
  createdAt: 1708099200000,
  updatedAt: 1708099200000,
  name: "Alex",
  email: "alex@example.com",
  age: 30,
}
```

If a syncer is configured with a `create` function, GraphDB writes the document optimistically and then calls the syncer. If the syncer returns `false` or throws, the document is automatically reverted (removed) and a `syncError` event is emitted.

## Read

`read()` is **synchronous**. It takes a document ID and returns `Doc<User> | null`.

```ts
const user = users.read(id);

if (user) {
  console.log(user.name); // "Alex"
  console.log(user._id); // "a1b2c3d4-..."
  console.log(user.createdAt); // 1708099200000
}
```

If no document exists with the given ID, `read()` returns `null`:

```ts
const missing = users.read("nonexistent-id");
console.log(missing); // null
```

## Update

`update()` is async. It takes a document ID and a partial patch object. Only the fields you provide are updated; the rest remain unchanged. The `updatedAt` timestamp is refreshed automatically. It returns the full updated `Doc<User>`.

```ts
const updated = await users.update(id, { age: 31 });

console.log(updated.age); // 31
console.log(updated.name); // "Alex" (unchanged)
console.log(updated.updatedAt); // new timestamp, greater than createdAt
```

### Error cases

Calling `update()` without an ID throws:

```ts
await users.update("", { age: 31 });
// Error: "You must provide the GraphDocument ID that you would like to update."
```

Updating a document that does not exist throws:

```ts
await users.update("nonexistent-id", { age: 31 });
// Error: "No document to update found with ID: nonexistent-id"
```

### Syncer interaction

If a syncer is configured with an `update` function, GraphDB applies the patch optimistically and then calls the syncer. If the syncer fails, the document is automatically reverted to its previous state and a `syncError` event is emitted.

## Remove

`remove()` is async. It takes a document ID and returns a `RemoveResult` object.

```ts
const result = await users.remove(id);

console.log(result);
// { removedId: "a1b2c3d4-...", acknowledge: true }
```

### Error cases

Calling `remove()` without an ID throws:

```ts
await users.remove("");
// Error: "You must provide the GraphDocument ID that you would like to remove."
```

Removing a document that does not exist throws:

```ts
await users.remove("nonexistent-id");
// Error: "No document to remove found with ID: nonexistent-id"
```

### Syncer interaction

If a syncer is configured with a `remove` function, GraphDB removes the document optimistically and then calls the syncer. If the syncer fails, the document is automatically restored and a `syncError` event is emitted.

## Bulk operations

### updateMany

Update all documents matching a where clause with the same patch:

```ts
await users.updateMany({ age: { gte: 30 } }, { name: "Senior" });
```

### removeMany

Remove all documents matching a where clause:

```ts
await users.removeMany({ age: { lt: 18 } });
```

### populate

Load an array of existing documents into the collection. Every document **must** have an `_id` field.

```ts
users.populate([
  { _id: "user-1", createdAt: Date.now(), updatedAt: Date.now(), name: "Alex", email: "alex@example.com", age: 30 },
  { _id: "user-2", createdAt: Date.now(), updatedAt: Date.now(), name: "Sam", email: "sam@example.com", age: 25 },
]);
```

If any document is missing an `_id`, it throws:

```ts
// Error: "Every document must have an _id for populate."
```

## Utility methods

### count

Count documents, optionally filtered by a where clause:

```ts
const total = users.count();
const adults = users.count({ age: { gte: 18 } });
```

### exists

Check if a document exists by ID:

```ts
const found = users.exists(id); // true or false
```

### clear

Remove all documents from the collection:

```ts
users.clear();
```
