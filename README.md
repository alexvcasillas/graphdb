# GraphDB v2

An in-memory database with sync capabilities. Zero runtime dependencies. Bun-first.

## Packages

| Package | Description |
|---|---|
| `@graphdb/core` | Core database: collections, CRUD, queries, indexes, listeners, syncers |
| `@graphdb/types` | Shared TypeScript type definitions |

## Quick start

```bash
bun add @graphdb/core
```

```typescript
import { GraphDB } from '@graphdb/core';

const db = GraphDB();
db.createCollection<{ name: string; age: number }>('users', {
  indexes: ['name'],
});

const users = db.getCollection<{ name: string; age: number }>('users')!;
const id = await users.create({ name: 'Alex', age: 29 });
const doc = users.read(id);
```

## v2 breaking changes (from v1)

- **`updateAt` renamed to `updatedAt`**
- **Timestamps are epoch ms (`number`)**, not `Date` objects
- **`query()` always returns `Doc<T>[]`** (never `null` or single doc)
- New **`findOne()`** returns `Doc<T> | null`
- **0 runtime deps**: removed `uuid` (uses `crypto.randomUUID()`) and `date-fns`
- Listener payloads: `on('create', ({ doc }) => ...)`, `on('update', ({ before, after, patch }) => ...)`
- Fix: **skip edge cases** (`skip:0` valid, `skip >= length` returns `[]`)
- Fix: **query order** is filter -> sort -> skip -> limit
- Fix: **multi-field sort** evaluates keys in order, first non-zero decides
- Fix: **top-level RegExp** in where clause works: `{ name: /re/i }`
- Fix: **async/sync** no more `new Promise(async ...)` anti-pattern; sync errors surface and revert
- **Populate validates** every doc has `_id`; duplicates overwrite (last wins)
- **Map/Set** for listeners: O(1) unsubscribe, no array allocations

## API

### GraphDB

```typescript
const db = GraphDB();
db.createCollection<T>(name, options?); // options: { indexes?, syncers? }
db.getCollection<T>(name);             // Collection<T> | null
db.listCollections();                   // string[]
db.removeCollection(name);              // boolean
```

### Collection

```typescript
col.read(id);                          // Doc<T> | null
col.query(where, options?);            // Doc<T>[] (always array)
col.findOne(where);                    // Doc<T> | null
col.create(doc);                       // Promise<string> (the _id)
col.update(id, patch);                 // Promise<Doc<T>>
col.remove(id);                        // Promise<RemoveResult>
col.populate(docs);                    // void (bulk load)
col.count(where?);                     // number
col.exists(id);                        // boolean
col.clear();                           // void
col.updateMany(where, patch);          // Promise<Doc<T>[]>
col.removeMany(where);                 // Promise<RemoveResult[]>
```

### Listeners

```typescript
// Collection events with typed payloads
col.on('create',    ({ doc }) => ...);
col.on('update',    ({ before, after, patch }) => ...);
col.on('remove',    ({ doc }) => ...);
col.on('populate',  ({ count }) => ...);
col.on('syncError', ({ op, error, docId? }) => ...);

// Per-document listener
const cancel = col.listen(id, (payload) => ...);
cancel(); // unsubscribe
```

### Where clauses

```typescript
// Primitive equality
col.query({ name: 'Alex' });

// RegExp
col.query({ name: /^al/i });

// Operators
col.query({ age: { gt: 20, lte: 40 } });
col.query({ name: { includes: 'lex' } });
col.query({ name: { startsWith: 'Al' } });
col.query({ name: { match: /regex/ } });
col.query({ status: { in: ['active', 'pending'] } });

// Combined
col.query({ age: { gt: 18 }, lastName: 'Doe' });
```

### Indexes

```typescript
db.createCollection<User>('users', {
  indexes: ['name', 'age'], // hash equality indexes
});
```

Indexes accelerate equality (`{ name: 'X' }`), `{ eq }`, and `{ in: [] }` lookups. Other operators (gt, regex, includes, etc.) fall through to full evaluation on candidate docs.

### Syncers

```typescript
db.createCollection<User>('users', {
  syncers: {
    create: async (doc) => { /* POST to backend; return true/false */ },
    update: async (doc) => { /* PUT to backend; return true/false */ },
    remove: async (id)  => { /* DELETE from backend; return true/false */ },
  },
});
```

Optimistic write + revert on sync failure. Sync errors are thrown and emitted via `syncError` event.

## Development

```bash
bun install
bun run test       # run all tests
bun run build      # build all packages
bun run typecheck  # typecheck all packages
```

### Changesets

```bash
bun changeset        # create a changeset
bun run version-packages  # bump versions + changelogs
bun run release      # publish to npm
```

## License

MIT
