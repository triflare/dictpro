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
} from './03-dictionary-queries.js';
import {
  dictCheckPropImpl,
  dictCloneImpl,
  dictManageImpl,
  dictManageKeyImpl,
  dictMergeImpl,
} from './04-dictionary-mutations.js';
import {
  arrayGetItemImpl,
  arrayInitImpl,
  arrayInsertItemImpl,
  arrayJoinImpl,
  arrayPushImpl,
  arrayRemoveItemImpl,
  arraySetItemImpl,
} from './05-array-operations.js';

const dictionaries = new Map();

// Fix: Guard against missing VM in sandboxed environment
if (Scratch.vm && Scratch.vm.runtime) {
  Scratch.vm.runtime.on('RUNTIME_DISPOSED', () => {
    dictionaries.clear();
  });
}

class tfDictionariesPro {
  getInfo() {
    return {
      id: 'triflareDictionariesPro',
      name: Scratch.translate('Dictionaries Pro'),
      menuIconURI: mint.assets.get('icons/menu.svg'),
      color1: '#9639cd',
      color2: '#8432b5',
      blocks: [
        {
          opcode: 'dictList',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('list of dictionaries'),
        },
        {
          opcode: 'dictStringify',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('stringify dictionary [DICT] into JSON'),
          arguments: {
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictGet',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('key [KEY] from dictionary [DICT]'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'bar',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictKeys',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('keys of path [KEY] in dictionary [DICT]'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'items',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictLength',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('length of [KEY] in [DICT]'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'items',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictType',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('type of [KEY] in [DICT]'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'bar',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },

        '---',
        // Advanced Queries
        {
          opcode: 'dictContainsValue',
          blockType: Scratch.BlockType.BOOLEAN,
          text: Scratch.translate('is value [VAL] mentioned anywhere in [DICT]?'),
          arguments: {
            VAL: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'search_term',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictFindPath',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('path to first [VAL] in [DICT]'),
          arguments: {
            VAL: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'search_term',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictFilterArray',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate(
            'filter array [KEY] in [DICT] where [SUBKEY] [OP] [VAL]'
          ),
          arguments: {
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'users' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'foo' },
            SUBKEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'id' },
            OP: { type: Scratch.ArgumentType.STRING, menu: 'filter_ops' },
            VAL: { type: Scratch.ArgumentType.STRING, defaultValue: '1' },
          },
        },
        {
          opcode: 'dictAggregate',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('get [OP] of [KEY] in [DICT]'),
          arguments: {
            OP: { type: Scratch.ArgumentType.STRING, menu: 'agg_ops' },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'scores' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'foo' },
          },
        },
        {
          opcode: 'dictFlatten',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('flatten dictionary [DICT] to JSON'),
          arguments: {
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'foo' },
          },
        },

        '---',

        {
          opcode: 'dictCheckProp',
          blockType: Scratch.BlockType.BOOLEAN,
          text: Scratch.translate('key [KEY] in [DICT] [CHECK]?'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'bar',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
            CHECK: {
              type: Scratch.ArgumentType.STRING,
              menu: 'check_menu',
            },
          },
        },

        '---',

        {
          opcode: 'dictManageKey',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('key [KEY] in [DICT]: [ACTION] [VAL]'),
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'bar',
            },
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
            ACTION: {
              type: Scratch.ArgumentType.STRING,
              menu: 'key_action_menu',
            },
            VAL: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'baz',
            },
          },
        },
        {
          opcode: 'dictManage',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('dictionary [DICT]: [ACTION] [DATA]'),
          arguments: {
            DICT: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
            ACTION: {
              type: Scratch.ArgumentType.STRING,
              menu: 'dict_action_menu',
            },
            DATA: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: '{"bar": "baz"}',
            },
          },
        },
        {
          opcode: 'dictClone',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('clone dictionary [SRC] as [DEST]'),
          arguments: {
            SRC: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'original',
            },
            DEST: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'copy',
            },
          },
        },
        {
          opcode: 'dictMerge',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('merge dictionary [SRC] into [DEST]'),
          arguments: {
            SRC: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'data',
            },
            DEST: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'foo',
            },
          },
        },
        {
          opcode: 'dictExportBase64',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('export dictionary [DICT] as Base64'),
          arguments: {
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'foo' },
          },
        },

        '---',
        // Array Operations
        {
          opcode: 'arrayInit',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('initialize [DICT] as empty array'),
          arguments: {
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
          },
        },
        {
          opcode: 'arrayPush',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('push [VAL] to array [KEY] in [DICT]'),
          arguments: {
            VAL: { type: Scratch.ArgumentType.STRING, defaultValue: 'item' },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
          },
        },
        {
          opcode: 'arrayGetItem',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('item [INDEX] of array [KEY] in [DICT]'),
          arguments: {
            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
          },
        },
        {
          opcode: 'arraySetItem',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate(
            'replace item [INDEX] of array [KEY] in [DICT] with [VAL]'
          ),
          arguments: {
            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
            VAL: { type: Scratch.ArgumentType.STRING, defaultValue: 'item' },
          },
        },
        {
          opcode: 'arrayInsertItem',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('insert [VAL] at [INDEX] in array [KEY] in [DICT]'),
          arguments: {
            VAL: { type: Scratch.ArgumentType.STRING, defaultValue: 'item' },
            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
          },
        },
        {
          opcode: 'arrayRemoveItem',
          blockType: Scratch.BlockType.COMMAND,
          text: Scratch.translate('delete item [INDEX] from array [KEY] in [DICT]'),
          arguments: {
            INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
          },
        },
        {
          opcode: 'arrayJoin',
          blockType: Scratch.BlockType.REPORTER,
          text: Scratch.translate('items of array [KEY] in [DICT] joined by [SEP]'),
          arguments: {
            KEY: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
            DICT: { type: Scratch.ArgumentType.STRING, defaultValue: 'myArray' },
            SEP: { type: Scratch.ArgumentType.STRING, defaultValue: ', ' },
          },
        },
      ],
      menus: {
        check_menu: {
          acceptReporters: true,
          items: ['is defined', 'is null', 'is array', 'is dictionary (object)'],
        },
        key_action_menu: {
          acceptReporters: true,
          items: ['set to', 'change by', 'push', 'delete'],
        },
        dict_action_menu: {
          acceptReporters: true,
          items: ['load JSON', 'clear', 'delete'],
        },
        filter_ops: {
          acceptReporters: true,
          items: ['=', '!=', '>', '<', 'contains'],
        },
        agg_ops: {
          acceptReporters: true,
          items: ['sum', 'average', 'min', 'max'],
        },
      },
    };
  }

  dictList() {
    return dictListImpl(dictionaries);
  }

  dictStringify({ DICT }) {
    return dictStringifyImpl(dictionaries, DICT);
  }

  dictGet({ KEY, DICT }) {
    return dictGetImpl(dictionaries, KEY, DICT);
  }

  dictKeys({ KEY, DICT }) {
    return dictKeysImpl(dictionaries, KEY, DICT);
  }

  dictLength({ KEY, DICT }) {
    return dictLengthImpl(dictionaries, KEY, DICT);
  }

  dictType({ KEY, DICT }) {
    return dictTypeImpl(dictionaries, KEY, DICT);
  }

  dictContainsValue({ VAL, DICT }) {
    return dictContainsValueImpl(dictionaries, VAL, DICT);
  }

  dictFindPath({ VAL, DICT }) {
    return dictFindPathImpl(dictionaries, VAL, DICT);
  }

  dictFlatten({ DICT }) {
    return dictFlattenImpl(dictionaries, DICT);
  }

  dictFilterArray({ KEY, DICT, SUBKEY, OP, VAL }) {
    return dictFilterArrayImpl(dictionaries, KEY, DICT, SUBKEY, OP, VAL);
  }

  dictAggregate({ OP, KEY, DICT }) {
    return dictAggregateImpl(dictionaries, OP, KEY, DICT);
  }

  dictExportBase64({ DICT }) {
    return dictExportBase64Impl(dictionaries, DICT);
  }

  dictCheckProp({ KEY, DICT, CHECK }) {
    return dictCheckPropImpl(dictionaries, KEY, DICT, CHECK);
  }

  dictManageKey({ KEY, DICT, ACTION, VAL }) {
    dictManageKeyImpl(dictionaries, KEY, DICT, ACTION, VAL);
  }

  dictManage({ DICT, ACTION, DATA }) {
    dictManageImpl(dictionaries, DICT, ACTION, DATA);
  }

  dictClone({ SRC, DEST }) {
    dictCloneImpl(dictionaries, SRC, DEST);
  }

  dictMerge({ SRC, DEST }) {
    dictMergeImpl(dictionaries, SRC, DEST);
  }

  arrayInit({ DICT }) {
    arrayInitImpl(dictionaries, DICT);
  }

  arrayPush({ VAL, KEY, DICT }) {
    arrayPushImpl(dictionaries, VAL, KEY, DICT);
  }

  arrayGetItem({ INDEX, KEY, DICT }) {
    return arrayGetItemImpl(dictionaries, INDEX, KEY, DICT);
  }

  arraySetItem({ INDEX, KEY, DICT, VAL }) {
    arraySetItemImpl(dictionaries, INDEX, KEY, DICT, VAL);
  }

  arrayInsertItem({ VAL, INDEX, KEY, DICT }) {
    arrayInsertItemImpl(dictionaries, VAL, INDEX, KEY, DICT);
  }

  arrayRemoveItem({ INDEX, KEY, DICT }) {
    arrayRemoveItemImpl(dictionaries, INDEX, KEY, DICT);
  }

  arrayJoin({ KEY, DICT, SEP }) {
    return arrayJoinImpl(dictionaries, KEY, DICT, SEP);
  }
}

Scratch.extensions.register(new tfDictionariesPro());
