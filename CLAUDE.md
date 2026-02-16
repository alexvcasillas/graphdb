# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install                # install dependencies
bun run build              # build all packages
bun run test               # run all tests
bun run typecheck          # typecheck all packages
bun run lint               # lint all packages (same as typecheck)

# Single package
bun test --filter @graphdb/core     # test core only
bun run --filter @graphdb/core build # build core only

# Single test file
bun test packages/core/test/collection.test.ts

# Changesets
bun changeset              # create a changeset
bun run version-packages   # bump versions + changelogs
bun run release            # publish to npm
```

## Architecture

Bun-first monorepo with zero runtime dependencies. Two packages plus a docs app:

- **`packages/types`** (`@graphdb/types`) — Pure TypeScript type definitions. No runtime code. Defines `Doc<T>`, `Where<T>`, `WhereClause`, `QueryOptions`, `Collection<T>`, `Syncers<T>`, event payload types, and `GraphDBType`. This is a dependency of core.
- **`packages/core`** (`@graphdb/core`) — The database implementation. Exports `GraphDB` factory and `createCollection`, plus re-exports all types from `@graphdb/types`.
- **`apps/docs`** — Documentation app (placeholder).

### Core internals (`packages/core/src/`)

`GraphDB()` is a factory that returns a `GraphDBType` — a thin wrapper holding a `Map<string, Collection>`. All logic lives in `createCollection()` (`collection.ts`), which uses closure-based encapsulation (no classes):

- **Storage**: `Map<string, Doc<T>>` keyed by `_id` (generated via `crypto.randomUUID()`)
- **Indexes**: `Map<field, Map<value, Set<docId>>>` — hash indexes for equality, `eq`, and `in` lookups. Other operators fall through to full scan on candidate docs.
- **Query pipeline**: filter → sort → skip → limit
- **Listeners**: `Map/Set` for both collection-level events (`on`) and per-document listeners (`listen`). O(1) unsubscribe.
- **Syncers**: Optimistic writes with automatic revert on sync failure. Sync errors are both thrown and emitted via `syncError` event.

Utilities in `packages/core/src/utils/`:
- `where-checker.ts` — Evaluates a single where clause against a document field (handles primitives, RegExp, and operator objects)
- `sort-documents.ts` — Multi-field sort with ASC/DESC
- `empty-object.ts` — Fast empty-object check

### Key design decisions

- Timestamps are epoch milliseconds (`number`), not `Date` objects
- `query()` always returns `Doc<T>[]` (never null); `findOne()` returns `Doc<T> | null`
- `create/update/remove` are async (for syncer support); `read/query/findOne` are sync
- All types re-exported from `@graphdb/core` via `export type * from '@graphdb/types'`
- Dual CJS/ESM builds via Bun bundler with TypeScript declaration files from `tsc`

## TypeScript

Base config in `tsconfig.base.json`: ES2022 target, ESNext modules, Bundler resolution, strict mode, `noUncheckedIndexedAccess` enabled.
