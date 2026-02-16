---
title: Collection
description: API reference for all Collection methods.
---

A `Collection<T>` is the primary interface for storing, querying, and observing documents. Collections are created via `db.createCollection()` and retrieved via `db.getCollection()`.

```typescript
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();
db.createCollection<User>('users');
const users = db.getCollection<User>('users')!;
```

---

## Read Operations

All read operations are **synchronous**.

### read

Returns a single document by its ID.

```typescript
read(id: string): Doc<T> | null;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | The `_id` of the document to retrieve. |

#### Return Type

`Doc<T> | null` -- The document if found, or `null` if no document exists with that ID.

#### Example

```typescript
const id = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });

const doc = users.read(id);
// { _id: '...', name: 'Alice', email: 'alice@example.com', age: 30, createdAt: 1700000000000, updatedAt: 1700000000000 }

const missing = users.read('nonexistent-id');
// null
```

---

### query

Returns all documents matching the given where clause, with optional sorting, pagination, and limiting.

```typescript
query(where: Where<T>, options?: QueryOptions): Doc<T>[];
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `where` | `Where<T>` | Yes | Filter criteria. Pass `{}` to match all documents. |
| `options` | `QueryOptions` | No | Sorting, skip, and limit options. |

#### QueryOptions

| Option | Type | Description |
|--------|------|-------------|
| `orderBy` | `Record<string, 'ASC' \| 'DESC'>` | Sort by one or more fields. |
| `skip` | `number` | Number of results to skip (applied after sort). |
| `limit` | `number` | Maximum number of results to return (applied after skip). |

#### Return Type

`Doc<T>[]` -- Always returns an array. Returns an empty array if no documents match.

#### Behavior

The query pipeline executes in this order: **filter** then **sort** then **skip** then **limit**.

When indexed fields are present in the where clause with primitive equality, `eq`, or `in` operators, the index is used to narrow candidates before applying remaining filters. See [Where Clauses](/api-reference/where-clauses/) for full details.

#### Example

```typescript
// Find all users older than 25, sorted by name
const results = users.query(
  { age: { gt: 25 } },
  { orderBy: { name: 'ASC' }, limit: 10 }
);

// Find all documents (no filter)
const all = users.query({});

// Pagination
const page2 = users.query({}, { orderBy: { createdAt: 'DESC' }, skip: 10, limit: 10 });
```

---

### findOne

Returns the first document matching the where clause.

```typescript
findOne(where: Where<T>): Doc<T> | null;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `where` | `Where<T>` | Yes | Filter criteria. |

#### Return Type

`Doc<T> | null` -- The first matching document, or `null` if none match.

#### Example

```typescript
const alice = users.findOne({ email: 'alice@example.com' });
// { _id: '...', name: 'Alice', email: 'alice@example.com', age: 30, ... }

const nobody = users.findOne({ name: 'Nobody' });
// null
```

---

### count

Returns the number of documents matching the where clause, or the total count if no where clause is provided.

```typescript
count(where?: Where<T>): number;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `where` | `Where<T>` | No | Filter criteria. Omit to count all documents. |

#### Return Type

`number`

#### Example

```typescript
const total = users.count();
// 42

const adults = users.count({ age: { gte: 18 } });
// 38
```

---

### exists

Checks whether a document with the given ID exists in the collection.

```typescript
exists(id: string): boolean;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | The `_id` of the document to check. |

#### Return Type

`boolean`

#### Example

```typescript
const id = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });

