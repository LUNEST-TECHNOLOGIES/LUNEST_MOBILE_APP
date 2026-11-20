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
let stamped = worker.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'lunest-pwa-${release}';`);
// Build a complete offline shell, including route chunks, CSS, fonts and brand assets.
function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const precache = ['/'];
for (const file of walk(path.join('dist', '_expo'))) {
  if (/\.(js|css|woff2?|ttf|otf)$/.test(file)) precache.push('/' + path.relative('dist', file).split(path.sep).join('/'));
}
if (fs.existsSync('dist/assets')) for (const file of walk('dist/assets')) {
  if (/\.(woff2?|ttf|otf)$/.test(file)) precache.push('/' + path.relative('dist', file).split(path.sep).join('/'));
}
for (const file of ['brand/lunest-avatar.png','icon-192.png','manifest.json']) if (fs.existsSync(path.join('dist',file))) precache.push('/'+file);
stamped = stamped.replace(/const PRECACHE_URLS = \[.*?\];/, 'const PRECACHE_URLS = '+JSON.stringify(precache)+';');
if (fs.existsSync('dist/offline.html')) {
  let offline = fs.readFileSync('dist/offline.html','utf8');
  const logo = fs.readFileSync(path.join(path.dirname(process.argv[1]),'../assets/images/lunest-logo-white.png')).toString('base64');
  offline = offline.replace('__LUNEST_OFFLINE_LOGO__','data:image/png;base64,'+logo);
  fs.writeFileSync('dist/offline.html',offline);
  stamped = stamped.replace(/const OFFLINE_HTML = .*?;\n/, 'const OFFLINE_HTML = '+JSON.stringify(offline)+';\n');
}
fs.writeFileSync(workerPath, stamped);
console.log(`Stamped PWA release ${release}`);
