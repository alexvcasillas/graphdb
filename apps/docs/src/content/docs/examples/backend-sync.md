---
title: Backend Sync
description: Full syncer implementation with a REST API backend.
---

GraphDB syncers let you persist writes to a backend while keeping the local collection as the source of truth for reads. Writes are optimistic: the local collection updates immediately, and if the syncer returns `false` or throws, the change is automatically reverted.

## Defining the API layer

```typescript
const API_BASE = "https://api.example.com";

interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}
```

## Building the syncers

Each syncer receives the document (or document ID for `remove`) and must return a `Promise<boolean>`. Return `true` to confirm the write, or `false` to trigger a revert.

```typescript
import { GraphDB, type Doc } from "@graphdb/core";

const productSyncers = {
  create: async (doc: Doc<Product>): Promise<boolean> => {
    const response = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: doc._id,
        name: doc.name,
        price: doc.price,
        category: doc.category,
        inStock: doc.inStock,
      }),
    });

    return response.ok;
  },

  update: async (doc: Doc<Product>): Promise<boolean> => {
    const response = await fetch(`${API_BASE}/products/${doc._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: doc.name,
        price: doc.price,
        category: doc.category,
        inStock: doc.inStock,
      }),
    });

    return response.ok;
  },

  remove: async (docId: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE}/products/${docId}`, {
      method: "DELETE",
    });

    return response.ok;
  },
};
```

## Creating the collection with syncers

```typescript
const db = GraphDB();

const products = db.createCollection<Product>("products", {
  indexes: ["category", "inStock"],
  syncers: productSyncers,
});
```

## The optimistic write flow

When you call a write method on a collection that has syncers, the following happens:

1. The local collection is updated immediately (optimistic write).
2. The corresponding syncer function is called in the background.
3. If the syncer returns `true`, nothing else happens -- the local state is already correct.
4. If the syncer returns `false` or throws, the local change is reverted and a `syncError` event is emitted.

```typescript
// This updates the local collection right away.
// The UI can read the new document immediately.
const id = await products.create({
  name: "Mechanical Keyboard",
  price: 149.99,
  category: "peripherals",
  inStock: true,
});

// The document is available in the collection synchronously after create resolves.
const keyboard = products.read(id);
// { _id: "...", name: "Mechanical Keyboard", price: 149.99, ... }
```

## Handling sync errors

Subscribe to the `syncError` event to log failures, show notifications, or implement retry logic.

```typescript
products.on("syncError", ({ op, error, docId }) => {
  console.error(`Sync failed for ${op} on doc ${docId}:`, error);
});
```

### Retry with backoff

A more robust approach retries failed operations with exponential backoff.

```typescript
interface FailedOp {
  op: "create" | "update" | "remove";
  docId?: string;
  retries: number;
}

const failedOps: FailedOp[] = [];
const MAX_RETRIES = 3;

products.on("syncError", ({ op, docId }) => {
  const existing = failedOps.find(
    (f) => f.op === op && f.docId === docId,
  );

  if (existing) {
    existing.retries += 1;
  } else {
    failedOps.push({ op, docId, retries: 1 });
  }
});

async function retryFailedOps() {
  const pending = failedOps.splice(0, failedOps.length);

  for (const failed of pending) {
    if (failed.retries > MAX_RETRIES) {
      console.error(
        `Giving up on ${failed.op} for doc ${failed.docId} after ${MAX_RETRIES} retries`,
      );
      continue;
    }

    const delay = Math.pow(2, failed.retries) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      if (failed.op === "create" && failed.docId) {
        const doc = products.read(failed.docId);
        if (doc) {
          await productSyncers.create(doc);
        }
      } else if (failed.op === "update" && failed.docId) {
        const doc = products.read(failed.docId);
        if (doc) {
          await productSyncers.update(doc);
        }
      } else if (failed.op === "remove" && failed.docId) {
        await productSyncers.remove(failed.docId);
      }
    } catch (err) {
      console.error(`Retry failed for ${failed.op}:`, err);
      failedOps.push(failed); // re-queue for next cycle
    }
  }
}

// Run retry loop on an interval
setInterval(retryFailedOps, 30_000);
```

## Populate on load

A common pattern is to fetch existing data from the server when the app starts and load it into the collection with `populate`. This avoids triggering individual syncer calls for each document.

```typescript
interface ApiProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

async function loadProducts() {
  const response = await fetch(`${API_BASE}/products`);

  if (!response.ok) {
    throw new Error(`Failed to load products: ${response.status}`);
  }

  const data: ApiProduct[] = await response.json();

  // Map API response to the shape your collection expects.
  // populate() bypasses syncers, so this will not POST back to the server.
  await products.populate(
    data.map((item) => ({
      name: item.name,
      price: item.price,
      category: item.category,
      inStock: item.inStock,
    })),
  );

  console.log(`Loaded ${data.length} products from server`);
}

// Call on app startup
loadProducts();
```

`populate` fires a single `populate` event with the count of inserted documents, rather than individual `create` events. This makes it efficient for bulk loading.

## Full example: putting it all together

```typescript
import { GraphDB, type Doc } from "@graphdb/core";

// --- Types ---
interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// --- API ---
const API_BASE = "https://api.example.com";

// --- Syncers ---
const syncers = {
  create: async (doc: Doc<Product>): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    return res.ok;
  },
  update: async (doc: Doc<Product>): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/products/${doc._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    return res.ok;
  },
  remove: async (docId: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/products/${docId}`, {
      method: "DELETE",
    });
    return res.ok;
  },
};

// --- Database ---
const db = GraphDB();
const products = db.createCollection<Product>("products", {
  indexes: ["category", "inStock"],
  syncers,
});

// --- Error handling ---
products.on("syncError", ({ op, error, docId }) => {
  console.error(`[sync] ${op} failed for ${docId}:`, error);
});

// --- Load initial data ---
async function init() {
  const res = await fetch(`${API_BASE}/products`);
  if (res.ok) {
    const data = await res.json();
    await products.populate(data);
  }
}

// --- Application code ---
async function main() {
  await init();

  // Create a product -- written locally, then synced to server
  const id = await products.create({
    name: "USB-C Hub",
    price: 39.99,
    category: "peripherals",
    inStock: true,
  });

  // Read is synchronous and instant
  const hub = products.read(id);
  console.log("Created:", hub?.name);

  // Update -- local first, then PUT to server
  await products.update(id, { price: 34.99 });

  // Query
  const peripherals = products.query({ category: "peripherals", inStock: true });
  console.log("In-stock peripherals:", peripherals.length);

  // Remove -- local first, then DELETE on server
  await products.remove(id);
}

main();
```
