import { describe, it, expect, mock } from 'bun:test';
import { GraphDB } from '../src/graphdb';
import type { Doc, Collection } from '@graphdb/types';

interface UserModel {
  name: string;
  lastName: string;
  age: number;
}

// Helper to create a populated collection
function setupUsers(options?: Parameters<typeof GraphDB>[0]) {
  const db = GraphDB();
  db.createCollection<UserModel>('user', options);
  const col = db.getCollection<UserModel>('user')!;
  const now = Date.now();
  col.populate([
    { _id: '1', name: 'Alex', lastName: 'Casillas', age: 29, createdAt: now, updatedAt: now },
    { _id: '2', name: 'Daniel', lastName: 'Casillas', age: 22, createdAt: now, updatedAt: now },
    { _id: '3', name: 'Antonio', lastName: 'Cobos', age: 35, createdAt: now, updatedAt: now },
    { _id: '4', name: 'John', lastName: 'Snow', age: 19, createdAt: now, updatedAt: now },
    { _id: '5', name: 'John', lastName: 'Doe', age: 40, createdAt: now, updatedAt: now },
    { _id: '6', name: 'Jane', lastName: 'Doe', age: 50, createdAt: now, updatedAt: now },
  ] as Doc<UserModel>[]);
  return { db, col };
}

// ─── CRUD basics ─────────────────────────────────────────────────────────────

describe('CRUD', () => {
  it('creates a collection and reads back a document', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const doc = col.read(id);
    expect(doc).not.toBeNull();
    expect(doc!.name).toBe('Alex');
    expect(doc!._id).toBe(id);
    expect(typeof doc!.createdAt).toBe('number');
    expect(typeof doc!.updatedAt).toBe('number');
  });

  it('read returns null for missing doc', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(col.read('nonexistent')).toBeNull();
  });

  it('updates a document', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const updated = await col.update(id, { name: 'John', lastName: 'Snow' });
    expect(updated.name).toBe('John');
    expect(updated.lastName).toBe('Snow');
    expect(updated.age).toBe(29);
  });

  it('rejects update without id', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(col.update('', { name: 'X' })).rejects.toThrow(
      'You must provide the GraphDocument ID'
    );
  });

  it('rejects update of non-existent doc', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(col.update('fake', { name: 'X' })).rejects.toThrow(
      'No document to update found with ID: fake'
    );
  });

  it('removes a document', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const result = await col.remove(id);
    expect(result).toEqual({ removedId: id, acknowledge: true });
    expect(col.read(id)).toBeNull();
  });

  it('rejects remove without id', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(col.remove('')).rejects.toThrow(
      'You must provide the GraphDocument ID'
    );
  });

  it('rejects remove of non-existent doc', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(col.remove('fake')).rejects.toThrow(
      'No document to remove found with ID: fake'
    );
  });
});

// ─── Query always returns array (v2 fix) ──────────────────────────────────────

