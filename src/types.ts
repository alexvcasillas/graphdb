export type GraphDBType = {
  createCollection: <T>(
    collectionId: string,
    syncers?: GraphDocumentSyncers<T>
  ) => void;
  getCollection: <T>(collectionId: string) => Collection<T> | null;
};

export type Query = {};
export type Where = {};

export type Collection<T> = {
  read: (documentId: string) => GraphDocument<T>;
  create: (document: T) => Promise<string>;
  update: (documentId: string, patch: Partial<T>) => Promise<GraphDocument<T>>;
  remove: (documentId: string) => Promise<RemoveOperationFeedback>;
  listen: (documentId: string, listener: ListenerFn<GraphDocument<T>>) => void;
  __dev: {
    documents: Map<string, T>;
  };
};

export type GraphDocument<T> = {
  _id: string;
  createdAt: Date;
  updateAt: Date;
} & T;

export type ListenerFn<T> = (document: T) => void;

export type GraphDocumentListener<T> = {
  id: string;
  document: string;
  fn: ListenerFn<GraphDocument<T>>;
};

export type GraphDocumentListeners<T> = GraphDocumentListener<T>[];

export type GraphDocumentSyncers<T> = {
  create?: (document: GraphDocument<T>) => Promise<boolean>;
  update?: (document: GraphDocument<T>) => Promise<boolean>;
  remove?: (documentId: string) => Promise<boolean>;
};

export type RemoveOperationFeedback = {
  removedId: string;
  acknowledge: true;
};
