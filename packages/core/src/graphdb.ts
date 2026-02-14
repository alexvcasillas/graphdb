import type { GraphDBType, CollectionOptions, Collection } from '@graphdb/types';
import { createCollection } from './collection';

export function GraphDB(): GraphDBType {
  const collections = new Map<string, Collection<any>>();

  function create<T>(name: string, options?: CollectionOptions<T>): void {
    collections.set(name, createCollection<T>(options));
  }

  function getCollection<T>(name: string): Collection<T> | null {
    return (collections.get(name) as Collection<T>) ?? null;
  }

  function listCollections(): string[] {
    return [...collections.keys()];
  }

  function removeCollection(name: string): boolean {
    return collections.delete(name);
  }

  return {
    createCollection: create,
    getCollection,
    listCollections,
    removeCollection,
  };
}
