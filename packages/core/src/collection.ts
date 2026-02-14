import type {
  Doc,
  Where,
  QueryOptions,
  Syncers,
  CollectionOptions,
  Collection,
  CancelFn,
  RemoveResult,
  EventType,
  EventPayloadMap,
  ListenerPayload,
} from '@graphdb/types';
import { whereChecker } from './utils/where-checker';
import { isEmptyObject } from './utils/empty-object';
import { sortDocuments } from './utils/sort-documents';

export function createCollection<T>(options?: CollectionOptions<T>): Collection<T> {
  const syncers = options?.syncers;
  const indexedFields = options?.indexes ?? [];

  // ─── Document storage ────────────────────────────────────────────────
  const documents = new Map<string, Doc<T>>();

  // ─── Indexes: field -> value -> Set<docId> ───────────────────────────
  const indexes = new Map<keyof T, Map<unknown, Set<string>>>();
  for (const field of indexedFields) {
    indexes.set(field, new Map());
  }

  // ─── Listeners (Map/Set for O(1) unsub) ──────────────────────────────
  const onListeners = new Map<EventType, Set<(payload: any) => void>>();
  const docListeners = new Map<string, Set<(payload: ListenerPayload<T>) => void>>();

  // ─── Index helpers ───────────────────────────────────────────────────
  function indexAdd(doc: Doc<T>): void {
    for (const field of indexedFields) {
      const val = (doc as Record<string, unknown>)[field as string];
      const bucket = indexes.get(field)!;
      let set = bucket.get(val);
      if (!set) {
        set = new Set();
        bucket.set(val, set);
      }
      set.add(doc._id);
    }
  }

  function indexRemove(doc: Doc<T>): void {
    for (const field of indexedFields) {
      const val = (doc as Record<string, unknown>)[field as string];
      const bucket = indexes.get(field)!;
      const set = bucket.get(val);
      if (set) {
        set.delete(doc._id);
        if (set.size === 0) bucket.delete(val);
      }
    }
  }

  function indexUpdate(before: Doc<T>, after: Doc<T>): void {
    for (const field of indexedFields) {
      const oldVal = (before as Record<string, unknown>)[field as string];
      const newVal = (after as Record<string, unknown>)[field as string];
      if (oldVal === newVal) continue;
      const bucket = indexes.get(field)!;
      // Remove from old bucket
      const oldSet = bucket.get(oldVal);
      if (oldSet) {
        oldSet.delete(before._id);
        if (oldSet.size === 0) bucket.delete(oldVal);
      }
      // Add to new bucket
      let newSet = bucket.get(newVal);
      if (!newSet) {
        newSet = new Set();
        bucket.set(newVal, newSet);
      }
      newSet.add(after._id);
    }
  }

  function indexRebuild(): void {
    for (const bucket of indexes.values()) bucket.clear();
    for (const doc of documents.values()) indexAdd(doc);
  }

  function indexClear(): void {
    for (const bucket of indexes.values()) bucket.clear();
  }

  // ─── Notify helpers ──────────────────────────────────────────────────
  function emit<E extends EventType>(event: E, payload: EventPayloadMap<T>[E]): void {
    const fns = onListeners.get(event);
    if (fns) for (const fn of fns) fn(payload);
  }

  function notifyDocListeners(docId: string, payload: ListenerPayload<T>): void {
    const fns = docListeners.get(docId);
    if (fns) for (const fn of fns) fn(payload);
  }

  // ─── Query planner: use indexes when possible ────────────────────────
  function getCandidateIds(where: Where<T>): Set<string> | null {
    if (indexedFields.length === 0) return null;

    const candidateSets: Set<string>[] = [];

    for (const [key, clause] of Object.entries(where)) {
      const field = key as keyof T;
      if (!indexes.has(field)) continue;
      const bucket = indexes.get(field)!;

      if (clause instanceof RegExp || typeof clause === 'function') continue;

      if (typeof clause !== 'object' || clause === null) {
        // Primitive equality
        const set = bucket.get(clause);
        candidateSets.push(set ? new Set(set) : new Set());
        continue;
      }

      const obj = clause as Record<string, unknown>;
      if ('eq' in obj && obj.eq !== undefined) {
        const set = bucket.get(obj.eq);
        candidateSets.push(set ? new Set(set) : new Set());
        continue;
      }

      if ('in' in obj && Array.isArray(obj.in)) {
        const union = new Set<string>();
        for (const v of obj.in) {
          const set = bucket.get(v);
          if (set) for (const id of set) union.add(id);
        }
        candidateSets.push(union);
        continue;
      }
    }

    if (candidateSets.length === 0) return null;

    // Intersect smallest-first
    candidateSets.sort((a, b) => a.size - b.size);
    let result: Set<string> = candidateSets[0]!;
    for (let i = 1; i < candidateSets.length; i++) {
      const next = candidateSets[i]!;
      const intersection = new Set<string>();
      for (const id of result) {
        if (next.has(id)) intersection.add(id);
      }
      result = intersection;
      if (result.size === 0) break;
    }

    return result;
  }

  // ─── API ─────────────────────────────────────────────────────────────

  function read(id: string): Doc<T> | null {
    return documents.get(id) ?? null;
  }

  function query(where: Where<T>, options?: QueryOptions): Doc<T>[] {
    const empty = isEmptyObject(where);
    let results: Doc<T>[];

    if (empty) {
      results = [...documents.values()];
    } else {
      const candidateIds = getCandidateIds(where);
      if (candidateIds !== null) {
        // Index-assisted query
        results = [];
        for (const id of candidateIds) {
          const doc = documents.get(id);
          if (!doc) continue;
          let match = true;
          for (const [key, clause] of Object.entries(where)) {
            if (!whereChecker(key, clause, doc)) { match = false; break; }
          }
          if (match) results.push(doc);
        }
      } else {
        // Full scan
        results = [];
        for (const doc of documents.values()) {
          let match = true;
          for (const [key, clause] of Object.entries(where)) {
            if (!whereChecker(key, clause, doc)) { match = false; break; }
          }
          if (match) results.push(doc);
        }
      }
    }

    if (!options) return results;

    // Order: filter -> sort -> skip -> limit
    if (options.orderBy) {
      results = sortDocuments(results, options.orderBy);
    }

    if (options.skip !== undefined && options.skip > 0) {
      if (options.skip >= results.length) return [];
      results = results.slice(options.skip);
    }

    if (options.limit !== undefined && options.limit >= 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  function findOne(where: Where<T>): Doc<T> | null {
    if (isEmptyObject(where)) {
      const first = documents.values().next();
      return first.done ? null : first.value;
    }
    for (const doc of documents.values()) {
      let match = true;
      for (const [key, clause] of Object.entries(where)) {
        if (!whereChecker(key, clause, doc)) { match = false; break; }
      }
      if (match) return doc;
    }
    return null;
  }

  async function create(input: T): Promise<string> {
    const _id = crypto.randomUUID();
    const now = Date.now();
    const doc: Doc<T> = { ...input, _id, createdAt: now, updatedAt: now } as Doc<T>;

    documents.set(_id, doc);
    indexAdd(doc);

    if (syncers?.create) {
      try {
        const ok = await syncers.create(doc);
        if (!ok) {
          documents.delete(_id);
          indexRemove(doc);
          emit('syncError', { op: 'create', error: new Error('Sync returned false'), docId: _id });
          throw new Error("Document synchronization wasn't possible.");
        }
      } catch (err) {
        if (documents.has(_id)) {
          documents.delete(_id);
          indexRemove(doc);
        }
        emit('syncError', { op: 'create', error: err, docId: _id });
        throw err instanceof Error && err.message === "Document synchronization wasn't possible."
          ? err
          : new Error("Document synchronization wasn't possible.");
      }
    }

    emit('create', { doc });
    notifyDocListeners(_id, { doc });
    return _id;
  }

  async function update(id: string, patch: Partial<T>): Promise<Doc<T>> {
    if (!id) {
      throw new Error('You must provide the GraphDocument ID that you would like to update.');
    }

    const before = documents.get(id);
    if (!before) {
      throw new Error(`No document to update found with ID: ${id}`);
    }

    const now = Date.now();
    const after: Doc<T> = { ...before, ...patch, updatedAt: now } as Doc<T>;

    documents.set(id, after);
    indexUpdate(before, after);

    if (syncers?.update) {
      try {
        const ok = await syncers.update(after);
        if (!ok) {
          documents.set(id, before);
          indexUpdate(after, before);
          emit('syncError', { op: 'update', error: new Error('Sync returned false'), docId: id });
          throw new Error("[UPDATE SYNC]: Document synchronization wasn't possible.");
        }
      } catch (err) {
        if (documents.get(id) === after) {
          documents.set(id, before);
          indexUpdate(after, before);
        }
        emit('syncError', { op: 'update', error: err, docId: id });
        throw err instanceof Error && err.message === "[UPDATE SYNC]: Document synchronization wasn't possible."
          ? err
          : new Error("[UPDATE SYNC]: Document synchronization wasn't possible.");
      }
    }

    const payload = { before, after, patch };
    emit('update', payload);
    notifyDocListeners(id, payload);
    return after;
  }

  async function remove(id: string): Promise<RemoveResult> {
    if (!id) {
      throw new Error('You must provide the GraphDocument ID that you would like to remove.');
    }

    const doc = documents.get(id);
    if (!doc) {
      throw new Error(`No document to remove found with ID: ${id}`);
    }

    documents.delete(id);
    indexRemove(doc);

    if (syncers?.remove) {
      try {
        const ok = await syncers.remove(id);
        if (!ok) {
          documents.set(id, doc);
          indexAdd(doc);
          emit('syncError', { op: 'remove', error: new Error('Sync returned false'), docId: id });
          throw new Error("[REMOVE SYNC]: Document synchronization wasn't possible.");
        }
      } catch (err) {
        if (!documents.has(id)) {
          documents.set(id, doc);
          indexAdd(doc);
        }
        emit('syncError', { op: 'remove', error: err, docId: id });
        throw err instanceof Error && err.message === "[REMOVE SYNC]: Document synchronization wasn't possible."
          ? err
          : new Error("[REMOVE SYNC]: Document synchronization wasn't possible.");
      }
    }

    emit('remove', { doc });
    notifyDocListeners(id, { doc });
    return { removedId: id, acknowledge: true };
  }

  function populate(docs: Doc<T>[]): void {
    for (const doc of docs) {
      if (!doc._id) throw new Error('Every document must have an _id for populate.');
      documents.set(doc._id, doc);
    }
    indexRebuild();
    emit('populate', { count: docs.length });
  }

  function listen(id: string, fn: (payload: ListenerPayload<T>) => void): CancelFn {
    let set = docListeners.get(id);
    if (!set) {
      set = new Set();
      docListeners.set(id, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0) docListeners.delete(id);
    };
  }

  function on<E extends EventType>(event: E, fn: (payload: EventPayloadMap<T>[E]) => void): CancelFn {
    let set = onListeners.get(event);
    if (!set) {
      set = new Set();
      onListeners.set(event, set);
    }
    set.add(fn as (payload: any) => void);
    return () => {
      set!.delete(fn as (payload: any) => void);
      if (set!.size === 0) onListeners.delete(event);
    };
  }

  function count(where?: Where<T>): number {
    if (!where || isEmptyObject(where)) return documents.size;
    return query(where).length;
  }

  function exists(id: string): boolean {
    return documents.has(id);
  }

  function clear(): void {
    documents.clear();
    indexClear();
  }

  async function updateMany(where: Where<T>, patch: Partial<T>): Promise<Doc<T>[]> {
    const matches = query(where);
    const results: Doc<T>[] = [];
    for (const doc of matches) {
      results.push(await update(doc._id, patch));
    }
    return results;
  }

  async function removeMany(where: Where<T>): Promise<RemoveResult[]> {
    const matches = query(where);
    const results: RemoveResult[] = [];
    for (const doc of matches) {
      results.push(await remove(doc._id));
    }
    return results;
  }

  return {
    read,
    query,
    findOne,
    create,
    update,
    remove,
    populate,
    listen,
    on,
    count,
    exists,
    clear,
    updateMany,
    removeMany,
  };
}
