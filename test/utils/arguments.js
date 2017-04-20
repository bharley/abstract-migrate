import { expect } from 'chai';
import { nameOrNumber } from '../../src/util/arguments';

describe('utils/arguments', () => {
  describe('nameOrNumber', () => {
    it('should return non-numeric values as-is', () => {
      const cases = [
        '1234-patching-a-thing',
        'doing-some-work-12',
        'this is another lame test case',
        '12dogs',
      ];

      cases.forEach((testCase) => {
        expect(nameOrNumber(testCase)).to.equal(testCase);
      });
    });

    it('should return numeric values as numbers', () => {
      const cases = [
        '1234',
        '42',
        '1',
        '34635',
      ];

      cases.forEach((testCase) => {
        expect(nameOrNumber(testCase)).to.equal(parseInt(testCase, 10));
      });
    });
  });
});
