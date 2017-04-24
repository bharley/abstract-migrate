import { expect } from 'chai';
import { mapSeries, promiseback } from '../../src/util/promise';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const now = () => new Date().valueOf();

describe('utils/promise', () => {
  describe('mapSeries', () => {
    it('should map results to an array', async () => {
      const results = await mapSeries([1, 2, 3, 4], async n => n * 2);

      expect(results).to.deep.equal([2, 4, 6, 8]);
    });

    it('should run each item in sequence', async () => {
      const start = now();
      const results = await mapSeries([1, 2, 3], async (n) => {
        await sleep(100);
        return [n, now() - start];
      });

      results.forEach(([n, delta]) => {
        expect(delta).to.be.closeTo(n * 100, 20);
      });
    });
  });

  describe('promiseback', () => {
    it('should support node-style callbacks', async () => {
      const thinkAboutColors = (callback) => {
        sleep(25).then(() => callback(null, 'blue'));
      };
      const favoriteColor = await promiseback(thinkAboutColors);

      expect(favoriteColor).to.equal('blue');
    });

    it('should support Promises', async () => {
      const thinkAboutColors = () => sleep(25).then(() => 'blue');
      const favoriteColor = await promiseback(thinkAboutColors);

      expect(favoriteColor).to.equal('blue');
    });
  });
});
