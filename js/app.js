// 画面の切り替え（#read, #read/c01, #cards, #test, #cases, #cases/k01, #tools）と、各画面に渡す共通の道具。

import { createSafeStorage } from './lib/safestorage.js';
import { createProgress } from './lib/progress.js';
import { content } from './lib/content.js';
import * as read from './views/read.js';
import * as cards from './views/cards.js';
import * as test from './views/test.js';
import * as cases from './views/cases.js';
import * as tools from './views/tools.js';

function rawLocalStorage() {
  // 参照するだけで例外を投げる環境がある（保存がブロックされた端末など）
  try {
    return window.localStorage;
  } catch {
    return { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  }
}

const view = document.getElementById('view');
const banner = document.getElementById('save-banner');
const storage = createSafeStorage(rawLocalStorage(), (failing) => { banner.hidden = !failing; });
const progress = createProgress(storage);

let handlers = {};

const ctx = {
  content,
  progress,
  render(html, h = {}) {
    view.innerHTML = html;
    handlers = h;
  },
  go(hash) {
    if (location.hash.slice(1) === hash) route();
    else location.hash = hash;
  },
  rerender(opts = {}) {
    const y = window.scrollY;
    route({ fromRerender: true });
    if (opts.keepScroll) window.scrollTo(0, y);
    if (opts.focus) {
      const el = view.querySelector(opts.focus);
      if (el) {
        el.focus({ preventScroll: !!opts.keepScroll });
        if (opts.keepScroll) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  },
  startCards(spec) {
    if (!cards.start(ctx, spec)) ctx.toast('出せるカードがありません');
    ctx.go('cards');
  },
  startTest(spec) {
    test.start(ctx, spec);
    ctx.go('test');
  },
  resetSessions() {
    cards.reset();
    test.reset();
    cases.reset();
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 2500);
  },
};

view.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = handlers[el.dataset.act];
  if (fn) fn(el.dataset.arg, el);
});

function route({ fromRerender = false } = {}) {
  const [tab = 'read', arg] = (location.hash.slice(1) || 'read').split('/');
  document.querySelectorAll('.tab').forEach((b) => {
    b.setAttribute('aria-current', String(b.dataset.tab === tab));
  });
  if (tab === 'read') arg ? read.chapter(ctx, arg) : read.home(ctx);
  else if (tab === 'cards') cards.render(ctx);
  else if (tab === 'test') test.render(ctx);
  else if (tab === 'cases') arg ? cases.detail(ctx, arg) : cases.list(ctx);
  else if (tab === 'tools') tools.render(ctx);
  else read.home(ctx);
  if (!fromRerender) {
    window.scrollTo(0, 0);
    const title = view.querySelector('.page-title');
    if (title) title.focus({ preventScroll: true });
  }
}

document.getElementById('tabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('.tab');
  if (b) ctx.go(b.dataset.tab);
});

window.addEventListener('hashchange', () => route());
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
