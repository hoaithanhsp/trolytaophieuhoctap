import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildInteractiveHtml } from '../exportHtml';
import type { Question, Worksheet } from '../../types';

function makeWorksheet(questions: Partial<Question>[]): Worksheet {
  return {
    id: 'ws',
    title: 'Kiểm thử',
    subjectId: 'math',
    subjectName: 'Toán',
    gradeLevel: 'secondary',
    questions: questions.map((q, i) => ({
      id: `q${i}`,
      content: `Câu ${i + 1}`,
      type: 'multiple_choice',
      correctAnswer: '',
      difficulty: 'easy',
      ...q,
    })),
    answerKey: [],
    language: 'vi',
    createdAt: '',
    updatedAt: '',
  } as Worksheet;
}

async function openWorksheet(questions: Partial<Question>[]) {
  const dom = new JSDOM(buildInteractiveHtml(makeWorksheet(questions)), {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve));
  const doc = dom.window.document;
  return {
    doc,
    card: (i: number) => doc.getElementById(`q-${i}`) as HTMLElement,
    clickOption: (i: number, optionIndex: number) => {
      (doc.querySelectorAll(`#q-${i} .opt-btn`)[optionIndex] as HTMLElement).click();
    },
  };
}

describe('phiếu HTML tương tác — chấm trắc nghiệm', () => {
  it.each([
    ['đáp án là số', ['1', '2', '3', '4'], '3', 2],
    ['đáp án là chữ L M N Q', ['L', 'M', 'N', 'Q'], 'M', 1],
    ['đáp án là nội dung', ['60', '80', '100', '75'], '80', 1],
    ['đáp án là chữ cái vị trí', ['Hà Nội', 'Huế', 'Đà Nẵng', 'Cần Thơ'], 'B', 1],
    ['đáp án có kèm nhãn', ['Hà Nội', 'Huế', 'Đà Nẵng', 'Cần Thơ'], 'C. Đà Nẵng', 2],
    ['đáp án có emoji', ['🐟 Cá heo', '🐙 Bạch tuộc', '🦀 Cua biển', '🐱 Mèo con'], '🐱 Mèo con', 3],
  ])('%s: chọn đúng thì báo đúng, chọn sai thì báo sai', async (_name, options, correctAnswer, rightIndex) => {
    const right = await openWorksheet([{ options, correctAnswer }]);
    right.clickOption(0, rightIndex);
    expect(right.card(0).classList.contains('correct')).toBe(true);
    expect(right.doc.getElementById('correctCount')?.textContent).toBe('1');

    const wrong = await openWorksheet([{ options, correctAnswer }]);
    wrong.clickOption(0, (rightIndex + 1) % options.length);
    expect(wrong.card(0).classList.contains('wrong')).toBe(true);
    expect(wrong.doc.querySelectorAll('.correct-answer')[0]?.textContent).toContain(options[rightIndex]);
  });

  it('câu không xác định được đáp án thì không tính sai cho học sinh', async () => {
    const ws = await openWorksheet([{ options: ['Một', 'Hai', 'Ba', 'Bốn'], correctAnswer: '' }]);
    ws.clickOption(0, 0);
    expect(ws.card(0).classList.contains('wrong')).toBe(false);
    expect(ws.doc.getElementById('wrongCount')?.textContent).toBe('0');
  });
});

describe('phiếu HTML tương tác — các dạng khác', () => {
  it('đúng/sai chấp nhận đáp án viết khác kiểu', async () => {
    const ws = await openWorksheet([{ type: 'true_false', options: ['Đúng', 'Sai'], correctAnswer: 'true' }]);
    (ws.doc.querySelectorAll('#q-0 .tf-btn')[0] as HTMLElement).click();
    expect(ws.card(0).classList.contains('correct')).toBe(true);
  });

  it('đúng/sai vẫn chấm được khi không có options', async () => {
    const ws = await openWorksheet([{ type: 'true_false', correctAnswer: 'Sai' }]);
    (ws.doc.querySelectorAll('#q-0 .tf-btn')[1] as HTMLElement).click();
    expect(ws.card(0).classList.contains('correct')).toBe(true);
  });

  it('điền khuyết bỏ qua hoa thường, khoảng trắng, dấu câu và LaTeX', async () => {
    const ws = await openWorksheet([{ type: 'fill_blank', correctAnswer: '$\\frac{1}{4}$' }]);
    (ws.doc.getElementById('fill-0') as HTMLInputElement).value = ' 1/4. ';
    (ws.doc.querySelector('#q-0 .fill-submit') as HTMLElement).click();
    expect(ws.card(0).classList.contains('correct')).toBe(true);
  });

  it('nối cột chấm đúng cả khi nội dung có dấu ngoặc kép', async () => {
    const pairs = [{ left: 'x', right: 'từ "một"' }, { left: 'y', right: 'từ "hai"' }];
    const ws = await openWorksheet([{ type: 'matching', matchingPairs: pairs }]);
    ws.doc.querySelectorAll<HTMLSelectElement>('#q-0 .match-select').forEach((select, j) => {
      const option = Array.from(select.options).find(o => o.textContent === pairs[j].right) as HTMLOptionElement;
      select.value = option.value;
    });
    (ws.doc.querySelector('#q-0 .match-check') as HTMLElement).click();
    expect(ws.card(0).classList.contains('correct')).toBe(true);
  });

  it('tự luận không được cộng vào số câu đúng', async () => {
    const ws = await openWorksheet([
      { type: 'short_answer', correctAnswer: 'tham khảo' },
      { options: ['1', '2'], correctAnswer: '2' },
    ]);
    (ws.doc.getElementById('text-0') as HTMLTextAreaElement).value = 'bài làm';
    (ws.doc.querySelector('#q-0 .fill-submit') as HTMLElement).click();
    expect(ws.doc.getElementById('correctCount')?.textContent).toBe('0');
    ws.clickOption(1, 0);
    expect(ws.doc.getElementById('summaryScore')?.textContent).toBe('0%');
  });

  it('nội dung chứa </script> không làm hỏng trang', async () => {
    const ws = await openWorksheet([{ content: 'a</script><b>', options: ['1', '2'], correctAnswer: '1' }]);
    expect(ws.card(0).querySelector('.q-content-text')?.textContent).toContain('a</script>');
  });
});
