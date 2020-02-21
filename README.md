# 📦 GraphDB – An in memory database with sync capabilities

GraphDB is an in memory database with sync capabilities that lets you handle data the way you want with a bare minimum setup.

- [Quick start](#quick-start)
- [Initialization](#initialization)
- [Create a collection](#create-a-collection)
- [Get a collection](#get-a-collection)
- [Create a document](#create-a-document)
- [Read a document](#read-a-document)
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

const userDocument = userCollection?.read(insertedId as string);
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

userCollection.listen(
  insertedId as string,
  (document: GraphDocument<UserModel>) => {
    // Handle document updates here
  }
);
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
  async create(document: GraphDocument<T>) {
    return new Promise((resolve, reject) => {
      // Send data to your backend!
      const backendResponse = await backend.create(document);
      // Resolve with true if backend process was ok
      if (backendResponse.status === 200) return resolve(true);
      // Reject with false if backend process was ok
      if (backendResponse.status === 500) return reject(false);
    });
  };
  async update(document: GraphDocument<T>) {
    return new Promise((resolve, reject) => {
      // Send data to your backend!
      const backendResponse = await backend.update(document);
      // Resolve with true if backend process was ok
      if (backendResponse.status === 200) return resolve(true);
      // Reject with false if backend process was ok
      if (backendResponse.status === 500) return reject(false);
    });
  };
  async remove(documentId: string) {
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
