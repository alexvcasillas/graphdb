---
title: TypeScript Types
description: All TypeScript types exported by GraphDB.
---

GraphDB is written in TypeScript and exports all of its types for use in your application. Types are defined in the `@graphdb/types` package and re-exported from `@graphdb/core`, so you can import everything from a single package.

```typescript
import { GraphDB, type Doc, type Where, type Collection } from '@graphdb/core';
```

## Type definitions

All examples reference this base type:

```typescript
type User = { name: string; email: string; age: number };
```

---

### `Doc<T>`

A stored document. Wraps your data type `T` with metadata fields added by GraphDB.

```typescript
type Doc<T> = { _id: string; createdAt: number; updatedAt: number } & T;
```

- `_id` — Unique identifier, generated via `crypto.randomUUID()`.
- `createdAt` — Epoch milliseconds when the document was created.
- `updatedAt` — Epoch milliseconds when the document was last updated.

```typescript
const user: Doc<User> = {
  _id: '550e8400-e29b-41d4-a716-446655440000',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
};
```

---

### `Where<T>`

A filter object used by `query()`, `findOne()`, `updateMany()`, and `removeMany()`. Each key maps to a field on `T` and accepts a direct value, a `WhereClause`, or a `RegExp`.

```typescript
type Where<T> = {
  [K in keyof T]?: T[K] | WhereClause<T[K]> | RegExp;
} & Record<string, unknown>;
```

```typescript
// Direct value match
const byName: Where<User> = { name: 'Alice' };

// Operator-based match
const olderThan25: Where<User> = { age: { gt: 25 } };

// RegExp match
const gmailUsers: Where<User> = { email: /gmail\.com$/ };
```

---

### `WhereClause<V>`

Operator object for fine-grained filtering on a single field.

```typescript
type WhereClause<V> = {
  eq?: V;
  notEq?: V;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  includes?: string;
  startsWith?: string;
  endsWith?: string;
  match?: RegExp;
  in?: V[];
};
```

| Operator     | Description                        | Applicable types   |
| ------------ | ---------------------------------- | ------------------ |
| `eq`         | Equal to                           | Any                |
| `notEq`      | Not equal to                       | Any                |
| `gt`         | Greater than                       | `number`           |
| `gte`        | Greater than or equal              | `number`           |
| `lt`         | Less than                          | `number`           |
| `lte`        | Less than or equal                 | `number`           |
| `includes`   | String contains substring          | `string`           |
| `startsWith` | String starts with                 | `string`           |
| `endsWith`   | String ends with                   | `string`           |
| `match`      | Matches a regular expression       | `string`           |
| `in`         | Value is in the provided array     | Any                |

```typescript
// Users aged 25-35 whose email contains "example"
const results = users.query({
  age: { gte: 25, lte: 35 },
  email: { includes: 'example' },
});
```

---

### `QueryOptions`

Options for pagination and sorting in `query()`.

```typescript
type QueryOptions = {
  skip?: number;
  limit?: number;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
};
```

```typescript
// Get the 10 oldest users, skipping the first 5
const page = users.query({}, {
  orderBy: { age: 'DESC' },
  skip: 5,
  limit: 10,
});
```

---

### `CollectionOptions<T>`

Configuration passed to `createCollection()`.

```typescript
type CollectionOptions<T> = {
  indexes?: (keyof T)[];
  syncers?: Syncers<T>;
};
```

```typescript
const users = db.createCollection<User>('users', {
  indexes: ['email', 'age'],
  syncers: {
    create: async (doc) => { /* ... */ return true; },
  },
});
```

---

### `Syncers<T>`

Functions that synchronize in-memory writes with an external backend.

```typescript
type Syncers<T> = {
  create?: (doc: Doc<T>) => Promise<boolean>;
  update?: (doc: Doc<T>) => Promise<boolean>;
  remove?: (docId: string) => Promise<boolean>;
};
```

All three are optional. See the [Syncers guide](/guides/syncers/) for detailed usage.

---

### `CancelFn`

Returned by `on()` and `listen()`. Call it to remove the listener.

```typescript
type CancelFn = () => void;
```

