import type { Doc } from '@graphdb/types';

export function sortDocuments<T>(
  docs: Doc<T>[],
  orderBy: Record<string, 'ASC' | 'DESC'>,
): Doc<T>[] {
  const keys = Object.entries(orderBy);
  if (keys.length === 0) return docs;

  return [...docs].sort((a, b) => {
    for (const [key, dir] of keys) {
      const va = (a as Record<string, unknown>)[key];
      const vb = (b as Record<string, unknown>)[key];
      let cmp = 0;

      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        cmp = 0; // unsupported or mismatched types — treat as equal
      }

      if (cmp !== 0) return dir === 'ASC' ? cmp : -cmp;
    }
    return 0;
  });
}
