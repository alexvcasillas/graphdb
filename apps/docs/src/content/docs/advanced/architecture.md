---
title: Architecture
description: Internal architecture and design decisions of GraphDB.
---

This page explains how GraphDB is built internally. Understanding the architecture helps you make informed decisions about data modeling, indexing, and when to reach for specific APIs.

## High-level overview

```
+---------------------------------------------------+
|                    GraphDB()                       |
|              (factory function)                    |
|                                                    |
|   Returns GraphDBType: thin wrapper holding        |
|   Map<string, Collection>                          |
|                                                    |
|   +---------------------------------------------+ |
|   | createCollection<T>(options?)                | |
|   |                                              | |
|   | +----------+  +---------+  +-------------+  | |
|   | | Storage  |  | Indexes |  | Listeners   |  | |
|   | | Map<     |  | Map<    |  | Map<Event,  |  | |
|   | |  id,     |  |  field, |  |  Set<fn>>   |  | |
|   | |  Doc<T>> |  |  Map<   |  |             |  | |
|   | |          |  |   value,|  | Map<docId,  |  | |
|   | |          |  |   Set<  |  |  Set<fn>>   |  | |
|   | |          |  |   id>>> |  +-------------+  | |
|   | +----------+  +---------+                    | |
|   |                                              | |
|   | +----------+  +-----------+                  | |
|   | | Syncers  |  | Utilities |                  | |
|   | | (optional|  | - where   |                  | |
|   | |  async   |  |   checker |                  | |
|   | |  hooks)  |  | - sort    |                  | |
|   | +----------+  | - isEmpty |                  | |
|   |               +-----------+                  | |
|   +---------------------------------------------+ |
+---------------------------------------------------+
```

## Closure-based design

GraphDB uses closure-based encapsulation rather than classes. The `createCollection()` function declares all internal state as local variables and returns a plain object whose methods close over that state. This means:

- **Private by default.** Internal structures like the document `Map`, index `Map`, and listener `Set` instances are not accessible from outside. There is no `this` to leak, no prototype to monkey-patch, and no need for `#private` fields or `WeakMap` tricks.
- **No `this` binding issues.** Every returned method is a plain closure. You can destructure, pass callbacks around, or assign methods to variables without worrying about lost context.
- **Simpler testing.** The returned object is a plain JavaScript object with predictable behavior.

```ts
// Simplified mental model of createCollection
function createCollection<T>(options?) {
  // Private state -- not reachable from outside
  const documents = new Map<string, Doc<T>>();
  const indexes = new Map<keyof T, Map<unknown, Set<string>>>();
  const onListeners = new Map<EventType, Set<(payload: any) => void>>();
  const docListeners = new Map<string, Set<(payload: ListenerPayload<T>) => void>>();

  // Public API -- closes over private state
  return {
    create(doc) { /* ... */ },
    read(id) { /* ... */ },
    update(id, patch) { /* ... */ },
    remove(id) { /* ... */ },
    query(where, options) { /* ... */ },
    // ...
  };
}
```

## Document storage

Documents are stored in a `Map<string, Doc<T>>`. The key is the document's `_id`, a string generated via `crypto.randomUUID()` at creation time. Each document is stored as a `Doc<T>`, which extends your type `T` with system fields:

```ts
type Doc<T> = T & {
  _id: string;
  _createdAt: number;  // epoch milliseconds
  _updatedAt: number;  // epoch milliseconds
};
```

Timestamps are epoch milliseconds (`number`), not `Date` objects. This makes comparisons trivial and avoids serialization issues.

Using a `Map` provides:

- O(1) `read(id)` via `Map.get()`
- O(1) `exists(id)` via `Map.has()`
- O(1) `count()` (no filter) via `Map.size`
- Insertion-order iteration when scanning

## Index structure

Indexes follow a three-level `Map` structure:

```
indexes: Map<field, Map<value, Set<docId>>>
```

For example, given a collection of users indexed on `age`:

```
indexes = Map {
  "age" => Map {
    25 => Set { "uuid-1", "uuid-4" },
    30 => Set { "uuid-2" },
    35 => Set { "uuid-3", "uuid-5", "uuid-7" }
  }
}
```

When you create a collection with `indexes: ['age']`, GraphDB initializes an empty `Map` for the `age` field. As documents are created, updated, or removed, three internal helpers maintain index consistency:

