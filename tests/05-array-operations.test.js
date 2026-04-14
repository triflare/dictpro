import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayGetItemImpl,
  arrayInitImpl,
  arrayInsertItemImpl,
  arrayJoinImpl,
  arrayPushImpl,
  arrayRemoveItemImpl,
  arraySetItemImpl,
} from '../src/05-array-operations.js';

describe('arrayInitImpl', () => {
  it('initializes a dictionary as an empty array', () => {
    const dictionaries = new Map([['items', { old: true }]]);

    arrayInitImpl(dictionaries, 'items');
    assert.deepEqual(dictionaries.get('items'), []);
  });
});

describe('arrayPushImpl', () => {
  it('creates root array when dictionary is missing and KEY is empty', () => {
    const dictionaries = new Map();

    arrayPushImpl(dictionaries, '1', '', 'numbers');
    assert.deepEqual(dictionaries.get('numbers'), ['1']);
  });

  it('creates object or array roots based on key path and pushes into nested arrays', () => {
    const dictionaries = new Map();

    arrayPushImpl(dictionaries, 'x', 'users.list', 'dataObjectRoot');
    assert.deepEqual(dictionaries.get('dataObjectRoot'), {
      users: {
        list: ['x'],
      },
    });

    arrayPushImpl(dictionaries, 'y', '0.items', 'dataArrayRoot');
    assert.deepEqual(dictionaries.get('dataArrayRoot'), [{ items: ['y'] }]);
  });

  it('does not push when target exists but is not an array', () => {
    const dictionaries = new Map([['data', { value: 10 }]]);

    arrayPushImpl(dictionaries, 'x', 'value', 'data');
    assert.deepEqual(dictionaries.get('data'), { value: 10 });
  });
});

describe('arrayGetItemImpl', () => {
  it('returns formatted items and guards invalid lookups', () => {
    const dictionaries = new Map([
      ['arr', [1, { a: 1 }, 'x']],
      ['nested', { items: ['a', 'b'] }],
    ]);

    assert.equal(arrayGetItemImpl(dictionaries, 0, '', 'arr'), 1);
    assert.equal(arrayGetItemImpl(dictionaries, 1, '', 'arr'), '{"a":1}');
    assert.equal(arrayGetItemImpl(dictionaries, 1, 'items', 'nested'), 'b');
    assert.equal(arrayGetItemImpl(dictionaries, 99, '', 'arr'), 'undefined');
    assert.equal(arrayGetItemImpl(dictionaries, -1, '', 'arr'), 'undefined');
    assert.equal(arrayGetItemImpl(dictionaries, 'bad', '', 'arr'), 'undefined');
    assert.equal(arrayGetItemImpl(dictionaries, 0, 'missing', 'nested'), 'undefined');
    assert.equal(arrayGetItemImpl(dictionaries, 0, '', 'missing'), 'undefined');
  });
});

describe('arraySetItemImpl', () => {
  it('replaces in-range items and ignores invalid indices', () => {
    const dictionaries = new Map([
      ['arr', [1, 2]],
      ['nested', { items: ['a'] }],
    ]);

    arraySetItemImpl(dictionaries, 1, '', 'arr', '{"ok":true}');
    assert.deepEqual(dictionaries.get('arr'), [1, { ok: true }]);

    arraySetItemImpl(dictionaries, 0, 'items', 'nested', 'b');
    assert.deepEqual(dictionaries.get('nested').items, ['b']);

    arraySetItemImpl(dictionaries, 99, '', 'arr', 'x');
    arraySetItemImpl(dictionaries, -1, '', 'arr', 'x');
    assert.deepEqual(dictionaries.get('arr'), [1, { ok: true }]);
  });
});

describe('arrayInsertItemImpl', () => {
  it('inserts at index, appends when index exceeds length, and ignores negative', () => {
    const dictionaries = new Map([
      ['arr', ['a', 'c']],
      ['nested', { items: [1, 3] }],
    ]);

    arrayInsertItemImpl(dictionaries, 'b', 1, '', 'arr');
    assert.deepEqual(dictionaries.get('arr'), ['a', 'b', 'c']);

    arrayInsertItemImpl(dictionaries, 'end', 99, '', 'arr');
    assert.deepEqual(dictionaries.get('arr'), ['a', 'b', 'c', 'end']);

    arrayInsertItemImpl(dictionaries, 2, 1, 'items', 'nested');
    assert.deepEqual(dictionaries.get('nested').items, [1, 2, 3]);

    arrayInsertItemImpl(dictionaries, 'nope', -1, '', 'arr');
    assert.deepEqual(dictionaries.get('arr'), ['a', 'b', 'c', 'end']);
  });
});

describe('arrayRemoveItemImpl', () => {
  it('removes valid indices and ignores invalid ones', () => {
    const dictionaries = new Map([
      ['arr', ['a', 'b', 'c']],
      ['nested', { items: [1, 2, 3] }],
    ]);

    arrayRemoveItemImpl(dictionaries, 1, '', 'arr');
    assert.deepEqual(dictionaries.get('arr'), ['a', 'c']);

    arrayRemoveItemImpl(dictionaries, 0, 'items', 'nested');
    assert.deepEqual(dictionaries.get('nested').items, [2, 3]);

    arrayRemoveItemImpl(dictionaries, 99, '', 'arr');
    arrayRemoveItemImpl(dictionaries, -1, '', 'arr');
    arrayRemoveItemImpl(dictionaries, 'bad', '', 'arr');
    assert.deepEqual(dictionaries.get('arr'), ['a', 'c']);
  });
});

describe('arrayJoinImpl', () => {
  it('joins arrays and serializes object values', () => {
    const dictionaries = new Map([
      ['arr', ['a', { b: 1 }, 2]],
      ['nested', { items: [1, 2, 3] }],
    ]);

    assert.equal(arrayJoinImpl(dictionaries, '', 'arr', '|'), 'a|{"b":1}|2');
    assert.equal(arrayJoinImpl(dictionaries, 'items', 'nested', ', '), '1, 2, 3');
    assert.equal(arrayJoinImpl(dictionaries, 'missing', 'nested', ','), '');
    assert.equal(arrayJoinImpl(dictionaries, '', 'missing', ','), '');
  });
});
