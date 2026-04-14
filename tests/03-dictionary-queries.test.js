import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dictAggregateImpl,
  dictContainsValueImpl,
  dictExportBase64Impl,
  dictFilterArrayImpl,
  dictFindPathImpl,
  dictFlattenImpl,
  dictGetImpl,
  dictKeysImpl,
  dictLengthImpl,
  dictListImpl,
  dictStringifyImpl,
  dictTypeImpl,
} from '../src/03-dictionary-queries.js';

describe('dictListImpl and dictStringifyImpl', () => {
  it('lists dictionaries and stringifies existing dictionaries', () => {
    const dictionaries = new Map([
      ['alpha', { a: 1 }],
      ['beta', [1, 2]],
    ]);

    assert.equal(dictListImpl(dictionaries), '["alpha","beta"]');
    assert.equal(dictStringifyImpl(dictionaries, 'alpha'), '{"a":1}');
    assert.equal(dictStringifyImpl(dictionaries, 'missing'), '{}');
  });
});

describe('dictGetImpl, dictKeysImpl, dictLengthImpl, dictTypeImpl', () => {
  it('gets values with nested paths and formatOutput semantics', () => {
    const dictionaries = new Map([
      [
        'data',
        {
          user: {
            name: 'Ada',
            tags: ['engineer', 'mentor'],
          },
          count: 2,
          empty: null,
        },
      ],
    ]);

    assert.equal(
      dictGetImpl(dictionaries, '', 'data'),
      '{"user":{"name":"Ada","tags":["engineer","mentor"]},"count":2,"empty":null}'
    );
    assert.equal(dictGetImpl(dictionaries, 'user.name', 'data'), 'Ada');
    assert.equal(dictGetImpl(dictionaries, 'user.tags', 'data'), '["engineer","mentor"]');
    assert.equal(dictGetImpl(dictionaries, 'missing', 'data'), 'undefined');
    assert.equal(dictGetImpl(dictionaries, 'x', 'missing'), 'undefined');
  });

  it('reports keys, lengths, and type information for root and nested values', () => {
    const dictionaries = new Map([
      [
        'data',
        {
          obj: { a: 1, b: 2 },
          list: [10, 20, 30],
          text: 'hello',
          nil: null,
        },
      ],
      ['rootArray', [1, 2]],
      ['primitive', 42],
    ]);

    assert.equal(dictKeysImpl(dictionaries, '', 'data'), '["obj","list","text","nil"]');
    assert.equal(dictKeysImpl(dictionaries, 'obj', 'data'), '["a","b"]');
    assert.equal(dictKeysImpl(dictionaries, 'text', 'data'), '[]');
    assert.equal(dictKeysImpl(dictionaries, '', 'primitive'), '[]');
    assert.equal(dictKeysImpl(dictionaries, 'missing', 'data'), '[]');

    assert.equal(dictLengthImpl(dictionaries, '', 'data'), 4);
    assert.equal(dictLengthImpl(dictionaries, '', 'rootArray'), 2);
    assert.equal(dictLengthImpl(dictionaries, 'list', 'data'), 3);
    assert.equal(dictLengthImpl(dictionaries, 'text', 'data'), 5);
    assert.equal(dictLengthImpl(dictionaries, 'obj', 'data'), 2);
    assert.equal(dictLengthImpl(dictionaries, 'missing', 'data'), 0);
    assert.equal(dictLengthImpl(dictionaries, '', 'missing'), 0);

    assert.equal(dictTypeImpl(dictionaries, '', 'data'), 'object');
    assert.equal(dictTypeImpl(dictionaries, '', 'rootArray'), 'array');
    assert.equal(dictTypeImpl(dictionaries, 'nil', 'data'), 'null');
    assert.equal(dictTypeImpl(dictionaries, 'list', 'data'), 'array');
    assert.equal(dictTypeImpl(dictionaries, 'obj', 'data'), 'object');
    assert.equal(dictTypeImpl(dictionaries, 'missing', 'data'), 'undefined');
    assert.equal(dictTypeImpl(dictionaries, '', 'missing'), 'undefined');
  });
});

describe('dictContainsValueImpl and dictFindPathImpl', () => {
  it('searches deeply for values and reports first matching path', () => {
    const dictionaries = new Map([
      [
        'data',
        {
          profile: { name: 'Ada' },
          stats: { count: 3 },
          list: [{ id: 10 }, { id: 20 }],
        },
      ],
    ]);

    assert.equal(dictContainsValueImpl(dictionaries, 'Ada', 'data'), true);
    assert.equal(dictContainsValueImpl(dictionaries, 3, 'data'), true);
    assert.equal(dictContainsValueImpl(dictionaries, 'missing', 'data'), false);
    assert.equal(dictContainsValueImpl(dictionaries, 'x', 'missing'), false);

    assert.equal(dictFindPathImpl(dictionaries, 'Ada', 'data'), 'profile.name');
    assert.equal(dictFindPathImpl(dictionaries, 20, 'data'), 'list.1.id');
    assert.equal(dictFindPathImpl(dictionaries, 'missing', 'data'), '');
    assert.equal(dictFindPathImpl(dictionaries, 'x', 'missing'), '');
  });
});

