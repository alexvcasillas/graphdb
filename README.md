# 📦 GraphDB – An in memory database with sync capabilities

GraphDB is an in memory database with sync capabilities that lets you handle data the way you want with a bare minimum setup.

[![CircleCI](https://circleci.com/gh/alexvcasillas/graphdb.svg?style=svg)](https://circleci.com/gh/alexvcasillas/graphdb)
[![Codecoverage](https://img.shields.io/badge/coverage-94.4%25-green)](https://img.shields.io/badge/coverage-94.4%25-green)

[![BundleSize](https://img.shields.io/bundlephobia/minzip/@alexvcasillas/graphdb)](https://img.shields.io/bundlephobia/minzip/@alexvcasillas/graphdb)
[![Downloads](https://img.shields.io/npm/dw/@alexvcasillas/graphdb)](https://img.shields.io/npm/dw/@alexvcasillas/graphdb)

[![Version](https://img.shields.io/npm/v/@alexvcasillas/graphdb)](https://img.shields.io/npm/v/@alexvcasillas/graphdb)[![License](https://img.shields.io/npm/l/@alexvcasillas/graphdb)](https://img.shields.io/npm/l/@alexvcasillas/graphdb)

- [Quick start](#quick-start)
- [Initialization](#initialization)
- [API and Types](#api-and-types)
- [Create a collection](#create-a-collection)
- [Get a collection](#get-a-collection)
- [Populate a collection](#populate-a-collection)
- [Create a document](#create-a-document)
- [Read a document](#read-a-document)
- [Query documents](#query-documents)
- [Query documents with complex where clause](#query-documents-with-complex-where-clause)
- [Update a document](#update-a-document)
- [Remove a document](#remove-a-document)
- [Listen to changes](#listen-to-changes)
- [Syncers](#syncers)

# Quick start

```
yarn add @alexvcasillas/graphdb
```

```
npm i -s @alexvcasillas/graphdb
```

# Initialization

```typescript
import { GraphDB } from '@alexvcasillas/graphdb';

const graphdb = GraphDB();
```

# API and Types

```typescript
type GraphDBType = {
  createCollection: <T>(
    collectionId: string,
    syncers?: GraphDocumentSyncers<T>
  ) => void;
  getCollection: <T>(collectionId: string) => Collection<T> | null;
};

type Where = {
  [property: string]: any;
};

type Collection<T> = {
  read: (documentId: string) => GraphDocument<T>;
  query: (where: Where) => GraphDocument<T> | GraphDocument<T>[] | null;
  create: (document: T) => Promise<string>;
  update: (documentId: string, patch: Partial<T>) => Promise<GraphDocument<T>>;
  remove: (documentId: string) => Promise<RemoveOperationFeedback>;
  listen: (
    documentId: string,
    listener: ListenerFn<GraphDocument<T>>
  ) => CancelListenerFn;
};

type GraphDocument<T> = {
  _id: string;
  createdAt: Date;
  updateAt: Date;
} & T;

type ListenerFn<T> = (document: T) => void;

type GraphDocumentListener<T> = {
  id: string;
  document: string;
  fn: ListenerFn<GraphDocument<T>>;
};

type GraphDocumentListeners<T> = GraphDocumentListener<T>[];

type CancelListenerFn = () => void;

type GraphDocumentSyncers<T> = {
  create?: (document: GraphDocument<T>) => Promise<boolean>;
  update?: (document: GraphDocument<T>) => Promise<boolean>;
  remove?: (documentId: string) => Promise<boolean>;
};

type RemoveOperationFeedback = {
  removedId: string;
  acknowledge: true;
};
```

# Create a collection

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

graphdb.createCollection<UserModel>('user');
```

# Get a collection

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');
```

# Populate a collection

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

userCollection.populate([
  {
    _id: '1',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '2',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '3',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '4',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '5',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '6',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
]);
```

# Create a document

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const insertedId = await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});
```

# Read a document

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const insertedId = await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});

const userDocument = userCollection.read(insertedId as string);
```

# Query documents

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});

userCollection.query({ name: 'Alex', age: 29 });
```

# Query documents with complex where clause

Complex operators include for now:

- `gt`: greater than
- `gte`: greater than or equals
- `lt`: lower than
- `lte`: lower than or equals

This operators can be combine to form complex where clauses like the following:

```
{ age: { gt: 20, lt: 40 } }
```

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

userCollection?.populate([
  {
    _id: '1',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '2',
    name: 'Daniel',
    lastName: 'Casillas',
    age: 22,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '3',
    name: 'Antonio',
    lastName: 'Cobos',
    age: 34,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '4',
    name: 'John',
    lastName: 'Snow',
    age: 19,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '5',
    name: 'John',
    lastName: 'Doe',
    age: 40,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '6',
    name: 'Jane',
    lastName: 'Doe',
    age: 50,
    createdAt: new Date(),
    updateAt: new Date(),
  },
]);

const queryResult = userCollection?.query({
  age: { gt: 30 },
});

// queryResult.length === 3

// queryResult[0]
// { _id: '3', name: 'Antonio', lastName: 'Cobos', age: 34 }

// queryResult[1]
// { _id: '5', name: 'John', lastName: 'Doe', age: 40 }

// queryResult[2]
// { _id: '6', name: 'Jane', lastName: 'Doe', age: 50 }
```

# Update a document

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const insertedId = await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});

const updatedDocument = await userCollection.update(insertedId as string, {
  name: 'John',
  lastName: 'Snow',
});
```

# Remove a document

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const insertedId = await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});

const removeFeedback = await userCollection.remove(insertedId as string);
```

# Listen to changes

```typescript
import { GraphDocument } from '@alexvcasillas/graphdb';

interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const insertedId = await userCollection.create({
  name: 'Alex',
  lastName: 'Casillas',
  age: 29,
});

const stopListen = userCollection.listen(
  insertedId as string,
  (document: GraphDocument<UserModel>) => {
    // Handle document updates here
  }
);

// Call this whenever you want to stop lintening to changes
stopListen();
```

# Syncers

Syncers are a cool feature that will let you sync data to your backend. You can add up to three syncers: to `create`, to `update` and to `remove`.

```typescript
import { GraphDB } from '@alexvcasillas/graphdb'

const graphdb = GraphDB();

interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

graphdb.createCollection<UserModel>('user', {
  create(document: GraphDocument<T>) {
    return new Promise((resolve, reject) => {
      // Send data to your backend!
      const backendResponse = await backend.create(document);
      // Resolve with true if backend process was ok
      if (backendResponse.status === 200) return resolve(true);
      // Reject with false if backend process was ok
      if (backendResponse.status === 500) return reject(false);
    });
  };
  update(document: GraphDocument<T>) {
    return new Promise((resolve, reject) => {
      // Send data to your backend!
      const backendResponse = await backend.update(document);
      // Resolve with true if backend process was ok
      if (backendResponse.status === 200) return resolve(true);
      // Reject with false if backend process was ok
      if (backendResponse.status === 500) return reject(false);
    });
  };
  remove(documentId: string) {
    return new Promise((resolve, reject) => {
      // Send data to your backend!
      const backendResponse = await backend.remove(document);
      // Resolve with true if backend process was ok
      if (backendResponse.status === 200) return resolve(true);
      // Reject with false if backend process was ok
      if (backendResponse.status === 500) return reject(false);
    });
  };
});
```

The cool thing about data-syncing is that if the sync promise returns false, it will revert changes locally at the state it was previously, meaning that changes wont be applied localy and you'll always be in-sync with your backend.