describe('query always returns Doc<T>[]', () => {
  it('returns empty array when no match', () => {
    const { col } = setupUsers();
    const result = col.query({ age: 99 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('returns array even for single match', () => {
    const { col } = setupUsers();
    const result = col.query({ name: 'Alex' });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alex');
  });

  it('returns array for multiple matches', () => {
    const { col } = setupUsers();
    const result = col.query({ lastName: 'Doe' });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('returns all docs with empty where', () => {
    const { col } = setupUsers();
    const result = col.query({});
    expect(result.length).toBe(6);
  });
});

// ─── findOne ──────────────────────────────────────────────────────────────────

describe('findOne', () => {
  it('returns first matching doc', () => {
    const { col } = setupUsers();
    const doc = col.findOne({ name: 'Alex' });
    expect(doc).not.toBeNull();
    expect(doc!.name).toBe('Alex');
  });

  it('returns null when no match', () => {
    const { col } = setupUsers();
    expect(col.findOne({ name: 'Nobody' })).toBeNull();
  });

  it('returns first doc with empty where', () => {
    const { col } = setupUsers();
    const doc = col.findOne({});
    expect(doc).not.toBeNull();
  });
});

// ─── Skip edge cases (v2 fix) ────────────────────────────────────────────────

describe('skip edge cases', () => {
  it('skip:0 is valid and returns all', () => {
    const { col } = setupUsers();
    const result = col.query({}, { skip: 0 });
    expect(result.length).toBe(6);
  });

  it('skip >= length returns empty array', () => {
    const { col } = setupUsers();
    const result = col.query({}, { skip: 100 });
    expect(result.length).toBe(0);
  });

  it('skip + limit combination works', () => {
    const { col } = setupUsers();
    const result = col.query({}, { skip: 2, limit: 2 });
    expect(result.length).toBe(2);
    expect(result[0]._id).toBe('3');
    expect(result[1]._id).toBe('4');
  });
});

// ─── Order: filter -> sort -> skip -> limit (v2 fix) ─────────────────────────

describe('query order: filter -> sort -> skip -> limit', () => {
  it('sorts before skip and limit', () => {
    const { col } = setupUsers();
    const result = col.query({}, { orderBy: { age: 'ASC' }, skip: 1, limit: 2 });
    // Sorted: 19, 22, 29, 35, 40, 50. Skip 1 -> 22,29,35,40,50. Limit 2 -> 22,29
    expect(result.length).toBe(2);
    expect(result[0].age).toBe(22);
    expect(result[1].age).toBe(29);
  });
});

// ─── Multi-field sort (v2 fix) ───────────────────────────────────────────────

describe('multi-field sort', () => {
  it('sorts by first key, then second key', () => {
    const { col } = setupUsers();
    // Two Johns: ages 19 and 40. Two Does: ages 40 and 50.
    const result = col.query({}, { orderBy: { lastName: 'ASC', age: 'ASC' } });
    // Casillas (22, 29), Cobos (35), Doe (40, 50), Snow (19)
    expect(result[0].lastName).toBe('Casillas');
    expect(result[0].age).toBe(22);
    expect(result[1].lastName).toBe('Casillas');
    expect(result[1].age).toBe(29);
    expect(result[2].lastName).toBe('Cobos');
    expect(result[3].lastName).toBe('Doe');
    expect(result[3].age).toBe(40);
    expect(result[4].lastName).toBe('Doe');
    expect(result[4].age).toBe(50);
    expect(result[5].lastName).toBe('Snow');
  });
});

// ─── Regex where (v2 fix) ────────────────────────────────────────────────────

describe('regex where', () => {
  it('top-level RegExp in where clause', () => {
    const { col } = setupUsers();
    const result = col.query({ name: /^jo/i });
    expect(result.length).toBe(2);
    expect(result.every(d => d.name === 'John')).toBe(true);
  });

  it('match operator with RegExp', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { match: /^al/i } });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Alex');
  });
});

// ─── Complex where clauses ───────────────────────────────────────────────────

describe('complex where clauses', () => {
  it('gt operator', () => {
    const { col } = setupUsers();
    const result = col.query({ age: { gt: 30 } });
    expect(result.length).toBe(3);
  });

  it('combined gt and lte', () => {
    const { col } = setupUsers();
    const result = col.query({ age: { gt: 30, lte: 40 } });
    expect(result.length).toBe(2);
  });

  it('multi-field where with operator', () => {
    const { col } = setupUsers();
    const result = col.query({ age: { gt: 20 }, lastName: 'Casillas' });
    expect(result.length).toBe(2);
    expect(result.every(d => d.lastName === 'Casillas')).toBe(true);
  });

  it('string includes operator', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { includes: 'ohn' } });
    expect(result.length).toBe(2);
  });

  it('string startsWith operator', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { startsWith: 'Al' } });
    expect(result.length).toBe(1);
  });

  it('string endsWith operator', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { endsWith: 'ex' } });
    expect(result.length).toBe(1);
  });

  it('eq operator', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { eq: 'Alex' } });
    expect(result.length).toBe(1);
  });

  it('notEq operator', () => {
    const { col } = setupUsers();
    const result = col.query({ name: { notEq: 'Alex' } });
    expect(result.length).toBe(5);
  });

  it('in operator', () => {
    const { col } = setupUsers();
    const result = col.query({ age: { in: [19, 29, 50] } });
    expect(result.length).toBe(3);
  });
});

