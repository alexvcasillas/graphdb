---
title: GraphDB
description: API reference for the GraphDB factory function.
---

## Factory Function

```typescript
import { GraphDB } from '@graphdb/core';

function GraphDB(): GraphDBType;
```

`GraphDB` is a factory function that creates and returns a new in-memory database instance. Each call produces an independent database with its own set of collections.

### Return Type

```typescript
type GraphDBType = {
  createCollection: <T>(name: string, options?: CollectionOptions<T>) => void;
  getCollection: <T>(name: string) => Collection<T> | null;
  listCollections: () => string[];
  removeCollection: (name: string) => boolean;
};
```

### Basic Usage

```typescript
import { GraphDB } from '@graphdb/core';

const db = GraphDB();
```

---

## Methods

### createCollection

Registers a new collection in the database.

```typescript
createCollection<T>(name: string, options?: CollectionOptions<T>): void;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Unique name for the collection. |
| `options` | `CollectionOptions<T>` | No | Configuration for indexes and syncers. |

#### CollectionOptions

```typescript
type CollectionOptions<T> = {
  indexes?: (keyof T)[];
  syncers?: Syncers<T>;
};
```

| Option | Type | Description |
|--------|------|-------------|
| `indexes` | `(keyof T)[]` | Fields to build hash indexes on for faster equality, `eq`, and `in` lookups. |
| `syncers` | `Syncers<T>` | Async callbacks invoked after create, update, or remove operations for external synchronization. |

#### Return Type

`void`

#### Example

```typescript
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();

// Basic collection
db.createCollection<User>('users');

// Collection with indexes and syncers
db.createCollection<User>('users', {
  indexes: ['email', 'age'],
  syncers: {
    create: async (doc) => {
      await fetch('/api/users', { method: 'POST', body: JSON.stringify(doc) });
      return true;
    },
    update: async (doc) => {
      await fetch(`/api/users/${doc._id}`, { method: 'PUT', body: JSON.stringify(doc) });
      return true;
    },
    remove: async (docId) => {
      await fetch(`/api/users/${docId}`, { method: 'DELETE' });
      return true;
    },
  },
});
```

---

### getCollection

Retrieves an existing collection by name.

```typescript
getCollection<T>(name: string): Collection<T> | null;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | The name of the collection to retrieve. |

#### Return Type

`Collection<T> | null` -- Returns the collection if it exists, or `null` if no collection with the given name has been created.

#### Example

```typescript
type User = { name: string; email: string; age: number };

const db = GraphDB();
db.createCollection<User>('users');

const users = db.getCollection<User>('users');
// users is Collection<User>

const missing = db.getCollection('nonexistent');
// missing is null
```

---

### listCollections

Returns the names of all collections currently registered in the database.

```typescript
listCollections(): string[];
```

#### Parameters

None.

#### Return Type

`string[]` -- An array of collection names.

#### Example

```typescript
const db = GraphDB();

db.createCollection('users');
db.createCollection('posts');
db.createCollection('comments');

const names = db.listCollections();
// ['users', 'posts', 'comments']
```

---

### removeCollection

Removes a collection from the database, including all of its data, indexes, and listeners.

```typescript
removeCollection(name: string): boolean;
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | The name of the collection to remove. |

#### Return Type

`boolean` -- Returns `true` if the collection was found and removed, `false` if no collection with the given name exists.

#### Example

```typescript
const db = GraphDB();
db.createCollection('users');

const removed = db.removeCollection('users');
// true

const removedAgain = db.removeCollection('users');
// false (already removed)
```

---

## Complete Example

```typescript
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();

// Create a collection with an index on email
db.createCollection<User>('users', {
  indexes: ['email'],
});

// Retrieve the collection
const users = db.getCollection<User>('users');

if (users) {
  // Use collection methods
  const id = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });
  const doc = users.read(id);
  console.log(doc);
}

// List all collections
console.log(db.listCollections()); // ['users']

// Clean up
db.removeCollection('users');
console.log(db.listCollections()); // []
```
