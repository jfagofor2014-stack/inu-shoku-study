// 相談タブ：実際にありそうな相談を、聞く → 見極める → 伝える の順でたどり、最後に返答例を読む。

import { escapeHtml as e, inline } from '../lib/markup.js';
import { arrange } from '../lib/quiz.js';

// 開いている相談の途中経過（タブを移っても残す。再読み込みで消える）
let run = null;

export function list(ctx) {
  const { content, progress } = ctx;
  const done = progress.get().cases;
  const rows = content.cases
    .map((k) => {
      const r = done[k.id];
      return `<button class="case-row" data-act="open" data-arg="${k.id}">
        <span class="case-title">${e(k.title)}</span>
        <span class="muted">${e(k.dog)}</span>
        ${r ? `<span class="badge">${r.best}/${k.steps.length}</span>` : ''}
      </button>`;
    })
    .join('');
  ctx.render(
    `<h1 class="page-title" tabindex="-1">相談練習</h1>
    <p class="hint">お店で受けそうな相談を、3つのステップでたどります。最後の「返答の一例」は、自分の言葉で言い直してみるのがおすすめです。</p>
    ${rows}`,
    { open: (id) => ctx.go(`cases/${id}`) },
  );
}

export function detail(ctx, id) {
  const { content, progress } = ctx;
  const k = content.cases.find((x) => x.id === id);
  if (!k) return ctx.go('cases');
  if (!run || run.id !== id) run = { id, step: 0, chosen: null, current: arrange(k.steps[0]), score: 0 };

  const finished = run.step >= k.steps.length;
  const ch = content.chapterById[k.chapter];

  let stepHtml = '';
  if (!finished) {
    const s = k.steps[run.step];
    const { choices, answer } = run.current;
    const answered = run.chosen !== null;
    stepHtml = `<div class="card">
      <div class="flash-ch">ステップ ${run.step + 1} / ${k.steps.length}</div>
      <p class="question" tabindex="-1">${inline(s.q)}</p>
      <div class="choices">${choices
        .map((c, i) => {
          let cls = 'choice';
          if (answered && i === answer) cls += ' right';
          else if (answered && i === run.chosen) cls += ' wrong';
          return `<button class="${cls}" data-act="choose" data-arg="${i}" ${answered ? 'disabled' : ''}>
            <span class="choice-mark">${'ABCD'[i]}</span><span>${inline(c)}</span></button>`;
        })
        .join('')}</div>
      ${
        answered
          ? `<div class="explain ${run.chosen === answer ? 'is-ok' : 'is-ng'}" tabindex="-1">
              <p class="verdict">${run.chosen === answer ? 'いい判断です' : 'ここは要注意'}</p>
              <p>${inline(s.e)}</p>
              <button class="btn primary wide" data-act="next">${run.step + 1 < k.steps.length ? '次のステップへ' : '返答の一例を見る'}</button>
            </div>`
          : ''
      }
    </div>`;
  } else {
    stepHtml = `<div class="card model" tabindex="-1">
      <h3>誠実な返答の一例</h3>
      <p>${inline(k.model)}</p>
      <p class="muted">${run.score} / ${k.steps.length} ステップで最初から正しい判断ができました。</p>
      <div class="row">
        <button class="btn" data-act="again">もう一度</button>
        <button class="btn" data-act="read">第${ch.no}章を読む</button>
      </div>
    </div>`;
  }

  ctx.render(
    `<button class="back" data-act="back">‹ 相談の一覧</button>
    <h1 class="page-title" tabindex="-1">${e(k.title)}</h1>
    <div class="card story">
      <div class="dog">${e(k.dog)}</div>
      <p>${inline(k.story)}</p>
    </div>
    ${stepHtml}`,
    {
      back: () => { run = null; ctx.go('cases'); },
      choose: (arg) => {
        run.chosen = Number(arg);
        if (run.chosen === run.current.answer) run.score++;
        ctx.rerender({ focus: '.explain', keepScroll: true });
      },
      next: () => {
        run.step++;
        run.chosen = null;
        if (run.step < k.steps.length) {
          run.current = arrange(k.steps[run.step]);
          ctx.rerender({ focus: '.question', keepScroll: true });
        } else {
          const score = run.score;
          progress.update((d) => {
            const prev = d.cases[id];
            const best = Math.max(score, prev ? prev.best : 0);
            return { ...d, cases: { ...d.cases, [id]: { best } } };
          });
          ctx.rerender({ focus: '.model', keepScroll: true });
        }
      },
      again: () => { run = null; ctx.rerender(); },
      read: () => ctx.go(`read/${k.chapter}`),
    },
  );
}

export function reset() {
  run = null;
}
