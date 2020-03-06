import { v4 as uuid } from 'uuid';
import {
  GraphDocumentSyncers,
  GraphDocument,
  GraphDocumentListeners,
  GraphDocumentListener,
  RemoveOperationFeedback,
  ListenerFn,
  CancelListenerFn,
  Where,
  GraphDocumentListenersOn,
  ListenerOnFn,
} from './types';
import { whereChecker } from './utils/where-checker';
import { isEmptyObject } from './utils/empty-object';

export function Collection<T>(syncers?: GraphDocumentSyncers<T>) {
  const documents = new Map<string, GraphDocument<T>>();
  let listeners: GraphDocumentListeners<T> = [];
  let listenersOn: GraphDocumentListenersOn = [];

  function notifyListenersOn(
    notifyType: 'create' | 'update' | 'remove' | 'populate'
  ) {
    if (listenersOn.length === 0) return;
    listenersOn
      .filter(listener => listener.type === notifyType)
      .forEach(listener => listener.fn());
  }

  const read = (documentId: string): GraphDocument<T> | null => {
    return documents.get(documentId) || null;
  };

  const query = (
    where: Where
  ): GraphDocument<T> | GraphDocument<T>[] | null => {
    const queriedDocuments: GraphDocument<T>[] = [];
    const emptyWhere = isEmptyObject(where);
    documents.forEach((document: GraphDocument<T>) => {
      if (emptyWhere) {
        queriedDocuments.push(document);
        return;
      }
      let allKeysMatch = true;
      for (let [key, value] of Object.entries(where)) {
        if (!whereChecker<T>(key, value, document)) allKeysMatch = false;
      }
      if (allKeysMatch) queriedDocuments.push(document);
    });
    if (queriedDocuments.length === 0) return null;
    if (queriedDocuments.length === 1) return queriedDocuments[0];
    return queriedDocuments;
  };

  const create = (document: T): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const _id = uuid();
      const createTimestamp = new Date();
      const updateTimestamp = new Date();
      documents.set(_id, {
        _id,
        createdAt: createTimestamp,
        updateAt: updateTimestamp,
        ...document,
      });
      if (syncers?.create) {
        let syncResult;
        try {
          syncResult = await syncers?.create({
            _id,
            createdAt: createTimestamp,
            updateAt: updateTimestamp,
            ...document,
          });
        } catch (syncError) {
          // Do nothing here
        }
        if (syncResult) {
          notifyListenersOn('create');
          return resolve(_id);
        }
        documents.delete(_id);
        return reject(new Error(`Document synchronization wasn't possible.`));
      }
      notifyListenersOn('create');
      return resolve(_id);
    });
  };

  const update = (
    documentId: string,
    patch: Partial<T>
  ): Promise<GraphDocument<T>> => {
    return new Promise(async (resolve, reject) => {
      if (!documentId) {
        return reject(
          new Error(
            'You must provide the GraphDocument ID that you would like to update.'
          )
        );
      }

      const document = documents.get(documentId) || null;

      if (!document) {
        return reject(
          new Error(`No document to update found with ID: ${documentId}`)
        );
      }

      const updateTimestamp = new Date();

      const updatedDocument = {
        ...document,
        ...patch,
        updateAt: updateTimestamp,
      };

      documents.set(documentId, updatedDocument);

      if (syncers?.update) {
        let syncResult;
        try {
          syncResult = await syncers?.update(updatedDocument);
        } catch (syncError) {
          // Do nothing here
        }
        if (!syncResult) {
          documents.set(documentId, document);
          return reject(
            new Error(
              `[UPDATE SYNC]: Document synchronization wasn't possible.`
            )
          );
        }
      }

      // Search for a listener of this document
      if (listeners.length !== 0) {
        listeners.forEach((listener: GraphDocumentListener<T>) => {
          if (listener.document === documentId) {
            listener.fn(updatedDocument);
          }
        });
      }

      notifyListenersOn('update');

      return resolve({ ...document, ...patch, updateAt: updateTimestamp });
    });
  };

  const remove = (documentId: string): Promise<RemoveOperationFeedback> => {
    return new Promise(async (resolve, reject) => {
      if (!documentId) {
        return reject(
          new Error(
            'You must provide the GraphDocument ID that you would like to remove.'
          )
        );
      }

      const document = documents.get(documentId) || null;

      if (!document) {
        return reject(
          new Error(`No document to remove found with ID: ${documentId}`)
        );
      }

      documents.delete(documentId);

      if (syncers?.remove) {
        let syncResult;
        try {
          syncResult = await syncers.remove(documentId);
        } catch (syncError) {
          // Do nothing here
        }
        if (!syncResult) {
          documents.set(documentId, document);
          return reject(
            new Error(
              `[REMOVE SYNC]: Document synchronization wasn't possible.`
            )
          );
        }
      }

      notifyListenersOn('remove');

      return resolve({
        removedId: documentId,
        acknowledge: true,
      });
    });
  };

  const populate = (population: GraphDocument<T>[]) => {
    const amountOfDocuments = population.length - 1;
    for (let i = 0; i <= amountOfDocuments; i++) {
      documents.set(population[i]._id, population[i]);
    }
    notifyListenersOn('populate');
  };

  const listen = (
    documentId: string,
    listener: ListenerFn<GraphDocument<T>>
  ): CancelListenerFn => {
    const listenerId = uuid();
    listeners.push({
      id: listenerId,
      document: documentId,
      fn: listener,
    });
    return () => {
      listeners = listeners.filter(listener => listener.id !== listenerId);
    };
  };

  const on = (
    type: 'create' | 'update' | 'remove' | 'populate',
    listener: ListenerOnFn
  ): CancelListenerFn => {
    const listenerId = `on-${type}-${uuid()}`;
    listenersOn.push({
      id: listenerId,
      type,
      fn: listener,
    });
    return () => {
      listenersOn = listenersOn.filter(listener => listener.id !== listenerId);
    };
  };

  return {
    read,
    query,
    create,
    update,
    remove,
    populate,
    listen,
    on,
  };
}
