export type GraphDBType = {
  createCollection: <T>(
    collectionId: string,
    syncers?: GraphDocumentSyncers<T>
  ) => void;
  getCollection: <T>(collectionId: string) => Collection<T> | null;
};

export type Where = {
  [property: string]: any;
};

export type Collection<T> = {
  read: (documentId: string) => GraphDocument<T>;
  query: (where: Where) => GraphDocument<T> | GraphDocument<T>[] | null;
  create: (document: T) => Promise<string>;
  update: (documentId: string, patch: Partial<T>) => Promise<GraphDocument<T>>;
  remove: (documentId: string) => Promise<RemoveOperationFeedback>;
  populate: (population: GraphDocument<T>[]) => void;
  listen: (
    documentId: string,
    listener: ListenerFn<GraphDocument<T>>
  ) => CancelListenerFn;
  on: (
    type: 'create' | 'update' | 'remove' | 'populate',
    listener: ListenerFn<GraphDocument<T>>
  ) => CancelListenerFn;
};

export type GraphDocument<T> = {
  _id: string;
  createdAt: Date;
  updateAt: Date;
} & T;

export type ListenerFn<T> = (document: GraphDocument<T>) => void;
export type ListenerOnFn = () => void;

export type GraphDocumentListener<T> = {
  id: string;
  document: string;
  fn: ListenerFn<GraphDocument<T>>;
};

export type GraphDocumentListenerOn = {
  id: string;
  type: 'create' | 'update' | 'remove' | 'populate';
  fn: ListenerOnFn;
};

export type GraphDocumentListeners<T> = GraphDocumentListener<T>[];
export type GraphDocumentListenersOn = GraphDocumentListenerOn[];

export type CancelListenerFn = () => void;

export type GraphDocumentSyncers<T> = {
  create?: (document: GraphDocument<T>) => Promise<boolean>;
  update?: (document: GraphDocument<T>) => Promise<boolean>;
  remove?: (documentId: string) => Promise<boolean>;
};

export type RemoveOperationFeedback = {
  removedId: string;
  acknowledge: true;
};
