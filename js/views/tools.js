// 道具タブ：計算機、早見表、この学習ノートについて、記録のリセット。

import { escapeHtml as e } from '../lib/markup.js';
import { rer, der, dryMatter, eggshellGrams, FACTORS } from '../lib/calc.js';

const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');

export function render(ctx) {
  const options = FACTORS.map((f) => `<option value="${f.f}">${e(f.label)}（×${f.f}）</option>`).join('');
  ctx.render(
    `<h1 class="page-title" tabindex="-1">道具</h1>

    <section class="card tool">
      <h3>1日のカロリー（RER・DER）</h3>
      <label>体重（kg）<input id="t-kg" type="number" inputmode="decimal" min="0" step="0.1" value="10"></label>
      <label>状態<select id="t-f">${options}</select></label>
      <div class="out" id="t-energy" aria-live="polite"></div>
      <p class="hint">出発点の数字です。2〜4週ごとに体重とBCSを見て調整します。減量中は「理想体重」を入れてください。</p>
    </section>

    <section class="card tool">
      <h3>乾物量換算</h3>
      <label>成分の表示値（%）<input id="t-pct" type="number" inputmode="decimal" min="0" step="0.1" value="8"></label>
      <label>水分（%）<input id="t-moist" type="number" inputmode="decimal" min="0" max="99" step="0.1" value="78"></label>
      <div class="out" id="t-dm" aria-live="polite"></div>
      <p class="hint">AAFCOの最低基準（乾物）：成犬 たんぱく質18%・脂肪5.5%／子犬 22.5%・8.5%</p>
    </section>

    <section class="card tool">
      <h3>卵殻カルシウムの量（手作り食）</h3>
      <label>手作り食の1日のカロリー（kcal）<input id="t-kcal" type="number" inputmode="decimal" min="0" step="10" value="600"></label>
      <div class="out" id="t-egg" aria-live="polite"></div>
      <p class="hint">カルシウムを全て卵殻粉で補う場合の目安（1000kcalあたりCa約1g、卵殻粉1gにCa約390mgで計算）。他の食材のカルシウムは差し引きます。総合栄養食には足さないでください。</p>
    </section>

    <section class="card">
      <h3>ボディコンディションスコア（9段階）</h3>
      <ul class="plain">
        <li><b>1〜3 やせ</b>：肋骨・背骨・腰骨が見える、または脂肪がほとんど触れない</li>
        <li><b>4〜5 理想</b>：薄い脂肪越しに肋骨に触れる。上から見てくびれ、横から見てお腹が吊り上がる</li>
        <li><b>6〜7 太りぎみ</b>：肋骨が触りにくい、くびれがわずか（BCS7は理想より約20%重い）</li>
        <li><b>8〜9 肥満</b>：肋骨が触れない、くびれがない、お腹が垂れる</li>
      </ul>
    </section>

    <section class="card">
      <h3>根拠の強さの目安</h3>
      <ul class="plain">
        <li><span class="ev ev-A">根拠A 強い</span> 質の高い比較試験や研究のまとめで確認</li>
        <li><span class="ev ev-B">根拠B 中程度</span> 比較試験はあるが少ない・小さい・ばらつく</li>
        <li><span class="ev ev-C">根拠C 弱い</span> 理屈・症例報告・専門家の意見が中心</li>
        <li><span class="ev ev-D">根拠D なし</span> 根拠がない、または否定的</li>
      </ul>
    </section>

    <section class="card about">
      <h3>この学習ノートについて</h3>
      <p>お店で食の相談を受けたときに、誠実に対応できるよう知識を身につけるための学習用ノートです。個々の犬の診断や治療の代わりにはなりません。</p>
      <p>内容は、AAFCO・NRC・WSAVA・IRIS などの基準や指針、公表されている研究をもとに整理したものです。数値や根拠の評価は研究や基準の改訂で変わることがあります。気になる点は、元の資料や獣医師に確認してください。</p>
      <p>学習の記録はこの端末の中だけに保存されます。</p>
      <button class="btn danger" data-act="reset">学習の記録をすべて消す</button>
    </section>`,
    {
      reset: () => {
        if (!confirm('読んだ節・カード・テスト・相談練習の記録をすべて消します。よろしいですか？')) return;
        ctx.progress.reset();
        ctx.resetSessions();
        ctx.toast('記録を消しました');
      },
    },
  );

  const $ = (id) => document.getElementById(id);
  const num = (id) => parseFloat($(id).value);

  function update() {
    const kg = num('t-kg');
    const f = parseFloat($('t-f').value);
    const r = rer(kg);
    $('t-energy').innerHTML = `RER <b>${fmt(r)}</b> kcal　→　DER <b>${fmt(der(kg, f))}</b> kcal/日<br>
      <small>水の目安 ${fmt(kg * 50)}〜${fmt(kg * 60)} ml/日（多飲の目安 ${fmt(kg * 100)} ml超）</small>`;
    $('t-dm').innerHTML = `乾物量 <b>${fmt(dryMatter(num('t-pct'), num('t-moist')), 1)}</b> %`;
    $('t-egg').innerHTML = `卵殻粉 約 <b>${fmt(eggshellGrams(num('t-kcal')), 1)}</b> g/日`;
  }
  for (const id of ['t-kg', 't-f', 't-pct', 't-moist', 't-kcal']) $(id).addEventListener('input', update);
  update();
}
