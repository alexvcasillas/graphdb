import { GraphDocument } from 'types';

export const whereChecker = <T>(
  propertyToCheck: string,
  whereClause: object | any,
  document: GraphDocument<T>
): boolean => {
  let allKeysMatch = true;
  if (typeof whereClause !== 'object') {
    // @ts-ignore
    return document[propertyToCheck] === whereClause;
  }
  for (let [key, value] of Object.entries(whereClause)) {
    // @ts-ignore
    if (typeof value !== typeof document[propertyToCheck]) {
      allKeysMatch = false;
      continue;
    }
    if (key === 'gt' && typeof value === 'number') {
      // @ts-ignore
      if (document[propertyToCheck] <= value) allKeysMatch = false;
      continue;
    }
    if (key === 'gte' && typeof value === 'number') {
      // @ts-ignore
      if (document[propertyToCheck] < value) allKeysMatch = false;
      continue;
    }
    if (key === 'lt' && typeof value === 'number') {
      // @ts-ignore
      if (document[propertyToCheck] >= value) allKeysMatch = false;
      continue;
    }
    if (key === 'lte' && typeof value === 'number') {
      // @ts-ignore
      if (document[propertyToCheck] > value) allKeysMatch = false;
      continue;
    }
    allKeysMatch = false;
  }
  return allKeysMatch;
};
