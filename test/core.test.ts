import { GraphDB } from '../src';
import { GraphDocument } from '../src/types';

type UserModel = {
  name: string;
  lastName: string;
  age: number;
};

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
  it('shoud listen to changes on an given document', async () => {
    const graphdb = GraphDB();
    graphdb.createCollection<UserModel>('user');
    const userCollection = graphdb.getCollection<UserModel>('user');
    const insertedId = await userCollection?.create({
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
    });
    userCollection?.listen(
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
      }
    );
  });
});
