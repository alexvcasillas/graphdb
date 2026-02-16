---
title: Testing
description: Testing patterns with Bun test and GraphDB.
---

GraphDB's synchronous reads and simple factory API make it easy to test. This page shows common testing patterns using Bun's built-in test runner.

## Test helper: fresh database per test

Shared mutable state between tests leads to flaky results. Create a new database and collection for each test.

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { GraphDB, type Collection, type Doc } from "@graphdb/core";

interface Task {
  title: string;
  priority: number;
  done: boolean;
}

function createTestCollection() {
  const db = GraphDB();
  return db.createCollection<Task>("tasks", {
    indexes: ["priority", "done"],
  });
}

describe("tasks collection", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  // tests go here...
});
```

Every test starts with an empty collection, so ordering and isolation are guaranteed.

## Testing CRUD operations

### Create and read

```typescript
describe("create and read", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  it("should create a document and return its id", async () => {
    const id = await tasks.create({
      title: "Write tests",
      priority: 1,
      done: false,
    });

    expect(id).toBeString();
    expect(id.length).toBeGreaterThan(0);
  });

  it("should read back the created document", async () => {
    const id = await tasks.create({
      title: "Write tests",
      priority: 1,
      done: false,
    });

    const doc = tasks.read(id);

    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Write tests");
    expect(doc!.priority).toBe(1);
    expect(doc!.done).toBe(false);
    expect(doc!._id).toBe(id);
    expect(doc!.createdAt).toBeNumber();
    expect(doc!.updatedAt).toBeNumber();
  });

  it("should return null for a nonexistent id", () => {
    const doc = tasks.read("does-not-exist");
    expect(doc).toBeNull();
  });
});
```

### Update

```typescript
describe("update", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  it("should update specific fields and bump updatedAt", async () => {
    const id = await tasks.create({
      title: "Original",
      priority: 3,
      done: false,
    });

    const before = tasks.read(id)!;
    // Small delay so updatedAt differs
    await new Promise((r) => setTimeout(r, 10));

    const updated = await tasks.update(id, { done: true, priority: 1 });

    expect(updated.done).toBe(true);
    expect(updated.priority).toBe(1);
    expect(updated.title).toBe("Original"); // unchanged
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
  });
});
```

### Remove

```typescript
describe("remove", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  it("should remove a document and return acknowledgment", async () => {
    const id = await tasks.create({
      title: "To remove",
      priority: 2,
      done: false,
    });

    const result = await tasks.remove(id);

    expect(result.removedId).toBe(id);
    expect(result.acknowledge).toBe(true);
    expect(tasks.read(id)).toBeNull();
  });

  it("should reflect removal in count", async () => {
    await tasks.create({ title: "A", priority: 1, done: false });
    const idB = await tasks.create({ title: "B", priority: 2, done: false });

    expect(tasks.count()).toBe(2);

    await tasks.remove(idB);

    expect(tasks.count()).toBe(1);
  });
});
```

## Testing queries

```typescript
describe("queries", () => {
  let tasks: Collection<Task>;

  beforeEach(async () => {
    tasks = createTestCollection();

    await tasks.create({ title: "Low priority task", priority: 3, done: false });
    await tasks.create({ title: "High priority task", priority: 1, done: false });
    await tasks.create({ title: "Medium done task", priority: 2, done: true });
    await tasks.create({ title: "High done task", priority: 1, done: true });
  });

  it("should filter by primitive equality", () => {
    const results = tasks.query({ done: true });
    expect(results).toHaveLength(2);
    results.forEach((doc) => expect(doc.done).toBe(true));
  });

  it("should filter with comparison operators", () => {
    const highPriority = tasks.query({ priority: { lte: 1 } });
    expect(highPriority).toHaveLength(2);

    const lowPriority = tasks.query({ priority: { gt: 2 } });
    expect(lowPriority).toHaveLength(1);
    expect(lowPriority[0]!.title).toBe("Low priority task");
  });

  it("should filter with string operators", () => {
    const results = tasks.query({ title: { startsWith: "High" } });
    expect(results).toHaveLength(2);
  });

  it("should filter with the in operator", () => {
    const results = tasks.query({ priority: { in: [1, 3] } });
    expect(results).toHaveLength(3);
  });

  it("should combine multiple where fields with AND logic", () => {
    const results = tasks.query({ priority: 1, done: false });
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe("High priority task");
  });

  it("should support orderBy, skip, and limit", () => {
    const page = tasks.query(
      {},
      { orderBy: { priority: "ASC" }, skip: 1, limit: 2 },
    );

    expect(page).toHaveLength(2);
    // After sorting by priority ASC (1,1,2,3) and skipping 1, we get index 1 and 2
  });

  it("should return an empty array when nothing matches", () => {
    const results = tasks.query({ priority: { gt: 100 } });
    expect(results).toEqual([]);
  });
});
```

## Testing findOne, count, and exists

```typescript
describe("findOne, count, exists", () => {
  let tasks: Collection<Task>;

  beforeEach(async () => {
    tasks = createTestCollection();
    await tasks.create({ title: "Alpha", priority: 1, done: false });
    await tasks.create({ title: "Beta", priority: 2, done: true });
  });

  it("findOne should return the first match", () => {
    const result = tasks.findOne({ done: true });
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Beta");
  });

  it("findOne should return null when nothing matches", () => {
    const result = tasks.findOne({ priority: 99 });
    expect(result).toBeNull();
  });

  it("count should return total or filtered count", () => {
    expect(tasks.count()).toBe(2);
    expect(tasks.count({ done: false })).toBe(1);
  });

  it("exists should check by id", async () => {
    const id = await tasks.create({ title: "C", priority: 3, done: false });
    expect(tasks.exists(id)).toBe(true);
    expect(tasks.exists("nonexistent")).toBe(false);
  });
});
```

## Testing event listeners

```typescript
describe("event listeners", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  it("should fire create event with the new document", async () => {
    const events: Doc<Task>[] = [];
    tasks.on("create", ({ doc }) => events.push(doc));

    await tasks.create({ title: "Test", priority: 1, done: false });

    expect(events).toHaveLength(1);
    expect(events[0]!.title).toBe("Test");
  });

  it("should fire update event with before, after, and patch", async () => {
    const id = await tasks.create({ title: "Before", priority: 1, done: false });

    let captured: { before: Doc<Task>; after: Doc<Task>; patch: Partial<Task> } | null = null;
    tasks.on("update", (event) => {
      captured = event;
    });

    await tasks.update(id, { title: "After", done: true });

    expect(captured).not.toBeNull();
    expect(captured!.before.title).toBe("Before");
    expect(captured!.after.title).toBe("After");
    expect(captured!.patch).toEqual({ title: "After", done: true });
  });

  it("should fire remove event with the removed document", async () => {
    const id = await tasks.create({ title: "Gone", priority: 1, done: false });

    const removed: Doc<Task>[] = [];
    tasks.on("remove", ({ doc }) => removed.push(doc));

    await tasks.remove(id);

    expect(removed).toHaveLength(1);
    expect(removed[0]!.title).toBe("Gone");
  });

  it("should fire populate event with count", async () => {
    let count = 0;
    tasks.on("populate", (event) => {
      count = event.count;
    });

    await tasks.populate([
      { title: "A", priority: 1, done: false },
      { title: "B", priority: 2, done: false },
      { title: "C", priority: 3, done: true },
    ]);

    expect(count).toBe(3);
  });

  it("should stop firing after unsubscribe", async () => {
    const events: Doc<Task>[] = [];
    const unsub = tasks.on("create", ({ doc }) => events.push(doc));

    await tasks.create({ title: "First", priority: 1, done: false });
    unsub();
    await tasks.create({ title: "Second", priority: 2, done: false });

    expect(events).toHaveLength(1);
    expect(events[0]!.title).toBe("First");
  });

  it("should fire per-document listener on update", async () => {
    const id = await tasks.create({ title: "Watch me", priority: 1, done: false });

    const snapshots: Doc<Task>[] = [];
    const cancel = tasks.listen(id, (doc) => snapshots.push(doc));

    await tasks.update(id, { priority: 5 });
    await tasks.update(id, { done: true });

    cancel();
    await tasks.update(id, { title: "Ignored" });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]!.priority).toBe(5);
    expect(snapshots[1]!.done).toBe(true);
  });
});
```

## Testing syncers

### Successful sync

```typescript
describe("syncers - success", () => {
  it("should call the create syncer with the document", async () => {
    const calls: Doc<Task>[] = [];

    const db = GraphDB();
    const tasks = db.createCollection<Task>("tasks", {
      syncers: {
        create: async (doc) => {
          calls.push(doc);
          return true;
        },
      },
    });

    const id = await tasks.create({ title: "Synced", priority: 1, done: false });

    // Allow the syncer to resolve
    await new Promise((r) => setTimeout(r, 50));

    expect(calls).toHaveLength(1);
    expect(calls[0]!._id).toBe(id);
    expect(calls[0]!.title).toBe("Synced");

    // Document should still exist since syncer returned true
    expect(tasks.read(id)).not.toBeNull();
  });
});
```

### Failed sync with revert

```typescript
describe("syncers - failure and revert", () => {
  it("should revert a create when syncer returns false", async () => {
    const db = GraphDB();
    const tasks = db.createCollection<Task>("tasks", {
      syncers: {
        create: async () => false, // reject every create
      },
    });

    const errors: Array<{ op: string; docId?: string }> = [];
    tasks.on("syncError", ({ op, docId }) => {
      errors.push({ op, docId });
    });

    const id = await tasks.create({ title: "Will revert", priority: 1, done: false });

    // The document exists optimistically right after create
    expect(tasks.read(id)).not.toBeNull();

    // Wait for the syncer to run and revert
    await new Promise((r) => setTimeout(r, 50));

    // After revert, the document should be gone
    expect(tasks.read(id)).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]!.op).toBe("create");
  });

  it("should revert an update when syncer returns false", async () => {
    const db = GraphDB();
    const tasks = db.createCollection<Task>("tasks", {
      syncers: {
        update: async () => false,
      },
    });

    const id = await tasks.create({ title: "Original", priority: 1, done: false });

    await tasks.update(id, { title: "Changed" });

    // Wait for syncer to reject and revert
    await new Promise((r) => setTimeout(r, 50));

    const doc = tasks.read(id);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Original"); // reverted
  });

  it("should revert a remove when syncer returns false", async () => {
    const db = GraphDB();
    const tasks = db.createCollection<Task>("tasks", {
      syncers: {
        remove: async () => false,
      },
    });

    const id = await tasks.create({ title: "Persistent", priority: 1, done: false });

    await tasks.remove(id);

    // Wait for syncer to reject and revert
    await new Promise((r) => setTimeout(r, 50));

    // Document should be restored
    const doc = tasks.read(id);
    expect(doc).not.toBeNull();
    expect(doc!.title).toBe("Persistent");
  });
});
```

### Syncer that throws

```typescript
describe("syncers - exceptions", () => {
  it("should emit syncError when syncer throws", async () => {
    const db = GraphDB();
    const tasks = db.createCollection<Task>("tasks", {
      syncers: {
        create: async () => {
          throw new Error("Network failure");
        },
      },
    });

    const errors: Array<{ op: string; error: unknown }> = [];
    tasks.on("syncError", ({ op, error }) => {
      errors.push({ op, error });
    });

    await tasks.create({ title: "Doomed", priority: 1, done: false });

    // Wait for the syncer to throw and the error event to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(errors).toHaveLength(1);
    expect(errors[0]!.op).toBe("create");
    expect(errors[0]!.error).toBeInstanceOf(Error);
  });
});
```

## Testing bulk operations

```typescript
describe("bulk operations", () => {
  let tasks: Collection<Task>;

  beforeEach(() => {
    tasks = createTestCollection();
  });

  it("populate should insert multiple documents", async () => {
    await tasks.populate([
      { title: "A", priority: 1, done: false },
      { title: "B", priority: 2, done: true },
      { title: "C", priority: 3, done: false },
    ]);

    expect(tasks.count()).toBe(3);
  });

  it("updateMany should patch all matching documents", async () => {
    await tasks.populate([
      { title: "A", priority: 1, done: false },
      { title: "B", priority: 2, done: false },
      { title: "C", priority: 3, done: true },
    ]);

    await tasks.updateMany({ done: false }, { done: true });

    const allDone = tasks.query({ done: true });
    expect(allDone).toHaveLength(3);
  });

  it("removeMany should delete all matching documents", async () => {
    await tasks.populate([
      { title: "A", priority: 1, done: false },
      { title: "B", priority: 2, done: true },
      { title: "C", priority: 3, done: true },
    ]);

    await tasks.removeMany({ done: true });

    expect(tasks.count()).toBe(1);
    expect(tasks.findOne({ title: "A" })).not.toBeNull();
  });

  it("clear should remove all documents", async () => {
    await tasks.populate([
      { title: "A", priority: 1, done: false },
      { title: "B", priority: 2, done: false },
    ]);

    await tasks.clear();

    expect(tasks.count()).toBe(0);
  });
});
```
