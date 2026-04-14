import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloneValue,
  deepContains,
  deepFindPath,
  deepMerge,
  flattenObject,
  formatOutput,
  getArrayForKey,
  isDangerousKey,
  isPlainObject,
  resolvePath,
  sanitize,
  tryParse,
} from '../src/02-dictionary-utils.js';

describe('isDangerousKey', () => {
  it('flags keys that can lead to prototype pollution', () => {
    assert.equal(isDangerousKey('__proto__'), true);
    assert.equal(isDangerousKey('constructor'), true);
    assert.equal(isDangerousKey('prototype'), true);
    assert.equal(isDangerousKey('safe'), false);
  });
});

describe('sanitize', () => {
  it('removes dangerous keys recursively from objects and arrays', () => {
    const input = JSON.parse(
      '{"safe":1,"__proto__":{"bad":1},"nested":{"constructor":2,"ok":true},"arr":[{"prototype":3},{"a":1}]}'
    );

    const output = sanitize(input);

    assert.equal(output, input);
    assert.deepEqual(output, {
      safe: 1,
      nested: { ok: true },
      arr: [{}, { a: 1 }],
    });
    assert.equal(Object.prototype.hasOwnProperty.call(output, '__proto__'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(output.nested, 'constructor'), false);
  });

  it('returns primitive inputs unchanged', () => {
    assert.equal(sanitize('text'), 'text');
    assert.equal(sanitize(4), 4);
    assert.equal(sanitize(null), null);
  });
});

describe('isPlainObject', () => {
  it('accepts only non-null non-array objects', () => {
    assert.equal(isPlainObject({ a: 1 }), true);
    assert.equal(isPlainObject([]), false);
    assert.equal(isPlainObject(null), false);
    assert.equal(isPlainObject('x'), false);
  });
});

describe('tryParse', () => {
  it('parses object and array JSON strings and sanitizes dangerous keys', () => {
    assert.deepEqual(tryParse('{"x":1,"__proto__":{"bad":1}}'), { x: 1 });
    assert.deepEqual(tryParse('[1,{"constructor":1}]'), [1, {}]);
  });

  it('returns original input for invalid JSON, non-JSON-like strings, and non-strings', () => {
    assert.equal(tryParse('{bad-json}'), '{bad-json}');
    assert.equal(tryParse('123'), '123');
    assert.equal(tryParse(123), 123);
  });
});

describe('resolvePath', () => {
  it('returns root and null key for empty path', () => {
    const root = { a: 1 };
    assert.deepEqual(resolvePath(root, ''), { target: root, key: null });
  });

  it('resolves escaped dots in path segments', () => {
    const root = {
      'a.b': { c: 1 },
    };
    const loc = resolvePath(root, 'a\\.b.c');
    assert.ok(loc);
    assert.equal(loc.target, root['a.b']);
    assert.equal(loc.key, 'c');
  });

  it('creates missing object and array segments when autoCreate is true', () => {
    const root = {};
    const loc = resolvePath(root, 'users.0.name', true);
    assert.ok(loc);

    loc.target[loc.key] = 'Ada';
    assert.deepEqual(root, {
      users: [{ name: 'Ada' }],
    });
  });

  it('returns null for missing paths without auto-create, dangerous keys, or non-object traversal', () => {
    const root = { a: 1 };

    assert.equal(resolvePath(root, 'missing.key'), null);
    assert.equal(resolvePath(root, 'a.b'), null);
    assert.equal(resolvePath({}, 'safe.__proto__.x', true), null);
    assert.equal(resolvePath({}, 'safe.__proto__', true), null);
  });
});

describe('deepMerge', () => {
  it('deep-merges plain objects while skipping dangerous keys', () => {
    const target = { nested: { x: 1 }, keep: true };
    const source = JSON.parse(
      '{"nested":{"y":2},"replace":[1],"constructor":{"bad":1},"__proto__":{"bad":1}}'
    );

    deepMerge(target, source);

    assert.deepEqual(target, {
      nested: { x: 1, y: 2 },
      keep: true,
      replace: [1],
    });
    assert.equal(Object.prototype.hasOwnProperty.call(target, 'constructor'), false);
  });
});

describe('formatOutput', () => {
  it('formats undefined, null, objects, and primitives consistently', () => {
    assert.equal(formatOutput(undefined), 'undefined');
    assert.equal(formatOutput(null), 'null');
    assert.equal(formatOutput({ a: 1 }), '{"a":1}');
    assert.equal(formatOutput(42), 42);
    assert.equal(formatOutput('ok'), 'ok');
  });
});

describe('deepContains and deepFindPath', () => {
  it('searches deeply with string-coercion semantics', () => {
    const data = {
      nested: { value: '5' },
      list: [1, 2, { id: 10 }],
    };

    assert.equal(deepContains(data, 5), true);
    assert.equal(deepContains(data, 'missing'), false);
    assert.equal(deepFindPath(data, 10), 'list.2.id');
  });

  it('ignores dangerous keys while finding paths', () => {
    const data = JSON.parse('{"safe":{"value":"ok"},"hidden":{"__proto__":"secret"}}');
    assert.equal(deepFindPath(data, 'ok'), 'safe.value');
    assert.equal(deepFindPath(data, 'secret'), '');
  });
});

describe('flattenObject', () => {
  it('flattens nested values and ignores dangerous keys', () => {
    const input = JSON.parse(
      '{"a":{"b":2},"arr":[1,{"c":3}],"__proto__":{"bad":1},"nested":{"constructor":1}}'
    );

    assert.deepEqual(flattenObject(input), {
      'a.b': 2,
      'arr.0': 1,
      'arr.1.c': 3,
    });
  });
});

describe('getArrayForKey', () => {
  it('returns root or nested arrays and null for invalid targets', () => {
    const dictionaries = new Map([
      ['rootArray', [1, 2]],
      ['nestedArray', { items: [3, 4] }],
      ['notArray', { items: 'x' }],
    ]);

    assert.deepEqual(getArrayForKey(dictionaries, 'rootArray', ''), [1, 2]);
    assert.deepEqual(getArrayForKey(dictionaries, 'nestedArray', 'items'), [3, 4]);
    assert.equal(getArrayForKey(dictionaries, 'nestedArray', 'missing'), null);
    assert.equal(getArrayForKey(dictionaries, 'notArray', 'items'), null);
    assert.equal(getArrayForKey(dictionaries, 'missing', ''), null);
  });
});

describe('cloneValue', () => {
  it('deep-clones values without retaining references', () => {
    const value = { a: { b: [1, 2] } };
    const cloned = cloneValue(value);

    cloned.a.b.push(3);

    assert.deepEqual(value, { a: { b: [1, 2] } });
    assert.deepEqual(cloned, { a: { b: [1, 2, 3] } });
  });

  it('falls back to JSON clone when structuredClone is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');

    if (descriptor && descriptor.writable !== true) {
      return;
    }

    const original = globalThis.structuredClone;
    try {
      globalThis.structuredClone = undefined;
      const cloned = cloneValue({ x: { y: 1 } });
      assert.deepEqual(cloned, { x: { y: 1 } });
      cloned.x.y = 9;
      assert.deepEqual(cloned, { x: { y: 9 } });
    } finally {
      globalThis.structuredClone = original;
    }
  });
});
