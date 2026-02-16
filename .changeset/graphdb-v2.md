---
"@graphdb/types": major
"@graphdb/core": major
---

GraphDB v2: Bun-first monorepo with zero runtime dependencies

Breaking changes:
- Timestamps are now epoch milliseconds (`number`) instead of `Date` objects
- `query()` always returns `Doc<T>[]` (never null)
- Query pipeline order is now filter → sort → skip → limit
- Multi-field sort support
- New closure-based architecture (no classes)

New features:
- Hash indexes for equality, `eq`, and `in` lookups
- Per-document listeners via `listen()`
- Typed event payloads for `on()` listeners
- `findOne()`, `count()`, `exists()`, `clear()`, `updateMany()`, `removeMany()` APIs
- `populate()` for bulk document loading
- Optimistic syncer writes with automatic revert on failure
- RegExp support in where clauses (top-level and `match` operator)
- Dual CJS/ESM builds
