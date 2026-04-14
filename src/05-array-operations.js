import {
  formatOutput,
  getArrayForKey,
  resolvePath,
  tryParse,
} from './02-dictionary-utils.js';

export function arrayInitImpl(dictionaries, DICT) {
  dictionaries.set(DICT, []);
}

export function arrayPushImpl(dictionaries, VAL, KEY, DICT) {
  if (!dictionaries.has(DICT)) {
    const firstSeg = KEY.split('.')[0];
    dictionaries.set(DICT, KEY === '' || /^\d/.test(firstSeg) ? [] : {});
  }
  const root = dictionaries.get(DICT);

  if (KEY === '') {
    if (Array.isArray(root)) {
      root.push(tryParse(VAL));
    }
    return;
  }

  const loc = resolvePath(root, KEY, true);
  if (!loc) return;

  let arr = loc.target[loc.key];
  if (arr === undefined) {
    loc.target[loc.key] = [];
    arr = loc.target[loc.key];
  }
  if (Array.isArray(arr)) {
    arr.push(tryParse(VAL));
  }
}

export function arrayGetItemImpl(dictionaries, INDEX, KEY, DICT) {
  const arr = getArrayForKey(dictionaries, DICT, KEY);
  if (arr === null) return 'undefined';

  const idx = Math.trunc(Number(INDEX));
  if (isNaN(idx) || idx < 0 || idx >= arr.length) return 'undefined';
  return formatOutput(arr[idx]);
}

export function arraySetItemImpl(dictionaries, INDEX, KEY, DICT, VAL) {
  const arr = getArrayForKey(dictionaries, DICT, KEY);
  if (arr === null) return;

  const idx = Math.trunc(Number(INDEX));
  if (isNaN(idx) || idx < 0 || idx >= arr.length) return;
  arr[idx] = tryParse(VAL);
}

export function arrayInsertItemImpl(dictionaries, VAL, INDEX, KEY, DICT) {
  const arr = getArrayForKey(dictionaries, DICT, KEY);
  if (arr === null) return;

  const idx = Math.trunc(Number(INDEX));
  if (isNaN(idx) || idx < 0) return;
  arr.splice(Math.min(idx, arr.length), 0, tryParse(VAL));
}

export function arrayRemoveItemImpl(dictionaries, INDEX, KEY, DICT) {
  const arr = getArrayForKey(dictionaries, DICT, KEY);
  if (arr === null) return;

  const idx = Math.trunc(Number(INDEX));
  if (isNaN(idx) || idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
}

export function arrayJoinImpl(dictionaries, KEY, DICT, SEP) {
  const arr = getArrayForKey(dictionaries, DICT, KEY);
  if (arr === null) return '';
  return arr
    .map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
    .join(SEP);
}
