// テストタブ：4択。答えるとすぐ正誤と解説を出す（覚えるためのテストなので）。

import { escapeHtml as e, inline } from '../lib/markup.js';
import { arrange, pick, record } from '../lib/quiz.js';

const PER_SESSION = 10;
let session = null;

function idsFor(ctx, spec) {
  const { content, progress } = ctx;
  const stats = progress.get().quiz;
  if (spec.kind === 'chapter') return pick(content.chapterById[spec.chapter].quizIds, stats, 99, 'random');
  if (spec.kind === 'weak') return pick(content.allQuizIds, stats, PER_SESSION, 'weak');
  if (spec.kind === 'retry') return spec.ids.slice();
  return pick(content.allQuizIds, stats, PER_SESSION, 'random');
}

export function start(ctx, spec) {
  const ids = idsFor(ctx, spec);
  session = ids.length
    ? { ids, i: 0, chosen: null, current: arrange(ctx.content.quiz[ids[0]]), wrong: [], correct: 0 }
    : null;
  return !!session;
}

function accuracy(stats, ids) {
  let ok = 0;
  let total = 0;
  for (const id of ids) {
    const s = stats[id];
    if (s) { ok += s.ok; total += s.ok + s.ng; }
  }
  return total ? `${Math.round((ok / total) * 100)}%` : '未';
}

function menu(ctx) {
  const { content, progress } = ctx;
  const stats = progress.get().quiz;
  const rows = content.chapters
    .map((ch) => `<button class="link-row" data-act="chapter" data-arg="${ch.id}">
        <span>${ch.no}. ${e(ch.title)}</span><span class="muted">${accuracy(stats, ch.quizIds)}・${ch.quizIds.length}問</span>
      </button>`)
    .join('');
  ctx.render(
    `<h1 class="page-title" tabindex="-1">テスト</h1>
    <div class="card">
      <button class="btn primary wide" data-act="random">全範囲からランダム ${PER_SESSION}問</button>
      <button class="btn wide" data-act="weak">苦手・まだ解いていない問題から ${PER_SESSION}問</button>
      <p class="hint">相談の場面を想定した問題が多めです。正解を選んだ理由まで言えるかを意識してください。</p>
    </div>
    <h2 class="sec-title">章ごと（正答率）</h2>
    ${rows}`,
    {
      random: () => { start(ctx, { kind: 'random' }); ctx.rerender(); },
      weak: () => {
        if (!start(ctx, { kind: 'weak' })) ctx.toast('苦手な問題はありません。すばらしい！');
        ctx.rerender();
      },
      chapter: (id) => { start(ctx, { kind: 'chapter', chapter: id }); ctx.rerender(); },
    },
  );
}

function finish(ctx) {
  const { content } = ctx;
  const n = session.ids.length;
  const wrong = session.wrong;
  const list = wrong
    .map((id) => {
      const q = content.quiz[id];
      return `<div class="card review">
        <p class="review-q">${inline(q.q)}</p>
        <p class="review-a">正解：${inline(q.c[0])}</p>
        <p class="muted">${inline(q.e)}</p>
      </div>`;
    })
    .join('');
  ctx.render(
    `<h1 class="page-title" tabindex="-1">結果</h1>
    <div class="card center">
      <p class="big">${session.correct} / ${n}</p>
      ${wrong.length ? '<button class="btn primary wide" data-act="retry">間違えた問題だけもう一度</button>' : '<p>全問正解です！</p>'}
      <button class="btn wide" data-act="menu">テストのメニューへ</button>
    </div>
    ${wrong.length ? `<h2 class="sec-title">間違えた問題</h2>${list}` : ''}`,
    {
      retry: () => { start(ctx, { kind: 'retry', ids: wrong }); ctx.rerender(); },
      menu: () => { session = null; ctx.rerender(); },
    },
  );
}

function show(ctx) {
  const { content, progress } = ctx;
  if (session.i >= session.ids.length) return finish(ctx);
  const id = session.ids[session.i];
  const q = content.quiz[id];
  const ch = content.chapterById[q.chapter];
  const { choices, answer } = session.current;
  const answered = session.chosen !== null;
  const buttons = choices
    .map((c, i) => {
      let cls = 'choice';
      if (answered && i === answer) cls += ' right';
      else if (answered && i === session.chosen) cls += ' wrong';
      return `<button class="${cls}" data-act="choose" data-arg="${i}" ${answered ? 'disabled' : ''}>
        <span class="choice-mark">${'ABCD'[i]}</span><span>${inline(c)}</span></button>`;
    })
    .join('');
  const ok = session.chosen === answer;
  ctx.render(
    `<div class="row between">
      <button class="back" data-act="quit">‹ やめる</button>
      <span class="muted">${session.i + 1} / ${session.ids.length}</span>
    </div>
    <div class="card">
      <div class="flash-ch">${ch.no}. ${e(ch.title)}</div>
      <p class="question" tabindex="-1">${inline(q.q)}</p>
      <div class="choices">${buttons}</div>
    </div>
    ${
      answered
        ? `<div class="card explain ${ok ? 'is-ok' : 'is-ng'}" tabindex="-1">
            <p class="verdict">${ok ? '正解' : '不正解'}</p>
            <p>${inline(q.e)}</p>
            <button class="btn primary wide" data-act="next">${session.i + 1 < session.ids.length ? '次へ' : '結果を見る'}</button>
            <button class="link-row small" data-act="read">この章を読み直す ›</button>
          </div>`
        : ''
    }`,
    {
      quit: () => { session = null; ctx.rerender(); },
      choose: (arg) => {
        session.chosen = Number(arg);
        const correct = session.chosen === answer;
        if (correct) session.correct++;
        else session.wrong.push(id);
        progress.update((d) => ({ ...d, quiz: record(d.quiz, id, correct) }));
        ctx.rerender({ focus: '.explain', keepScroll: true });
      },
      next: () => {
        session.i++;
        session.chosen = null;
        if (session.i < session.ids.length) session.current = arrange(content.quiz[session.ids[session.i]]);
        ctx.rerender({ focus: '.question' });
      },
      read: () => ctx.go(`read/${q.chapter}`),
    },
  );
}

export function render(ctx) {
  if (session) show(ctx);
  else menu(ctx);
}

export function reset() {
  session = null;
}
