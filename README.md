# 📦 GraphDB – An in memory database with sync capabilities

GraphDB is an in memory database with sync capabilities that lets you handle data the way you want with a bare minimum setup.

[![CircleCI](https://circleci.com/gh/alexvcasillas/graphdb.svg?style=svg)](https://circleci.com/gh/alexvcasillas/graphdb)
[![Codecoverage](https://img.shields.io/badge/coverage-98.87%25-green)](https://img.shields.io/badge/coverage-98.87%25-green)

[![BundleSize](https://img.shields.io/bundlephobia/minzip/@alexvcasillas/graphdb)](https://img.shields.io/bundlephobia/minzip/@alexvcasillas/graphdb)
[![Downloads](https://img.shields.io/npm/dw/@alexvcasillas/graphdb)](https://img.shields.io/npm/dw/@alexvcasillas/graphdb)

[![Version](https://img.shields.io/npm/v/@alexvcasillas/graphdb)](https://img.shields.io/npm/v/@alexvcasillas/graphdb)[![License](https://img.shields.io/npm/l/@alexvcasillas/graphdb)](https://img.shields.io/npm/l/@alexvcasillas/graphdb)

- [Quick start](#quick-start)
- [Initialization](#initialization)
- [API and Types](#api-and-types)
- [Create a collection](#create-a-collection)
- [Get a collection](#get-a-collection)
- [Populate a collection](#populate-a-collection)
- [Listen to collection on](#listen-to-collection-on)
- [Create a document](#create-a-document)
- [Read a document](#read-a-document)
- [Query documents](#query-documents)
- [Query documents with complex where clause](#query-documents-with-complex-where-clause)
- [Query documents with additional options](#query-documents-with-additional-options)
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
export type GraphDBType = {
  createCollection: <T>(
    collectionId: string,
    syncers?: GraphDocumentSyncers<T>
  ) => void;
  getCollection: <T>(collectionId: string) => Collection<T> | null;
};

export type Where = {
  [property: string]: any;
};

export type QueryOptions = {
  skip?: number;
  limit?: number;
  orderBy?: {
    [key: string]: 'ASC' | 'DESC';
  };
};

export type Collection<T> = {
  read: (documentId: string) => GraphDocument<T>;
  query: (
    where: Where,
    options?: QueryOptions
  ) => GraphDocument<T> | GraphDocument<T>[] | null;
  create: (document: T) => Promise<string>;
  update: (documentId: string, patch: Partial<T>) => Promise<GraphDocument<T>>;
  remove: (documentId: string) => Promise<RemoveOperationFeedback>;
  populate: (population: GraphDocument<T>[]) => void;
  listen: (
    documentId: string,
    listener: ListenerFn<GraphDocument<T>>
  ) => CancelListenerFn;
  on: (
    type: 'create' | 'update' | 'remove' | 'populate',
    listener: ListenerFn<GraphDocument<T>>
  ) => CancelListenerFn;
};

export type GraphDocument<T> = {
  _id: string;
  createdAt: Date;
  updateAt: Date;
} & T;

export type ListenerFn<T> = (document: GraphDocument<T>) => void;
export type ListenerOnFn = () => void;

export type GraphDocumentListener<T> = {
  id: string;
  document: string;
  fn: ListenerFn<GraphDocument<T>>;
};

export type GraphDocumentListenerOn = {
  id: string;
  type: 'create' | 'update' | 'remove' | 'populate';
  fn: ListenerOnFn;
};

export type GraphDocumentListeners<T> = GraphDocumentListener<T>[];
export type GraphDocumentListenersOn = GraphDocumentListenerOn[];

export type CancelListenerFn = () => void;

export type GraphDocumentSyncers<T> = {
  create?: (document: GraphDocument<T>) => Promise<boolean>;
  update?: (document: GraphDocument<T>) => Promise<boolean>;
  remove?: (documentId: string) => Promise<boolean>;
};

export type RemoveOperationFeedback = {
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

# Listen to collection on

```typescript
import { GraphDocument } from '@alexvcasillas/graphdb';

interface UserModel {
  name: string;
  lastName: string;
  age: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

const stopOnCreateListen = userCollection.on('create', function onCreate() {});
const stopOnPopulateListen = userCollection.on(
  'populate',
  function onPopulate() {}
);
const stopOnUpdateListen = userCollection.on('update', function onUpdate() {});
const stopOnRemoveListen = userCollection.on('remove', function onRemove() {});

stopOnCreateListen();
stopOnPopulateListen();
stopOnUpdateListen();
stopOnRemoveListen();
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

// Empty where clause returns all documents on the collection
userCollection.query({});
userCollection.query({ name: 'Alex', age: 29 });
```

# Query documents with complex where clause

Complex operators for `number` types include for now:

- `gt`: greater than
- `gte`: greater than or equals
- `lt`: lower than
- `lte`: lower than or equals

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
    age: 35,
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
// { _id: '3', name: 'Antonio', lastName: 'Cobos', age: 35 }

// queryResult[1]
// { _id: '5', name: 'John', lastName: 'Doe', age: 40 }

// queryResult[2]
// { _id: '6', name: 'Jane', lastName: 'Doe', age: 50 }
```

Complex operators for `string` types include for now:

- `eq`: equals
- `notEq`: not equals
- `includes`: includes the given substring
- `startsWith`: starts with the given substring
- `endsWith`: ends with the given substring

This operators can be used to form complex where clauses like the following:

```
{ email: { endsWith: '@gmail.com' } }
```

```typescript
interface UserModel {
  name: string;
  lastName: string;
  age: string;
  email: string;
}

const userCollection = graphdb.getCollection<UserModel>('user');

userCollection?.populate([
  {
    _id: '1',
    name: 'Alex',
    lastName: 'Casillas',
    email: 'alex@gmail.com',
    age: 29,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '2',
    name: 'Daniel',
    lastName: 'Casillas',
    email: 'dani@hotmail.com',
    age: 22,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '3',
    name: 'Antonio',
    lastName: 'Cobos',
    email: 'antonio@gmail.com',
    age: 35,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '4',
    name: 'John',
    lastName: 'Snow',
    email: 'john@thewall.com'
    age: 19,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '5',
    name: 'John',
    lastName: 'Doe',
    email: 'john@gmail.com',
    age: 40,
    createdAt: new Date(),
    updateAt: new Date(),
  },
  {
    _id: '6',
    name: 'Jane',
    lastName: 'Doe',
    email: 'jane@msn.com',
    age: 50,
    createdAt: new Date(),
    updateAt: new Date(),
  },
]);

const queryResult = userCollection?.query({
  email: { endsWith: '@gmail.com' },
});

// queryResult.length === 3

// queryResult[0]
// { _id: '1', name: 'Alex', lastName: 'Casillas', email: 'alex@gmail.com' }

// queryResult[1]
// { _id: '3', name: 'Antonio', lastName: 'Cobos', email: 'antonio@gmail.com' }

// queryResult[2]
// { _id: '5', name: 'John', lastName: 'Doe', email: 'john@gmail.com' }
```

# Query documents with additional options

Additional options for the query are the following:

- `skip`: skips the given amount of documents from the beginning of the collection
- `limit`: by the given amount limits the resulted documents from the query
- `orderBy`: sorts the resulted query documents by the given fields in the given order (ASC or DESC)

This operators can be combined to form complex option clauses like the following:

```
{
  skip: 2,
  limit: 4,
  orderBy: {
    age: 'DESC',
  },
}
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
    age: 35,
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

const queryResult = userCollection?.query(
  {},
  {
    orderBy: {
      age: 'ASC',
    },
  }
);

// queryResult[0]._id = '4'
// queryResult[1]._id = '2'
// queryResult[2]._id = '1'
// queryResult[3]._id = '3'
// queryResult[4]._id = '5'
// queryResult[5]._id = '6'
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
