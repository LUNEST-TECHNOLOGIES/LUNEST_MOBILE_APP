const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');

function service(file, apiClient) {
  const exports = {};
  const source = babel.transformSync(fs.readFileSync('src/services/' + file, 'utf8'), {
    configFile: false, babelrc: false, plugins: [require('@babel/plugin-transform-modules-commonjs')]
  }).code;
  vm.runInNewContext(source, { exports, require: name => name === './apiClient' ? apiClient : {}, console });
  return exports.default;
}

(async () => {
  let calls = 0;
  const payments = service('paymentService.js', { get: async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return { success: true, body: [{ name: 'Fixture Bank', code: 'test' }] };
  } });
  await assert.rejects(payments.getBanks());
  const results = await Promise.all([payments.getBanks(), payments.getBanks(), payments.getBanks()]);
  assert.equal(results[0][0].code, 'test');
  await payments.getBanks();
  assert.equal(calls, 2);
  const listings = service('listingService.js', {});
  const requests = [];
  listings.fetchAllListings = async ({listingIds}) => {
    requests.push(listingIds.length);
    return { success: true, listings: listingIds.map(_id => ({_id})).reverse() };
  };
  const ids = Array.from({length: 105}, (_, index) => index.toString(16).padStart(24, '0'));
  const records = await listings.hydrateListingIds([...ids, ids[3], {_id:'existing'}]);
  assert.deepEqual(requests, [100,5]);
  assert.equal(records[0]._id, ids[0]);
  assert.equal(records[105]._id, ids[3]);
  assert.equal(records[106]._id, 'existing');
  console.log('Passed reference cache retry/coalescing and ordered, deduplicated listing batches.');
})().catch(error => { console.error(error); process.exitCode = 1; });
