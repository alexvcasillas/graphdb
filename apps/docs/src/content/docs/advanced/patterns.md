---
title: Patterns
description: Common patterns and best practices for using GraphDB.
---

This page presents practical patterns for common use cases. Each pattern includes a description of the problem, the approach, and a working code example.

## Offline-first pattern

**Problem:** Your application needs to work without a network connection. Data should be available immediately on startup and sync back to the server when connectivity is restored.

**Approach:** On app load, fetch data from your API and hydrate the collection with `populate()`. Configure syncers to push writes back to the server. If the network is down, the syncer will fail, GraphDB will revert the local change, and you can retry later.

```ts
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();

const users = db.collection<User>('users', {
  indexes: ['email'],
  syncers: {
    create: async (doc) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      return res.ok;
    },
    update: async (doc) => {
      const res = await fetch(`/api/users/${doc._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      return res.ok;
    },
    remove: async (doc) => {
      const res = await fetch(`/api/users/${doc._id}`, {
        method: 'DELETE',
      });
      return res.ok;
    },
  },
});

// Hydrate on app startup
async function initializeUsers() {
  try {
    const response = await fetch('/api/users');
    const apiUsers = await response.json();

    users.populate(
      apiUsers.map((u: any) => ({
        _id: u.id,
        _createdAt: u.createdAt,
        _updatedAt: u.updatedAt,
        name: u.name,
        email: u.email,
        age: u.age,
      })),
    );

    console.log(`Loaded ${users.count()} users`);
  } catch (error) {
    console.warn('Failed to load users from API, starting with empty store');
  }
}

// Queue failed operations for retry
const pendingWrites: Array<() => Promise<void>> = [];

users.on('syncError', () => {
  // In a real app, capture the operation details for retry
  console.warn('Sync failed, operation will be retried when online');
});

async function retryPendingWrites() {
  while (pendingWrites.length > 0) {
    const operation = pendingWrites.shift()!;
    try {
      await operation();
    } catch {
      pendingWrites.unshift(operation);
      break; // Still offline, stop retrying
    }
  }
}
```

## Optimistic UI pattern

**Problem:** You want the UI to feel instant. Users should see their changes immediately, even before the server confirms them. If the server rejects the change, the UI should revert.

**Approach:** GraphDB's syncer system does this automatically. The write is applied to the in-memory store first (so the UI updates), then the syncer runs asynchronously. On failure, the write is reverted. Combine this with listeners to keep the UI in sync.

```ts
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();

