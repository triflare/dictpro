import {
  cloneValue,
  deepMerge,
  isPlainObject,
  resolvePath,
  sanitize,
  tryParse,
} from './02-dictionary-utils.js';

export function dictCheckPropImpl(dictionaries, KEY, DICT, CHECK) {
  if (!dictionaries.has(DICT)) return false;
  const root = dictionaries.get(DICT);

  if (KEY === '') {
    if (CHECK === 'is defined') return true;
    if (CHECK === 'is null') return root === null;

    if (CHECK === 'is array') return Array.isArray(root);
    if (CHECK === 'is dictionary (object)') return isPlainObject(root);
    return false;
  }

  const loc = resolvePath(root, KEY);

  if (!loc || loc.target === null) return false;
  const val = loc.target[loc.key];

  if (CHECK === 'is defined')
    return Object.prototype.hasOwnProperty.call(loc.target, loc.key);
  if (CHECK === 'is null') return val === null;
  if (CHECK === 'is array') return Array.isArray(val);
  if (CHECK === 'is dictionary (object)') return isPlainObject(val);
  return false;
}

export function dictManageKeyImpl(dictionaries, KEY, DICT, ACTION, VAL) {
  if (!dictionaries.has(DICT)) {
    if (ACTION === 'delete') return;
    dictionaries.set(DICT, KEY === '' && ACTION === 'push' ? [] : {});
  }
  const root = dictionaries.get(DICT);

  if (KEY === '') {
    if (ACTION === 'set to') {
      const newVal = tryParse(VAL);

      if (typeof newVal === 'object' && newVal !== null) {
        dictionaries.set(DICT, newVal);
      }
    } else if (ACTION === 'delete') {
      dictionaries.delete(DICT);
    } else if (ACTION === 'push') {
      if (Array.isArray(root)) {
        root.push(tryParse(VAL));
      }
    }
    return;
  }

  const autoCreate = ACTION !== 'delete';
  const loc = resolvePath(root, KEY, autoCreate);

  if (!loc) return;

  if (ACTION === 'set to') {
    loc.target[loc.key] = tryParse(VAL);
  } else if (ACTION === 'change by') {
    const currentVal = loc.target[loc.key];

    if (typeof currentVal === 'object' && currentVal !== null) return;

    const startVal = Number(currentVal);
    const delta = Number(VAL);

    const safeStart = isNaN(startVal) ? 0 : startVal;
    const safeDelta = isNaN(delta) ? 0 : delta;

    loc.target[loc.key] = safeStart + safeDelta;
  } else if (ACTION === 'push') {
    let targetVal = loc.target[loc.key];

    if (targetVal !== undefined && !Array.isArray(targetVal)) {
      if (typeof targetVal === 'object' && targetVal !== null) return;
      targetVal = [targetVal];
      loc.target[loc.key] = targetVal;
    }

    if (targetVal === undefined) {
      loc.target[loc.key] = [];
      targetVal = loc.target[loc.key];
    }
    targetVal.push(tryParse(VAL));
  } else if (ACTION === 'delete') {
    if (Array.isArray(loc.target)) {
      const index = Math.trunc(Number(loc.key));
      if (!isNaN(index) && index >= 0 && index < loc.target.length) {
        loc.target.splice(index, 1);
      }
    } else {
      delete loc.target[loc.key];
    }
  }
}

export function dictManageImpl(dictionaries, DICT, ACTION, DATA) {
  if (ACTION === 'delete') {
    if (dictionaries.has(DICT)) dictionaries.delete(DICT);
  } else if (ACTION === 'clear') {
    if (dictionaries.has(DICT)) {
      const current = dictionaries.get(DICT);
      dictionaries.set(DICT, Array.isArray(current) ? [] : {});
    }
  } else if (ACTION === 'load JSON') {
    let parsed;
    try {
      parsed = sanitize(JSON.parse(DATA));
    } catch (_e) {
      parsed = {
        error: 'Invalid JSON',
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      parsed = {
        error: 'Invalid JSON Structure',
      };
    }

    dictionaries.set(DICT, parsed);
  }
}

export function dictCloneImpl(dictionaries, SRC, DEST) {
  if (!dictionaries.has(SRC)) return;
  const src = dictionaries.get(SRC);

  try {
    dictionaries.set(DEST, cloneValue(src));
  } catch (e) {
    console.warn('Dictionaries Pro: Clone failed', e);
  }
}

export function dictMergeImpl(dictionaries, SRC, DEST) {
  if (!dictionaries.has(SRC)) return;
  const srcData = dictionaries.get(SRC);

  if (!dictionaries.has(DEST)) {
    try {
      dictionaries.set(DEST, cloneValue(srcData));
    } catch (e) {
      console.warn('Dictionaries Pro: Merge (clone) failed', e);
    }
    return;
  }

  const destData = dictionaries.get(DEST);

  if (isPlainObject(srcData) && isPlainObject(destData)) {
    deepMerge(destData, srcData);
  } else {
    try {
      dictionaries.set(DEST, cloneValue(srcData));
    } catch (e) {
      console.warn('Dictionaries Pro: Merge (overwrite) failed', e);
    }
  }
}
