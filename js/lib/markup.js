// 教材本文の小さな書式を HTML にする。教材は自分たちで書いたものだが、念のため先に全部エスケープする。
//
//   ## 見出し          → 小見出し
//   - 項目              → 箇条書き（連続した行をまとめる）
//   !! 文               → 受診をすすめるサイン（連続した行を1つの枠にまとめる）
//   NG: 文 / OK: 文     → 言い換えの例
//   **太字**            → 強調
//   〔根拠A〕〜〔根拠D〕 → 根拠の強さのバッジ
//   それ以外            → 段落

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EVIDENCE_LABEL = { A: '根拠A 強い', B: '根拠B 中程度', C: '根拠C 弱い', D: '根拠D なし' };

export function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/〔根拠([A-D])〕/g, (_, g) => `<span class="ev ev-${g}">${EVIDENCE_LABEL[g]}</span>`);
}

function kindOf(line) {
  if (line.startsWith('## ')) return 'h';
  if (line.startsWith('- ')) return 'li';
  if (line.startsWith('!! ')) return 'flag';
  if (line.startsWith('NG: ') || line.startsWith('OK: ')) return 'say';
  return 'p';
}

export function renderBody(text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const kind = kindOf(lines[i]);
    if (kind === 'h') {
      out.push(`<h4>${inline(lines[i].slice(3))}</h4>`);
      i++;
      continue;
    }
    if (kind === 'p') {
      out.push(`<p>${inline(lines[i])}</p>`);
      i++;
      continue;
    }
    // 箇条書き・受診サイン・言い換えは、同じ種類が続く限り1つにまとめる
    const group = [];
    while (i < lines.length && kindOf(lines[i]) === kind) group.push(lines[i++]);
    if (kind === 'li') {
      out.push(`<ul>${group.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`);
    } else if (kind === 'flag') {
      out.push(
        `<div class="flag"><div class="flag-title">獣医さんへつなぐサイン</div><ul>${group
          .map((l) => `<li>${inline(l.slice(3))}</li>`)
          .join('')}</ul></div>`,
      );
    } else {
      out.push(
        `<div class="say">${group
          .map((l) => {
            const ok = l.startsWith('OK: ');
            return `<p class="${ok ? 'say-ok' : 'say-ng'}"><b>${ok ? 'OK' : 'NG'}</b>${inline(l.slice(4))}</p>`;
          })
          .join('')}</div>`,
      );
    }
  }
  return out.join('');
}
