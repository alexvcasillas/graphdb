import { GraphDocument } from '../types';

export const whereChecker = <T>(
  propertyToCheck: keyof T,
  whereClause: object | any,
  document: GraphDocument<T>
): boolean => {
  let allKeysMatch = true;
  if (typeof whereClause !== 'object') {
    if (whereClause instanceof RegExp) {
      return whereClause.test((document[propertyToCheck] as unknown) as string);
    }

    const prop = (document[propertyToCheck] as unknown) as any;
    return prop === whereClause;
  }
  for (let [key, value] of Object.entries(whereClause)) {
    if (key === 'match' && value instanceof RegExp) {
      const prop = (document[propertyToCheck] as unknown) as string;
      if (!value.test(prop)) allKeysMatch = false;
      continue;
    }

    if (typeof value !== typeof document[propertyToCheck]) {
      allKeysMatch = false;
      continue;
    }

    if (typeof value === 'number') {
      const prop = (document[propertyToCheck] as unknown) as number;
      if (key === 'gt' && typeof value === 'number') {
        if (prop <= value) allKeysMatch = false;
        continue;
      }
      if (key === 'gte' && typeof value === 'number') {
        if (prop < value) allKeysMatch = false;
        continue;
      }
      if (key === 'lt' && typeof value === 'number') {
        if (prop >= value) allKeysMatch = false;
        continue;
      }
      if (key === 'lte' && typeof value === 'number') {
        if (prop > value) allKeysMatch = false;
        continue;
      }
    }
    if (typeof value === 'string') {
      const prop = (document[propertyToCheck] as unknown) as string;
      if (key === 'eq') {
        if (prop !== value) allKeysMatch = false;
        continue;
      }
      if (key === 'notEq') {
        if (prop === value) allKeysMatch = false;
        continue;
      }
      if (key === 'includes') {
        if (!prop.includes(value)) allKeysMatch = false;
        continue;
      }
      if (key === 'startsWith') {
        if (!prop.startsWith(value)) allKeysMatch = false;
        continue;
      }
      if (key === 'endsWith') {
        if (!prop.endsWith(value)) allKeysMatch = false;
        continue;
      }
    }
    allKeysMatch = false;
  }
  return allKeysMatch;
};
