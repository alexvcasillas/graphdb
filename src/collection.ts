import { v4 as uuid } from 'uuid';
import {
  GraphDocumentSyncers,
  GraphDocument,
  GraphDocumentListeners,
  GraphDocumentListener,
  RemoveOperationFeedback,
  ListenerFn,
  CancelListenerFn,
} from './types';

export function Collection<T>(syncers?: GraphDocumentSyncers<T>) {
  const documents = new Map<string, GraphDocument<T>>();
  let listeners: GraphDocumentListeners<T> = [];

  const read = (documentId: string): GraphDocument<T> | null => {
    return documents.get(documentId) || null;
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
          return resolve(_id);
        }
        documents.delete(_id);
        return reject(new Error(`Document synchronization wasn't possible.`));
      }
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
      return resolve({
        removedId: documentId,
        acknowledge: true,
      });
    });
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

  return {
    read,
    create,
    update,
    remove,
    listen,
  };
}
