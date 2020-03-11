import { isBefore } from 'date-fns';

import { GraphDocument } from '../types';

/* Sorts documents by a numerical propery */
function numericalSort<T>(
  documents: GraphDocument<T>[],
  property: keyof T,
  order: 'ASC' | 'DESC'
) {
  function sortBy(a: GraphDocument<T>, b: GraphDocument<T>) {
    const valueA = (a[property as keyof T] as unknown) as number;
    const valueB = (b[property as keyof T] as unknown) as number;

    return order === 'ASC' ? valueA - valueB : valueB - valueA;
  }
  return [...documents].sort(sortBy);
}

/* Sorts documents by a date property */
function dateSort<T>(
  documents: GraphDocument<T>[],
  property: keyof T,
  order: 'ASC' | 'DESC'
) {
  function sortBy(a: GraphDocument<T>, b: GraphDocument<T>) {
    const valueA = (a[property as keyof T] as unknown) as Date;
    const valueB = (b[property as keyof T] as unknown) as Date;

    return order === 'ASC'
      ? isBefore(valueA, valueB)
        ? 1
        : -1
      : isBefore(valueB, valueA)
      ? 1
      : -1;
  }
  return [...documents].sort(sortBy);
}

export const sortDocuments = <T>(
  documents: GraphDocument<T>[],
  sortBy: {
    [property: string]: 'ASC' | 'DESC';
  }
): GraphDocument<T>[] => {
  let sortedDocuments: GraphDocument<T>[] = [];
  for (let [key, value] of Object.entries<any>(sortBy)) {
    // Numerical sort type
    if (typeof documents[0][key as keyof T] === 'number') {
      sortedDocuments = numericalSort(
        documents,
        key as keyof T,
        value as 'ASC' | 'DESC'
      );
      continue;
    }
    // Date sort type
    if (documents[0][key as keyof T] instanceof Date) {
      sortedDocuments = dateSort(
        documents,
        key as keyof T,
        value as 'ASC' | 'DESC'
      );
      continue;
    }
  }
  return sortedDocuments;
};
