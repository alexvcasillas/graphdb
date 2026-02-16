---
title: Indexes
description: Use hash indexes to accelerate equality lookups.
---

GraphDB supports hash indexes on specified fields to speed up queries that use equality-based lookups. Indexes trade memory for query performance -- they are most valuable on fields you frequently filter by.

## Configuring indexes

Pass an `indexes` array when creating a collection:

```ts
import { GraphDB } from "@graphdb/core";

type User = {
  name: string;
  email: string;
  age: number;
};

const db = GraphDB();
const users = db.createCollection<User>("users", {
  indexes: ["email", "age"],
});
```

Each indexed field gets a hash map data structure that maps field values to sets of document IDs.

## Which operators benefit from indexes

Indexes accelerate these lookup types:

| Lookup type | Example | Uses index |
|---|---|---|
| Primitive equality | `{ email: "alex@example.com" }` | Yes |
| `eq` operator | `{ email: { eq: "alex@example.com" } }` | Yes |
| `in` operator | `{ age: { in: [25, 30, 35] } }` | Yes |

For `in` queries, GraphDB looks up each value in the index and unions the resulting document ID sets, avoiding a full collection scan.

## Which operators do NOT use indexes

These operators always require scanning documents (either the full collection or a candidate set):

| Operator | Example |
|---|---|
| `notEq` | `{ age: { notEq: 30 } }` |
| `gt` | `{ age: { gt: 25 } }` |
| `gte` | `{ age: { gte: 25 } }` |
| `lt` | `{ age: { lt: 30 } }` |
| `lte` | `{ age: { lte: 30 } }` |
| `includes` | `{ email: { includes: "example" } }` |
| `startsWith` | `{ name: { startsWith: "Al" } }` |
| `endsWith` | `{ email: { endsWith: ".com" } }` |
| `match` (RegExp) | `{ name: { match: /alex/i } }` |
| Top-level RegExp | `{ name: /alex/i }` |

When a query combines an indexed field (with an equality or `in` check) and a non-indexed operator, GraphDB uses the index to narrow the candidate set first, then applies the remaining filters via scan on those candidates.

## Internal structure

Indexes use a nested `Map` structure:

```
Map<field, Map<value, Set<docId>>>
```

For example, with an index on `age`:

```
"age" -> Map {
  25 -> Set { "id-sam" },
  30 -> Set { "id-alex" },
  35 -> Set { "id-jordan" },
}
```

Looking up `{ age: 30 }` is an O(1) map lookup to retrieve the set of matching document IDs, compared to scanning every document in the collection.

## Index maintenance

Indexes are automatically kept in sync with the collection data:

- **create** -- the new document's indexed field values are added to the index.
- **update** -- the old values are removed from the index and the new values are added.
- **remove** -- the document's indexed field values are removed from the index.
- **populate** -- indexes are rebuilt for all populated documents.
- **clear** -- indexes are cleared along with the collection data.

You never need to manually rebuild or refresh indexes.

## Index-assisted queries vs full scans

Consider a collection with 10,000 users and an index on `email`:

```ts
// Index-assisted: O(1) lookup
users.query({ email: { eq: "alex@example.com" } });

// Full scan: checks all 10,000 documents
users.query({ age: { gt: 25 } });
```

When mixing indexed and non-indexed fields:

```ts
// Index narrows candidates first, then scans only those
users.query({
  email: { eq: "alex@example.com" },
  age: { gt: 25 },
});
```

Here, the index on `email` produces a small candidate set (likely one document), and the `age` filter is applied only to that candidate -- not to the full collection.

## Trade-offs

**Benefits:**
- Equality and `in` lookups become O(1) instead of O(n).
- Queries combining indexed and non-indexed fields scan fewer documents.

**Costs:**
- Each index adds memory proportional to the number of unique values in the field.
- Every write operation (create, update, remove) must also update the index, adding a small overhead.

## Best practices

- Index fields you frequently query with equality checks or `in` operators.
- Avoid indexing fields with extremely high cardinality where every value is unique (like `_id`) unless you need fast equality lookups on them.
- Avoid indexing fields you rarely query -- the write overhead is not worth it.
- Fields used primarily with range operators (`gt`, `lt`, `gte`, `lte`) or string matching (`includes`, `startsWith`, `endsWith`, `match`) do not benefit from hash indexes.
