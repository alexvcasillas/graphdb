---
title: Types
description: Complete reference for all exported TypeScript types.
---

All types are exported from `@graphdb/types` and re-exported from `@graphdb/core`.

```typescript
import type { Doc, Where, Collection, GraphDBType } from '@graphdb/core';
```

---

## Document Types

### Doc

The base document type. Every document stored in a collection is wrapped with these system fields.

```typescript
type Doc<T> = {
  _id: string;
  createdAt: number;
  updatedAt: number;
} & T;
```

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Unique identifier generated via `crypto.randomUUID()`. |
| `createdAt` | `number` | Epoch milliseconds when the document was created. |
| `updatedAt` | `number` | Epoch milliseconds when the document was last updated. |

Timestamps are epoch milliseconds (`number`), not `Date` objects.

#### Example

```typescript
type User = { name: string; email: string; age: number };

// A Doc<User> looks like:
const doc: Doc<User> = {
  _id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
};
```

---

### RemoveResult

The result returned by `remove()` and each element in the array returned by `removeMany()`.

```typescript
type RemoveResult = {
  removedId: string;
  acknowledge: true;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `removedId` | `string` | The `_id` of the removed document. |
| `acknowledge` | `true` | Always `true`, confirming the operation succeeded. |

#### Example

```typescript
const result: RemoveResult = await users.remove(id);
// { removedId: 'a1b2c3d4-...', acknowledge: true }
```

---

## Query Types

### Where

The filter object used to match documents. Each key corresponds to a document field. Values can be a primitive (strict equality), a `RegExp`, or a `WhereClause` operator object.

```typescript
type Where<T = Record<string, unknown>> = {
  [K in keyof T]?: T[K] | WhereClause<T[K]> | RegExp;
} & Record<string, unknown>;
```

All specified fields must match for a document to be included (logical AND).

#### Example

```typescript
type User = { name: string; email: string; age: number };

// Primitive equality
const w1: Where<User> = { name: 'Alice' };

// RegExp
const w2: Where<User> = { email: /gmail\.com$/ };

// Operator object
const w3: Where<User> = { age: { gte: 18, lt: 65 } };