```typescript
const cancel: CancelFn = users.on('create', (payload) => {
  console.log(payload.doc.name);
});

cancel(); // Listener removed
```

---

### `RemoveResult`

Returned by `remove()` and as array elements from `removeMany()`.

```typescript
type RemoveResult = { removedId: string; acknowledge: true };
```

```typescript
const result: RemoveResult = await users.remove('some-id');
console.log(result.removedId, result.acknowledge); // "some-id" true
```

---

### `EventType`

Union of all supported event names.

```typescript
type EventType = 'create' | 'update' | 'remove' | 'populate' | 'syncError';
```

---

### `CreatePayload<T>`

Payload for the `create` event.

```typescript
type CreatePayload<T> = { doc: Doc<T> };
```

---

### `UpdatePayload<T>`

Payload for the `update` event. Contains the document state before and after the update, plus the patch that was applied.

```typescript
type UpdatePayload<T> = {
  before: Doc<T>;
  after: Doc<T>;
  patch: Partial<T>;
};
```

---

### `RemovePayload<T>`

Payload for the `remove` event.

```typescript
type RemovePayload<T> = { doc: Doc<T> };
```

---

### `PopulatePayload`

Payload for the `populate` event.

```typescript
type PopulatePayload = { count: number };
```

---

### `SyncErrorPayload`

Payload for the `syncError` event.

```typescript
type SyncErrorPayload = {
  op: 'create' | 'update' | 'remove';
  error: unknown;
  docId?: string;
};
```

---

### `ListenerPayload<T>`

Union type for per-document listener callbacks. The payload will be one of `CreatePayload<T>`, `UpdatePayload<T>`, or `RemovePayload<T>`.

```typescript
type ListenerPayload<T> = CreatePayload<T> | UpdatePayload<T> | RemovePayload<T>;
```

```typescript
users.listen(doc._id, (payload: ListenerPayload<User>) => {
  if ('before' in payload) {
    // UpdatePayload
  } else {
    // CreatePayload or RemovePayload
  }
});
```

---

### `Collection<T>`

The full interface of a collection instance. Returned by `createCollection()` and `getCollection()`.

```typescript
type Collection<T> = {
  read: (id: string) => Doc<T> | null;
  query: (where: Where<T>, options?: QueryOptions) => Doc<T>[];
  findOne: (where: Where<T>) => Doc<T> | null;
  create: (doc: T) => Promise<Doc<T>>;
  update: (id: string, patch: Partial<T>) => Promise<Doc<T>>;
  remove: (id: string) => Promise<RemoveResult>;
  populate: (docs: Doc<T>[]) => void;
  listen: (id: string, handler: (payload: ListenerPayload<T>) => void) => CancelFn;
  on: (event: EventType, handler: (payload: any) => void) => CancelFn;
  count: (where?: Where<T>) => number;
  exists: (id: string) => boolean;
  clear: () => void;
  updateMany: (where: Where<T>, patch: Partial<T>) => Promise<Doc<T>[]>;
  removeMany: (where: Where<T>) => Promise<RemoveResult[]>;
};
```

---

### `GraphDBType`

The top-level database instance returned by `GraphDB()`.

```typescript
type GraphDBType = {
  createCollection: <T>(name: string, options?: CollectionOptions<T>) => Collection<T>;
  getCollection: <T>(name: string) => Collection<T> | undefined;
  listCollections: () => string[];
  removeCollection: (name: string) => boolean;
};
```

```typescript
const db: GraphDBType = GraphDB();

db.createCollection<User>('users');
db.listCollections();    // ['users']
db.getCollection('users'); // Collection<User>
db.removeCollection('users'); // true
```

## Import structure

Types are defined in `@graphdb/types` and re-exported from `@graphdb/core`:

```
@graphdb/types   <-- type definitions only, no runtime code
    ^
    |
@graphdb/core    <-- re-exports all types via `export type * from '@graphdb/types'`
```

You should always import from `@graphdb/core` unless you specifically need only the type package as a dependency:

```typescript
// Recommended
import { GraphDB, type Doc, type Where } from '@graphdb/core';

// Also valid, for type-only packages
import type { Doc, Where } from '@graphdb/types';
```
