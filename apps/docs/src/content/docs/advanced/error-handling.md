---
title: Error Handling
description: Complete error catalog and handling patterns.
---

GraphDB throws specific error messages for invalid operations and sync failures. This page catalogs every error, explains when it occurs, and shows how to handle each one.

## Error catalog

### Validation errors

These errors are thrown synchronously when you pass invalid arguments to a write operation.

#### Missing ID on update

```
"You must provide the GraphDocument ID that you would like to update."
```

**When it occurs:** You call `update()` with an empty string or falsy value as the document ID.

```ts
type User = { name: string; email: string; age: number };

// This throws immediately
await users.update('', { name: 'Alice' });
```

**How to handle:** Ensure you always pass a valid `_id` string. This typically indicates a bug in your code where a variable holding the ID is uninitialized.

#### Document not found on update

```
"No document to update found with ID: {id}"
```

**When it occurs:** You call `update()` with a valid string ID, but no document with that ID exists in the collection.

```ts
// This throws if the ID does not match any document
await users.update('nonexistent-uuid', { name: 'Alice' });
```

**How to handle:** Check if the document exists before updating, or wrap the call in a try/catch:

```ts
type User = { name: string; email: string; age: number };

const doc = users.read(id);
if (doc) {
  await users.update(id, { name: 'Alice' });
}
```

#### Missing ID on remove

```
"You must provide the GraphDocument ID that you would like to remove."
```

**When it occurs:** You call `remove()` with an empty string or falsy value.

```ts
// This throws immediately
await users.remove('');
```

**How to handle:** Same as the update case -- ensure the ID variable is valid before calling `remove()`.

#### Document not found on remove

```
"No document to remove found with ID: {id}"
```

**When it occurs:** You call `remove()` with a valid string ID, but no document with that ID exists.

```ts
// This throws if the document was already removed or never existed
await users.remove('nonexistent-uuid');
```

**How to handle:** Check existence first or use try/catch:

```ts
type User = { name: string; email: string; age: number };

if (users.exists(id)) {
  await users.remove(id);
}
```

### Populate errors

#### Missing `_id` in populated documents

```
"Every document must have an _id for populate."
```

**When it occurs:** You call `populate()` with an array of documents where at least one document is missing the `_id` field. Unlike `create()`, which generates an `_id` automatically, `populate()` expects pre-existing documents that already have IDs.

```ts
type User = { name: string; email: string; age: number };

// This throws because the document has no _id
users.populate([
  { name: 'Alice', email: 'alice@example.com', age: 25 } as any,
]);
```

**How to handle:** Ensure every document passed to `populate()` includes `_id`, `_createdAt`, and `_updatedAt`. These typically come from your backend API:

```ts
type User = { name: string; email: string; age: number };

const apiUsers = await fetchUsersFromAPI();

users.populate(apiUsers.map((u) => ({
  _id: u.id,
  _createdAt: u.createdAt,
  _updatedAt: u.updatedAt,
  name: u.name,
  email: u.email,
  age: u.age,
})));
```

### Sync errors

Sync errors occur when a syncer function returns `false` or throws. GraphDB handles these by reverting the optimistic write, emitting a `syncError` event, and then throwing an error.

#### Create sync failure

```
"Document synchronization wasn't possible."
```

**When it occurs:** The `create` syncer returns `false` or throws after a document was optimistically created.

```ts
type User = { name: string; email: string; age: number };

const db = GraphDB();
const users = db.collection<User>('users', {
  syncers: {
    create: async (doc) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(doc),
      });
      return response.ok; // returns false on failure
    },
  },
});

try {
  await users.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
} catch (error) {
  // error.message === "Document synchronization wasn't possible."
  // The document has already been removed from the collection
  console.error('Failed to sync new user:', error);
}
```

#### Update sync failure

```
"[UPDATE SYNC]: Document synchronization wasn't possible."
```

**When it occurs:** The `update` syncer returns `false` or throws after a document was optimistically updated.

```ts
try {
  await users.update(userId, { age: 26 });
} catch (error) {
  // error.message === "[UPDATE SYNC]: Document synchronization wasn't possible."
  // The document has been reverted to its previous state
  console.error('Failed to sync user update:', error);
}
```

#### Remove sync failure

