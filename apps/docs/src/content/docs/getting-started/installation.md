---
title: Installation
description: Install GraphDB and start using it in your project.
---

## Install the package

GraphDB is published as `@graphdb/core` on npm. Install it with your preferred package manager:

```bash
# Bun (recommended)
bun add @graphdb/core

# npm
npm install @graphdb/core

# pnpm
pnpm add @graphdb/core
```

The `@graphdb/types` package is included as a dependency of `@graphdb/core` — you don't need to install it separately.

## Import

### ESM (recommended)

```typescript
import { GraphDB } from '@graphdb/core';
```

### CommonJS

```javascript
const { GraphDB } = require('@graphdb/core');
```

### Type-only imports

If you need just the types (e.g., for interfaces in a separate file):

```typescript
import type { Doc, Collection, Where, QueryOptions } from '@graphdb/core';
```

All types from `@graphdb/types` are re-exported from `@graphdb/core`, so you never need to import from `@graphdb/types` directly.

## Compatibility

| Runtime | Minimum Version |
|---------|----------------|
| Bun     | 1.x+           |
| Node.js | 18+            |

GraphDB uses `crypto.randomUUID()` for ID generation, which requires Node.js 18 or later. Bun supports this natively.

## Build formats

GraphDB ships dual CJS/ESM builds with TypeScript declaration files. Your bundler will automatically resolve the correct format.

## Next steps

Head to the [Quick Start](/getting-started/quick-start/) to create your first database and collection.
