# GraphDB Improvement Analysis

> Comprehensive audit of `@alexvcasillas/graphdb` v1.5.1 covering performance,
> developer experience, correctness, and modernization opportunities.

---

## Table of Contents

1. [Migrate to Bun](#1-migrate-to-bun)
2. [Modernize the Toolchain](#2-modernize-the-toolchain)
3. [Performance Improvements](#3-performance-improvements)
4. [Bugs & Correctness Issues](#4-bugs--correctness-issues)
5. [API Design Improvements](#5-api-design-improvements)
6. [Type Safety Improvements](#6-type-safety-improvements)
7. [Testing Improvements](#7-testing-improvements)
8. [Developer Experience](#8-developer-experience)

---

## 1. Migrate to Bun

**Priority: High** | Affects: toolchain, runtime, bundling, testing, DX

TSDX (v0.12.3) is the current build/test/lint orchestrator. It has been
**unmaintained since 2021** and pins the project to outdated versions of
Rollup, Jest, and ESLint. Migrating to Bun replaces *all* of this in one move.

### What Bun replaces

| Current (TSDX)             | Bun equivalent                  |
| -------------------------- | ------------------------------- |
| `tsdx build` (Rollup)     | `bun build` (native bundler)    |
| `tsdx test` (Jest)         | `bun test` (native test runner) |
| `tsdx lint` (ESLint)       | Keep ESLint / Biome (see below) |
| `tsdx watch`               | `bun build --watch`             |
| `yarn install`             | `bun install`                   |
| `uuid` dependency          | `Bun.randomUUIDv7()` or `crypto.randomUUID()` |
| `tslib` (import helpers)   | Not needed -- Bun runs TS natively |

### Migration steps

1. **Delete the `yarn.lock`**, add a `bun.lock`.
2. **Replace scripts** in `package.json`:
   ```jsonc
   {
     "scripts": {
       "dev": "bun build ./src/index.ts --outdir ./dist --watch",
       "build": "bun build ./src/index.ts --outdir ./dist --target node --format esm && bun x tsc --emitDeclarationOnly",
       "test": "bun test",
       "lint": "bunx @biomejs/biome check ./src",
       "prepare": "bun run build"
     }
   }
   ```
3. **Drop dependencies** that Bun makes unnecessary: `tsdx`, `tslib`,
   `@types/jest`, and possibly `uuid` (see Section 3.2).
4. **Migrate tests** from Jest syntax to `bun:test`. The API is nearly
   identical (`describe`, `test`, `expect`, `mock`) -- main change is the
   import: `import { describe, test, expect } from 'bun:test'`.
5. **Update `tsconfig.json`**: change `target` from `"es5"` to `"es2022"`
   (or `"esnext"`), remove `"jsx": "react"` (not used), and remove
   `"importHelpers": true` since `tslib` is no longer needed.
6. **Generate declaration files** separately with `tsc --emitDeclarationOnly`
   since `bun build` does not emit `.d.ts` files.
7. **Update CI** from CircleCI + Node to GitHub Actions + Bun (one-liner
   setup via `oven-sh/setup-bun`).

### Concrete gains

- **Install speed**: `bun install` is 10-30x faster than `yarn`.
- **Test speed**: `bun test` runs significantly faster than Jest through TSDX.
- **Build speed**: Native bundler, no Rollup startup overhead.
- **Fewer dependencies**: Drop ~400+ transitive deps coming from TSDX.
- **Native TypeScript**: No transpilation step for development; run `.ts`
  files directly.

---

## 2. Modernize the Toolchain

### 2.1 Replace TSDX (even without Bun)

If Bun adoption is staged, the immediate step is to drop TSDX regardless.
Alternatives: **tsup** (esbuild-based, zero-config) or **unbuild** (Rollup 4).

`tsup` is the smallest lift -- drop-in for a TS library:

```jsonc
// tsconfig.json stays the same, add tsup.config.ts:
{
  "entry": ["src/index.ts"],
  "format": ["cjs", "esm"],
  "dts": true,
  "clean": true
}
```

### 2.2 Replace Husky v4 with v9+ (or lefthook)

Husky v4 (`"husky": "^4.2.3"`) uses a deprecated hook installation method.
v9 is the current major. Alternatively, **lefthook** is faster and has no
post-install side effects.

### 2.3 Replace ESLint + Prettier with Biome

**Biome** is a single binary that handles linting + formatting. It is
significantly faster than ESLint + Prettier and has zero configuration
for a TypeScript project.

### 2.4 Upgrade TypeScript to 5.x

Current: `^3.8.2`. This misses years of type-system improvements:
template literal types, `satisfies`, `const` type parameters, `NoInfer`,
`using` declarations, and better inference. The strict config is already
on -- upgrading is mostly a version bump.

### 2.5 Update `date-fns` or remove it

`date-fns@^2.10.0` is used for **a single function**: `isBefore()` in
`sort-documents.ts`. This pulls in the entire `date-fns` package for a
comparison that can be done with `dateA.getTime() - dateB.getTime()`.
**Recommendation**: remove `date-fns` entirely and use native Date
comparison.

### 2.6 Replace or remove `uuid`

`uuid@^3.4.0` is v3. Current is v11. It is used only for `v4()` calls.
Options:
- **Built-in**: `crypto.randomUUID()` (available in Node 19+, Bun, all
  modern browsers) -- zero dependencies.
- **Upgrade**: If you need Node 16 support, upgrade to `uuid@11`.

---

## 3. Performance Improvements

### 3.1 Query is O(n) on every call -- add indexing

`query()` in `collection.ts:44` does a full `documents.forEach(...)` scan
on every call. For collections with thousands of documents this becomes
the bottleneck.

**Recommendation**: Add optional hash indexes.

```ts
// Conceptual API
collection.createIndex('email'); // creates Map<value, Set<docId>>
```

A hash index makes equality queries O(1) instead of O(n). Range queries
(`gt`, `lt`, etc.) would need a sorted structure (e.g., a B-tree or
sorted array with binary search).

### 3.2 Listener notification scans the full array

`notifyListenersOn()` at `collection.ts:28-30` filters the entire
`listenersOn` array on every write operation:

```ts
listenersOn
  .filter(listener => listener.type === notifyType)
  .forEach(listener => listener.fn());
```

**Recommendation**: Partition listeners by type at registration time using
a `Map<string, Set<ListenerFn>>`. This turns notification from O(n) to
O(k) where k is only the listeners of that specific type.

Similarly, document-specific listeners (`collection.ts:161-166`) scan
the full `listeners` array to find matches. Store them in a
`Map<documentId, Set<ListenerFn>>` instead.

### 3.3 Listener unsubscribe creates a new array every time

At `collection.ts:240` and `collection.ts:255`:

```ts
listeners = listeners.filter(listener => listener.id !== listenerId);
```

This allocates a new array on every unsubscribe. With a `Map<id, listener>`
or `Set` structure, removal becomes O(1) with no allocation.

### 3.4 `whereChecker` does not short-circuit

In `collection.ts:49-54`, when a where clause has multiple keys:

```ts
let allKeysMatch = true;
for (let [key, value] of Object.entries(where)) {
  if (!whereChecker<T>(key as keyof T, value, document))
    allKeysMatch = false; // <-- does NOT break
}
if (allKeysMatch) queriedDocuments.push(document);
```

Once `allKeysMatch` is `false`, the loop continues checking remaining
keys for no reason. Add a `break`:

```ts
if (!whereChecker<T>(key as keyof T, value, document)) {
  allKeysMatch = false;
  break;
}
```

### 3.5 `sortDocuments` only applies the last sort key

In `sort-documents.ts:48-67`, the loop iterates through `Object.entries(sortBy)`
but each iteration **overwrites** `sortedDocuments`. If you pass
`{ age: 'ASC', name: 'DESC' }`, only `name` sorting survives.

This is both a **bug** and a performance waste (sorts are thrown away).
Multi-field sorting should be done in a single comparator that chains
fields by priority.

### 3.6 Query returns references, not copies

`read()` and `query()` return direct references to the stored `Map`
entries. Consumers can mutate documents and corrupt the store:

```ts
const user = collection.read(id);
user.name = 'hacked'; // Modifies the stored document!
```

**Recommendation**: Return shallow copies (`{ ...document }`) from `read`
and `query`, or document this as intentional (some in-memory DBs do this
for performance and call it "live references").

### 3.7 `new Date()` called twice in `create()`

At `collection.ts:80-81`:

```ts
const createTimestamp = new Date();
const updateTimestamp = new Date();
```

These are two separate `Date` objects that will differ by microseconds.
Use a single timestamp:

```ts
const timestamp = new Date();
// then use `timestamp` for both createdAt and updateAt
```

### 3.8 Remove `date-fns` from sort comparisons

`isBefore()` from `date-fns` adds function call overhead + package weight.
Native comparison is equivalent and faster:

```ts
// Before (with date-fns)
isBefore(valueA, valueB) ? 1 : -1

// After (native)
valueA.getTime() - valueB.getTime()   // ASC
valueB.getTime() - valueA.getTime()   // DESC
```

---

## 4. Bugs & Correctness Issues

### 4.1 `typeof` check fails for RegExp

In `where-checker.ts:9`:

```ts
if (typeof whereClause !== 'object') {
  if (whereClause instanceof RegExp) { ... }
```

`typeof /regex/` returns `"object"`, so the `instanceof RegExp` check
inside the `!== 'object'` branch is **unreachable**. RegExp where clauses
at the top level (e.g., `query({ name: /Alex/ })`) silently fall through
to the object-key iteration path where they happen to work only because
`Object.entries(/Alex/)` returns `[]` -- which means `allKeysMatch` stays
`true` and the regex is never actually tested.

**Fix**: Check `instanceof RegExp` *before* the `typeof` check.

### 4.2 `query()` returns inconsistent types

- 0 matches: `null`
- 1 match: `GraphDocument<T>` (single object)
- 2+ matches: `GraphDocument<T>[]` (array)

This forces every consumer to do a three-way type check:

```ts
const result = collection.query({ active: true });
if (result === null) { /* no results */ }
else if (Array.isArray(result)) { /* multiple */ }
else { /* single */ }
```

**Recommendation**: Always return an array (empty for no matches). This
is the universal convention for query operations and eliminates an entire
class of consumer bugs.

### 4.3 `updateAt` typo -- should be `updatedAt`

The field `updateAt` in `GraphDocument<T>` (`types.ts:44`) is grammatically
inconsistent with `createdAt`. Standard convention is `updatedAt`. This
is a breaking change but worth doing in a major version.

### 4.4 `on()` listener type signature is wrong

In `types.ts:37`:

```ts
on: (
  type: 'create' | 'update' | 'remove' | 'populate',
  listener: ListenerFn<GraphDocument<T>>
) => CancelListenerFn;
```

But the actual implementation (`collection.ts:244-257`) passes `ListenerOnFn`
(no-argument callback), not `ListenerFn<GraphDocument<T>>`. The type says
the listener receives a document; the runtime never passes one.

### 4.5 `create()` wraps `async` inside `new Promise()`

At `collection.ts:78`:

```ts
const create = (document: T): Promise<string> => {
  return new Promise(async (resolve, reject) => {
```

This is the classic **`async` executor anti-pattern**. If the async
function throws before reaching a `try/catch`, the error is swallowed
(unhandled promise rejection). The fix is to make the entire function
`async` and remove the `new Promise` wrapper:

```ts
const create = async (document: T): Promise<string> => {
  // use try/catch + throw instead of resolve/reject
```

The same anti-pattern exists in `update()` (line 116) and `remove()`
(line 176).

### 4.6 Syncer error is silently swallowed

At `collection.ts:97-98`:

```ts
} catch (syncError) {
  // Do nothing here
}
```

If a syncer throws, the error vanishes. The subsequent `if (syncResult)`
check treats it as a failure, but there is no way for the consumer to
know *why* it failed. At minimum, include the original error in the
rejection:

```ts
catch (syncError) {
  documents.delete(_id);
  return reject(syncError);
}
```

### 4.7 `populate()` doesn't validate documents

`populate()` trusts that all documents in the array have valid `_id`
fields. If a document is missing `_id`, it stores `undefined` as the
Map key, which creates a ghost entry.

### 4.8 `skip` is silently ignored when >= array length

At `collection.ts:63`:

```ts
if (options.skip && options.skip < filteredWithOptions.length) {
  filteredWithOptions = filteredWithOptions.slice(options.skip);
}
```

If `skip >= length`, the skip is ignored entirely rather than returning
an empty array. Also, `skip: 0` is falsy and gets skipped even though
it's a valid (no-op) value.

### 4.9 `read()` type says it returns `GraphDocument<T>`, implementation returns `null`

In `types.ts:22`:

```ts
read: (documentId: string) => GraphDocument<T>;
```

But `collection.ts:33-35`:

```ts
const read = (documentId: string): GraphDocument<T> | null => {
  return documents.get(documentId) || null;
};
```

The type definition is missing `| null`.

---

## 5. API Design Improvements

### 5.1 Add `removeCollection()` and `listCollections()`

There is no way to delete a collection or enumerate existing ones. The
internal `Map` grows forever.

### 5.2 Add `count()` method

Getting the number of documents requires `query({})` which returns all
documents into memory just to call `.length`. A dedicated `count(where?)`
avoids this.

### 5.3 Add `exists(documentId)` method

Currently requires `read()` + null check. A boolean `exists()` is clearer
and avoids returning the full document when you only need to know if
it's there.

### 5.4 Add batch write operations

`updateMany(where, patch)` and `removeMany(where)` would avoid the
read-query-loop-update pattern consumers must use today.

### 5.5 Add `clear()` method to collections

No way to empty a collection without removing and recreating it.

### 5.6 Make `listen()` fire on create and remove too

Currently `listen(docId, fn)` only fires on `update`. If a consumer
wants to know when a document is removed, they must use `on('remove')`
which doesn't tell them *which* document was removed. Adding an optional
event filter would help:

```ts
collection.listen(docId, fn, { onCreate: true, onUpdate: true, onRemove: true });
```

### 5.7 Pass document data to `on()` listeners

The `on()` callback receives no arguments. Consumers know *something*
happened but not *what*. Passing the affected document (or document ID
for remove) is much more useful:

```ts
collection.on('create', (document) => { ... });
collection.on('remove', (removedId) => { ... });
```

### 5.8 Support async iteration / streaming queries

For large collections, an `AsyncGenerator`-based query could yield
documents one at a time instead of materializing the full result array.

---

## 6. Type Safety Improvements

### 6.1 Make `Where` type-safe with generics

Current `Where` type allows querying any arbitrary property name:

```ts
type Where = { [property: string]: any };
```

This provides zero type checking. A generic version:

```ts
type Where<T> = {
  [K in keyof T]?: T[K] | WhereClause<T[K]>;
};

type WhereClause<V> = V extends number
  ? { gt?: number; gte?: number; lt?: number; lte?: number }
  : V extends string
  ? { eq?: string; notEq?: string; includes?: string; startsWith?: string; endsWith?: string; match?: RegExp }
  : V;
```

This catches typos in field names and type mismatches at compile time.

### 6.2 Fix `query()` return type

As noted in Section 4.2, the return type should be:

```ts
query: (where: Where<T>, options?: QueryOptions) => GraphDocument<T>[];
```

Always an array, possibly empty.

### 6.3 Add `Readonly<GraphDocument<T>>` to returned documents

If documents should not be mutated by consumers, the return types should
use `Readonly<>` or `DeepReadonly<>` to enforce immutability at the type
level.

### 6.4 Narrow `on()` listener types per event

```ts
on(type: 'create', listener: (doc: GraphDocument<T>) => void): CancelListenerFn;
on(type: 'update', listener: (doc: GraphDocument<T>) => void): CancelListenerFn;
on(type: 'remove', listener: (removedId: string) => void): CancelListenerFn;
on(type: 'populate', listener: (docs: GraphDocument<T>[]) => void): CancelListenerFn;
```

Function overloads make each event's payload type-safe.

### 6.5 Constrain `T` with a record type

Currently `T` is unconstrained, meaning `Collection<number>` or
`Collection<string>` would compile but break at runtime. Adding a
constraint like `T extends Record<string, unknown>` prevents this.

---

## 7. Testing Improvements

### 7.1 Missing test categories

| Category                      | Status  |
| ----------------------------- | ------- |
| Concurrency / race conditions | Missing |
| Listener memory leak          | Missing |
| Nested object documents       | Missing |
| `null` / `undefined` values   | Missing |
| `orderBy` in query options    | Missing |
| Multi-field `orderBy`         | Missing |
| String sorting                | Missing |
| `skip >= length` edge case    | Missing |
| `skip: 0` edge case           | Missing |
| `populate` with empty array   | Missing |
| `populate` with duplicate IDs | Missing |
| `query({})` (empty where)     | Missing |
| `getCollection` for missing   | Missing |
| `read()` type mismatch check  | Missing |
| RegExp top-level where clause | Missing (would expose bug 4.1) |
| Multiple listeners same doc   | Missing |

### 7.2 Test infrastructure

- Migrate from Jest (via TSDX) to `bun:test` along with the Bun migration.
- Add coverage thresholds to CI to enforce the claimed 98.87%.
- Add property-based tests (e.g., `fast-check`) for the query engine to
  catch edge cases in `whereChecker`.

### 7.3 Benchmarks

Add a `bench/` directory with `bun bench` files to track:
- Insert throughput (documents/sec)
- Query latency vs. collection size
- Listener notification overhead
- Memory usage per document

---

## 8. Developer Experience

### 8.1 Publish ESM-first with CJS fallback

The current setup has `"main"` (CJS) as primary and `"module"` (ESM) as
secondary. Modern best practice is:

```jsonc
{
  "type": "module",
  "main": "./dist/index.js",        // ESM
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 8.2 Add `exports` field to package.json

Without the `"exports"` field, deep imports like
`@alexvcasillas/graphdb/dist/collection` are possible, which couples
consumers to internal structure.

### 8.3 Move CI from CircleCI to GitHub Actions

The repo is on GitHub. GitHub Actions is free for public repos and
requires less configuration. With Bun:

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install
- run: bun test
- run: bun run build
```

### 8.4 Add a `CHANGELOG.md`

There is no changelog. Consumers have no way to understand what changed
between versions.

### 8.5 Add JSDoc to public API

The exported functions and types have zero documentation comments. Adding
JSDoc enables IDE tooltips for consumers without them having to read the
source.

### 8.6 Consider renaming the package

`graphdb` implies a graph database (nodes + edges + traversals). This is
actually a **document store** with collections. The name may confuse
users looking for actual graph database features (relationships,
graph queries, shortest path, etc.). Something like `@alexvcasillas/docstore`
or `@alexvcasillas/memdb` would set clearer expectations.

---

## Priority Matrix

| # | Improvement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 1 | Migrate to Bun | High | Medium | **P0** |
| 2 | Drop TSDX (tsup interim) | High | Low | **P0** |
| 3 | Fix RegExp bug (4.1) | High | Low | **P0** |
| 4 | Fix async-executor anti-pattern (4.5) | High | Low | **P0** |
| 5 | Fix `on()` type mismatch (4.4) | Medium | Low | **P0** |
| 6 | Fix `read()` type (4.9) | Medium | Low | **P0** |
| 7 | Add `break` in where loop (3.4) | Medium | Trivial | **P1** |
| 8 | Consistent query return type (4.2) | High | Medium | **P1** |
| 9 | Remove `date-fns` (2.5, 3.8) | Medium | Low | **P1** |
| 10 | Replace `uuid` with `crypto.randomUUID()` (2.6) | Medium | Low | **P1** |
| 11 | Fix multi-field sort bug (3.5) | Medium | Medium | **P1** |
| 12 | Listener storage refactor (3.2, 3.3) | Medium | Medium | **P1** |
| 13 | Fix silent syncer errors (4.6) | Medium | Low | **P1** |
| 14 | Type-safe `Where<T>` (6.1) | High | Medium | **P2** |
| 15 | Add indexing (3.1) | High | High | **P2** |
| 16 | Add `count()`, `exists()`, `clear()` (5.2-5.5) | Medium | Low | **P2** |
| 17 | Pass data to `on()` listeners (5.7) | Medium | Medium | **P2** |
| 18 | Add batch operations (5.4) | Medium | Medium | **P2** |
| 19 | Modernize `package.json` exports (8.1-8.2) | Medium | Low | **P2** |
| 20 | Add missing tests (7.1) | Medium | Medium | **P2** |
| 21 | Add benchmarks (7.3) | Low | Medium | **P3** |
| 22 | CI migration to GH Actions (8.3) | Low | Low | **P3** |
| 23 | Rename `updateAt` -> `updatedAt` (4.3) | Low | Low | **P3** (breaking) |

---

*Generated from analysis of `@alexvcasillas/graphdb` v1.5.1 on 2026-02-14.*