// Multi-field
const w4: Where<User> = { name: 'Alice', age: { gt: 25 } };
```

---

### WhereClause

An object containing one or more comparison operators for filtering a single field.

```typescript
type WhereClause<V = unknown> = {
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

| Operator | Operand Type | Description |
|----------|-------------|-------------|
| `eq` | `V` | Strict equality (`===`). |
| `notEq` | `V` | Strict inequality (`!==`). |
| `gt` | `number` | Greater than. |
| `gte` | `number` | Greater than or equal. |
| `lt` | `number` | Less than. |
| `lte` | `number` | Less than or equal. |
| `includes` | `string` | Substring inclusion check. |
| `startsWith` | `string` | String prefix check. |
| `endsWith` | `string` | String suffix check. |
| `match` | `RegExp` | Regular expression test. |
| `in` | `V[]` | Value is in the given array. |

All operators in a single clause must pass for the field to match.

#### Example

```typescript
// Age between 18 and 65 (inclusive lower, exclusive upper)
const clause: WhereClause<number> = { gte: 18, lt: 65 };

// Name starts with "A" and is not "Adam"
const nameClause: WhereClause<string> = { startsWith: 'A', notEq: 'Adam' };
```

---

### QueryOptions

Options for sorting and paginating query results.

```typescript
type QueryOptions = {
  skip?: number;
  limit?: number;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
};
```

| Option | Type | Description |
|--------|------|-------------|
| `skip` | `number` | Number of results to skip after sorting. |
| `limit` | `number` | Maximum number of results to return after skipping. |
| `orderBy` | `Record<string, 'ASC' \| 'DESC'>` | Sort by one or more fields. Supports multi-field sorting. |

The pipeline order is: **filter** then **sort** then **skip** then **limit**.

#### Example

```typescript
// Get the second page of 10 users sorted by name ascending
const options: QueryOptions = {
  orderBy: { name: 'ASC' },
  skip: 10,
  limit: 10,
};

const results = users.query({}, options);
```

---

## Collection Types

### Collection

The full interface for interacting with a collection of documents.

```typescript
type Collection<T> = {
  read: (id: string) => Doc<T> | null;
  query: (where: Where<T>, options?: QueryOptions) => Doc<T>[];
  findOne: (where: Where<T>) => Doc<T> | null;
  create: (doc: T) => Promise<string>;
  update: (id: string, patch: Partial<T>) => Promise<Doc<T>>;
  remove: (id: string) => Promise<RemoveResult>;
  populate: (docs: Doc<T>[]) => void;
  listen: (id: string, fn: (payload: ListenerPayload<T>) => void) => CancelFn;
  on: <E extends EventType>(event: E, fn: (payload: EventPayloadMap<T>[E]) => void) => CancelFn;
  count: (where?: Where<T>) => number;
  exists: (id: string) => boolean;
  clear: () => void;
  updateMany: (where: Where<T>, patch: Partial<T>) => Promise<Doc<T>[]>;
  removeMany: (where: Where<T>) => Promise<RemoveResult[]>;
};
```

See the [Collection API reference](/api-reference/collection/) for detailed documentation of each method.

#### Example

```typescript
type User = { name: string; email: string; age: number };

const users: Collection<User> = db.getCollection<User>('users')!;

const id = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });
const doc = users.read(id);
```

---

### CollectionOptions

Configuration options passed when creating a collection.

```typescript
type CollectionOptions<T> = {
  indexes?: (keyof T)[];
  syncers?: Syncers<T>;
};
```

| Option | Type | Description |
|--------|------|-------------|
| `indexes` | `(keyof T)[]` | Fields to create hash indexes on. Speeds up primitive equality, `eq`, and `in` lookups. |
| `syncers` | `Syncers<T>` | Async callbacks for synchronizing writes with an external data source. |

#### Example

```typescript
type User = { name: string; email: string; age: number };

const options: CollectionOptions<User> = {
  indexes: ['email', 'age'],
  syncers: {
    create: async (doc) => {
      const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify(doc) });
      return res.ok;
    },
  },
};

db.createCollection<User>('users', options);
```

---

### CancelFn

A function returned by `on()` and `listen()` that unsubscribes the listener when called.

```typescript
type CancelFn = () => void;
```

#### Example

```typescript
const cancel: CancelFn = users.on('create', ({ doc }) => {
  console.log('Created:', doc.name);
});

// Later, stop listening
cancel();
```

---

## Syncer Types

### Syncers

Async callback functions invoked after write operations for external synchronization. Each syncer should return `true` on success and `false` on failure. Throwing an error is treated as failure.

```typescript
type Syncers<T> = {
  create?: (doc: Doc<T>) => Promise<boolean>;
  update?: (doc: Doc<T>) => Promise<boolean>;
  remove?: (docId: string) => Promise<boolean>;
};
```

| Syncer | Parameter | Description |
|--------|-----------|-------------|
| `create` | `doc: Doc<T>` | Called after a document is created. Receives the full document. |
| `update` | `doc: Doc<T>` | Called after a document is updated. Receives the full updated document. |
| `remove` | `docId: string` | Called after a document is removed. Receives the document's `_id`. |

On failure, the local change is automatically reverted (optimistic write rollback) and a `syncError` event is emitted.

#### Example

```typescript
type User = { name: string; email: string; age: number };

const syncers: Syncers<User> = {
  create: async (doc) => {
    const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify(doc) });
    return res.ok;
  },
  update: async (doc) => {
    const res = await fetch(`/api/users/${doc._id}`, { method: 'PUT', body: JSON.stringify(doc) });
    return res.ok;
  },
  remove: async (docId) => {
    const res = await fetch(`/api/users/${docId}`, { method: 'DELETE' });
    return res.ok;
  },
};

db.createCollection<User>('users', { syncers });
```

---

## Event Types

### EventType

A union of all supported event names.

```typescript
type EventType = 'create' | 'update' | 'remove' | 'populate' | 'syncError';
```

---

### EventPayloadMap

Maps each event type to its corresponding payload type. Used by `on()` for type-safe event handling.

```typescript
type EventPayloadMap<T> = {
  create: CreatePayload<T>;
  update: UpdatePayload<T>;
  remove: RemovePayload<T>;
  populate: PopulatePayload;
  syncError: SyncErrorPayload;
};
```

#### Example

```typescript
type User = { name: string; email: string; age: number };

// The type system ensures the callback receives the correct payload
users.on('update', (payload: EventPayloadMap<User>['update']) => {
  console.log(payload.before.name, '->', payload.after.name);
});
```

---

### CreatePayload

Payload emitted with the `create` event.

```typescript
type CreatePayload<T> = {
  doc: Doc<T>;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `doc` | `Doc<T>` | The newly created document. |

---

### UpdatePayload

Payload emitted with the `update` event.

```typescript
type UpdatePayload<T> = {
  before: Doc<T>;
  after: Doc<T>;
  patch: Partial<T>;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `before` | `Doc<T>` | The document before the update. |
| `after` | `Doc<T>` | The document after the update. |
| `patch` | `Partial<T>` | The partial object that was merged. |

---

### RemovePayload

Payload emitted with the `remove` event.

```typescript
type RemovePayload<T> = {
  doc: Doc<T>;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `doc` | `Doc<T>` | The document that was removed. |

---

### PopulatePayload

Payload emitted with the `populate` event.

```typescript
type PopulatePayload = {
  count: number;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | The number of documents that were populated. |

---

### SyncErrorPayload

Payload emitted with the `syncError` event when a syncer fails.

```typescript
type SyncErrorPayload = {
  op: 'create' | 'update' | 'remove';
  error: unknown;
  docId?: string;
};
```

| Field | Type | Description |
|-------|------|-------------|
| `op` | `'create' \| 'update' \| 'remove'` | The operation that failed to sync. |
| `error` | `unknown` | The error that was thrown or the sync failure reason. |
| `docId` | `string \| undefined` | The `_id` of the affected document, if available. |

---

### ListenerPayload

The union type used for per-document listeners registered via `listen()`.

```typescript
type ListenerPayload<T> = CreatePayload<T> | UpdatePayload<T> | RemovePayload<T>;
```

The payload will be one of the three event payloads. You can discriminate between them by checking for the presence of specific fields:

#### Example

```typescript
type User = { name: string; email: string; age: number };

users.listen(id, (payload: ListenerPayload<User>) => {
  if ('before' in payload && 'after' in payload) {
    // UpdatePayload
    console.log('Updated:', payload.patch);
  } else {
    // CreatePayload or RemovePayload
    console.log('Document:', payload.doc);
  }
});
```

---

## Database Types

### GraphDBType

The return type of the `GraphDB()` factory function. Provides methods for managing collections.

```typescript
type GraphDBType = {
  createCollection: <T>(name: string, options?: CollectionOptions<T>) => void;
  getCollection: <T>(name: string) => Collection<T> | null;
  listCollections: () => string[];
  removeCollection: (name: string) => boolean;
};
```

| Method | Return Type | Description |
|--------|-------------|-------------|
| `createCollection` | `void` | Register a new collection. |
| `getCollection` | `Collection<T> \| null` | Retrieve a collection by name, or `null` if it does not exist. |
| `listCollections` | `string[]` | Get the names of all registered collections. |
| `removeCollection` | `boolean` | Remove a collection. Returns `true` if it existed. |

See the [GraphDB API reference](/api-reference/graphdb/) for detailed documentation of each method.

#### Example

```typescript
import { GraphDB } from '@graphdb/core';
import type { GraphDBType } from '@graphdb/core';

const db: GraphDBType = GraphDB();

type User = { name: string; email: string; age: number };

db.createCollection<User>('users', { indexes: ['email'] });
const users = db.getCollection<User>('users')!;
console.log(db.listCollections()); // ['users']
db.removeCollection('users');
```
