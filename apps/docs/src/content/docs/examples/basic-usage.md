---
title: Basic Usage
description: Complete user management example from start to finish.
---

A complete walkthrough of GraphDB features using a user management scenario. Every snippet below is self-contained and runnable.

## Setup

```typescript
import { GraphDB } from "@graphdb/core";

interface User {
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  age: number;
  active: boolean;
}

const db = GraphDB();

const users = db.createCollection<User>("users", {
  indexes: ["email", "role", "active"],
});
```

Indexes on `email`, `role`, and `active` speed up equality and `in` lookups on those fields. Other operators still work on any field -- they just fall back to a full scan.

## Creating documents

`create` is async and returns the generated `_id`.

```typescript
const aliceId = await users.create({
  name: "Alice Johnson",
  email: "alice@example.com",
  role: "admin",
  age: 34,
  active: true,
});
// aliceId -> "a1b2c3d4-..." (crypto.randomUUID)

const bobId = await users.create({
  name: "Bob Smith",
  email: "bob@example.com",
  role: "editor",
  age: 28,
  active: true,
});

const carolId = await users.create({
  name: "Carol White",
  email: "carol@example.com",
  role: "viewer",
  age: 41,
  active: false,
});

const daveId = await users.create({
  name: "Dave Park",
  email: "dave@example.com",
  role: "editor",
  age: 25,
  active: true,
});
```

Every document stored in the collection is wrapped in `Doc<User>`, which adds `_id`, `createdAt`, and `updatedAt` (epoch milliseconds).

## Reading a single document

`read` is synchronous and returns `Doc<User> | null`.

```typescript
const alice = users.read(aliceId);
// {
//   _id: "a1b2c3d4-...",
//   createdAt: 1739712000000,
//   updatedAt: 1739712000000,
//   name: "Alice Johnson",
//   email: "alice@example.com",
//   role: "admin",
//   age: 34,
//   active: true,
// }

const ghost = users.read("nonexistent-id");
// null
```

## Querying with where clauses

### Primitive equality

The simplest filter is a plain value match.

```typescript
const admins = users.query({ role: "admin" });
// [ Doc<User> for Alice ]
```

### Comparison operators

```typescript
const over30 = users.query({ age: { gt: 30 } });
// [ Alice (34), Carol (41) ]

const under35 = users.query({ age: { lt: 35 } });
// [ Bob (28), Alice (34), Dave (25) ]

const exactly28 = users.query({ age: { eq: 28 } });
// [ Bob ]
```

### String operators

```typescript
const startsWithD = users.query({ name: { startsWith: "D" } });
// [ Dave Park ]

const gmailUsers = users.query({ email: { endsWith: "@example.com" } });
// [ Alice, Bob, Carol, Dave ]

const containsSmith = users.query({ name: { includes: "Smith" } });
// [ Bob Smith ]
```

### RegExp matching

You can pass a RegExp directly as a top-level where value, or use the `match` operator.

```typescript
// Top-level RegExp
const matchJ = users.query({ name: /johnson/i });
// [ Alice Johnson ]

// match operator
const matchPark = users.query({ name: { match: /park$/i } });
// [ Dave Park ]
```

### The `in` operator

```typescript
const editorsAndViewers = users.query({ role: { in: ["editor", "viewer"] } });
// [ Bob, Carol, Dave ]
```

### Combining multiple fields

All fields in a where clause are ANDed together.

```typescript
const activeEditors = users.query({ role: "editor", active: true });
// [ Bob, Dave ]
```

## Query options: sorting, skip, and limit

```typescript
// Sort by age descending
const byAge = users.query({}, { orderBy: { age: "DESC" } });
// [ Carol (41), Alice (34), Bob (28), Dave (25) ]

// Pagination: page 1, 2 items per page
const page1 = users.query(
  {},
  { orderBy: { name: "ASC" }, limit: 2, skip: 0 },
);
// [ Alice Johnson, Bob Smith ]

// Page 2
const page2 = users.query(
  {},
  { orderBy: { name: "ASC" }, limit: 2, skip: 2 },
);
// [ Carol White, Dave Park ]
```

## findOne

Returns the first matching document or `null`. Useful when you expect exactly one result.

```typescript
const admin = users.findOne({ role: "admin" });
// Doc<User> for Alice

const missing = users.findOne({ role: "superadmin" });
// null
```

## count and exists

```typescript
const totalUsers = users.count();
// 4

const activeCount = users.count({ active: true });
// 3

const aliceExists = users.exists(aliceId);
// true

const ghostExists = users.exists("nonexistent-id");
// false
```

## Updating a document

`update` is async and returns the full updated document.

```typescript
const updatedCarol = await users.update(carolId, { active: true, age: 42 });
// {
//   _id: "...",
//   createdAt: 1739712000000,
//   updatedAt: 1739712060000,   <-- updated
//   name: "Carol White",
//   email: "carol@example.com",
//   role: "viewer",
//   age: 42,                    <-- changed
//   active: true,               <-- changed
// }
```

Only the fields you pass in the patch are changed. `updatedAt` is bumped automatically.

## Bulk operations

### updateMany

```typescript
await users.updateMany({ role: "editor" }, { active: false });
// Bob and Dave are now inactive
```

### removeMany

```typescript
const result = await users.removeMany({ active: false });
// Removes Bob and Dave
```

## Removing a document

```typescript
const removeResult = await users.remove(aliceId);
// { removedId: "a1b2c3d4-...", acknowledge: true }
```

## Listening to events

### Collection-level events

```typescript
const unsubCreate = users.on("create", ({ doc }) => {
  console.log("New user:", doc.name);
});

const unsubUpdate = users.on("update", ({ before, after, patch }) => {
  console.log(`Updated ${before.name}:`, patch);
});

const unsubRemove = users.on("remove", ({ doc }) => {
  console.log("Removed user:", doc.name);
});

// Trigger the listeners
await users.create({
  name: "Eve Turner",
  email: "eve@example.com",
  role: "viewer",
  age: 30,
  active: true,
});
// Console: "New user: Eve Turner"

// Unsubscribe when done
unsubCreate();
unsubUpdate();
unsubRemove();
```

### Per-document listeners

```typescript
const eveId = (await users.findOne({ name: /eve/i }))?._id;

if (eveId) {
  const cancel = users.listen(eveId, (doc) => {
    console.log("Eve changed:", doc);
  });

  await users.update(eveId, { role: "editor" });
  // Console: "Eve changed: { _id: ..., name: 'Eve Turner', role: 'editor', ... }"

  cancel(); // stop listening
}
```

## Populating initial data

`populate` inserts many documents at once and fires a single `populate` event instead of individual `create` events.

```typescript
users.on("populate", ({ count }) => {
  console.log(`Loaded ${count} users`);
});

await users.populate([
  {
    name: "Frank Lee",
    email: "frank@example.com",
    role: "viewer",
    age: 22,
    active: true,
  },
  {
    name: "Grace Kim",
    email: "grace@example.com",
    role: "admin",
    age: 37,
    active: true,
  },
]);
// Console: "Loaded 2 users"
```

## Clearing a collection

```typescript
await users.clear();

const afterClear = users.count();
// 0
```

## Retrieving a collection later

If another part of your application needs access to an existing collection, use `getCollection`.

```typescript
const usersAgain = db.getCollection<User>("users");
// Collection<User> | null
```

This returns the same collection instance -- no data is duplicated.
