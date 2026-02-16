---
title: Performance
description: Performance characteristics and complexity analysis.
---

GraphDB is an in-memory database, so all operations are fast. However, understanding the complexity characteristics helps you design your data model and decide when indexes are worth the memory cost.

## Complexity reference

### Read operations

| Operation | Complexity | Notes |
|---|---|---|
| `read(id)` | O(1) | `Map.get()` |
| `exists(id)` | O(1) | `Map.has()` |
| `count()` (no filter) | O(1) | `Map.size` |
| `count(where)` | O(n) | Delegates to `query()` |
| `findOne(where)` | O(n) worst case | Stops at first match |
| `query()` (no index) | O(n) | Full scan of all documents |
| `query()` (indexed, equality/eq) | O(1) + O(k) | O(1) index lookup, O(k) candidate evaluation |
| `query()` (indexed, `in` operator) | O(m) + O(k) | O(m) lookups (m = array size), O(k) candidate evaluation |

Where **n** = total documents, **k** = matching candidates, **m** = size of the `in` array.

### Write operations

| Operation | Complexity | Notes |
|---|---|---|
| `create(doc)` | O(1) + O(i) | O(1) insert, O(i) index updates |
| `update(id, patch)` | O(1) + O(i) | O(1) lookup + merge, O(i) index updates |
| `remove(id)` | O(1) + O(i) | O(1) delete, O(i) index updates |
| `updateMany(where, patch)` | O(n) + O(k) | O(n) query, O(k) sequential writes |
| `removeMany(where)` | O(n) + O(k) | O(n) query, O(k) sequential writes |
| `populate(docs)` | O(n) + O(n*i) | O(n) inserts, O(n*i) index rebuild |
| `clear()` | O(1) | `Map.clear()` on docs and each index bucket |

Where **i** = number of indexed fields.

### Listener operations

| Operation | Complexity | Notes |
|---|---|---|
| `on(event, handler)` | O(1) | `Set.add()` |
| `listen(id, handler)` | O(1) | `Set.add()` |
| Unsubscribe (cancel function) | O(1) | `Set.delete()` |

### Sorting

| Operation | Complexity | Notes |
|---|---|---|
| `sortDocuments()` | O(n log n) | Standard comparison sort |

### Memory

| Structure | Memory | Notes |
|---|---|---|
| Document storage | O(n) | One entry per document |
| Index storage | O(n * i) | n = documents, i = indexed fields |
| Per-index bucket | O(distinct values) | One `Set` per distinct value per field |

## When indexes help

Indexes accelerate queries that use **equality-based** lookups on the indexed field. They are most effective when:

- You query frequently by a specific field (e.g., looking up users by `email`).
- The field has high cardinality (many distinct values), so each index bucket is small.
- You combine indexed fields in a query, because the query planner intersects candidate sets smallest-first.

```ts
import { GraphDB } from '@graphdb/core';

type User = { name: string; email: string; age: number };

const db = GraphDB();
const users = db.collection<User>('users', {
  indexes: ['email', 'age'],
});

// Fast: "email" is indexed, O(1) lookup
const results = users.query({ email: 'alice@example.com' });

// Fast: "age" is indexed, O(1) lookup per value in the array
const youngUsers = users.query({ age: { in: [25, 26, 27] } });

// Fast: both fields indexed, candidate sets are intersected
const specific = users.query({ email: 'alice@example.com', age: 25 });
```

## When indexes do not help

Indexes provide no benefit for:

- **Range operators** (`gt`, `gte`, `lt`, `lte`): These require scanning values, not exact lookups. The query planner falls through to evaluating candidates or a full scan.
- **`contains` and `regex` operators**: These cannot use hash-based lookups.
- **Low-cardinality fields**: If a field only has a few distinct values (e.g., a `role` field with "admin" and "user"), the index buckets are large, reducing the filtering benefit.
- **Write-heavy workloads with rarely-queried fields**: Every `create`, `update`, and `remove` must update all indexes. If you index a field you never filter by, you pay the write cost for no query benefit.

```ts
// NOT accelerated by index: range operator requires scan
const adults = users.query({ age: { gt: 18 } });

// NOT accelerated by index: regex cannot use hash lookup
const matched = users.query({ name: { regex: /^Ali/ } });
```

## Index memory cost

Each index maintains a `Map<value, Set<docId>>` for one field. The memory cost is proportional to the number of documents multiplied by the number of indexed fields.

For a collection of 10,000 users with 2 indexed fields (`email` and `age`):

- The `email` index stores up to 10,000 entries (one per unique email), each containing a `Set` with one `_id`.
- The `age` index stores entries for each distinct age value. If ages range from 18 to 80, that is roughly 62 entries, each containing a `Set` with the `_id`s of users of that age.

The overhead is modest for most in-memory use cases. If memory is a concern, only index fields you actually query by.

## Practical guidance

### Choosing what to index

Ask yourself these questions:

1. **Do I query this field frequently?** If you only filter by `email` once during app initialization, an index is unnecessary.
2. **Is the filter an equality check?** Indexes only accelerate `eq`, primitive equality, and `in`. Range queries get no benefit.
3. **Am I willing to pay the write overhead?** Each indexed field adds O(1) work per write. For 2-3 indexes this is negligible. For 10+ indexes on a write-heavy collection, measure first.

### Batch operations

Use `populate()` for loading initial data rather than calling `create()` in a loop. `populate()` inserts all documents first and rebuilds indexes once, rather than updating indexes per insert.

```ts
type User = { name: string; email: string; age: number };

// Good: single populate call, indexes built once
const apiData = await fetchUsers();
users.populate(apiData.map((u) => ({
  ...u,
  _id: u.id,
  _createdAt: u.createdAt,
  _updatedAt: u.updatedAt,
})));

// Less efficient: N individual creates, N index rebuilds
for (const u of apiData) {
  await users.create(u);
}
```

### Query optimization

When combining filters, place indexed fields alongside non-indexed ones. The query planner will use the index to narrow down candidates before evaluating expensive checks:

```ts
// If "age" is indexed but "name" is not:
// The planner uses the age index to find candidates,
// then evaluates the regex only on those candidates.
const results = users.query({
  age: 25,
  name: { regex: /^Ali/ },
});
```

## When to use GraphDB

GraphDB is a strong fit for:

- **Prototyping and MVPs.** Zero configuration, no server, no schema files. Define a type and start storing data.
- **Client-side caching.** Cache API responses in a queryable store with indexes for fast lookups.
- **Offline-first applications.** Use `populate()` to hydrate from an API on startup, and syncers to push writes back when connectivity returns.
- **Small to medium datasets.** Hundreds to low tens of thousands of documents per collection work comfortably in memory.
- **Testing.** Create a fresh database per test with no setup or teardown. No mocking needed for synchronous read operations.

## When to consider alternatives

GraphDB is not designed for:

- **Large datasets (100k+ documents).** All data lives in memory. There is no disk-backed storage, no pagination at the storage layer, and no streaming.
- **Persistence requirements.** GraphDB is ephemeral. If the process restarts, data is gone unless you re-populate from an external source.
- **Multi-process or multi-server.** There is no built-in replication, clustering, or shared memory. Each process gets its own independent in-memory store.
- **Complex relational queries.** There are no joins, aggregations, or transactions. If your data model requires these, a relational database is more appropriate.
- **Full-text search.** The `contains` and `regex` operators work but are O(n) scans. Dedicated search engines are better for large-scale text search.