users.exists(id);    // true
users.exists('xxx'); // false
```

---

## Write Operations

All write operations are **asynchronous**. If a syncer is configured for the operation, the local write is applied optimistically and then the syncer runs. If the syncer returns `false` or throws, the local change is reverted and an error is thrown.

### create

Inserts a new document into the collection.

```typescript
create(doc: T): Promise<string>;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doc` | `T` | Yes | The document data (without `_id`, `createdAt`, or `updatedAt`). |

#### Return Type

`Promise<string>` -- Resolves with the generated `_id` of the new document.

#### Behavior

- Generates a unique `_id` via `crypto.randomUUID()`.
- Sets `createdAt` and `updatedAt` to the current epoch milliseconds.
- Updates any relevant indexes.
- Emits a `create` event.
- If a `create` syncer is configured and it returns `false` or throws, the document is removed from the collection and the error `"Document synchronization wasn't possible."` is thrown. A `syncError` event is also emitted.

#### Example

```typescript
const id = await users.create({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
});
// id: 'a1b2c3d4-...'
```

---

### update

Updates an existing document by merging a partial patch.

```typescript
update(id: string, patch: Partial<T>): Promise<Doc<T>>;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | The `_id` of the document to update. |
| `patch` | `Partial<T>` | Yes | Fields to merge into the existing document. |

#### Return Type

`Promise<Doc<T>>` -- Resolves with the full updated document.

#### Behavior

- Merges the patch into the existing document.
- Updates `updatedAt` to the current epoch milliseconds.
- Updates any relevant indexes.
- Emits an `update` event with `{ before, after, patch }`.

#### Errors

| Condition | Error Message |
|-----------|---------------|
| `id` is falsy | `"You must provide the GraphDocument ID that you would like to update."` |
| No document found | `"No document to update found with ID: {id}"` |
| Syncer returns `false` or throws | `"[UPDATE SYNC]: Document synchronization wasn't possible."` |

When the update syncer fails, the document is reverted to its state before the update and a `syncError` event is emitted.

#### Example

```typescript
const updated = await users.update(id, { age: 31 });
// { _id: '...', name: 'Alice', email: 'alice@example.com', age: 31, createdAt: ..., updatedAt: ... }
```

---

### remove

Removes a document from the collection.

```typescript
remove(id: string): Promise<RemoveResult>;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | The `_id` of the document to remove. |

#### Return Type

```typescript
type RemoveResult = { removedId: string; acknowledge: true };
```

`Promise<RemoveResult>` -- Resolves with the removed document's ID and an acknowledgement flag.

#### Errors

| Condition | Error Message |
|-----------|---------------|
| `id` is falsy | `"You must provide the GraphDocument ID that you would like to remove."` |
| No document found | `"No document to remove found with ID: {id}"` |
| Syncer returns `false` or throws | `"[REMOVE SYNC]: Document synchronization wasn't possible."` |

When the remove syncer fails, the document is restored to the collection and a `syncError` event is emitted.

#### Example

```typescript
const result = await users.remove(id);
// { removedId: 'a1b2c3d4-...', acknowledge: true }
```

---

## Bulk Operations

### populate

Inserts an array of pre-existing documents (with `_id` already set) into the collection. Useful for hydrating the collection from an external data source.

```typescript
populate(docs: Doc<T>[]): void;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `docs` | `Doc<T>[]` | Yes | Array of complete documents including `_id`, `createdAt`, and `updatedAt`. |

#### Return Type

`void`

#### Errors

| Condition | Error Message |
|-----------|---------------|
| Any document is missing `_id` | `"Every document must have an _id for populate."` |

#### Behavior

- Adds each document to the collection's storage and indexes.
- Emits a single `populate` event with `{ count }` after all documents are inserted.
- Does **not** invoke syncers.

#### Example

```typescript
const existingDocs = [
  { _id: 'user-1', name: 'Alice', email: 'alice@example.com', age: 30, createdAt: 1700000000000, updatedAt: 1700000000000 },
  { _id: 'user-2', name: 'Bob', email: 'bob@example.com', age: 25, createdAt: 1700000000000, updatedAt: 1700000000000 },
];

users.populate(existingDocs);
// populate event emitted with { count: 2 }
```

---

### updateMany

Updates all documents matching the where clause with the given patch.

