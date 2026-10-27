// よむタブ：ホーム（今日の状況と章の一覧）と章の本文。

import { escapeHtml as e, renderBody } from '../lib/markup.js';
import { dayNumber, splitDeck, isLearned } from '../lib/srs.js';

function stats(ctx) {
  const { content, progress } = ctx;
  const p = progress.get();
  const today = dayNumber();
  const { due } = splitDeck(content.allCardIds, p.cards, today);
  const readCount = content.allSectionIds.filter((id) => p.read[id]).length;
  const learned = content.allCardIds.filter((id) => isLearned(p.cards[id])).length;
  let ok = 0;
  let total = 0;
  for (const s of Object.values(p.quiz)) {
    ok += s.ok;
    total += s.ok + s.ng;
  }
  return { due: due.length, readCount, learned, ok, total };
}

function bar(value, max) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return `<div class="bar" role="img" aria-label="${pct}%"><span style="width:${pct}%"></span></div>`;
}

export function home(ctx) {
  const { content, progress } = ctx;
  const p = progress.get();
  const s = stats(ctx);
  const rate = s.total ? `${Math.round((s.ok / s.total) * 100)}%` : '—';
  const chapters = content.chapters
    .map((ch) => {
      const read = ch.secIds.filter((id) => p.read[id]).length;
      const done = read === ch.secIds.length;
      return `<button class="chapter" data-act="open" data-arg="${ch.id}">
        <span class="chapter-no${done ? ' done' : ''}">${done ? '✓' : ch.no}</span>
        <span class="chapter-body">
          <span class="chapter-title">${e(ch.title)}</span>
          <span class="chapter-lead">${e(ch.lead)}</span>
          ${bar(read, ch.secIds.length)}
        </span>
      </button>`;
    })
    .join('');

  ctx.render(
    `<h1 class="page-title" tabindex="-1">犬の食と健康 学習ノート</h1>
    <div class="card today">
      <div class="today-grid">
        <div><b>${s.due}</b><span>今日の復習カード</span></div>
        <div><b>${s.learned}<small>/${content.allCardIds.length}</small></b><span>覚えたカード</span></div>
        <div><b>${s.readCount}<small>/${content.allSectionIds.length}</small></b><span>読んだ節</span></div>
        <div><b>${rate}</b><span>テスト正答率</span></div>
      </div>
      <button class="btn primary wide" data-act="review">${s.due ? `今日の復習 ${s.due}枚をはじめる` : '新しいカードを覚える'}</button>
    </div>
    <p class="hint">おすすめの回し方：章を読む → その章のカード → その章のテスト。毎日カードの復習だけは欠かさずに。</p>
    <h2 class="sec-title">章</h2>
    <div class="chapters">${chapters}</div>`,
    {
      open: (id) => ctx.go(`read/${id}`),
      review: () => ctx.startCards(s.due ? { kind: 'due' } : { kind: 'fresh' }),
    },
  );
}

export function chapter(ctx, id) {
  const { content, progress } = ctx;
  const ch = content.chapterById[id];
  if (!ch) return ctx.go('read');
  const p = progress.get();
  const idx = content.chapters.indexOf(ch);
  const prev = content.chapters[idx - 1];
  const next = content.chapters[idx + 1];
  const cases = content.cases.filter((k) => k.chapter === id);

  const sections = ch.secIds
    .map((sid, i) => {
      const s = content.sections[sid];
      const done = !!p.read[sid];
      return `<section class="card section">
        <h3>${ch.no}-${i + 1} ${e(s.t)}</h3>
        <div class="body">${renderBody(s.b)}</div>
        <button class="btn mark${done ? ' on' : ''}" data-act="mark" data-arg="${sid}" aria-pressed="${done}">
          ${done ? '✓ 読んだ' : '読んだらチェック'}
        </button>
      </section>`;
    })
    .join('');

  const caseLinks = cases.length
    ? `<h3 class="sec-title">この章の相談練習</h3>${cases
        .map((k) => `<button class="link-row" data-act="case" data-arg="${k.id}">${e(k.title)} ›</button>`)
        .join('')}`
    : '';

  ctx.render(
    `<button class="back" data-act="back">‹ 章の一覧</button>
    <h1 class="page-title" tabindex="-1"><small>第${ch.no}章</small>${e(ch.title)}</h1>
    <p class="lead">${e(ch.lead)}</p>
    ${sections}
    <div class="card next-step">
      <h3>覚えたか確かめる</h3>
      <div class="row">
        <button class="btn primary" data-act="cards">この章のカード ${ch.cardIds.length}枚</button>
        <button class="btn" data-act="test">この章のテスト ${ch.quizIds.length}問</button>
      </div>
      ${caseLinks}
    </div>
    <div class="row pager">
      ${prev ? `<button class="btn ghost" data-act="open" data-arg="${prev.id}">‹ ${e(prev.title)}</button>` : '<span></span>'}
      ${next ? `<button class="btn ghost" data-act="open" data-arg="${next.id}">${e(next.title)} ›</button>` : ''}
    </div>`,
    {
      back: () => ctx.go('read'),
      open: (cid) => ctx.go(`read/${cid}`),
      mark: (sid) => {
        progress.update((d) => {
          const read = { ...d.read };
          if (read[sid]) delete read[sid];
          else read[sid] = true;
          return { ...d, read };
        });
        ctx.rerender({ keepScroll: true });
      },
      cards: () => ctx.startCards({ kind: 'chapter', chapter: id }),
      test: () => ctx.startTest({ kind: 'chapter', chapter: id }),
      case: (kid) => ctx.go(`cases/${kid}`),
    },
  );
}