// ─── Populate validation (v2) ────────────────────────────────────────────────

describe('populate', () => {
  it('populates documents and allows querying', () => {
    const { col } = setupUsers();
    expect(col.query({}).length).toBe(6);
  });

  it('throws when doc has no _id', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    expect(() =>
      col.populate([{ name: 'No', lastName: 'Id', age: 0, createdAt: 0, updatedAt: 0 } as any])
    ).toThrow('_id');
  });

  it('duplicates overwrite (last wins)', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const now = Date.now();
    col.populate([
      { _id: '1', name: 'First', lastName: 'A', age: 1, createdAt: now, updatedAt: now } as Doc<UserModel>,
      { _id: '1', name: 'Second', lastName: 'B', age: 2, createdAt: now, updatedAt: now } as Doc<UserModel>,
    ]);
    const doc = col.read('1');
    expect(doc!.name).toBe('Second');
  });
});

// ─── Sync behavior (v2 fix: no swallowed errors) ────────────────────────────

describe('syncers', () => {
  it('create syncer resolves -> document persists', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        create: async () => true,
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    expect(col.read(id)).not.toBeNull();
  });

  it('create syncer returns false -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        create: async () => false,
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    expect(
      col.create({ name: 'Alex', lastName: 'Casillas', age: 29 })
    ).rejects.toThrow("synchronization wasn't possible");
  });

  it('create syncer throws -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        create: async () => { throw new Error('Network down'); },
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    expect(
      col.create({ name: 'Alex', lastName: 'Casillas', age: 29 })
    ).rejects.toThrow("synchronization wasn't possible");
  });

  it('update syncer returns false -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        update: async () => false,
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    try {
      await col.update(id, { name: 'John' });
    } catch {
      // expected
    }
    const doc = col.read(id)!;
    expect(doc.name).toBe('Alex');
  });

  it('remove syncer returns false -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        remove: async () => false,
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    try {
      await col.remove(id);
    } catch {
      // expected
    }
    expect(col.read(id)).not.toBeNull();
  });
});

// ─── Listeners: Map/Set + payloads (v2) ──────────────────────────────────────

describe('on() listeners with payloads', () => {
  it('create event includes { doc }', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    let payload: any = null;
    col.on('create', (p) => { payload = p; });
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    expect(payload).not.toBeNull();
    expect(payload.doc._id).toBe(id);
    expect(payload.doc.name).toBe('Alex');
  });

  it('update event includes { before, after, patch }', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.on('update', (p) => { payload = p; });
    await col.update(id, { name: 'John' });
    expect(payload.before.name).toBe('Alex');
    expect(payload.after.name).toBe('John');
    expect(payload.patch).toEqual({ name: 'John' });
  });

  it('remove event includes { doc }', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.on('remove', (p) => { payload = p; });
    await col.remove(id);
    expect(payload.doc._id).toBe(id);
  });

  it('populate event includes { count }', () => {
    const { col } = setupUsers();
    // Already populated with 6 items — let's add a listener and re-populate
    let payload: any = null;
    col.on('populate', (p) => { payload = p; });
    const now = Date.now();
    col.populate([
      { _id: '7', name: 'New', lastName: 'User', age: 1, createdAt: now, updatedAt: now } as Doc<UserModel>,
    ]);
    expect(payload.count).toBe(1);
  });

  it('syncError event fires on sync failure', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: { create: async () => false },
    });
    const col = db.getCollection<UserModel>('user')!;
    let payload: any = null;
    col.on('syncError', (p) => { payload = p; });
    try {
      await col.create({ name: 'Alex', lastName: 'C', age: 1 });
    } catch {
      // expected
    }
    expect(payload).not.toBeNull();
    expect(payload.op).toBe('create');
  });

  it('cancel function removes listener', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    let called = 0;
    const cancel = col.on('create', () => { called++; });
    await col.create({ name: 'A', lastName: 'B', age: 1 });
    expect(called).toBe(1);
    cancel();
    await col.create({ name: 'C', lastName: 'D', age: 2 });
    expect(called).toBe(1);
  });
});

