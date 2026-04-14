import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dictCheckPropImpl,
  dictCloneImpl,
  dictManageImpl,
  dictManageKeyImpl,
  dictMergeImpl,
} from '../src/04-dictionary-mutations.js';

describe('dictCheckPropImpl', () => {
  it('checks root-level conditions when KEY is empty', () => {
    const dictionaries = new Map([
      ['object', { a: 1 }],
      ['array', [1, 2]],
      ['nil', null],
    ]);

    assert.equal(dictCheckPropImpl(dictionaries, '', 'object', 'is defined'), true);
    assert.equal(dictCheckPropImpl(dictionaries, '', 'object', 'is dictionary (object)'), true);
    assert.equal(dictCheckPropImpl(dictionaries, '', 'object', 'is array'), false);
    assert.equal(dictCheckPropImpl(dictionaries, '', 'array', 'is array'), true);
    assert.equal(dictCheckPropImpl(dictionaries, '', 'nil', 'is null'), true);
    assert.equal(dictCheckPropImpl(dictionaries, '', 'missing', 'is defined'), false);
  });

  it('checks nested values for defined/null/array/object', () => {
    const dictionaries = new Map([['data', { value: 1, nil: null, list: [1], nested: { x: 1 } }]]);

    assert.equal(dictCheckPropImpl(dictionaries, 'value', 'data', 'is defined'), true);
    assert.equal(dictCheckPropImpl(dictionaries, 'nil', 'data', 'is null'), true);
    assert.equal(dictCheckPropImpl(dictionaries, 'list', 'data', 'is array'), true);
    assert.equal(dictCheckPropImpl(dictionaries, 'nested', 'data', 'is dictionary (object)'), true);
    assert.equal(dictCheckPropImpl(dictionaries, 'missing', 'data', 'is defined'), false);
  });
});

describe('dictManageKeyImpl', () => {
  it('creates dictionaries on demand and sets nested values', () => {
    const dictionaries = new Map();

    dictManageKeyImpl(dictionaries, 'user.name', 'profile', 'set to', 'Ada');
    assert.deepEqual(dictionaries.get('profile'), {
      user: { name: 'Ada' },
    });
  });

  it('does nothing when deleting a missing dictionary', () => {
    const dictionaries = new Map();
    dictManageKeyImpl(dictionaries, 'x', 'missing', 'delete', '');
    assert.equal(dictionaries.has('missing'), false);
  });

  it('supports root-level set/delete/push behavior', () => {
    const dictionaries = new Map();

    dictManageKeyImpl(dictionaries, '', 'root', 'set to', '{"a":1}');
    assert.deepEqual(dictionaries.get('root'), { a: 1 });

    dictManageKeyImpl(dictionaries, '', 'root', 'set to', '42');
    assert.deepEqual(dictionaries.get('root'), { a: 1 });

    dictManageKeyImpl(dictionaries, '', 'root', 'delete', '');
    assert.equal(dictionaries.has('root'), false);

    dictionaries.set('arr', []);
    dictManageKeyImpl(dictionaries, '', 'arr', 'push', 'x');
    assert.deepEqual(dictionaries.get('arr'), ['x']);

    dictionaries.set('obj', {});
    dictManageKeyImpl(dictionaries, '', 'obj', 'push', 'x');
    assert.deepEqual(dictionaries.get('obj'), {});
  });

  it('changes numeric values with safe coercion and ignores object targets', () => {
    const dictionaries = new Map([['data', { count: 1, obj: { n: 1 } }]]);

    dictManageKeyImpl(dictionaries, 'count', 'data', 'change by', '4');
    assert.equal(dictionaries.get('data').count, 5);

    dictManageKeyImpl(dictionaries, 'count', 'data', 'change by', 'NaN');
    assert.equal(dictionaries.get('data').count, 5);

    dictManageKeyImpl(dictionaries, 'created', 'data', 'change by', '3');
    assert.equal(dictionaries.get('data').created, 3);

    dictManageKeyImpl(dictionaries, 'obj', 'data', 'change by', '7');
    assert.deepEqual(dictionaries.get('data').obj, { n: 1 });
  });

  it('pushes values into array targets, converting primitives when needed', () => {
    const dictionaries = new Map([['data', { tag: 'first', list: [1], objectValue: { a: 1 } }]]);

    dictManageKeyImpl(dictionaries, 'tag', 'data', 'push', '{"id":2}');
    assert.deepEqual(dictionaries.get('data').tag, ['first', { id: 2 }]);

    dictManageKeyImpl(dictionaries, 'list', 'data', 'push', '2');
    assert.deepEqual(dictionaries.get('data').list, [1, '2']);

    dictManageKeyImpl(dictionaries, 'objectValue', 'data', 'push', 'x');
    assert.deepEqual(dictionaries.get('data').objectValue, { a: 1 });
  });

  it('deletes object keys and valid array indices', () => {
    const dictionaries = new Map([['data', { items: [10, 20, 30], name: 'Ada' }]]);

    dictManageKeyImpl(dictionaries, 'name', 'data', 'delete', '');
    assert.deepEqual(dictionaries.get('data'), { items: [10, 20, 30] });

    dictManageKeyImpl(dictionaries, 'items.1', 'data', 'delete', '');
    assert.deepEqual(dictionaries.get('data').items, [10, 30]);

    dictManageKeyImpl(dictionaries, 'items.99', 'data', 'delete', '');
    dictManageKeyImpl(dictionaries, 'items.bad', 'data', 'delete', '');
    assert.deepEqual(dictionaries.get('data').items, [10, 30]);
  });

  it('ignores dangerous keys to prevent prototype pollution', () => {
    const dictionaries = new Map([['safe', {}]]);

    dictManageKeyImpl(dictionaries, '__proto__.polluted', 'safe', 'set to', 'yes');
    dictManageKeyImpl(dictionaries, 'nested.__proto__', 'safe', 'set to', 'yes');

    assert.deepEqual(dictionaries.get('safe'), { nested: {} });
    assert.equal({}.polluted, undefined);
  });
});