```
"[REMOVE SYNC]: Document synchronization wasn't possible."
```

**When it occurs:** The `remove` syncer returns `false` or throws after a document was optimistically removed.

```ts
try {
  await users.remove(userId);
} catch (error) {
  // error.message === "[REMOVE SYNC]: Document synchronization wasn't possible."
  // The document has been re-inserted into the collection
  console.error('Failed to sync user removal:', error);
}
```

## Handling patterns

### Try/catch for individual operations

The most straightforward approach. Wrap each write in a try/catch to handle errors at the call site:

```ts
type User = { name: string; email: string; age: number };

async function updateUserAge(id: string, newAge: number): Promise<boolean> {
  try {
    await users.update(id, { age: newAge });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No document to update found')) {
        console.warn(`User ${id} no longer exists`);
      } else if (error.message.includes('synchronization')) {
        console.warn(`Sync failed for user ${id}, change reverted`);
      }
    }
    return false;
  }
}
```

### Centralized error handling with `syncError` event

For sync errors specifically, you can use the `syncError` collection event to handle all sync failures in one place. This is useful for showing toast notifications, logging, or retry logic:

```ts
type User = { name: string; email: string; age: number };

const db = GraphDB();
const users = db.collection<User>('users', {
  syncers: {
    create: async (doc) => { /* ... */ },
    update: async (doc) => { /* ... */ },
    remove: async (doc) => { /* ... */ },
  },
});

// Centralized sync error handler
users.on('syncError', (payload) => {
  console.error('Sync failed:', payload);

  // Show a notification to the user
  showToast('Changes could not be saved. They have been reverted.');

  // Log to an error tracking service
  errorTracker.capture(new Error('GraphDB sync failure'), {
    extra: payload,
  });
});
```

The `syncError` event fires for every sync failure, regardless of whether the caller catches the thrown error. This makes it a reliable place for cross-cutting concerns like logging or notifications.

### Defensive reads before writes

For operations where you expect a document might not exist, check before writing:

```ts
type User = { name: string; email: string; age: number };

async function safeUpdate(
  id: string,
  patch: Partial<User>,
): Promise<Doc<User> | null> {
  const existing = users.read(id);
  if (!existing) {
    console.warn(`Cannot update: user ${id} not found`);
    return null;
  }
  return await users.update(id, patch);
}

async function safeRemove(id: string): Promise<boolean> {
  if (!users.exists(id)) {
    console.warn(`Cannot remove: user ${id} not found`);
    return false;
  }
  const result = await users.remove(id);
  return result.removed;
}
```

### Validating populate data

When hydrating a collection from an external source, validate the data shape before calling `populate()`:

```ts
type User = { name: string; email: string; age: number };

function validateForPopulate(docs: unknown[]): Doc<User>[] {
  return docs.map((doc, index) => {
    if (typeof doc !== 'object' || doc === null) {
      throw new Error(`Document at index ${index} is not an object`);
    }
    const d = doc as Record<string, unknown>;
    if (!d._id || typeof d._id !== 'string') {
      throw new Error(`Document at index ${index} is missing a valid _id`);
    }
    return d as Doc<User>;
  });
}

const rawData = await fetchUsersFromAPI();
const validated = validateForPopulate(rawData);
users.populate(validated);
```

## Error behavior summary

| Operation | Error condition | Side effect | Recovery |
|---|---|---|---|
| `update('', patch)` | Empty ID | None (throws before write) | Fix caller code |
| `update(id, patch)` | ID not found | None (throws before write) | Check `exists(id)` first |
| `remove('')` | Empty ID | None (throws before write) | Fix caller code |
| `remove(id)` | ID not found | None (throws before write) | Check `exists(id)` first |
| `populate([...])` | Missing `_id` | None (throws before write) | Ensure all docs have `_id` |
| `create(doc)` | Sync failure | Doc removed (reverted) | Catch error or listen `syncError` |
| `update(id, patch)` | Sync failure | Doc reverted to previous state | Catch error or listen `syncError` |
| `remove(id)` | Sync failure | Doc re-inserted (reverted) | Catch error or listen `syncError` |

The key distinction: **validation errors** throw before any mutation occurs, so there is nothing to revert. **Sync errors** throw after an optimistic write, and GraphDB automatically reverts the change before throwing.
