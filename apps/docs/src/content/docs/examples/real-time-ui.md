---
title: Real-Time UI
description: React example using GraphDB listeners for live UI updates.
---

GraphDB's event system makes it straightforward to keep a UI in sync with your data. This example builds a todo list in React, but the same pattern works with any React renderer -- React DOM, React Native, or any other target.

## Database setup

Create the database and collection outside of your component tree so they are shared singletons.

```typescript
// db.ts
import { GraphDB } from "@graphdb/core";

export interface Todo {
  title: string;
  completed: boolean;
}

export const db = GraphDB();

export const todos = db.createCollection<Todo>("todos", {
  indexes: ["completed"],
});
```

## Custom hook: useCollection

This hook subscribes to collection events and re-queries whenever the data changes. It returns the current list of documents plus the collection instance for writes.

```typescript
// useCollection.ts
import { useState, useEffect, useCallback } from "react";
import type { Collection, Doc, Where, QueryOptions } from "@graphdb/core";

export function useCollection<T extends Record<string, unknown>>(
  collection: Collection<T>,
  where: Where<T> = {},
  options?: QueryOptions<T>,
) {
  const [docs, setDocs] = useState<Doc<T>[]>(() =>
    collection.query(where, options),
  );

  const refresh = useCallback(() => {
    setDocs(collection.query(where, options));
  }, [collection, where, options]);

  useEffect(() => {
    // Run an initial query in case the data changed between render and effect
    refresh();

    const unsubCreate = collection.on("create", refresh);
    const unsubUpdate = collection.on("update", refresh);
    const unsubRemove = collection.on("remove", refresh);
    const unsubPopulate = collection.on("populate", refresh);

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubRemove();
      unsubPopulate();
    };
  }, [collection, refresh]);

  return { docs, collection };
}
```

Every time a `create`, `update`, `remove`, or `populate` event fires, the hook re-runs the query and React re-renders with the new data. The cleanup function unsubscribes all listeners when the component unmounts.

## TodoList component

```tsx
// TodoList.tsx
import { useState } from "react";
import { useCollection } from "./useCollection";
import { todos, type Todo } from "./db";

export function TodoList() {
  const [input, setInput] = useState("");

  const { docs, collection } = useCollection<Todo>(todos, {}, {
    orderBy: { createdAt: "DESC" },
  });

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    await collection.create({ title: trimmed, completed: false });
    setInput("");
  };

  const handleToggle = async (id: string, current: boolean) => {
    await collection.update(id, { completed: !current });
  };

  const handleDelete = async (id: string) => {
    await collection.remove(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const total = docs.length;
  const done = docs.filter((d) => d.completed).length;

  return (
    <div>
      <h1>Todos ({done}/{total} completed)</h1>

      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      <ul>
        {docs.map((todo) => (
          <li key={todo._id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo._id, todo.completed)}
            />
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
            >
              {todo.title}
            </span>
            <button onClick={() => handleDelete(todo._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Because `useCollection` handles all the subscription logic, the component itself contains no manual state synchronization. Adding, toggling, or deleting a todo triggers a collection event, which causes the hook to re-query and React to re-render.

## Filtered views

You can render multiple views of the same collection by passing different `where` clauses.

```tsx
// ActiveTodos.tsx
import { useCollection } from "./useCollection";
import { todos, type Todo } from "./db";

export function ActiveTodos() {
  const { docs } = useCollection<Todo>(todos, { completed: false });

  return (
    <div>
      <h2>Active ({docs.length})</h2>
      <ul>
        {docs.map((todo) => (
          <li key={todo._id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// CompletedTodos.tsx
import { useCollection } from "./useCollection";
import { todos, type Todo } from "./db";

export function CompletedTodos() {
  const { docs } = useCollection<Todo>(todos, { completed: true });

  return (
    <div>
      <h2>Completed ({docs.length})</h2>
      <ul>
        {docs.map((todo) => (
          <li key={todo._id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

Both components subscribe to the same underlying collection. When a todo is toggled, both views update automatically.

## Watching a single document

For cases where you only care about changes to one specific document, use the `listen` method on the collection.

```tsx
// TodoDetail.tsx
import { useState, useEffect } from "react";
import type { Doc } from "@graphdb/core";
import { todos, type Todo } from "./db";

export function TodoDetail({ id }: { id: string }) {
  const [todo, setTodo] = useState<Doc<Todo> | null>(() => todos.read(id));

  useEffect(() => {
    // Set current value
    setTodo(todos.read(id));

    // Listen for changes to this specific document
    const cancel = todos.listen(id, (updatedDoc) => {
      setTodo(updatedDoc);
    });

    return () => {
      cancel();
    };
  }, [id]);

  if (!todo) {
    return <p>Todo not found.</p>;
  }

  return (
    <div>
      <h2>{todo.title}</h2>
      <p>Status: {todo.completed ? "Done" : "Pending"}</p>
      <p>Created: {new Date(todo.createdAt).toLocaleString()}</p>
      <p>Updated: {new Date(todo.updatedAt).toLocaleString()}</p>
    </div>
  );
}
```

The `listen` callback fires only when the document with the given `id` is updated. The cancel function returned by `listen` is called in the effect cleanup to prevent memory leaks.

## Notes on stability

The `where` and `options` objects passed to `useCollection` are compared by reference. If you create new object literals on every render, the hook will re-subscribe on each render cycle. To avoid this, either define them outside the component or wrap them in `useMemo`.

```tsx
import { useMemo } from "react";

function FilteredList({ status }: { status: boolean }) {
  const where = useMemo(() => ({ completed: status }), [status]);
  const options = useMemo(() => ({ orderBy: { title: "ASC" as const } }), []);

  const { docs } = useCollection<Todo>(todos, where, options);

  return (
    <ul>
      {docs.map((todo) => (
        <li key={todo._id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```
