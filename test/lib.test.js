import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBody, escapeHtml } from '../js/lib/markup.js';
import { grade, splitDeck, isLearned, INTERVALS } from '../js/lib/srs.js';
import { arrange, pick, record, weakness } from '../js/lib/quiz.js';
import { rer, der, dryMatter, eggshellGrams } from '../js/lib/calc.js';
import { parse, createProgress } from '../js/lib/progress.js';
import { content } from '../js/lib/content.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('markup: 箇条書き・受診サイン・言い換えをまとめる', () => {
  const html = renderBody('段落\n- a\n- b\n!! x\n!! y\nNG: だめ\nOK: よい\n## 見出し');
  assert.equal(html, '<p>段落</p><ul><li>a</li><li>b</li></ul>'
    + '<div class="flag"><div class="flag-title">獣医さんへつなぐサイン</div><ul><li>x</li><li>y</li></ul></div>'
    + '<div class="say"><p class="say-ng"><b>NG</b>だめ</p><p class="say-ok"><b>OK</b>よい</p></div>'
    + '<h4>見出し</h4>');
});

test('markup: 太字と根拠バッジ、エスケープ', () => {
  assert.match(renderBody('**強**〔根拠B〕'), /<strong>強<\/strong><span class="ev ev-B">根拠B 中程度<\/span>/);
  assert.equal(escapeHtml('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
  assert.match(renderBody('<script>'), /&lt;script&gt;/);
});

test('srs: 覚えた→箱が進む、あやしい→1つ戻る、わからない→箱0で今日', () => {
  assert.deepEqual(grade(undefined, 'good', 100), { box: 1, due: 101 });
  assert.deepEqual(grade({ box: 3, due: 0 }, 'good', 100), { box: 4, due: 100 + INTERVALS[4] });
  assert.deepEqual(grade({ box: 3, due: 0 }, 'unsure', 100), { box: 2, due: 101 });
  assert.deepEqual(grade({ box: 0, due: 0 }, 'unsure', 100), { box: 0, due: 101 });
  assert.deepEqual(grade({ box: 5, due: 0 }, 'again', 100), { box: 0, due: 100 });
  assert.equal(grade({ box: 6, due: 0 }, 'good', 0).box, 6);
});

test('srs: 復習と新規に分ける', () => {
  const r = splitDeck(['a', 'b', 'c'], { a: { box: 1, due: 5 }, b: { box: 1, due: 9 } }, 5);
  assert.deepEqual(r, { due: ['a'], fresh: ['c'] });
  assert.equal(isLearned({ box: 3 }), true);
  assert.equal(isLearned({ box: 2 }), false);
});

test('quiz: 並べ替えても正解の位置を追える', () => {
  const r = arrange({ c: ['正', 'x', 'y', 'z'] }, seq([0.1, 0.9, 0.5]));
  assert.equal(r.choices[r.answer], '正');
  assert.equal(r.choices.length, 4);
});

test('quiz: 苦手モードは間違えたものと未回答だけ、苦手順', () => {
  const stats = { a: { ok: 3, ng: 0 }, b: { ok: 0, ng: 3 }, c: { ok: 2, ng: 1 } };
  const r = pick(['a', 'b', 'c', 'd'], stats, 10, 'weak', seq([0.3]));
  assert.ok(!r.includes('a'));
  assert.equal(r[0], 'b');
  assert.ok(weakness(stats.b) > weakness(undefined));
  assert.deepEqual(record({}, 'x', false), { x: { ok: 0, ng: 1 } });
});

test('calc: RER・DER・乾物量・卵殻', () => {
  assert.equal(Math.round(rer(10)), 394);
  assert.equal(Math.round(der(10, 1.6)), 630);
  assert.equal(Math.round(dryMatter(8, 78) * 10), 364);
  assert.ok(Number.isNaN(dryMatter(8, 100)));
  assert.ok(Number.isNaN(rer(0)));
  assert.equal(Math.round(eggshellGrams(600) * 10), 15);
});

test('progress: 壊れた値は既定値、更新は保存される', () => {
  assert.deepEqual(parse('{bad'), { read: {}, cards: {}, quiz: {}, cases: {} });
  assert.deepEqual(parse('{"read":[1],"cards":{"x":1}}').cards, { x: 1 });
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const p = createProgress(storage);
  p.update((d) => ({ ...d, read: { s: true } }));
  assert.deepEqual(createProgress(storage).get().read, { s: true });
  p.reset();
  assert.equal(mem.size, 0);
});

test('content: すべての問題が4択で、選択肢が重複しない。相談の章IDが存在する', () => {
  for (const q of Object.values(content.quiz)) {
    assert.equal(q.c.length, 4, q.id);
    assert.equal(new Set(q.c).size, 4, q.id);
    assert.ok(q.e, q.id);
  }
  for (const k of content.cases) {
    assert.ok(content.chapterById[k.chapter], k.id);
    for (const s of k.steps) assert.equal(new Set(s.c).size, s.c.length, k.id);
  }
  assert.equal(new Set(content.allCardIds).size, content.allCardIds.length);
});
