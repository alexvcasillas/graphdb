import { isEmptyObject } from '../src/utils/empty-object';

describe('utils: empty object', () => {
  it('Should return true if the object is empty', () => {
    const query = {};
    expect(isEmptyObject(query)).toBe(true);
  });
  it('Should return false if the object is not empty', () => {
    const query = {
      name: 'Alex',
    };
    expect(isEmptyObject(query)).toBe(false);
  });
});
