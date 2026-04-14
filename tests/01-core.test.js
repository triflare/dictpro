import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { installScratchMock } from './helpers/mock-scratch.js';

const { mock, restore } = installScratchMock();
const runtimeEvents = new Map();

mock.vm = {
  runtime: {
    on(eventName, handler) {
      runtimeEvents.set(eventName, handler);
    },
  },
};

mock.translate = text => `translated:${text}`;
mock.extensions.register = instance => {
  globalThis.__dictplusExtension = instance;
};
globalThis.mint.assets.get = path => `asset:${path}`;

await import('../src/01-core.js');

const extension = globalThis.__dictplusExtension;

const clearRuntimeState = () => {
  const onDisposed = runtimeEvents.get('RUNTIME_DISPOSED');
  if (onDisposed) onDisposed();
};

after(() => {
  clearRuntimeState();
  delete globalThis.__dictplusExtension;
  restore();
});

beforeEach(() => {
  clearRuntimeState();
});

describe('core extension registration', () => {
  it('registers an extension instance and runtime disposal handler', () => {
    assert.ok(extension);
    assert.equal(typeof runtimeEvents.get('RUNTIME_DISPOSED'), 'function');
  });
});

describe('getInfo metadata', () => {
  it('returns expected metadata, menus, and opcodes', () => {
    const info = extension.getInfo();

    assert.equal(info.id, 'triflareDictionariesPro');
    assert.equal(info.name, 'translated:Dictionaries Pro');
    assert.equal(info.menuIconURI, 'asset:icons/menu.svg');
    assert.equal(info.color1, '#9639cd');
    assert.equal(info.color2, '#8432b5');

    assert.deepEqual(info.menus.check_menu.items, [
      'is defined',
      'is null',
      'is array',
      'is dictionary (object)',
    ]);

    const opcodes = info.blocks.filter(block => block !== '---').map(block => block.opcode);
    const expectedOpcodes = [
      'dictList',
      'dictStringify',
      'dictGet',
      'dictKeys',
      'dictLength',
      'dictType',
      'dictContainsValue',
      'dictFindPath',
      'dictFilterArray',
      'dictAggregate',
      'dictFlatten',
      'dictCheckProp',
      'dictManageKey',
      'dictManage',
      'dictClone',
      'dictMerge',
      'dictExportBase64',
      'arrayInit',
      'arrayPush',
      'arrayGetItem',
      'arraySetItem',
      'arrayInsertItem',
      'arrayRemoveItem',
      'arrayJoin',
    ];

    for (const opcode of expectedOpcodes) {
      assert.ok(opcodes.includes(opcode), `missing opcode: ${opcode}`);
    }
  });
});

describe('method wrappers', () => {
  it('runs dictionary query and mutation flows through wrapper methods', () => {
    extension.dictManage({
      DICT: 'profile',
      ACTION: 'load JSON',
      DATA: '{"count":2,"users":[{"id":1},{"id":2}],"scores":[1,2,3]}',
    });

    assert.equal(extension.dictGet({ KEY: 'count', DICT: 'profile' }), 2);
    assert.equal(extension.dictType({ KEY: 'users', DICT: 'profile' }), 'array');

    extension.dictManageKey({ KEY: 'count', DICT: 'profile', ACTION: 'change by', VAL: '3' });
    assert.equal(extension.dictGet({ KEY: 'count', DICT: 'profile' }), 5);

    extension.arrayPush({ VAL: '{"id":3}', KEY: 'users', DICT: 'profile' });
    assert.equal(extension.dictLength({ KEY: 'users', DICT: 'profile' }), 3);

    assert.equal(extension.dictContainsValue({ VAL: '5', DICT: 'profile' }), true);
    assert.equal(extension.dictFindPath({ VAL: '5', DICT: 'profile' }), 'count');
    assert.equal(extension.dictAggregate({ OP: 'sum', KEY: 'scores', DICT: 'profile' }), 6);
    assert.deepEqual(JSON.parse(extension.dictFlatten({ DICT: 'profile' })), {
      count: 5,
      'users.0.id': 1,
      'users.1.id': 2,
      'users.2.id': 3,
      'scores.0': 1,
      'scores.1': 2,
      'scores.2': 3,
    });
    assert.equal(typeof extension.dictExportBase64({ DICT: 'profile' }), 'string');
  });

  it('runs array wrapper operations for root arrays', () => {
    extension.arrayInit({ DICT: 'arr' });

    extension.arrayPush({ VAL: '1', KEY: '', DICT: 'arr' });
    extension.arrayPush({ VAL: '2', KEY: '', DICT: 'arr' });
    extension.arraySetItem({ INDEX: 0, KEY: '', DICT: 'arr', VAL: '{"ok":true}' });

    assert.equal(extension.arrayGetItem({ INDEX: 0, KEY: '', DICT: 'arr' }), '{"ok":true}');
    assert.equal(extension.arrayGetItem({ INDEX: 1, KEY: '', DICT: 'arr' }), '2');

    extension.arrayInsertItem({ VAL: 'first', INDEX: 0, KEY: '', DICT: 'arr' });
    extension.arrayRemoveItem({ INDEX: 1, KEY: '', DICT: 'arr' });

    assert.equal(extension.arrayJoin({ KEY: '', DICT: 'arr', SEP: '|' }), 'first|2');
  });

  it('clears dictionary state when runtime is disposed', () => {
    extension.dictManage({ DICT: 'temp', ACTION: 'load JSON', DATA: '{"alive":true}' });
    assert.equal(extension.dictList(), '["temp"]');

    clearRuntimeState();

    assert.equal(extension.dictList(), '[]');
    assert.equal(extension.dictGet({ KEY: 'alive', DICT: 'temp' }), 'undefined');
  });
});
