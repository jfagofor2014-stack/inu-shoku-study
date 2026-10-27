// 4択テストの出題。教材では c[0] が正解なので、表示のたびに並べ替える。

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function arrange(item, rng = Math.random) {
  const order = shuffle(item.c.map((_, i) => i), rng);
  return {
    choices: order.map((i) => item.c[i]),
    answer: order.indexOf(0),
  };
}

// 苦手度：間違えた回数が多く、正解が少ないほど高い。未回答は中くらい（0.5）。
export function weakness(stat) {
  if (!stat || stat.ok + stat.ng === 0) return 0.5;
  return (stat.ng + 1) / (stat.ok + stat.ng + 2);
}

// mode: 'random' | 'weak'。weak は苦手度の高い順（同点はランダム）。
export function pick(ids, stats, n, mode, rng = Math.random) {
  const shuffled = shuffle(ids, rng);
  if (mode === 'weak') {
    // 一度でも間違えたもの、または未回答のものだけを対象にする
    const pool = shuffled.filter((id) => {
      const s = stats[id];
      return !s || s.ng > 0;
    });
    pool.sort((a, b) => weakness(stats[b]) - weakness(stats[a]));
    return pool.slice(0, n);
  }
  return shuffled.slice(0, n);
}

export function record(stats, id, correct) {
  const s = stats[id] || { ok: 0, ng: 0 };
  return { ...stats, [id]: { ok: s.ok + (correct ? 1 : 0), ng: s.ng + (correct ? 0 : 1) } };
}