describe('dictManageImpl', () => {
  it('deletes and clears dictionaries', () => {
    const dictionaries = new Map([
      ['obj', { a: 1 }],
      ['arr', [1, 2]],
    ]);

    dictManageImpl(dictionaries, 'obj', 'clear', '');
    dictManageImpl(dictionaries, 'arr', 'clear', '');
    assert.deepEqual(dictionaries.get('obj'), {});
    assert.deepEqual(dictionaries.get('arr'), []);

    dictManageImpl(dictionaries, 'arr', 'delete', '');
    assert.equal(dictionaries.has('arr'), false);
  });

  it('loads JSON, sanitizes dangerous keys, and guards invalid structures', () => {
    const dictionaries = new Map();

    dictManageImpl(
      dictionaries,
      'data',
      'load JSON',
      '{"a":1,"nested":{"constructor":2},"arr":[{"prototype":3}]}'
    );
    assert.deepEqual(dictionaries.get('data'), {
      a: 1,
      nested: {},
      arr: [{}],
    });

    dictManageImpl(dictionaries, 'invalid', 'load JSON', '{bad-json}');
    assert.deepEqual(dictionaries.get('invalid'), { error: 'Invalid JSON' });

    dictManageImpl(dictionaries, 'primitive', 'load JSON', '42');
    assert.deepEqual(dictionaries.get('primitive'), { error: 'Invalid JSON Structure' });
  });
});

describe('dictCloneImpl', () => {
  it('clones existing dictionaries without sharing references', () => {
    const dictionaries = new Map([['src', { nested: { arr: [1, 2] } }]]);

    dictCloneImpl(dictionaries, 'src', 'dest');
    dictionaries.get('dest').nested.arr.push(3);

    assert.deepEqual(dictionaries.get('src'), { nested: { arr: [1, 2] } });
    assert.deepEqual(dictionaries.get('dest'), { nested: { arr: [1, 2, 3] } });
  });

  it('does nothing if source dictionary is missing', () => {
    const dictionaries = new Map();
    dictCloneImpl(dictionaries, 'missing', 'dest');
    assert.equal(dictionaries.has('dest'), false);
  });

  it('warns and skips destination updates if cloning fails', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');
    if (descriptor && descriptor.writable !== true) {
      return;
    }

    const circular = {};
    circular.self = circular;
    const dictionaries = new Map([['src', circular]]);

    const originalStructuredClone = globalThis.structuredClone;
    const originalWarn = console.warn;
    const warnings = [];

    globalThis.structuredClone = () => {
      throw new Error('clone failed');
    };
    console.warn = (...args) => {
      warnings.push(args.join(' '));
    };

    try {
      dictCloneImpl(dictionaries, 'src', 'dest');
      assert.equal(dictionaries.has('dest'), false);
      assert.equal(
        warnings.some(msg => msg.includes('Clone failed')),
        true
      );
    } finally {
      globalThis.structuredClone = originalStructuredClone;
      console.warn = originalWarn;
    }
  });
});

describe('dictMergeImpl', () => {
  it('deep-merges plain-object source and destination dictionaries', () => {
    const dictionaries = new Map([
      ['src', { nested: { b: 2 }, add: true }],
      ['dest', { nested: { a: 1 }, keep: true }],
    ]);

    dictMergeImpl(dictionaries, 'src', 'dest');
    assert.deepEqual(dictionaries.get('dest'), {
      nested: { a: 1, b: 2 },
      keep: true,
      add: true,
    });
  });

  it('clones source into destination when destination is missing', () => {
    const dictionaries = new Map([['src', { a: 1 }]]);

    dictMergeImpl(dictionaries, 'src', 'dest');
    assert.deepEqual(dictionaries.get('dest'), { a: 1 });
    assert.notEqual(dictionaries.get('dest'), dictionaries.get('src'));
  });

  it('overwrites destination when either side is not a plain object', () => {
    const dictionaries = new Map([
      ['src', [1, 2, 3]],
      ['dest', { a: 1 }],
    ]);

    dictMergeImpl(dictionaries, 'src', 'dest');
    assert.deepEqual(dictionaries.get('dest'), [1, 2, 3]);
  });

  it('does nothing when source dictionary is missing', () => {
    const dictionaries = new Map([['dest', { a: 1 }]]);

    dictMergeImpl(dictionaries, 'missing', 'dest');
    assert.deepEqual(dictionaries.get('dest'), { a: 1 });
  });

  it('warns and keeps destination unchanged if merge clone path fails', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'structuredClone');
    if (descriptor && descriptor.writable !== true) {
      return;
    }

    const circular = {};
    circular.self = circular;
    const dictionaries = new Map([
      ['src', circular],
      ['dest', [1, 2, 3]],
    ]);

    const originalStructuredClone = globalThis.structuredClone;
    const originalWarn = console.warn;
    const warnings = [];

    globalThis.structuredClone = () => {
      throw new Error('merge clone failed');
    };
    console.warn = (...args) => {
      warnings.push(args.join(' '));
    };

    try {
      dictMergeImpl(dictionaries, 'src', 'dest');
      assert.deepEqual(dictionaries.get('dest'), [1, 2, 3]);
      assert.equal(
        warnings.some(msg => msg.includes('Merge (overwrite) failed')),
        true
      );
    } finally {
      globalThis.structuredClone = originalStructuredClone;
      console.warn = originalWarn;
    }
  });
});
