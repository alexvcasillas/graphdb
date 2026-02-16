---
title: Where Clauses
description: Complete reference for where clause syntax and operators.
---

Where clauses are used by `query()`, `findOne()`, `count()`, `updateMany()`, and `removeMany()` to filter documents. A where clause is an object where each key corresponds to a field on the document and the value defines the condition to match.

```typescript
type Where<T = Record<string, unknown>> = {
  [K in keyof T]?: T[K] | WhereClause<T[K]> | RegExp;
} & Record<string, unknown>;
```

## Matching Rules

1. **All fields must match.** Every field specified in the where clause must pass for a document to be included in the result.
2. **All operators in a clause must pass.** When using an operator object with multiple operators, every operator within that object must pass for the field to match. If any single operator fails, the entire field condition fails.

---

## Filter Forms

There are three ways to filter on a field: primitive equality, top-level RegExp, and operator objects.

### Primitive Equality

Match a field by direct value comparison using strict equality (`===`).

```typescript
// Find users named Alice
users.query({ name: 'Alice' });

// Find users who are exactly 30
users.query({ age: 30 });
```

**Index support:** Yes. When the field is indexed, a hash-map lookup is used instead of a full collection scan.

---

### Top-Level RegExp

Pass a `RegExp` directly as the field value. The document's field value is converted to a string via `String(value)` and then tested against the regex.

```typescript
// Find users whose name starts with "A" (case-insensitive)
users.query({ name: /^a/i });

// Find users with a gmail address
users.query({ email: /gmail\.com$/ });
```

**Index support:** No. A full scan is always performed for regex filters.

---

### Operator Object

Pass an object containing one or more operators from the `WhereClause` type.

```typescript
type WhereClause<V = unknown> = {
  eq?: V;
  notEq?: V;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  includes?: string;
  startsWith?: string;
  endsWith?: string;
  match?: RegExp;
  in?: V[];
};
```

---

## Operators

### eq

Tests for strict equality (`===`).

| Property | Value |
|----------|-------|
| **Operand type** | Same as the field type |
| **Index support** | Yes |

```typescript
users.query({ name: { eq: 'Alice' } });
```

---

### notEq

Tests for strict inequality (`!==`).

| Property | Value |
|----------|-------|
| **Operand type** | Same as the field type |
| **Index support** | No |

```typescript
users.query({ name: { notEq: 'Bob' } });
```

---

### gt

Tests that the field value is greater than the operand. Only passes when the field value is of type `number`.

| Property | Value |
|----------|-------|
| **Operand type** | `number` |
| **Index support** | No |

```typescript
users.query({ age: { gt: 25 } });
```

---

### gte

Tests that the field value is greater than or equal to the operand. Only passes when the field value is of type `number`.

| Property | Value |
|----------|-------|
| **Operand type** | `number` |
| **Index support** | No |

```typescript
users.query({ age: { gte: 18 } });
```

---

### lt

Tests that the field value is less than the operand. Only passes when the field value is of type `number`.

| Property | Value |
|----------|-------|
| **Operand type** | `number` |
| **Index support** | No |

```typescript
users.query({ age: { lt: 65 } });
```

---

### lte

Tests that the field value is less than or equal to the operand. Only passes when the field value is of type `number`.

| Property | Value |
|----------|-------|
| **Operand type** | `number` |
| **Index support** | No |

```typescript
users.query({ age: { lte: 30 } });
```

---

### includes

Tests that the field value (as a string) contains the operand substring. Only passes when the field value is of type `string`.

| Property | Value |
|----------|-------|
| **Operand type** | `string` |
| **Index support** | No |

```typescript
users.query({ email: { includes: 'example' } });
```

---

### startsWith

Tests that the field value (as a string) starts with the operand. Only passes when the field value is of type `string`.

| Property | Value |
|----------|-------|
| **Operand type** | `string` |
| **Index support** | No |

```typescript
users.query({ name: { startsWith: 'Al' } });
```

---

### endsWith

Tests that the field value (as a string) ends with the operand. Only passes when the field value is of type `string`.

| Property | Value |
|----------|-------|
| **Operand type** | `string` |
| **Index support** | No |

```typescript
users.query({ email: { endsWith: '.com' } });
```

---

### match

Tests the field value against a `RegExp` using `RegExp.test()`. This is the operator-object equivalent of the top-level RegExp form.

| Property | Value |
|----------|-------|
| **Operand type** | `RegExp` |
| **Index support** | No |

```typescript
users.query({ name: { match: /^alice$/i } });
```

---

### in

Tests that the field value is included in the provided array (using `Array.includes()`).

| Property | Value |
|----------|-------|
| **Operand type** | `V[]` (array of the field's type) |
| **Index support** | Yes (union of index sets) |

```typescript
users.query({ age: { in: [25, 30, 35] } });
users.query({ name: { in: ['Alice', 'Bob'] } });
```

---

## Operator Evaluation Order

When a field's value is an operator object, the operators are evaluated in the following order. Evaluation short-circuits on the first failure.

1. `match` (RegExp test)
2. `in` (array inclusion)
3. `eq` (strict equality)
4. `notEq` (strict inequality)
5. `gt` (greater than)
6. `gte` (greater than or equal)
7. `lt` (less than)
8. `lte` (less than or equal)
9. `includes` (substring check)
10. `startsWith` (prefix check)
11. `endsWith` (suffix check)

---

## Combining Operators

You can combine multiple operators in a single clause object. All operators must pass for the field to match.

```typescript
// Age must be >= 18 AND < 65
users.query({ age: { gte: 18, lt: 65 } });

// Name must start with "A" AND not equal "Adam"
users.query({ name: { startsWith: 'A', notEq: 'Adam' } });
```

---

## Multi-Field Queries

When multiple fields are specified, all conditions must be satisfied (logical AND across fields).

```typescript
// Name starts with "A" AND age is between 18 and 65 AND email ends with ".com"
const results = users.query({
  name: { startsWith: 'A' },
  age: { gte: 18, lt: 65 },
  email: { endsWith: '.com' },
});
```

---

## Index Utilization

Hash indexes are maintained as `Map<field, Map<value, Set<docId>>>`. They accelerate lookups for the following patterns only:

| Pattern | Indexed? | Description |
|---------|----------|-------------|
| Primitive equality (`{ field: value }`) | Yes | Direct hash-map lookup. |
| `eq` operator (`{ field: { eq: value } }`) | Yes | Direct hash-map lookup. |
| `in` operator (`{ field: { in: [v1, v2] } }`) | Yes | Union of sets for each value. |
| All other operators | No | Full scan on candidates. |

When a query involves multiple indexed fields, the candidate sets are intersected starting from the smallest set. Any remaining non-indexed operators are then evaluated against the candidate documents.

### Example with Indexes

```typescript
type User = { name: string; email: string; age: number };

const db = GraphDB();
db.createCollection<User>('users', {
  indexes: ['email', 'age'],
});

const users = db.getCollection<User>('users')!;

// Uses the email index for O(1) lookup, then checks age on candidates
users.query({ email: 'alice@example.com', age: { gt: 25 } });

// Uses the age index with "in" (union of sets for 25 and 30)
users.query({ age: { in: [25, 30] } });

// No index used -- startsWith requires a full scan
users.query({ email: { startsWith: 'alice' } });
```
