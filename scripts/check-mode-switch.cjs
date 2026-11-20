const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const code = babel.transformSync(fs.readFileSync('src/context/UserModeContext.jsx', 'utf8'), {
  configFile: false, babelrc: false, presets: [require('@babel/preset-react')],
  plugins: [require('@babel/plugin-transform-modules-commonjs')],
}).code;
async function scenario(user, saved = null, path = '/') {
  const hooks = [], effects = [], timers = new Map(), writes = [];
  let index = 0, value, timerId = 0, liveUser = user, profile = user;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (_, props) => { value = props.value; return null; },
    useState(initial) { const i = index++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
    useRef(initial) { const i = index++; return hooks[i] ||= { current: initial }; },
    useCallback: fn => fn,
    useEffect(fn) { const i = index++; if (!(i in hooks)) { hooks[i] = true; effects.push(fn); } },
  };
  const out = {};
  vm.runInNewContext(code, { exports: out, React: react, console: { log() {}, warn() {}, error() {} },
    window: { location: { pathname: path } }, setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id),
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name.includes('async-storage')) return { setItem: async () => {}, removeItem: async () => {} };
      if (name.includes('authService')) return { getUserData: async () => liveUser, isLoggedIn: async () => !!liveUser, fetchProfile: async () => ({ data: profile }) };
      if (name.includes('storageService')) return { getUserItem: async () => saved, setUserItem: async (...args) => { writes.push(args); } };
      // Requests intentionally never settle: they must not keep the switch locked.
      return { __esModule: true, default: new Proxy({}, { get: () => () => new Promise(() => {}) }) };
    },
  });
  const render = () => { index = 0; out.UserModeProvider({ children: null }); return value; };
  const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); return render(); };
  render(); effects.forEach(fn => fn()); await settle();
  return { get value() { return value; }, render, settle, writes, timers,
    setUser(next) { liveUser = profile = next; },
  };
}
(async () => {
  const host = { _id: 'host-A', userType: 'HOST', hostApplicationStatus: 'APPROVED' };
  let s = await scenario(host);
  assert.equal(s.value.isHost, true); assert.equal(s.value.isGuest, true);
  const first = s.value.switchToHost();
  const duplicate = s.value.switchToGuest();
  assert.equal(await first, true); assert.equal(await duplicate, false);
  s.render(); assert.equal(s.value.isSwitching, true);
  assert.equal(await s.value.syncMode('GUEST'), false, 'Outgoing layout cannot undo switch');
  assert.equal(await s.value.syncMode('HOST'), true); s.render();
  assert.equal(s.value.isHostMode, true); assert.equal(s.value.isSwitching, false);
  assert.equal(await s.value.switchToGuest(), true); s.render();
  const fallback = [...s.timers.values()].find(t => t.ms === 1500); assert(fallback); fallback.fn(); s.render();
  assert.equal(s.value.isSwitching, false, 'Hung requests must not trap switch');
  assert.equal(s.value.targetMode, null);
  await s.value.resetUserMode(); s.render();
  assert.equal(await s.value.switchToHost(), false, 'Logout immediately removes host access');
  s = await scenario({ _id: 'guest-B', userType: 'GUEST' }, 'HOST', '/host');
  assert.equal(s.value.isGuest, true, 'Saved or URL host mode cannot grant privileges');
  assert.equal(await s.value.syncMode('HOST'), false);
  s = await scenario({ ...host, hostApplicationStatus: 'REVOKED' }, 'HOST');
  assert.equal(s.value.isHost, false);
  s = await scenario(host, 'HOST'); assert.equal(s.value.isHostMode, true);
  s.setUser({ _id: 'guest-B', userType: 'GUEST' }); await s.value.refreshHostStatus(); await s.settle();
  assert.equal(s.value.isGuest, true); assert.equal(s.value.isHost, false);
  for (const group of ['(tabs)', '(host-tabs)']) {
    const layout = fs.readFileSync(`app/${group}/_layout.jsx`, 'utf8');
    assert.match(layout, /if \(!isFocused \|\| isLoading\) return/);
  }
  console.log('PASS: rapid taps, outgoing-layout protection, destination acknowledgement, hung API recovery, logout, account isolation, revoked access and saved-mode restore.');
})().catch(error => { console.error(error); process.exitCode = 1; });
