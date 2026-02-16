---
title: Querying
description: Query documents with where clauses, operators, and options.
---

GraphDB provides two synchronous methods for querying documents: `query()` which returns an array of matching documents, and `findOne()` which returns the first match or `null`.

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

await users.create({ name: "Alex", email: "alex@example.com", age: 30 });
await users.create({ name: "Sam", email: "sam@example.com", age: 25 });
await users.create({ name: "Jordan", email: "jordan@example.com", age: 35 });
```

## query()

`query()` is synchronous and always returns `Doc<User>[]` -- never `null`. If nothing matches, it returns an empty array.

```ts
const results = users.query({ age: { gte: 30 } });
// [Doc<User>, Doc<User>] -- Alex and Jordan
```

Pass an empty object to get all documents:

```ts
const all = users.query({});
```

## findOne()

`findOne()` is synchronous and returns `Doc<User> | null`. It returns the first document that matches the where clause.

```ts
const user = users.findOne({ name: "Alex" });
// Doc<User> | null
```

## Primitive equality

The simplest form of a where clause uses direct value matching:

```ts
const results = users.query({ name: "Alex" });
```

This matches documents where `name` is exactly `"Alex"`.

## RegExp matching

You can use a RegExp directly at the top level of a where clause:

```ts
const results = users.query({ name: /alex/i });
```

Or use the `match` operator for the same effect:

```ts
const results = users.query({ name: { match: /alex/i } });
```

## Operators

### eq

Strict equality check:

```ts
users.query({ age: { eq: 30 } });
```

### notEq

Not equal:

```ts
users.query({ age: { notEq: 30 } });
// Sam (25) and Jordan (35)
```

### gt

Greater than:

```ts
users.query({ age: { gt: 25 } });
// Alex (30) and Jordan (35)
```

### gte

Greater than or equal:

```ts
users.query({ age: { gte: 30 } });
// Alex (30) and Jordan (35)
```

### lt

Less than:

```ts
users.query({ age: { lt: 30 } });
// Sam (25)
```

### lte

Less than or equal:

```ts
users.query({ age: { lte: 30 } });
// Sam (25) and Alex (30)
```

### includes

Check if a string field contains a substring:

```ts
users.query({ email: { includes: "example" } });
// All users
```

### startsWith

Check if a string field starts with a prefix:

```ts
users.query({ name: { startsWith: "Al" } });
// Alex
```

### endsWith

Check if a string field ends with a suffix:

```ts
users.query({ email: { endsWith: ".com" } });
// All users
```

### match

Match against a regular expression:

```ts
users.query({ name: { match: /^[AJ]/ } });
// Alex and Jordan
```

### in

Match any value in an array:

```ts
users.query({ age: { in: [25, 35] } });
// Sam (25) and Jordan (35)
```

## Multi-field where clauses

You can combine multiple fields in a single where clause. A document must match **all** conditions:

```ts
const results = users.query({
  age: { gte: 25 },
  name: { startsWith: "A" },
});
// Only Alex matches both conditions
```

## Query options

The second argument to `query()` is an optional `QueryOptions` object with `orderBy`, `skip`, and `limit`.

```ts
const results = users.query({ age: { gte: 20 } }, {
  orderBy: { age: "DESC" },
  skip: 0,
  limit: 2,
});
```

See the [Sorting & Pagination](/guides/sorting-pagination) guide for full details on these options.

## Pipeline order

Queries execute in a fixed order:

1. **Filter** -- apply the where clause to select matching documents
2. **Sort** -- order the results by `orderBy` fields
3. **Skip** -- skip the first N results
4. **Limit** -- take at most N results from what remains

This means sorting happens on the full filtered set before pagination is applied, giving you predictable paginated results.