```typescript
updateMany(where: Where<T>, patch: Partial<T>): Promise<Doc<T>[]>;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `where` | `Where<T>` | Yes | Filter criteria to select documents. |
| `patch` | `Partial<T>` | Yes | Fields to merge into each matching document. |

#### Return Type

`Promise<Doc<T>[]>` -- Resolves with an array of the updated documents.

#### Example

```typescript
// Give everyone over 30 a year older
const updated = await users.updateMany({ age: { gt: 30 } }, { age: 31 });
// Returns all updated documents
```

---

### removeMany

Removes all documents matching the where clause.

```typescript
removeMany(where: Where<T>): Promise<RemoveResult[]>;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `where` | `Where<T>` | Yes | Filter criteria to select documents to remove. |

#### Return Type

`Promise<RemoveResult[]>` -- Resolves with an array of `RemoveResult` objects, one per removed document.

#### Example

```typescript
// Remove all users under 18
const results = await users.removeMany({ age: { lt: 18 } });
// [{ removedId: '...', acknowledge: true }, ...]
```

---

### clear

Removes all documents from the collection, clearing all storage, indexes, and listeners.

```typescript
clear(): void;
```

#### Parameters

None.

#### Return Type

`void`

#### Example

```typescript
users.clear();
users.count(); // 0
```

---

## Event Operations

### on

Subscribes to collection-level events. Returns a cancel function to unsubscribe.

```typescript
on<E extends EventType>(event: E, fn: (payload: EventPayloadMap<T>[E]) => void): CancelFn;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event` | `EventType` | Yes | The event to listen for: `'create'`, `'update'`, `'remove'`, `'populate'`, or `'syncError'`. |
| `fn` | `(payload) => void` | Yes | Callback invoked when the event fires. |

#### Event Payloads

| Event | Payload Type | Fields |
|-------|-------------|--------|
| `'create'` | `CreatePayload<T>` | `{ doc }` |
| `'update'` | `UpdatePayload<T>` | `{ before, after, patch }` |
| `'remove'` | `RemovePayload<T>` | `{ doc }` |
| `'populate'` | `PopulatePayload` | `{ count }` |
| `'syncError'` | `SyncErrorPayload` | `{ op, error, docId? }` |

#### Return Type

`CancelFn` (`() => void`) -- Call this function to unsubscribe.

#### Example

```typescript
// Listen for new documents
const cancel = users.on('create', (payload) => {
  console.log('New user created:', payload.doc.name);
});

// Listen for updates
users.on('update', ({ before, after, patch }) => {
  console.log(`User ${before.name} updated:`, patch);
});

// Listen for removals
users.on('remove', ({ doc }) => {
  console.log('User removed:', doc.name);
});

// Listen for populate
users.on('populate', ({ count }) => {
  console.log(`Populated ${count} documents`);
});

// Listen for sync errors
users.on('syncError', ({ op, error, docId }) => {
  console.error(`Sync failed for ${op} on ${docId}:`, error);
});

// Unsubscribe
cancel();
```

---

### listen

Subscribes to changes on a specific document by its ID. The callback fires on create, update, and remove events that affect that document.

```typescript
listen(id: string, fn: (payload: ListenerPayload<T>) => void): CancelFn;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | The `_id` of the document to observe. |
| `fn` | `(payload) => void` | Yes | Callback invoked when the document is created, updated, or removed. |

#### Listener Payload

```typescript
type ListenerPayload<T> = CreatePayload<T> | UpdatePayload<T> | RemovePayload<T>;
```

The payload will be one of:
- `{ doc }` for create events
- `{ before, after, patch }` for update events
- `{ doc }` for remove events

#### Return Type

`CancelFn` (`() => void`) -- Call this function to unsubscribe.

#### Example

```typescript
const id = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });

const cancel = users.listen(id, (payload) => {
  if ('before' in payload && 'after' in payload) {
    console.log('Document updated:', payload.after);
  } else {
    console.log('Document changed:', payload.doc);
  }
});

// Trigger the listener
await users.update(id, { age: 31 });

// Stop listening
cancel();
```
