// ─── Event types ─────────────────────────────────────────────────────────────

export type EventType = 'create' | 'update' | 'remove' | 'populate' | 'syncError';

// ─── Listener payloads ───────────────────────────────────────────────────────

export type CreatePayload<T> = { doc: Doc<T> };
export type UpdatePayload<T> = { before: Doc<T>; after: Doc<T>; patch: Partial<T> };
export type RemovePayload<T> = { doc: Doc<T> };
export type PopulatePayload = { count: number };
export type SyncErrorPayload = { op: 'create' | 'update' | 'remove'; error: unknown; docId?: string };

export type EventPayloadMap<T> = {
  create: CreatePayload<T>;
  update: UpdatePayload<T>;
  remove: RemovePayload<T>;
  populate: PopulatePayload;
  syncError: SyncErrorPayload;
};

export type ListenerPayload<T> = CreatePayload<T> | UpdatePayload<T> | RemovePayload<T>;

// ─── Document ────────────────────────────────────────────────────────────────

export type Doc<T> = {
  _id: string;
  createdAt: number;
  updatedAt: number;
} & T;

// ─── Where / Query ───────────────────────────────────────────────────────────

export type Where<T = Record<string, unknown>> = {
  [K in keyof T]?: T[K] | WhereClause<T[K]> | RegExp;
} & Record<string, unknown>;

export type WhereClause<V = unknown> = {
  eq?: V;
  notEq?: V;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  includes?: string;
  startsWith?: string;
  endsWith?: string;
  match?: RegExp;
  in?: V[];
};

export type QueryOptions = {
  skip?: number;
  limit?: number;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
};

// ─── Syncers ─────────────────────────────────────────────────────────────────

export type Syncers<T> = {
  create?: (doc: Doc<T>) => Promise<boolean>;
  update?: (doc: Doc<T>) => Promise<boolean>;
  remove?: (docId: string) => Promise<boolean>;
};

// ─── Collection options ──────────────────────────────────────────────────────

export type CollectionOptions<T> = {
  indexes?: (keyof T)[];
  syncers?: Syncers<T>;
};

// ─── Collection ──────────────────────────────────────────────────────────────

export type CancelFn = () => void;

export type RemoveResult = {
  removedId: string;
  acknowledge: true;
};

export type Collection<T> = {
  read: (id: string) => Doc<T> | null;
  query: (where: Where<T>, options?: QueryOptions) => Doc<T>[];
  findOne: (where: Where<T>) => Doc<T> | null;
  create: (doc: T) => Promise<string>;
  update: (id: string, patch: Partial<T>) => Promise<Doc<T>>;
  remove: (id: string) => Promise<RemoveResult>;
  populate: (docs: Doc<T>[]) => void;
  listen: (id: string, fn: (payload: ListenerPayload<T>) => void) => CancelFn;
  on: <E extends EventType>(event: E, fn: (payload: EventPayloadMap<T>[E]) => void) => CancelFn;
  count: (where?: Where<T>) => number;
  exists: (id: string) => boolean;
  clear: () => void;
  updateMany: (where: Where<T>, patch: Partial<T>) => Promise<Doc<T>[]>;
  removeMany: (where: Where<T>) => Promise<RemoveResult[]>;
};

// ─── GraphDB ─────────────────────────────────────────────────────────────────

export type GraphDBType = {
  createCollection: <T>(name: string, options?: CollectionOptions<T>) => void;
  getCollection: <T>(name: string) => Collection<T> | null;
  listCollections: () => string[];
  removeCollection: (name: string) => boolean;
};
