import { whereChecker } from '../src/utils/where-checker';

describe('utils: where checker', () => {
  it('Should check for a GT clause agains a valid document (1/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { gt: 20 }, document)).toBe(true);
  });
  it('Should check for a GT clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { gt: 30 }, document)).toBe(false);
  });
  it('Should check for a GTE clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { gte: 29 }, document)).toBe(true);
  });
  it('Should check for a GTE clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { gte: 30 }, document)).toBe(false);
  });
  it('Should check for a LT clause agains a valid document (1/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { lt: 30 }, document)).toBe(true);
  });
  it('Should check for a LT clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { lt: 20 }, document)).toBe(false);
  });
  it('Should check for a LTE clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { lte: 29 }, document)).toBe(true);
  });
  it('Should check for a LTE clause agains a valid document (2/2)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { lte: 28 }, document)).toBe(false);
  });
  it("Should return false when the property to check doesn't match with the document type", () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { gte: '29' }, document)).toBe(false);
  });
  it("Should return false when the property to check doesn't match with any property checker", () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('age', { wolo: '29' }, document)).toBe(false);
  });
});
