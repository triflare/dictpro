export const isDangerousKey = key =>
  key === '__proto__' || key === 'constructor' || key === 'prototype';

export const sanitize = obj => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitize(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (isDangerousKey(key)) {
      delete obj[key];
    } else {
      obj[key] = sanitize(obj[key]);
    }
  }
  return obj;
};

export const isPlainObject = val =>
  !!val && typeof val === 'object' && !Array.isArray(val);

export const tryParse = val => {
  if (typeof val !== 'string') return val;
  const v = val.trim();
  if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
    try {
      return sanitize(JSON.parse(v));
    } catch (_e) {
      return val;
    }
  }
  return val;
};

export const resolvePath = (root, pathString, autoCreate = false) => {
  if (!pathString || pathString === '') {
    return {
      target: root,
      key: null,
    };
  }

  const placeholder = '\uFFFF';
  const protectedPath = pathString.replace(/\\\./g, placeholder);
  const parts = protectedPath
    .split('.')
    .map(p => p.replace(new RegExp(placeholder, 'g'), '.'));

  let current = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (isDangerousKey(part)) {
      return null;
    }

    if (typeof current !== 'object' || current === null) {
      return null;
    }

    if (current[part] === undefined) {
      if (autoCreate) {
        const nextPart = parts[i + 1];
        current[part] = isNaN(Number(nextPart)) ? {} : [];
      } else {
        return null;
      }
    }

    current = current[part];
  }

  if (typeof current !== 'object' || current === null) return null;

  const finalKey = parts[parts.length - 1];
  if (isDangerousKey(finalKey)) {
    return null;
  }

  return {
    target: current,
    key: finalKey,
  };
};

export const deepMerge = (target, source) => {
  for (const key of Object.keys(source)) {
    if (isDangerousKey(key)) continue;

    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
};

export const formatOutput = value => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

export const deepContains = (obj, target) => {
  if (String(obj) === String(target)) return true;
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).some(val => deepContains(val, target));
  }
  return false;
};

export const deepFindPath = (obj, target, currentPath = '') => {
  if (typeof obj !== 'object' || obj === null) {
    if (String(obj) === String(target)) return currentPath;
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (isDangerousKey(key)) continue;

        const newPath = currentPath ? `${currentPath}.${key}` : key;
        const found = deepFindPath(obj[key], target, newPath);
        if (found !== '') return found;
      }
    }
  }
  return '';
};

export const flattenObject = (obj, prefix = '', res = {}) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (isDangerousKey(key)) continue;

      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null) {
        flattenObject(val, newKey, res);
      } else {
        res[newKey] = val;
      }
    }
  }
  return res;
};

export const getArrayForKey = (dictionaries, DICT, KEY) => {
  if (!dictionaries.has(DICT)) return null;
  const root = dictionaries.get(DICT);
  if (KEY === '') {
    return Array.isArray(root) ? root : null;
  }
  const loc = resolvePath(root, KEY);
  if (!loc || !Array.isArray(loc.target[loc.key])) return null;
  return loc.target[loc.key];
};

export const cloneValue = value => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};
