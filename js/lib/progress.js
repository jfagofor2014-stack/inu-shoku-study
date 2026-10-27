// 学習の記録を1つのキーにまとめて保存する。壊れた値や古い形は既定値に戻す。

const KEY = 'inu-shoku-study:v1';

export function emptyProgress() {
  return { read: {}, cards: {}, quiz: {}, cases: {} };
}

function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function parse(raw) {
  const base = emptyProgress();
  if (!raw) return base;
  let v;
  try {
    v = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!isObj(v)) return base;
  for (const k of Object.keys(base)) if (isObj(v[k])) base[k] = v[k];
  return base;
}

export function createProgress(storage) {
  let data = parse(storage.getItem(KEY));
  return {
    get: () => data,
    update(fn) {
      data = fn(data);
      storage.setItem(KEY, JSON.stringify(data));
    },
    reset() {
      data = emptyProgress();
      storage.removeItem(KEY);
    },
  };
}
