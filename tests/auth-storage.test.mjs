import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup(blocked = false) {
  const storage = (unavailable) => {
    const data = new Map();
    return {
      getItem: (key) => { if (unavailable) throw new Error('Storage blocked'); return data.get(key) ?? null; },
      setItem: (key, value) => { if (unavailable) throw new Error('Storage blocked'); data.set(key, value); },
      removeItem: (key) => { if (unavailable) throw new Error('Storage blocked'); data.delete(key); },
    };
  };
  const window = { localStorage: storage(blocked === 'both' || blocked === 'local'), sessionStorage: storage(blocked === 'both' || blocked === 'session') };
  const context = { exports: {}, window, Map };
  const source = fs.readFileSync(new URL('../lib/authStorage.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(outputText, context);
  return { ...context.exports, window };
}

test('existing persistent sessions remain readable', () => {
  const { authStorage, getRememberSession, window } = setup();
  window.localStorage.setItem('auth-token', 'existing-session');
  assert.equal(getRememberSession(), true);
  assert.equal(authStorage.getItem('auth-token'), 'existing-session');
});

test('unchecked sign-ins use session storage and remove persistent tokens', () => {
  const { authStorage, setRememberSession, getRememberSession, window } = setup();
  window.localStorage.setItem('auth-token', 'old-session');
  setRememberSession(false);
  authStorage.setItem('auth-token', 'new-session');
  assert.equal(getRememberSession(), false);
  assert.equal(window.sessionStorage.getItem('auth-token'), 'new-session');
  assert.equal(window.localStorage.getItem('auth-token'), null);
  assert.equal(authStorage.getItem('auth-token'), 'new-session');
});

test('checked sign-ins persist tokens and remove stale tab sessions', () => {
  const { authStorage, setRememberSession, window } = setup();
  window.sessionStorage.setItem('auth-token', 'tab-session');
  setRememberSession(true);
  authStorage.setItem('auth-token', 'persistent-session');
  assert.equal(window.localStorage.getItem('auth-token'), 'persistent-session');
  assert.equal(window.sessionStorage.getItem('auth-token'), null);
});

test('sign-out removes tokens from both storage locations', () => {
  const { authStorage, window } = setup();
  window.localStorage.setItem('auth-token', 'local-session');
  window.sessionStorage.setItem('auth-token', 'tab-session');
  authStorage.removeItem('auth-token');
  assert.equal(window.localStorage.getItem('auth-token'), null);
  assert.equal(window.sessionStorage.getItem('auth-token'), null);
});

test('blocked browser storage falls back to memory without crashing', () => {
  const { authStorage, setRememberSession, getRememberSession } = setup('both');
  assert.doesNotThrow(() => setRememberSession(false));
  assert.equal(getRememberSession(), false);
  authStorage.setItem('auth-token', 'memory-session');
  assert.equal(authStorage.getItem('auth-token'), 'memory-session');
  authStorage.removeItem('auth-token');
  assert.equal(authStorage.getItem('auth-token'), null);
});

test('sign-out clears session storage even when local storage is blocked', () => {
  const { authStorage, window } = setup('local');
  window.sessionStorage.setItem('auth-token', 'tab-session');
  assert.equal(authStorage.getItem('auth-token'), 'tab-session');
  authStorage.removeItem('auth-token');
  assert.equal(window.sessionStorage.getItem('auth-token'), null);
  assert.equal(authStorage.getItem('auth-token'), null);
});

test('existing persistent sessions survive blocked session storage', () => {
  const { authStorage, window } = setup('session');
  window.localStorage.setItem('auth-token', 'persistent-session');
  assert.equal(authStorage.getItem('auth-token'), 'persistent-session');
});

test('failed session-storage writes never leave an old persistent token', () => {
  const { authStorage, setRememberSession, window } = setup('session');
  window.localStorage.setItem('auth-token', 'old-session');
  setRememberSession(false);
  authStorage.setItem('auth-token', 'new-session');
  assert.equal(window.localStorage.getItem('auth-token'), null);
  assert.equal(authStorage.getItem('auth-token'), 'new-session');
});
