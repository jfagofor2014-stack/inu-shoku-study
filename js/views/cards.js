// カードタブ：間隔反復で暗記する。
// 1回の山で最初に答えた評価だけを記録する（あやしい・わからないは山の最後へ戻して覚えるまで回す）。
// 例外として、「わからない」で今日のうちに出すことになったカードを同じ山で覚えたら、明日へ送る。

import { escapeHtml as e, inline } from '../lib/markup.js';
import { dayNumber, grade, splitDeck, isDue } from '../lib/srs.js';
import { shuffle } from '../lib/quiz.js';

const NEW_PER_SESSION = 15;
let session = null;

function deckFor(ctx, spec) {
  const { content, progress } = ctx;
  const p = progress.get();
  const today = dayNumber();
  if (spec.kind === 'due') return shuffle(splitDeck(content.allCardIds, p.cards, today).due);
  if (spec.kind === 'fresh') return splitDeck(content.allCardIds, p.cards, today).fresh.slice(0, NEW_PER_SESSION);
  if (spec.kind === 'chapter') return shuffle(content.chapterById[spec.chapter].cardIds);
  return [];
}

export function start(ctx, spec) {
  const ids = deckFor(ctx, spec);
  session = ids.length
    ? { queue: ids, seen: new Set(), flipped: false, total: ids.length, counts: { good: 0, unsure: 0, again: 0 }, label: spec.label || '' }
    : null;
  return !!session;
}

function menu(ctx) {
  const { content, progress } = ctx;
  const p = progress.get();
  const today = dayNumber();
  const { due, fresh } = splitDeck(content.allCardIds, p.cards, today);
  const rows = content.chapters
    .map((ch) => {
      const learnedHere = ch.cardIds.filter((id) => p.cards[id] && p.cards[id].box >= 3).length;
      return `<button class="link-row" data-act="chapter" data-arg="${ch.id}">
        <span>${ch.no}. ${e(ch.title)}</span><span class="muted">${learnedHere}/${ch.cardIds.length}</span>
      </button>`;
    })
    .join('');
  ctx.render(
    `<h1 class="page-title" tabindex="-1">カード</h1>
    <div class="card">
      <button class="btn primary wide" data-act="due" ${due.length ? '' : 'disabled'}>今日の復習 ${due.length}枚</button>
      <button class="btn wide" data-act="fresh" ${fresh.length ? '' : 'disabled'}>新しいカードを ${Math.min(fresh.length, NEW_PER_SESSION)}枚 覚える</button>
      <p class="hint">「覚えた」カードは 1日後 → 3日後 → 7日後 → 14日後 → 30日後 → 60日後 に出てきます。あやしい・わからないは、その場で覚えるまで繰り返します。</p>
    </div>
    <h2 class="sec-title">章ごとに全部（覚えた数／枚数）</h2>
    ${rows}`,
    {
      due: () => { start(ctx, { kind: 'due' }); ctx.rerender(); },
      fresh: () => { start(ctx, { kind: 'fresh' }); ctx.rerender(); },
      chapter: (id) => { start(ctx, { kind: 'chapter', chapter: id }); ctx.rerender(); },
    },
  );
}

function finish(ctx) {
  const c = session.counts;
  ctx.render(
    `<h1 class="page-title" tabindex="-1">おつかれさまでした</h1>
    <div class="card center">
      <p class="big">${session.total}枚 完了</p>
      <p>覚えた ${c.good}／あやしい ${c.unsure}／わからない ${c.again}<br><small class="muted">（最初の答えで数えています）</small></p>
      <button class="btn primary wide" data-act="menu">カードのメニューへ</button>
    </div>`,
    { menu: () => { session = null; ctx.rerender(); } },
  );
}

function show(ctx) {
  const { content, progress } = ctx;
  if (!session.queue.length) return finish(ctx);
  const id = session.queue[0];
  const card = content.cards[id];
  const ch = content.chapterById[card.chapter];
  const done = session.total - new Set(session.queue).size;
  ctx.render(
    `<div class="row between">
      <button class="back" data-act="quit">‹ やめる</button>
      <span class="muted">${done}/${session.total}</span>
    </div>
    <div class="card flash" tabindex="-1">
      <div class="flash-ch">${ch.no}. ${e(ch.title)}</div>
      <div class="flash-q">${inline(card.q)}</div>
      ${session.flipped ? `<div class="flash-a">${inline(card.a)}</div>` : ''}
    </div>
    ${
      session.flipped
        ? `<div class="grade">
            <button class="btn again" data-act="g" data-arg="again">わからない</button>
            <button class="btn unsure" data-act="g" data-arg="unsure">あやしい</button>
            <button class="btn good" data-act="g" data-arg="good">覚えた</button>
          </div>`
        : `<button class="btn primary wide tall" data-act="flip">答えを見る</button>
           <p class="hint center">答えを頭の中で言ってから、めくりましょう</p>`
    }
    <button class="link-row small" data-act="read">この章を読む ›</button>`,
    {
      quit: () => { session = null; ctx.rerender(); },
      flip: () => {
        session.flipped = true;
        session.flippedAt = Date.now();
        ctx.rerender({ focus: '.flash' });
      },
      read: () => ctx.go(`read/${card.chapter}`),
      g: (result) => {
        // 「答えを見る」を素早く2回押すと、同じ位置に出た評価ボタンまで押してしまうのを防ぐ
        if (Date.now() - session.flippedAt < 400) return;
        const today = dayNumber();
        const first = !session.seen.has(id);
        progress.update((d) => {
          const cur = d.cards[id];
          let nextState = cur;
          if (first) nextState = grade(cur, result, today);
          else if (result === 'good' && isDue(cur, today)) nextState = grade(cur, 'good', today);
          return nextState === cur ? d : { ...d, cards: { ...d.cards, [id]: nextState } };
        });
        if (first) session.counts[result]++;
        session.seen.add(id);
        session.queue.shift();
        if (result !== 'good') session.queue.push(id);
        session.flipped = false;
        ctx.rerender({ focus: '.flash' });
      },
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
