import { sortDocuments } from '../src/utils/sort-documents';

const mockDocs = [
  {
    _id: '1',
    name: 'Alex',
    lastName: 'Casillas',
    age: 29,
    createdAt: new Date('03/23/1990'),
    updateAt: new Date(),
  },
  {
    _id: '2',
    name: 'Daniel',
    lastName: 'Casillas',
    age: 22,
    createdAt: new Date('04/16/1997'),
    updateAt: new Date(),
  },
  {
    _id: '3',
    name: 'Antonio',
    lastName: 'Cobos',
    age: 35,
    createdAt: new Date('04/03/1985'),
    updateAt: new Date(),
  },
  {
    _id: '4',
    name: 'John',
    lastName: 'Snow',
    age: 19,
    createdAt: new Date('08/22/1962'),
    updateAt: new Date(),
  },
  {
    _id: '5',
    name: 'John',
    lastName: 'Doe',
    age: 40,
    createdAt: new Date('12/31/1975'),
    updateAt: new Date(),
  },
  {
    _id: '6',
    name: 'Jane',
    lastName: 'Doe',
    age: 50,
    createdAt: new Date('12/30/1975'),
    updateAt: new Date(),
  },
];

describe('utils: sort documents', () => {
  it('should sort documents by a number type property on a specific order (ASC)', () => {
    const orderedDocuments = sortDocuments(mockDocs, { age: 'ASC' });
    expect(orderedDocuments[0].age).toBe(19);
    expect(orderedDocuments[1].age).toBe(22);
    expect(orderedDocuments[2].age).toBe(29);
    expect(orderedDocuments[3].age).toBe(35);
    expect(orderedDocuments[4].age).toBe(40);
    expect(orderedDocuments[5].age).toBe(50);
  });
  it('should sort documents by a number type property on a specific order (DESC)', () => {
    const orderedDocuments = sortDocuments(mockDocs, { age: 'DESC' });
    expect(orderedDocuments[0].age).toBe(50);
    expect(orderedDocuments[1].age).toBe(40);
    expect(orderedDocuments[2].age).toBe(35);
    expect(orderedDocuments[3].age).toBe(29);
    expect(orderedDocuments[4].age).toBe(22);
    expect(orderedDocuments[5].age).toBe(19);
  });
  it('should sort documents by a date type property on a specific order (ASC)', () => {
    const orderedDocuments = sortDocuments(mockDocs, { createdAt: 'ASC' });
    expect(orderedDocuments[0].createdAt.getUTCFullYear()).toBe(1997);
    expect(orderedDocuments[1].createdAt.getUTCFullYear()).toBe(1990);
    expect(orderedDocuments[2].createdAt.getUTCFullYear()).toBe(1985);
    expect(orderedDocuments[3].createdAt.getUTCFullYear()).toBe(1975);
    expect(orderedDocuments[4].createdAt.getUTCFullYear()).toBe(1975);
    expect(orderedDocuments[5].createdAt.getUTCFullYear()).toBe(1962);
  });
  it('should sort documents by a date type property on a specific order (DESC)', () => {
    const orderedDocuments = sortDocuments(mockDocs, { createdAt: 'DESC' });
    expect(orderedDocuments[0].createdAt.getUTCFullYear()).toBe(1962);
    expect(orderedDocuments[1].createdAt.getUTCFullYear()).toBe(1975);
    expect(orderedDocuments[2].createdAt.getUTCFullYear()).toBe(1975);
    expect(orderedDocuments[3].createdAt.getUTCFullYear()).toBe(1985);
    expect(orderedDocuments[4].createdAt.getUTCFullYear()).toBe(1990);
    expect(orderedDocuments[5].createdAt.getUTCFullYear()).toBe(1997);
  });
});