const users = db.collection<User>('users', {
  syncers: {
    update: async (doc) => {
      const res = await fetch(`/api/users/${doc._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      return res.ok;
    },
  },
});

// UI state management
let userList: Doc<User>[] = [];

function renderUsers() {
  // Your framework's render logic here
  console.log('Rendering', userList.length, 'users');
}

// Listen for all changes and re-render
users.on('created', () => {
  userList = users.query({});
  renderUsers();
});

users.on('updated', () => {
  userList = users.query({});
  renderUsers();
});

users.on('removed', () => {
  userList = users.query({});
  renderUsers();
});

// Handle sync failures -- the revert already happened,
// but we need to re-render to reflect the reverted state
users.on('syncError', () => {
  userList = users.query({});
  renderUsers();
  showNotification('Your change could not be saved and was reverted.');
});

// User action: rename a user
async function renameUser(id: string, newName: string) {
  // This updates immediately (UI sees it right away via 'updated' listener)
  // If the server rejects, it reverts (UI sees revert via 'syncError' listener)
  try {
    await users.update(id, { name: newName });
  } catch {
    // Error already handled by syncError listener,
    // but you can add call-site-specific logic here
  }
}
```

The key insight is that you do not need to manage optimistic state yourself. GraphDB handles the write-then-revert lifecycle, and your listeners keep the UI synchronized with the actual store state.

## Repository pattern

**Problem:** You want to encapsulate data access logic behind a clean interface. Business rules, default values, derived fields, and validation should live in one place, not be scattered across your application.

**Approach:** Wrap a GraphDB collection in a module or class that exposes domain-specific methods. The collection is an implementation detail.

```ts
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();

function createUserRepository() {
  const collection = db.collection<User>('users', {
    indexes: ['email', 'age'],
  });

  return {
    // Domain-specific queries
    findByEmail(email: string): Doc<User> | null {
      return collection.findOne({ email });
    },

    findAdults(): Doc<User>[] {
      return collection.query(
        { age: { gte: 18 } },
        { sort: { name: 'ASC' } },
      );
    },

    findByAgeRange(min: number, max: number): Doc<User>[] {
      return collection.query({}).filter(
        (user) => user.age >= min && user.age <= max,
      );
    },

    // Validated writes
    async createUser(
      name: string,
      email: string,
      age: number,
    ): Promise<Doc<User>> {
      // Business validation
      if (age < 0 || age > 150) {
        throw new Error(`Invalid age: ${age}`);
      }
      if (!email.includes('@')) {
        throw new Error(`Invalid email: ${email}`);
      }

      // Check for duplicate email
      const existing = collection.findOne({ email });
      if (existing) {
        throw new Error(`User with email ${email} already exists`);
      }

      return await collection.create({ name, email, age });
    },

    async updateEmail(id: string, newEmail: string): Promise<Doc<User>> {
      if (!newEmail.includes('@')) {
        throw new Error(`Invalid email: ${newEmail}`);
      }

      const duplicate = collection.findOne({ email: newEmail });
      if (duplicate && duplicate._id !== id) {
        throw new Error(`Email ${newEmail} is already taken`);
      }

      return await collection.update(id, { email: newEmail });
    },

    async deactivateUser(id: string): Promise<{ removed: boolean }> {
      return await collection.remove(id);
    },

    // Statistics
    countByAge(age: number): number {
      return collection.count({ age });
    },

    totalUsers(): number {
      return collection.count();
    },

    // Expose event subscription for the UI layer
    onChange(callback: () => void) {
      const cancelCreated = collection.on('created', callback);
      const cancelUpdated = collection.on('updated', callback);
      const cancelRemoved = collection.on('removed', callback);

      // Return a single cancel function that removes all listeners
      return () => {
        cancelCreated();
        cancelUpdated();
        cancelRemoved();
      };
    },

    // Hydration
    populate(docs: Doc<User>[]) {
      collection.populate(docs);
    },
  };
}

// Usage
const userRepo = createUserRepository();

await userRepo.createUser('Alice', 'alice@example.com', 25);
const alice = userRepo.findByEmail('alice@example.com');
const adults = userRepo.findAdults();
const total = userRepo.totalUsers();
```

This pattern keeps your components and business logic clean. They interact with `userRepo.findByEmail()` instead of `collection.query({ email })`. Validation, defaults, and error messages are centralized.

## Testing patterns

**Problem:** You need to test code that uses GraphDB. You want tests to be isolated, fast, and deterministic.

**Approach:** Create a fresh `GraphDB` instance per test. Synchronous reads need no mocking. For async writes with syncers, provide mock syncer functions.

### Basic test setup

```ts
import { describe, it, expect } from 'bun:test';
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

describe('user operations', () => {
  // Fresh database for each test -- complete isolation
  function setup() {
    const db = GraphDB();
    const users = db.collection<User>('users', {
      indexes: ['email'],
    });
    return { db, users };
  }

  it('creates and reads a user', async () => {
    const { users } = setup();

    const created = await users.create({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
    });

    const found = users.read(created._id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Alice');
  });

  it('queries users by age', async () => {
    const { users } = setup();

    await users.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
    await users.create({ name: 'Bob', email: 'bob@example.com', age: 30 });
    await users.create({ name: 'Carol', email: 'carol@example.com', age: 25 });

    const age25 = users.query({ age: 25 });
    expect(age25).toHaveLength(2);
  });
});
```

Since GraphDB is entirely in-memory with no external dependencies, each test gets a completely isolated database by calling `GraphDB()`. No teardown, no cleanup, no shared state between tests.

### Testing with syncers

When testing code that uses syncers, provide mock syncer functions that you control:

```ts
import { describe, it, expect } from 'bun:test';
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

describe('synced operations', () => {
  it('syncs successfully when syncer returns true', async () => {
    const db = GraphDB();
    const users = db.collection<User>('users', {
      syncers: {
        create: async () => true, // Always succeeds
      },
    });

    const doc = await users.create({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
    });

    // Document exists because sync succeeded
    expect(users.exists(doc._id)).toBe(true);
  });

  it('reverts on sync failure', async () => {
    const db = GraphDB();
    const users = db.collection<User>('users', {
      syncers: {
        create: async () => false, // Always fails
      },
    });

    try {
      await users.create({
        name: 'Alice',
        email: 'alice@example.com',
        age: 25,
      });
    } catch {
      // Expected: sync failure throws
    }

    // Document was reverted
    expect(users.count()).toBe(0);
  });

  it('emits syncError event on failure', async () => {
    const db = GraphDB();
    const errors: unknown[] = [];

    const users = db.collection<User>('users', {
      syncers: {
        create: async () => false,
      },
    });

    users.on('syncError', (payload) => {
      errors.push(payload);
    });

    try {
      await users.create({
        name: 'Alice',
        email: 'alice@example.com',
        age: 25,
      });
    } catch {
      // Expected
    }

    expect(errors).toHaveLength(1);
  });
});
```

### Testing listeners

Listeners fire synchronously during write operations, so you can assert on them immediately after the write:

```ts
import { describe, it, expect } from 'bun:test';
import { GraphDB, type Doc } from '@graphdb/core';

type User = { name: string; email: string; age: number };

describe('listeners', () => {
  it('fires created event with the new document', async () => {
    const db = GraphDB();
    const users = db.collection<User>('users');
    const events: Doc<User>[] = [];

    users.on('created', (payload) => {
      events.push(payload.doc);
    });

    await users.create({ name: 'Alice', email: 'alice@example.com', age: 25 });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Alice');
  });

  it('fires per-document listener on update', async () => {
    const db = GraphDB();
    const users = db.collection<User>('users');
    let updatedDoc: Doc<User> | null = null;

    const alice = await users.create({
      name: 'Alice',
      email: 'alice@example.com',
      age: 25,
    });

    users.listen(alice._id, (payload) => {
      updatedDoc = payload.doc;
    });

    await users.update(alice._id, { age: 26 });

    expect(updatedDoc).not.toBeNull();
    expect(updatedDoc!.age).toBe(26);
  });

  it('supports O(1) unsubscribe', async () => {
    const db = GraphDB();
    const users = db.collection<User>('users');
    let callCount = 0;

    const cancel = users.on('created', () => {
      callCount++;
    });

    await users.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
    expect(callCount).toBe(1);

    cancel(); // Unsubscribe

    await users.create({ name: 'Bob', email: 'bob@example.com', age: 30 });
    expect(callCount).toBe(1); // Not incremented
  });
});
```

### Testing the repository pattern

When you use the repository pattern, test the repository itself rather than the raw collection:

```ts
import { describe, it, expect } from 'bun:test';

describe('user repository', () => {
  it('rejects duplicate emails', async () => {
    const userRepo = createUserRepository();

    await userRepo.createUser('Alice', 'alice@example.com', 25);

    expect(
      userRepo.createUser('Bob', 'alice@example.com', 30),
    ).rejects.toThrow('User with email alice@example.com already exists');
  });

  it('rejects invalid ages', () => {
    const userRepo = createUserRepository();

    expect(
      userRepo.createUser('Alice', 'alice@example.com', -5),
    ).rejects.toThrow('Invalid age: -5');
  });
});
```

## Summary

| Pattern | When to use | Key benefit |
|---|---|---|
| Offline-first | App must work without network | Data available immediately, syncs when online |
| Optimistic UI | UI must feel instant | Users see changes before server confirms |
| Repository | Business logic needs a clean boundary | Validation and queries centralized in one place |
| Testing | Always | No setup, no teardown, complete isolation per test |
