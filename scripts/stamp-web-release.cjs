const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// The worker must change when the app bundle changes, so an installed PWA
// discovers app releases even when the worker's caching code is unchanged.
const bundleDirectory = path.join('dist', '_expo', 'static', 'js', 'web');
const bundleFiles = fs.readdirSync(bundleDirectory).filter(file => file.endsWith('.js')).sort();
if (!bundleFiles.length) throw new Error('No web bundles found; cannot stamp the release.');
const hash = crypto.createHash('sha256');
for (const file of bundleFiles) hash.update(fs.readFileSync(path.join(bundleDirectory, file)));
const release = hash.digest('hex').slice(0, 16);
const workerPath = path.join('dist', 'sw.js');
const worker = fs.readFileSync(workerPath, 'utf8');
if (!/const CACHE_NAME = '[^']+';/.test(worker)) throw new Error('Service-worker release marker was not found.');
const stamped = worker.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'lunest-pwa-${release}';`);
fs.writeFileSync(workerPath, stamped);
console.log(`Stamped PWA release ${release}`);
