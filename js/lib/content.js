// 教材データを1つにまとめ、カード・問題・節に安定したIDを振る。
// IDは「章ID-種類+番号」。教材の途中に項目を足すと番号がずれるので、足すときは末尾に。

import part1 from '../data/part1.js';
import part2 from '../data/part2.js';
import part3 from '../data/part3.js';
import cases from '../data/cases.js';

export function build(chapters) {
  const sections = [];
  const cards = [];
  const quiz = [];
  const list = chapters.map((ch, n) => {
    const secIds = ch.sections.map((s, i) => {
      const id = `${ch.id}-s${i}`;
      sections.push({ id, chapter: ch.id, ...s });
      return id;
    });
    const cardIds = ch.cards.map(([q, a], i) => {
      const id = `${ch.id}-k${i}`;
      cards.push({ id, chapter: ch.id, q, a });
      return id;
    });
    const quizIds = ch.quiz.map((item, i) => {
      const id = `${ch.id}-q${i}`;
      quiz.push({ id, chapter: ch.id, ...item });
      return id;
    });
    return { ...ch, no: n + 1, secIds, cardIds, quizIds };
  });
  const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  return {
    chapters: list,
    chapterById: byId(list),
    sections: byId(sections),
    cards: byId(cards),
    quiz: byId(quiz),
    allCardIds: cards.map((c) => c.id),
    allQuizIds: quiz.map((q) => q.id),
    allSectionIds: sections.map((s) => s.id),
  };
}

export const content = { ...build([...part1, ...part2, ...part3]), cases };
