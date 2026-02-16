---
title: Sorting & Pagination
description: Sort results and paginate with skip and limit.
---

GraphDB supports sorting and pagination through the `QueryOptions` parameter on `query()`. The pipeline always executes in the order: **filter, sort, skip, limit**.

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
await users.create({ name: "Alex", email: "alex2@example.com", age: 22 });
```

## Sorting with orderBy

Use `orderBy` to sort results by one or more fields. Each field can be sorted in `"ASC"` (ascending) or `"DESC"` (descending) order.

### Single-field sort

```ts
const youngest = users.query({}, {
  orderBy: { age: "ASC" },
});
// Alex (22), Sam (25), Alex (30), Jordan (35)

const oldest = users.query({}, {
  orderBy: { age: "DESC" },
});
// Jordan (35), Alex (30), Sam (25), Alex (22)
```

### Multi-field sort

When sorting by multiple fields, the first field is compared first. If two documents have the same value for the first field, the second field is used as a tiebreaker, and so on.

```ts
const sorted = users.query({}, {
  orderBy: { name: "ASC", age: "DESC" },
});
// Alex (30), Alex (22), Jordan (35), Sam (25)
// Both "Alex" entries are grouped, with age descending within that group
```

### Sort behavior by type

- **Strings** are compared using `localeCompare()`, which provides locale-aware alphabetical ordering.
- **Numbers** are compared using subtraction (`a - b`), giving standard numerical ordering.
- **Unsupported types** (objects, booleans, etc.) are treated as equal, preserving their original order relative to each other.

## Pagination with skip and limit

### skip

`skip` specifies how many documents to skip from the beginning of the sorted results.

```ts
const results = users.query({}, {
  orderBy: { age: "ASC" },
  skip: 1,
});
// Sam (25), Alex (30), Jordan (35) -- skipped Alex (22)
```

A `skip` of `0` has no effect:

```ts
const results = users.query({}, { skip: 0 });
// All documents returned
```

If `skip` is greater than or equal to the number of results, an empty array is returned:

```ts
const results = users.query({}, { skip: 100 });
// []
```

### limit

`limit` specifies the maximum number of documents to return.

```ts
const results = users.query({}, {
  orderBy: { age: "ASC" },
  limit: 2,
});
// Alex (22), Sam (25)
```

A `limit` of `0` returns an empty array:

```ts
const results = users.query({}, { limit: 0 });
// []
```

### Combining skip and limit

Use both together for page-based pagination:

```ts
const pageSize = 2;

// Page 1
const page1 = users.query({}, {
  orderBy: { age: "ASC" },
  skip: 0,
  limit: pageSize,
});
// Alex (22), Sam (25)

// Page 2
const page2 = users.query({}, {
  orderBy: { age: "ASC" },
  skip: 2,
  limit: pageSize,
});
// Alex (30), Jordan (35)

// Page 3 (beyond data)
const page3 = users.query({}, {
  orderBy: { age: "ASC" },
  skip: 4,
  limit: pageSize,
});
// []
```

## Pipeline order

The query pipeline always runs in this fixed order:

1. **Filter** -- select documents matching the where clause
2. **Sort** -- order the filtered results by `orderBy`
3. **Skip** -- discard the first N documents
4. **Limit** -- take at most N documents from what remains

This order matters. Sorting is applied to the full filtered set before pagination, so you always get a consistent page of results regardless of insertion order.

```ts
// Get the 2nd and 3rd oldest users who are at least 25
const results = users.query({ age: { gte: 25 } }, {
  orderBy: { age: "DESC" },
  skip: 1,
  limit: 2,
});
// Filter: Alex (30), Sam (25), Jordan (35)
// Sort (DESC): Jordan (35), Alex (30), Sam (25)
// Skip 1: Alex (30), Sam (25)
// Limit 2: Alex (30), Sam (25)
```

## Using with count

Combine `count()` with pagination to know the total number of matching documents:

```ts
const where = { age: { gte: 25 } };
const total = users.count(where);
const page = users.query(where, {
  orderBy: { age: "ASC" },
  skip: 0,
  limit: 10,
});

console.log(`Showing ${page.length} of ${total} results`);
```
