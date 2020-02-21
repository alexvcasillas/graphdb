import { Collection as CollectionOfDocuments } from './collection';
import { GraphDocumentSyncers, Collection, GraphDBType } from './types';

export function GraphDB(): GraphDBType {
  const collections = new Map<string, any>();

  function createCollection<T>(
    collectionId: string,
    syncers?: GraphDocumentSyncers<T>
  ) {
    collections.set(collectionId, CollectionOfDocuments<T>(syncers));
  }

  function getCollection<T>(collectionId: string): Collection<T> | null {
    return collections.get(collectionId) || null;
  }

  return {
    createCollection,
    getCollection,
  };
}
