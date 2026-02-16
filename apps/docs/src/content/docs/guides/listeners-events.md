---
title: Listeners & Events
description: React to document changes with collection events and per-document listeners.
---

GraphDB provides two mechanisms for reacting to data changes: **collection-level events** via `on()` and **per-document listeners** via `listen()`. Both return a `CancelFn` for cleanup, and both use `Map`/`Set` internally for O(1) unsubscribe performance.

## Collection-level events with `on()`

The `on()` method subscribes to events across the entire collection. It returns a `CancelFn` that removes the listener when called.

```typescript
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();
const users = db.createCollection<User>('users');

const cancel = users.on('create', (payload) => {
  console.log('New user created:', payload.doc.name);
});

// Later, stop listening
cancel();
```

### Event types and payloads

There are five event types, each with a typed payload.

#### `create` — fires after a document is created

```typescript
users.on('create', (payload: CreatePayload<User>) => {
  // payload.doc — the full Doc<User> that was created
  console.log(payload.doc._id, payload.doc.name);
});
```

#### `update` — fires after a document is updated

```typescript
users.on('update', (payload: UpdatePayload<User>) => {
  // payload.before — Doc<User> before the update
  // payload.after  — Doc<User> after the update
  // payload.patch  — the partial object that was applied
  console.log('Changed:', Object.keys(payload.patch));
});
```

#### `remove` — fires after a document is removed

```typescript
users.on('remove', (payload: RemovePayload<User>) => {
  // payload.doc — the Doc<User> that was removed
  console.log('Removed user:', payload.doc.email);
});
```

#### `populate` — fires after bulk population

```typescript
users.on('populate', (payload: PopulatePayload) => {
  // payload.count — number of documents that were populated
  console.log(`Loaded ${payload.count} users`);
});
```

#### `syncError` — fires when a syncer operation fails

```typescript
users.on('syncError', (payload: SyncErrorPayload) => {
  // payload.op    — 'create' | 'update' | 'remove'
  // payload.error — the error that was thrown or caught
  // payload.docId — the document ID (when available)
  console.error(`Sync failed for ${payload.op}:`, payload.error);
});
```

### Multiple listeners on the same event

You can register as many listeners as you need for any event. Each call to `on()` returns its own independent `CancelFn`.

```typescript
const cancelLog = users.on('create', (payload) => {
  console.log('Log:', payload.doc.name);
});

const cancelAnalytics = users.on('create', (payload) => {
  trackEvent('user_created', { id: payload.doc._id });
});

// Remove only the analytics listener
cancelAnalytics();
// The log listener continues to fire
```

## Per-document listeners with `listen()`

The `listen()` method subscribes to changes for a single document by its `_id`. The handler fires on create, update, or remove operations that affect that specific document.

```typescript
const doc = await users.create({ name: 'Alice', email: 'alice@example.com', age: 30 });

const cancel = users.listen(doc._id, (payload: ListenerPayload<User>) => {
  console.log('Document changed:', payload);
});

// This triggers the listener
await users.update(doc._id, { age: 31 });

// This also triggers it
await users.remove(doc._id);

// Stop listening
cancel();
```

The `ListenerPayload<T>` is a union of `CreatePayload<T>`, `UpdatePayload<T>`, and `RemovePayload<T>`. You can distinguish between them by checking which properties exist on the payload.

```typescript
users.listen(doc._id, (payload) => {
  if ('before' in payload) {
    // UpdatePayload — has before, after, patch
    console.log('Updated from', payload.before.age, 'to', payload.after.age);
  } else if ('doc' in payload) {
    // Could be CreatePayload or RemovePayload
    console.log('Created or removed:', payload.doc._id);
  }
});
```

## Cleanup patterns

Always store cancel functions and call them when listeners are no longer needed to avoid memory leaks.

```typescript
// Store all cancel functions for batch cleanup
const cancellers: CancelFn[] = [];

cancellers.push(users.on('create', handleCreate));
cancellers.push(users.on('update', handleUpdate));
cancellers.push(users.on('remove', handleRemove));
cancellers.push(users.listen(someDocId, handleDocChange));

// Clean up all listeners at once
function teardown() {
  cancellers.forEach((cancel) => cancel());
  cancellers.length = 0;
}
```

Calling a `CancelFn` more than once is safe and has no effect after the first call.
