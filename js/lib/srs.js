// カードの間隔反復（ライトナー方式）。日付は「エポックからの日数」の整数で扱い、時刻を持たない。
//
// 箱 0 は「まだ覚えていない」。覚えた → 次の箱へ進み、その箱の日数だけ先に出す。
// あやしい → 箱を1つ戻して明日。わからない → 箱0に戻して今日のうちにもう一度。

export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MAX_BOX = INTERVALS.length - 1;

export function dayNumber(date = new Date()) {
  // 端末の日付で区切る（夜中に勉強しても「今日」がずれないように）
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

export function grade(state, result, today) {
  const box = state ? state.box : 0;
  if (result === 'good') {
    const next = Math.min(box + 1, MAX_BOX);
    return { box: next, due: today + INTERVALS[next] };
  }
  if (result === 'unsure') {
    const next = Math.max(box - 1, 0);
    return { box: next, due: today + 1 };
  }
  return { box: 0, due: today };
}

export function isDue(state, today) {
  return !!state && state.due <= today;
}

// 今日復習するカード（一度でも学んだもの）と、まだ一度も見ていないカードに分ける
export function splitDeck(ids, states, today) {
  const due = [];
  const fresh = [];
  for (const id of ids) {
    const s = states[id];
    if (!s) fresh.push(id);
    else if (isDue(s, today)) due.push(id);
  }
  return { due, fresh };
}

// 「覚えた」とみなすのは箱3（7日後に出す段階）以上
export function isLearned(state) {
  return !!state && state.box >= 3;
}
