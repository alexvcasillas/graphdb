import { whereChecker } from '../src/utils/where-checker';

describe('utils: where checker', () => {
  it('Should check for a GT clause against a valid document (1/2)', () => {
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
  it('Should check for a GT clause against a valid document (2/2)', () => {
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
  it('Should check for a GTE clause against a valid document (2/2)', () => {
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
  it('Should check for a GTE clause against a valid document (2/2)', () => {
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
  it('Should check for a LT clause against a valid document (1/2)', () => {
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
  it('Should check for a LT clause against a valid document (2/2)', () => {
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
  it('Should check for a LTE clause against a valid document (2/2)', () => {
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
  it('Should check for a LTE clause against a valid document (2/2)', () => {
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
  it('Should check for an EQ clause against a valid document', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', { eq: 'Alex' }, document)).toBe(true);
  });
  it('Should check for a NOTEQ clause against a valid document', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', { notEq: 'John' }, document)).toBe(true);
  });
  it('Should check for an INCLUDES clause against a valid document', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', { includes: 'le' }, document)).toBe(true);
  });
  it('Should check for a STARSWITH clause against a valid document', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', { startsWith: 'Al' }, document)).toBe(true);
  });
  it('Should check for a ENDSWITH clause against a valid document', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', { endsWith: 'ex' }, document)).toBe(true);
  });
  it('Should check for a MATCH RegExp clause against a valid document (lean)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(whereChecker('name', new RegExp(/Al{1,1}/gi), document)).toBe(true);
  });
  it('Should check for a MATCH RegExp clause against a valid document (complex clause)', () => {
    const document = {
      _id: '1',
      name: 'Alex',
      lastName: 'Casillas',
      age: 29,
      createdAt: new Date(),
      updateAt: new Date(),
    };
    expect(
      whereChecker('name', { match: new RegExp(/Al{1,1}/gi) }, document)
    ).toBe(true);
  });
});
