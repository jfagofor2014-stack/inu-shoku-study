// 道具タブの計算。表示用に丸めるのは画面側で行う。

export function rer(kg) {
  if (!(kg > 0)) return NaN;
  return 70 * Math.pow(kg, 0.75);
}

export const FACTORS = [
  { id: 'neutered', label: '避妊・去勢済みの成犬', f: 1.6 },
  { id: 'intact', label: '避妊・去勢していない成犬', f: 1.8 },
  { id: 'senior', label: '活動が少ない・高齢', f: 1.3 },
  { id: 'loss', label: '減量中（理想体重で計算）', f: 1.0 },
  { id: 'puppy-young', label: '子犬（4か月未満）', f: 3.0 },
  { id: 'puppy', label: '子犬（4か月〜成犬まで）', f: 2.0 },
];

export function der(kg, factor) {
  return rer(kg) * factor;
}

export function dryMatter(percent, moisture) {
  if (!(moisture >= 0 && moisture < 100) || !(percent >= 0)) return NaN;
  return (percent / (100 - moisture)) * 100;
}

// 卵殻粉：1gあたりカルシウム約0.39g（380〜400mgの中間）
export const EGGSHELL_CA_PER_G = 0.39;

// レシピのカロリーから、カルシウムを全て卵殻粉で補う場合の量（g）。NRCの目安 1000kcalあたり1g。
export function eggshellGrams(kcal) {
  if (!(kcal > 0)) return NaN;
  return (kcal / 1000) / EGGSHELL_CA_PER_G;
}