- **`indexAdd(doc)`** -- iterates each indexed field, gets the field's value from the document, and adds the document's `_id` to the corresponding `Set`. Creates the `Set` if it does not exist yet.
- **`indexRemove(doc)`** -- reverse of `indexAdd`. Removes the `_id` from the `Set` and cleans up empty `Set` entries to avoid memory leaks.
- **`indexUpdate(before, after)`** -- for each indexed field, compares old and new values. If unchanged, skips the field. Otherwise, removes from the old bucket and adds to the new one.

## Query planner

The query pipeline follows this order: **filter -> sort -> skip -> limit**.

The filter phase uses a function called `getCandidateIds()` that determines whether any `where` clause fields have indexes. The algorithm works as follows:

1. **Check for indexed fields.** For each field in the `where` clause, check if an index exists for that field.
2. **Equality lookups.** If the where value is a primitive (string, number, boolean) or uses the `eq` operator, look up the exact value in the index to get a `Set<docId>`. This is O(1).
3. **`in` operator lookups.** If the where value uses the `in` operator with an array, perform one lookup per array element and union the results. This is O(m) where m is the array length.
4. **Set intersection (smallest-first).** When multiple indexed fields match, sort the candidate sets by size (smallest first) and intersect them. This minimizes the number of comparisons because the smallest set bounds the maximum result size.
5. **Evaluate remaining clauses.** Non-indexed fields and operators that cannot use indexes (like `gt`, `lt`, `contains`, `regex`) are evaluated on the candidate documents only, not the full collection.

If no indexed fields match the query, the planner falls through to a full scan of all documents.

```
Query: { age: 25, name: "Alice" }
Indexes: ["age"]

1. "age" is indexed -> look up value 25 -> Set { "uuid-1", "uuid-4" }
2. "name" is NOT indexed -> skip index phase
3. Candidate set: { "uuid-1", "uuid-4" } (2 docs, not full collection)
4. Evaluate "name === Alice" only on those 2 candidates
```

## Listener system

GraphDB provides two listener mechanisms, both built on `Map<key, Set<handler>>`:

### Collection-level events (`on`)

```
onListeners: Map<EventType, Set<handler>>
```

Events include `created`, `updated`, `removed`, and `syncError`. When an event fires, GraphDB iterates the `Set` for that event type and calls each handler.

### Per-document listeners (`listen`)

```
docListeners: Map<docId, Set<handler>>
```

`listen(id, callback)` attaches a handler that fires whenever the specified document is updated or removed. This enables fine-grained reactivity -- you can watch a single document without receiving events for the entire collection.

### O(1) unsubscribe

Both `on()` and `listen()` return a cancel function. Internally, this cancel function calls `Set.delete(handler)`, which is O(1). There is no array scanning or splicing involved:

```ts
const cancel = users.on('created', (payload) => {
  console.log('New user:', payload.doc);
});

// Later: O(1) unsubscribe
cancel();
```

## Syncer system

Syncers enable optimistic writes. The pattern is:

1. **Apply the write immediately** to the in-memory store (create, update, or remove).
2. **Call the async syncer function** and await its result.
3. **If the syncer returns `true`**, the write stands. Nothing more happens.
4. **If the syncer returns `false` or throws**, GraphDB reverts the write automatically:
   - For `create`: removes the newly created document.
   - For `update`: restores the previous version of the document.
   - For `remove`: re-inserts the removed document.
5. **Emit a `syncError` event** so centralized error handlers can react.
6. **Throw an error** so the caller's `catch` block can handle it.

This design means the UI always sees an immediate response, and corrections happen asynchronously if the backend rejects the write.

```
Timeline:

  create(doc) called
       |
       v
  [Doc written to Map]  <-- UI sees new doc immediately
       |
       v
  [syncer.create(doc) called]
       |
       +-- success --> done
       |
       +-- failure --> [Doc removed from Map]
                       [syncError event emitted]
                       [Error thrown]
```

## Utility functions

### `whereChecker(doc, field, clause)`

Evaluates a single `where` clause against one field of a document. Handles:

- **Primitive values**: direct equality check (`doc[field] === clause`)
- **RegExp values**: tests the field value against the regular expression
- **Operator objects**: evaluates operators like `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, and `regex`

### `sortDocuments(docs, sort)`

Multi-field sort supporting `ASC` and `DESC` directions. Uses `String.prototype.localeCompare()` for string fields and numeric subtraction for numbers. Fields are evaluated in order -- the first field is the primary sort key, the second is the tiebreaker, and so on.

### `isEmptyObject(obj)`

A fast empty-object check using a `for...in` loop that returns `false` on the first property found. Faster than `Object.keys(obj).length === 0` because it avoids allocating an array.
