import { GraphDB, GraphDocument } from '../src';

interface UserModel {
  name: string;
  lastName: string;
  age: number;
}

describe('core behaviour', () => {
  it('should create a collection', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    expect(userCollection).toBeDefined();
  });
  it('should add a new document to the collection and read it', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const userDocument = userCollection?.read(insertedId as string);
    expect(userDocument).toEqual(
      expect.objectContaining({
        _id: insertedId,
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
  });
  it('should return null when no document has been found', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const userDocument = userCollection?.read('whatever');
    expect(userDocument).toBeNull();
  });
  it('should update an existent document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const updatedDocument = await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
    });
    expect(updatedDocument).toEqual(
      expect.objectContaining({
        _id: insertedId,
        name: 'John',
        lastName: 'Snow',
        age: 29,
      })
    );
  });
  it('should update an existent document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const updatedDocument = await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
    });
    expect(updatedDocument).toEqual(
      expect.objectContaining({
        _id: insertedId,
        name: 'John',
        lastName: 'Snow',
        age: 29,
      })
    );
  });
  it('should reject when trying to update without an ID', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    try {
      // @ts-ignore
      await userCollection?.update();
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        'You must provide the GraphDocument ID that you would like to update.'
      );
    }
  });
  it('should reject when trying to update an unexistent document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    try {
      await userCollection?.update('this-is-fake', {
        name: 'John',
        lastName: 'Snow',
      });
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        'No document to update found with ID: this-is-fake'
      );
    }
  });
  it('should remove an existent document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const removeFeedback = await userCollection?.remove(insertedId as string);
    expect(removeFeedback).toEqual({
      removedId: insertedId,
      acknowledge: true,
    });
  });
  it('should reject when trying to remove without an ID', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    try {
      // @ts-ignore
      await userCollection?.remove();
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        'You must provide the GraphDocument ID that you would like to remove.'
      );
    }
  });
  it('should reject when trying to remove an unexistent document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    try {
      await userCollection?.remove('this-is-fake' as string);
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        'No document to remove found with ID: this-is-fake'
      );
    }
  });
  it('shoud listen to changes on an given document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const cancelListener = userCollection?.listen(
      insertedId as string,
      (document: GraphDocument<UserModel>) => {
        expect(document).toEqual(
          expect.objectContaining({
            _id: insertedId,
            name: 'Alex',
            lastName: 'Casillas',
            age: 29,
          })
        );
        cancelListener && cancelListener();
      }
    );
  });
  it("shoud call listeners when they're setup", async () => {
    const mockListener = jest.fn();
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const cancelListener = userCollection?.listen(
      insertedId as string,
      mockListener
    );
    await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
    });
    cancelListener && cancelListener();
    expect(mockListener).toBeCalled();
  });
  it('should sync resolve when documents are created', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      create(_: GraphDocument<UserModel>) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const userDocument = userCollection?.read(insertedId as string);
    expect(userDocument).toEqual(
      expect.objectContaining({
        _id: insertedId,
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
  });
  it('should call the sync create fn when sync is required', async () => {
    const mockCreateSync = jest.fn(
      (_: GraphDocument<UserModel>): Promise<boolean> => {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      }
    );
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      create: mockCreateSync,
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    expect(mockCreateSync).toBeCalled();
  });
  it('should call the sync update fn when sync is required', async () => {
    const mockUpdateSync = jest.fn(
      (_: GraphDocument<UserModel>): Promise<boolean> => {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      }
    );
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      update: mockUpdateSync,
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
    });
    expect(mockUpdateSync).toBeCalled();
  });
  it('should call the sync create fn when sync is required', async () => {
    const mockRemoveFn = jest.fn(
      (_: string): Promise<boolean> => {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      }
    );
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      remove: mockRemoveFn,
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    await userCollection?.remove(insertedId as string);
    expect(mockRemoveFn).toBeCalled();
  });
  it('should sync reject when documents are created', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      create(_: GraphDocument<UserModel>) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 500 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    try {
      await userCollection?.create({
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      });
    } catch (error) {
      expect(error.message).toBe("Document synchronization wasn't possible.");
    }
  });
  it('should sync resolve when documents are updated', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      update(_: GraphDocument<UserModel>) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const updatedDocument = await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
    });
    expect(updatedDocument).toEqual(
      expect.objectContaining({
        _id: insertedId,
        name: 'John',
        lastName: 'Snow',
        age: 29,
      })
    );
  });
  it('should sync reject when documents are updated', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      update(_: GraphDocument<UserModel>) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 500 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    try {
      await userCollection?.update(insertedId as string, {
        name: 'John',
        lastName: 'Snow',
      });
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        "[UPDATE SYNC]: Document synchronization wasn't possible."
      );
    } finally {
      const updatedDocument = userCollection?.read(insertedId as string);
      expect(updatedDocument).toEqual(
        expect.objectContaining({
          _id: insertedId,
          name: 'Alex',
          lastName: 'Casillas',
          age: 29,
        })
      );
    }
  });
  it('should sync resolve when documents are removed', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      remove(_: string) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 200 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    const removeFeedback = await userCollection?.remove(insertedId as string);
    expect(removeFeedback).toEqual({
      removedId: insertedId,
      acknowledge: true,
    });
  });
  it('should sync reject when documents are removed', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user', {
      remove(_: string) {
        return new Promise(async (resolve, reject) => {
          // Send data to your backend!
          const backendResponse = await Promise.resolve({ status: 500 });
          // Resolve with true if backend process was ok
          if (backendResponse.status === 200) return resolve(true);
          // Reject with false if backend process was ok
          if (backendResponse.status === 500) return reject(false);
        });
      },
    });
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    try {
      await userCollection?.remove(insertedId as string);
    } catch (error) {
      // Do nothing?
      expect(error.message).toBe(
        "[REMOVE SYNC]: Document synchronization wasn't possible."
      );
    } finally {
      const removedDocument = userCollection?.read(insertedId as string);
      expect(removedDocument).toEqual(
        expect.objectContaining({
          _id: insertedId,
          name: 'Alex',
          lastName: 'Casillas',
          age: 29,
        })
      );
    }
  });
  it('should query a collection base on a single where clause', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    const queryResult = userCollection?.query({ name: 'Alex' });
    expect(queryResult).toEqual(
      expect.objectContaining({
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
  });
  it('should query a collection based on a complex where clause', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    const queryResult = userCollection?.query({ name: 'Alex', age: 29 });
    expect(queryResult).toEqual(
      expect.objectContaining({
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
  });
  it('should query a collection based on a complex where clause that returns an array of matches', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    const queryResult = userCollection?.query({ lastName: 'Doe' });
    expect(Array.isArray(queryResult)).toBe(true);
    expect((queryResult as GraphDocument<UserModel>[]).length).toBe(2);
    expect((queryResult as GraphDocument<UserModel>[])[0]).toEqual(
      expect.objectContaining({
        name: 'John',
        lastName: 'Doe',
        age: 40,
      })
    );
    expect((queryResult as GraphDocument<UserModel>[])[1]).toEqual(
      expect.objectContaining({
        name: 'Jane',
        lastName: 'Doe',
        age: 50,
      })
    );
  });
  it('should query a collection based on a where clause that wont match any document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    const queryResult = userCollection?.query({ age: 99 });
    expect(queryResult).toBe(null);
  });
  it('should populate a document collection with the given documents', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      name: 'Alex',
      lastName: 'Casillas',
    });
    expect(queryResult as GraphDocument<UserModel>).toEqual(
      expect.objectContaining({
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
  });
  it('should perform a query with a complex where clause', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    }) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(3);
    expect(queryResult[0]).toEqual(
      expect.objectContaining({
        name: 'Antonio',
        lastName: 'Cobos',
        age: 35,
      })
    );
    expect(queryResult[1]).toEqual(
      expect.objectContaining({
        name: 'John',
        lastName: 'Doe',
        age: 40,
      })
    );
    expect(queryResult[2]).toEqual(
      expect.objectContaining({
        name: 'Jane',
        lastName: 'Doe',
        age: 50,
      })
    );
  });
  it('should perform a query with a complex where clause (1/4)', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
    }) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(3);
    expect(queryResult[0]).toEqual(
      expect.objectContaining({
        name: 'Antonio',
        lastName: 'Cobos',
        age: 35,
      })
    );
    expect(queryResult[1]).toEqual(
      expect.objectContaining({
        name: 'John',
        lastName: 'Doe',
        age: 40,
      })
    );
    expect(queryResult[2]).toEqual(
      expect.objectContaining({
        name: 'Jane',
        lastName: 'Doe',
        age: 50,
      })
    );
  });
  it('should perform a query with a complex where clause (2/4)', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      age: { gt: 30, lte: 40 },
    }) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(2);
    expect(queryResult[0]).toEqual(
      expect.objectContaining({
        name: 'Antonio',
        lastName: 'Cobos',
        age: 35,
      })
    );
    expect(queryResult[1]).toEqual(
      expect.objectContaining({
        name: 'John',
        lastName: 'Doe',
        age: 40,
      })
    );
  });
  it('should perform a query with a complex where clause (3/4)', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      age: { gt: 60 },
    });
    expect(!!queryResult).toBe(false);
  });
  it('should perform a query with a complex where clause (4/4)', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      age: { gt: 20 },
      lastName: 'Casillas',
    }) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(2);
    expect(queryResult[0]).toEqual(
      expect.objectContaining({
        name: 'Alex',
        lastName: 'Casillas',
        age: 29,
      })
    );
    expect(queryResult[1]).toEqual(
      expect.objectContaining({
        name: 'Daniel',
        lastName: 'Casillas',
        age: 22,
      })
    );
  });
  it('shoud listen to on create changes on an given document collection', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');

    const mockListener = jest.fn();

    const cancelListener = userCollection?.on('create', mockListener);

    await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });

    cancelListener && cancelListener();

    expect(mockListener).toBeCalled();
  });
  it('shoud listen to on populate changes on an given document collection', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');

    const mockListener = jest.fn();

    const cancelListener = userCollection?.on('populate', mockListener);

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

    cancelListener && cancelListener();

    expect(mockListener).toBeCalled();
  });
  it('shoud listen to on update changes on an given document collection', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');

    const mockListener = jest.fn();

    const cancelListener = userCollection?.on('update', mockListener);

    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });

    await userCollection?.update(insertedId as string, {
      name: 'John',
      lastName: 'Snow',
      age: 19,
    });

    cancelListener && cancelListener();

    expect(mockListener).toBeCalled();
  });
  it('shoud listen to on remove changes on an given document collection', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');

    const mockListener = jest.fn();

    const cancelListener = userCollection?.on('remove', mockListener);

    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });

    await userCollection?.remove(insertedId as string);

    cancelListener && cancelListener();

    expect(mockListener).toBeCalled();
  });
  it('should limit the resulting collection to the given amount', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      { limit: 2 }
    ) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(2);
  });
  it('should skip the given amount of elements from the collection', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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

    const queryResult = userCollection?.query({}, { skip: 2 }) as GraphDocument<
      UserModel
    >[];
    expect(queryResult.length).toBe(4);
    expect(queryResult[0]._id).toBe('3');
  });
  it('should skip the given amount of elements from the collection and limit the result by the given amount', () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
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
      { skip: 2, limit: 2 }
    ) as GraphDocument<UserModel>[];
    expect(queryResult.length).toBe(2);
    expect(queryResult[0]._id).toBe('3');
    expect(queryResult[1]._id).toBe('4');
  });
});
