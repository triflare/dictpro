import {
  deepContains,
  deepFindPath,
  flattenObject,
  formatOutput,
  resolvePath,
  tryParse,
} from './02-dictionary-utils.js';

export function dictListImpl(dictionaries) {
  return JSON.stringify(Array.from(dictionaries.keys()));
}

export function dictStringifyImpl(dictionaries, DICT) {
  if (!dictionaries.has(DICT)) return '{}';
  return JSON.stringify(dictionaries.get(DICT));
}

export function dictGetImpl(dictionaries, KEY, DICT) {
  if (!dictionaries.has(DICT)) return 'undefined';
  const root = dictionaries.get(DICT);

  if (KEY === '') return formatOutput(root);

  const loc = resolvePath(root, KEY);
  if (!loc || loc.target === null || loc.target[loc.key] === undefined) {
    return 'undefined';
  }

  return formatOutput(loc.target[loc.key]);
}

export function dictKeysImpl(dictionaries, KEY, DICT) {
  if (!dictionaries.has(DICT)) return '[]';
  const root = dictionaries.get(DICT);

  if (!KEY) {
    if (typeof root === 'object' && root !== null) {
      return JSON.stringify(Object.keys(root));
    }
    return '[]';
  }

  const loc = resolvePath(root, KEY);
  if (!loc || loc.target === null || loc.target[loc.key] === undefined) {
    return '[]';
  }

  const val = loc.target[loc.key];
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(Object.keys(val));
  }
  return '[]';
}

export function dictLengthImpl(dictionaries, KEY, DICT) {
  if (!dictionaries.has(DICT)) return 0;
  const root = dictionaries.get(DICT);

  if (!KEY) {
    if (Array.isArray(root)) return root.length;
    if (typeof root === 'object' && root !== null) return Object.keys(root).length;
    return 0;
  }

  const loc = resolvePath(root, KEY);
  if (!loc || loc.target === null || loc.target[loc.key] === undefined) return 0;

  const val = loc.target[loc.key];
  if (Array.isArray(val)) return val.length;
  if (typeof val === 'string') return val.length;
  if (typeof val === 'object' && val !== null) return Object.keys(val).length;
  return 0;
}

export function dictTypeImpl(dictionaries, KEY, DICT) {
  if (!dictionaries.has(DICT)) return 'undefined';
  const root = dictionaries.get(DICT);

  if (KEY === '') {
    if (root === null) return 'null';

    if (Array.isArray(root)) return 'array';
    return typeof root;
  }

  const loc = resolvePath(root, KEY);

  if (!loc || loc.target === null || loc.target[loc.key] === undefined) {
    return 'undefined';
  }

  const val = loc.target[loc.key];
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

export function dictContainsValueImpl(dictionaries, VAL, DICT) {
  if (!dictionaries.has(DICT)) return false;
  const root = dictionaries.get(DICT);
  return deepContains(root, VAL);
}

export function dictFindPathImpl(dictionaries, VAL, DICT) {
  if (!dictionaries.has(DICT)) return '';
  const root = dictionaries.get(DICT);
  return deepFindPath(root, VAL);
}

export function dictFlattenImpl(dictionaries, DICT) {
  if (!dictionaries.has(DICT)) return '{}';
  const root = dictionaries.get(DICT);
  if (typeof root !== 'object' || root === null) return '{}';
  const flat = flattenObject(root);
  return JSON.stringify(flat);
}

export function dictFilterArrayImpl(dictionaries, KEY, DICT, SUBKEY, OP, VAL) {
  if (!dictionaries.has(DICT)) return '[]';
  const root = dictionaries.get(DICT);

  let arr = root;
  if (KEY !== '') {
    const loc = resolvePath(root, KEY);
    if (!loc || !Array.isArray(loc.target[loc.key])) return '[]';
    arr = loc.target[loc.key];
  }

  if (!Array.isArray(arr)) return '[]';

  const res = arr.filter(item => {
    if (typeof item !== 'object' || item === null) return false;

    const loc = resolvePath(item, SUBKEY);
    if (!loc || loc.target[loc.key] === undefined) return false;

    const prop = loc.target[loc.key];
    const compareVal = tryParse(VAL);

    if (OP === '=') return String(prop) === String(compareVal);
    if (OP === '!=') return String(prop) !== String(compareVal);
    if (OP === '>') return Number(prop) > Number(compareVal);
    if (OP === '<') return Number(prop) < Number(compareVal);
    if (OP === 'contains') return String(prop).includes(String(compareVal));
    return false;
  });

  return JSON.stringify(res);
}

export function dictAggregateImpl(dictionaries, OP, KEY, DICT) {
  if (!dictionaries.has(DICT)) return 0;
  const root = dictionaries.get(DICT);

  let arr = root;
  if (KEY !== '') {
    const loc = resolvePath(root, KEY);
    if (!loc) return 0;
    arr = loc.target[loc.key];
  }

  if (!Array.isArray(arr)) return 0;

  const nums = arr.map(Number).filter(n => !isNaN(n));
  if (nums.length === 0) return 0;

  if (OP === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (OP === 'average') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (OP === 'min') return nums.reduce((a, b) => Math.min(a, b), nums[0]);
  if (OP === 'max') return nums.reduce((a, b) => Math.max(a, b), nums[0]);
  return 0;
}

export function dictExportBase64Impl(dictionaries, DICT) {
  if (!dictionaries.has(DICT)) return '';
  const str = JSON.stringify(dictionaries.get(DICT));
  try {
    return btoa(str);
  } catch (_e) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }
}