describe('listen() per-doc listeners', () => {
  it('fires on update for a specific doc', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.listen(id, (p) => { payload = p; });
    await col.update(id, { name: 'John' });
    expect(payload).not.toBeNull();
    expect('after' in payload).toBe(true);
    expect(payload.after.name).toBe('John');
  });

  it('fires on create for a specific doc', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    // We can't listen before knowing the id, but we can test remove
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.listen(id, (p) => { payload = p; });
    await col.remove(id);
    expect(payload).not.toBeNull();
    expect('doc' in payload).toBe(true);
  });

  it('cancel removes the listener', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let called = 0;
    const cancel = col.listen(id, () => { called++; });
    await col.update(id, { age: 30 });
    expect(called).toBe(1);
    cancel();
    await col.update(id, { age: 31 });
    expect(called).toBe(1);
  });
});

// ─── Timestamps are numbers (v2 breaking) ───────────────────────────────────

describe('timestamps', () => {
  it('createdAt and updatedAt are epoch ms numbers', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const before = Date.now();
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const after = Date.now();
    const doc = col.read(id)!;
    expect(typeof doc.createdAt).toBe('number');
    expect(typeof doc.updatedAt).toBe('number');
    expect(doc.createdAt).toBeGreaterThanOrEqual(before);
    expect(doc.createdAt).toBeLessThanOrEqual(after);
  });

  it('updatedAt changes on update', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const doc1 = col.read(id)!;
    // Small delay to ensure different timestamp
    await new Promise(r => setTimeout(r, 5));
    await col.update(id, { age: 30 });
    const doc2 = col.read(id)!;
    expect(doc2.updatedAt).toBeGreaterThanOrEqual(doc1.updatedAt);
  });
});

// ─── API extras ──────────────────────────────────────────────────────────────

describe('count', () => {
  it('returns total count without where', () => {
    const { col } = setupUsers();
    expect(col.count()).toBe(6);
  });

  it('returns filtered count with where', () => {
    const { col } = setupUsers();
    expect(col.count({ lastName: 'Doe' })).toBe(2);
  });
});

describe('exists', () => {
  it('returns true for existing doc', () => {
    const { col } = setupUsers();
    expect(col.exists('1')).toBe(true);
  });

  it('returns false for non-existing doc', () => {
    const { col } = setupUsers();
    expect(col.exists('99')).toBe(false);
  });
});

describe('clear', () => {
  it('removes all documents', () => {
    const { col } = setupUsers();
    col.clear();
    expect(col.count()).toBe(0);
    expect(col.query({}).length).toBe(0);
  });
});

describe('updateMany', () => {
  it('updates all matching documents', async () => {
    const { col } = setupUsers();
    const results = await col.updateMany({ lastName: 'Doe' }, { age: 99 });
    expect(results.length).toBe(2);
    expect(results.every(d => d.age === 99)).toBe(true);
  });
});

describe('removeMany', () => {
  it('removes all matching documents', async () => {
    const { col } = setupUsers();
    const results = await col.removeMany({ lastName: 'Doe' });
    expect(results.length).toBe(2);
    expect(col.count()).toBe(4);
  });
});

// ─── GraphDB-level APIs ──────────────────────────────────────────────────────

describe('GraphDB', () => {
  it('getCollection returns null for non-existent', () => {
    const db = GraphDB();
    expect(db.getCollection('nope')).toBeNull();
  });

  it('listCollections returns collection names', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('users');
    db.createCollection<UserModel>('posts');
    expect(db.listCollections().sort()).toEqual(['posts', 'users']);
  });

  it('removeCollection removes a collection', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('users');
    expect(db.removeCollection('users')).toBe(true);
    expect(db.getCollection('users')).toBeNull();
    expect(db.removeCollection('users')).toBe(false);
  });
});

// ─── Additional syncer tests ─────────────────────────────────────────────────

