---
title: Syncers
description: Synchronize your in-memory data with a backend API.
---

Syncers let you bridge GraphDB's in-memory store with an external backend. When configured, every `create`, `update`, or `remove` operation will first apply the change optimistically, then call your syncer function. If the syncer fails, GraphDB automatically reverts the change.

## Configuring syncers

Pass a `syncers` object when creating a collection. Each syncer is an async function that returns a `boolean`.

```typescript
import { GraphDB, type Syncers } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const syncers: Syncers<User> = {
  create: async (doc) => { /* ... */ return true; },
  update: async (doc) => { /* ... */ return true; },
  remove: async (docId) => { /* ... */ return true; },
};

const db = GraphDB();
const users = db.createCollection<User>('users', { syncers });
```

### Syncer signatures

| Syncer   | Argument       | Return    |
| -------- | -------------- | --------- |
| `create` | `Doc<User>`    | `boolean` |
| `update` | `Doc<User>`    | `boolean` |
| `remove` | `string` (id)  | `boolean` |

- **`create`** receives the full document (including `_id`, `createdAt`, `updatedAt`) after it has been written to memory.
- **`update`** receives the full document after the patch has been applied.
- **`remove`** receives just the document ID as a string.

### Partial configuration

You do not have to provide all three syncers. Only the operations you define will be synced; the others work as normal in-memory operations.

```typescript
const users = db.createCollection<User>('users', {
  syncers: {
    create: async (doc) => {
      // Only sync creates to the backend
      const res = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(doc),
      });
      return res.ok;
    },
    // update and remove are local-only
  },
});
```

## Optimistic write flow

Every synced operation follows the same pattern:

1. **Apply** the change to the in-memory store immediately.
2. **Call** the corresponding syncer function.
3. **On success** (returns `true`): the change persists, events fire normally.
4. **On failure** (returns `false` or throws): **revert** the in-memory change and throw an error.

This means your UI can react to changes instantly while the backend sync happens in the background.

### Returning `false` vs throwing

Both cause the same revert behavior, but they differ in the error that propagates:

- **Returning `false`**: GraphDB throws a generic sync failure error.
- **Throwing an error**: GraphDB catches it, reverts, and re-throws the original error so you can inspect it.

```typescript
const syncers: Syncers<User> = {
  create: async (doc) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(doc),
    });

    if (!res.ok) {
      // Option A: return false — generic error is thrown
      return false;

      // Option B: throw — your error is re-thrown
      // throw new Error(`API returned ${res.status}`);
    }

    return true;
  },
};
```

## The `syncError` event

When a syncer fails, GraphDB emits a `syncError` event on the collection in addition to throwing. This is useful for centralized error handling or logging.

```typescript
users.on('syncError', (payload) => {
  // payload.op    — 'create' | 'update' | 'remove'
  // payload.error — the caught error
  // payload.docId — the document ID (when available)
  console.error(`Sync ${payload.op} failed:`, payload.error);
});
```

## Practical example: REST API

Here is a complete example that syncs a users collection with a REST API.

```typescript
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const API = 'https://api.example.com/users';

const db = GraphDB();

const users = db.createCollection<User>('users', {
  syncers: {
    create: async (doc: Doc<User>) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      return true;
    },

    update: async (doc: Doc<User>) => {
      const res = await fetch(`${API}/${doc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return true;
    },

    remove: async (docId: string) => {
      const res = await fetch(`${API}/${docId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Remove failed: ${res.status}`);
      return true;
    },
  },
});

// Centralized error handling
users.on('syncError', ({ op, error, docId }) => {
  reportToErrorTracker({ op, error, docId });
});
```

## Error handling patterns

### Try/catch per operation

```typescript
try {
  const user = await users.create({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
  });
  console.log('User created and synced:', user._id);
} catch (err) {
  // The create was reverted in memory
  console.error('Failed to sync user creation:', err);
}
```

### Global error listener

```typescript
users.on('syncError', ({ op, error, docId }) => {
  showToast(`Failed to ${op} document. Please try again.`);
});
```

Both patterns can be used together. The `syncError` event always fires on failure regardless of whether the caller catches the thrown error.
