const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/hooks/useFocusTracker.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function tracker(options) {
  const window = new EventTarget();
  const document = new EventTarget();
  let focused = true;
  let now = 100_000;
  let tick;
  const states = [];
  const origin = 'https://zenith.test';
  const bindings = {
    useState(initial) {
      const index = states.push(initial) - 1;
      return [initial, (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef: (current) => ({ current }),
    useEffect: (effect) => effect(),
    useCallback: (callback) => callback,
  };
  window.setInterval = (callback, delay) => { if (delay === 1000) tick = callback; };
  document.hasFocus = () => focused;
  document.hidden = false;
  class TestDate extends Date { static now() { return now; } }
  const exports = {};
  vm.runInNewContext(compiled, {
    window, document, Date: TestDate, location: { origin }, exports, require: () => bindings,
    sessionStorage: { getItem: () => null },
  });
  const api = exports.useFocusTracker({
    sessionId: 'test-session', warningThresholdSeconds: 10, idleThresholdSeconds: 60,
    shieldActive: false, showWarnings: true, trackKeyboardInactivity: true, ...options,
  });
  return {
    api, get stats() { return states[0]; }, get warning() { return states[1]; },
    advance(seconds) { now += seconds * 1_000; }, tick: () => tick(),
    blur() { focused = false; window.dispatchEvent(new Event('blur')); },
    focus() { focused = true; window.dispatchEvent(new Event('focus')); },
    block(focusSessionId = 'test-session') {
      const event = new Event('message');
      Object.assign(event, { source: window, origin, data: { type: 'ZENITH_DISTRACTION_ATTEMPT', domain: 'instagram.com', focusSessionId } });
      window.dispatchEvent(event);
    },
  };
}

test('warns on return even if Chrome suspended the timer while the window was away', () => {
  const focus = tracker();
  focus.blur();
  focus.advance(12);
  focus.focus();
  assert.equal(focus.warning, 'You were away from your focus session.');
  assert.equal(focus.stats.warningCount, 1);
  assert.equal(focus.stats.tabSwitchCount, 1);
});

test('keeps approved browsing quiet with protection active and warns once for a confirmed block', () => {
  const focus = tracker({ shieldActive: true });
  focus.blur();
  focus.advance(12);
  focus.tick();
  focus.focus();
  assert.equal(focus.stats.warningCount, 0);
  focus.block('old-session');
  focus.block();
  focus.block();
  assert.equal(focus.warning, 'The Shield blocked instagram.com.');
  assert.equal(focus.stats.warningCount, 1);
  assert.equal(focus.stats.blockAttemptCount, 1);
});

test('respects warning preferences and exercise inactivity', () => {
  for (const options of [{ trackKeyboardInactivity: false }, { showWarnings: false }]) {
    const focus = tracker(options);
    focus.advance(75);
    focus.tick();
    assert.equal(focus.warning, '');
  }
  const focus = tracker();
  focus.advance(75);
  focus.tick();
  focus.tick();
  assert.equal(focus.stats.warningCount, 1);
});