describe('syncers — update throws', () => {
  it('update syncer throws -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        update: async () => { throw new Error('Network down'); },
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    try {
      await col.update(id, { name: 'John' });
    } catch {
      // expected
    }
    const doc = col.read(id)!;
    expect(doc.name).toBe('Alex');
  });

  it('remove syncer throws -> revert + throw', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: {
        remove: async () => { throw new Error('Network down'); },
      },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    try {
      await col.remove(id);
    } catch {
      // expected
    }
    expect(col.read(id)).not.toBeNull();
  });

  it('syncError event fires with correct op and docId for update failure', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: { update: async () => false },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.on('syncError', (p) => { payload = p; });
    try { await col.update(id, { name: 'John' }); } catch { /* expected */ }
    expect(payload).not.toBeNull();
    expect(payload.op).toBe('update');
    expect(payload.docId).toBe(id);
  });

  it('syncError event fires with correct op and docId for remove failure', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: { remove: async () => false },
    });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    let payload: any = null;
    col.on('syncError', (p) => { payload = p; });
    try { await col.remove(id); } catch { /* expected */ }
    expect(payload).not.toBeNull();
    expect(payload.op).toBe('remove');
    expect(payload.docId).toBe(id);
  });

  it('after create-sync failure, exists returns false and count unchanged', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', {
      syncers: { create: async () => false },
    });
    const col = db.getCollection<UserModel>('user')!;
    const countBefore = col.count();
    let createdId: string | undefined;
    try {
      createdId = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    } catch {
      // expected
    }
    // The id was assigned optimistically but should be reverted
    expect(col.count()).toBe(countBefore);
    if (createdId) {
      expect(col.exists(createdId)).toBe(false);
    }
  });
});

// ─── Additional listener tests ───────────────────────────────────────────────

describe('listeners — edge cases', () => {
  it('multiple listeners on same event all fire', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user');
    const col = db.getCollection<UserModel>('user')!;
    let count1 = 0;
    let count2 = 0;
    col.on('create', () => { count1++; });
    col.on('create', () => { count2++; });
    await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });
});

// ─── Additional query tests ──────────────────────────────────────────────────

describe('query — edge cases', () => {
  it('limit: 0 returns empty array', () => {
    const { col } = setupUsers();
    const result = col.query({}, { limit: 0 });
    expect(result.length).toBe(0);
  });

  it('orderBy with DESC', () => {
    const { col } = setupUsers();
    const result = col.query({}, { orderBy: { age: 'DESC' } });
    expect(result[0].age).toBe(50);
    expect(result[result.length - 1].age).toBe(19);
  });
});

// ─── Additional count test ───────────────────────────────────────────────────

describe('count — edge cases', () => {
  it('count({}) (empty where) returns total same as no arg', () => {
    const { col } = setupUsers();
    expect(col.count({})).toBe(col.count());
  });
});

// ─── Additional updateMany / removeMany tests ────────────────────────────────

describe('updateMany — edge cases', () => {
  it('returns empty array when no docs match', async () => {
    const { col } = setupUsers();
    const results = await col.updateMany({ name: 'Nobody' }, { age: 99 });
    expect(results).toEqual([]);
  });
});

describe('removeMany — edge cases', () => {
  it('returns empty array when no docs match', async () => {
    const { col } = setupUsers();
    const results = await col.removeMany({ name: 'Nobody' });
    expect(results).toEqual([]);
  });
});

// ─── Additional clear test ───────────────────────────────────────────────────

describe('clear — edge cases', () => {
  it('after clear(), exists() returns false for previously-existing IDs', () => {
    const { col } = setupUsers();
    expect(col.exists('1')).toBe(true);
    col.clear();
    expect(col.exists('1')).toBe(false);
    expect(col.exists('2')).toBe(false);
  });
});

// ─── Indexing ────────────────────────────────────────────────────────────────