describe('dictFlattenImpl', () => {
  it('flattens nested objects and arrays', () => {
    const dictionaries = new Map([
      [
        'data',
        {
          a: { b: 1 },
          c: [2, { d: 3 }],
        },
      ],
      ['primitive', 1],
    ]);

    assert.deepEqual(JSON.parse(dictFlattenImpl(dictionaries, 'data')), {
      'a.b': 1,
      'c.0': 2,
      'c.1.d': 3,
    });
    assert.equal(dictFlattenImpl(dictionaries, 'primitive'), '{}');
    assert.equal(dictFlattenImpl(dictionaries, 'missing'), '{}');
  });
});

describe('dictFilterArrayImpl', () => {
  it('filters by comparison operators including nested subkeys', () => {
    const dictionaries = new Map([
      [
        'data',
        {
          users: [
            { id: 1, name: 'Ada', meta: { score: 8 } },
            { id: '2', name: 'Bob', meta: { score: 10 } },
            { id: 3, name: 'Alice Bob', meta: { score: 3 } },
            4,
            null,
          ],
        },
      ],
      ['rootArray', [{ v: 1 }, { v: 2 }]],
    ]);

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'data.users', 'missing', 'id', '=', '1')),
      []
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'id', '=', '1')),
      [{ id: 1, name: 'Ada', meta: { score: 8 } }]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'id', '!=', '1')),
      [
        { id: '2', name: 'Bob', meta: { score: 10 } },
        { id: 3, name: 'Alice Bob', meta: { score: 3 } },
      ]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'id', '>', '1')),
      [
        { id: '2', name: 'Bob', meta: { score: 10 } },
        { id: 3, name: 'Alice Bob', meta: { score: 3 } },
      ]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'id', '<', '3')),
      [
        { id: 1, name: 'Ada', meta: { score: 8 } },
        { id: '2', name: 'Bob', meta: { score: 10 } },
      ]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'name', 'contains', 'Bob')),
      [
        { id: '2', name: 'Bob', meta: { score: 10 } },
        { id: 3, name: 'Alice Bob', meta: { score: 3 } },
      ]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, 'users', 'data', 'meta.score', '>', '5')),
      [
        { id: 1, name: 'Ada', meta: { score: 8 } },
        { id: '2', name: 'Bob', meta: { score: 10 } },
      ]
    );

    assert.deepEqual(
      JSON.parse(dictFilterArrayImpl(dictionaries, '', 'rootArray', 'v', '=', '2')),
      [{ v: 2 }]
    );
    assert.equal(dictFilterArrayImpl(dictionaries, 'users', 'data', 'id', 'unknown', '2'), '[]');
    assert.equal(dictFilterArrayImpl(dictionaries, 'missing', 'data', 'id', '=', '1'), '[]');
  });
});

describe('dictAggregateImpl', () => {
  it('computes sum, average, min, and max over numeric array content', () => {
    const dictionaries = new Map([
      ['data', { scores: [1, '2', 'x', 4] }],
      ['rootArray', [1, 2, 3]],
    ]);

    assert.equal(dictAggregateImpl(dictionaries, 'sum', 'scores', 'data'), 7);
    assert.equal(dictAggregateImpl(dictionaries, 'average', 'scores', 'data'), 7 / 3);
    assert.equal(dictAggregateImpl(dictionaries, 'min', 'scores', 'data'), 1);
    assert.equal(dictAggregateImpl(dictionaries, 'max', 'scores', 'data'), 4);
    assert.equal(dictAggregateImpl(dictionaries, 'sum', '', 'rootArray'), 6);
    assert.equal(dictAggregateImpl(dictionaries, 'unknown', 'scores', 'data'), 0);
    assert.equal(dictAggregateImpl(dictionaries, 'sum', 'missing', 'data'), 0);
    assert.equal(dictAggregateImpl(dictionaries, 'sum', 'scores', 'missing'), 0);
  });
});

describe('dictExportBase64Impl', () => {
  it('exports JSON content as base64 and handles missing dictionaries', () => {
    const dictionaries = new Map([['data', { a: 1 }]]);
    const expected = Buffer.from('{"a":1}', 'utf8').toString('base64');

    assert.equal(dictExportBase64Impl(dictionaries, 'data'), expected);
    assert.equal(dictExportBase64Impl(dictionaries, 'missing'), '');
  });

  it('falls back when direct btoa conversion throws', () => {
    const dictionaries = new Map([['data', { text: 'ok' }]]);
    const originalBtoa = globalThis.btoa;
    let calls = 0;

    globalThis.btoa = input => {
      calls += 1;
      if (calls === 1) {
        throw new Error('first call failure');
      }
      return `fallback:${input}`;
    };

    try {
      const result = dictExportBase64Impl(dictionaries, 'data');
      assert.equal(calls, 2);
      assert.equal(result.startsWith('fallback:'), true);
    } finally {
      globalThis.btoa = originalBtoa;
    }
  });
});