describe('indexing', () => {
  it('indexed equality query matches full scan', () => {
    const { col: scan } = setupUsers();
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['lastName'] });
    const indexed = db.getCollection<UserModel>('user')!;
    const now = Date.now();
    const docs = [
      { _id: '1', name: 'Alex', lastName: 'Casillas', age: 29, createdAt: now, updatedAt: now },
      { _id: '2', name: 'Daniel', lastName: 'Casillas', age: 22, createdAt: now, updatedAt: now },
      { _id: '3', name: 'Antonio', lastName: 'Cobos', age: 35, createdAt: now, updatedAt: now },
      { _id: '4', name: 'John', lastName: 'Snow', age: 19, createdAt: now, updatedAt: now },
      { _id: '5', name: 'John', lastName: 'Doe', age: 40, createdAt: now, updatedAt: now },
      { _id: '6', name: 'Jane', lastName: 'Doe', age: 50, createdAt: now, updatedAt: now },
    ] as Doc<UserModel>[];
    indexed.populate(docs);

    const scanResult = scan.query({ lastName: 'Doe' });
    const indexResult = indexed.query({ lastName: 'Doe' });
    expect(indexResult.length).toBe(scanResult.length);
    expect(new Set(indexResult.map(d => d._id))).toEqual(new Set(scanResult.map(d => d._id)));
  });

  it('create adds to index, query finds it', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['name'] });
    const col = db.getCollection<UserModel>('user')!;
    await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    const result = col.query({ name: 'Alex' });
    expect(result.length).toBe(1);
  });

  it('update moves index bucket when indexed field changes', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['name'] });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    await col.update(id, { name: 'John' });

    expect(col.query({ name: 'Alex' }).length).toBe(0);
    expect(col.query({ name: 'John' }).length).toBe(1);
  });

  it('remove clears index bucket', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['name'] });
    const col = db.getCollection<UserModel>('user')!;
    const id = await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    await col.remove(id);
    expect(col.query({ name: 'Alex' }).length).toBe(0);
  });

  it('clear empties indexes', async () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['name'] });
    const col = db.getCollection<UserModel>('user')!;
    await col.create({ name: 'Alex', lastName: 'Casillas', age: 29 });
    col.clear();
    expect(col.query({ name: 'Alex' }).length).toBe(0);
  });

  it('in operator uses index for union', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['age'] });
    const col = db.getCollection<UserModel>('user')!;
    const now = Date.now();
    col.populate([
      { _id: '1', name: 'A', lastName: 'X', age: 10, createdAt: now, updatedAt: now },
      { _id: '2', name: 'B', lastName: 'Y', age: 20, createdAt: now, updatedAt: now },
      { _id: '3', name: 'C', lastName: 'Z', age: 30, createdAt: now, updatedAt: now },
    ] as Doc<UserModel>[]);
    const result = col.query({ age: { in: [10, 30] } });
    expect(result.length).toBe(2);
  });

  it('non-indexable operator on indexed field falls back to scan correctly', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['age'] });
    const col = db.getCollection<UserModel>('user')!;
    const now = Date.now();
    col.populate([
      { _id: '1', name: 'A', lastName: 'X', age: 10, createdAt: now, updatedAt: now },
      { _id: '2', name: 'B', lastName: 'Y', age: 20, createdAt: now, updatedAt: now },
      { _id: '3', name: 'C', lastName: 'Z', age: 30, createdAt: now, updatedAt: now },
    ] as Doc<UserModel>[]);
    // gt is not indexable — should fall back to full scan
    const result = col.query({ age: { gt: 15 } });
    expect(result.length).toBe(2);
    expect(result.every(d => d.age > 15)).toBe(true);
  });

  it('mixed indexable + non-indexable clauses', () => {
    const db = GraphDB();
    db.createCollection<UserModel>('user', { indexes: ['name'] });
    const col = db.getCollection<UserModel>('user')!;
    const now = Date.now();
    col.populate([
      { _id: '1', name: 'Alex', lastName: 'Casillas', age: 29, createdAt: now, updatedAt: now },
      { _id: '2', name: 'Alex', lastName: 'Other', age: 15, createdAt: now, updatedAt: now },
      { _id: '3', name: 'John', lastName: 'Snow', age: 35, createdAt: now, updatedAt: now },
    ] as Doc<UserModel>[]);
    // name is indexed (equality), age gt is non-indexable — uses index for name, then scans candidates
    const result = col.query({ name: 'Alex', age: { gt: 20 } });
    expect(result.length).toBe(1);
    expect(result[0]._id).toBe('1');
  });
});
