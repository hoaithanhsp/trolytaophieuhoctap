import { describe, expect, it } from 'vitest';
import {
  findCorrectOptionIndex,
  formatCorrectAnswer,
  getAnswerKeyText,
  getAnswerMode,
  getCorrectOptionIndex,
  getDisplayOptions,
  getMatchingRightOrder,
  gradeQuestion,
  hasUnresolvedAnswer,
  isFillAnswerCorrect,
  normalizeAnswerText,
  normalizeQuestionAnswer,
} from '../answerKey';
import { parseGeneratedQuestions } from '../geminiApi';
import type { Question } from '../../types';

const question = (overrides: Partial<Question>): Question => ({
  id: 'q1',
  content: 'Câu hỏi',
  type: 'multiple_choice',
  correctAnswer: '',
  difficulty: 'easy',
  ...overrides,
});

const CITIES = ['Hà Nội', 'Huế', 'Đà Nẵng', 'Cần Thơ'];

describe('findCorrectOptionIndex', () => {
  it.each<[string, string[], string, number]>([
    ['nội dung là số', ['1', '2', '3', '4'], '3', 2],
    ['số xáo trộn không bị hiểu là vị trí', ['4', '2', '1', '3'], '1', 2],
    ['nội dung là chữ L M N Q', ['L', 'M', 'N', 'Q'], 'N', 2],
    ['nội dung là chữ cái xáo trộn', ['B', 'A', 'D', 'C'], 'A', 1],
    ['nhãn A-D khi lựa chọn là văn bản', CITIES, 'B', 1],
    ['nhãn chữ thường', CITIES, 'c', 2],
    ['nhãn có dấu chấm', CITIES, 'D.', 3],
    ['nhãn trong ngoặc', CITIES, '(B)', 1],
    ['câu dẫn "Đáp án"', CITIES, 'Đáp án: C', 2],
    ['số thứ tự khi lựa chọn là văn bản', CITIES, '2', 1],
    ['nhãn kèm nội dung', CITIES, 'C. Đà Nẵng', 2],
    ['nhãn kèm nội dung lệch vị trí thì tin nội dung', CITIES, 'A. Huế', 1],
    ['lựa chọn có nhãn A-D', ['A. 60', 'B. 80', 'C. 100', 'D. 75'], '80', 1],
    ['lựa chọn có nhãn, đáp án là nhãn', ['A. 60', 'B. 80', 'C. 100', 'D. 75'], 'C', 2],
    ['lựa chọn có nhãn L M N Q', ['L. mèo', 'M. chó', 'N. gà', 'Q. vịt'], 'M', 1],
    ['lựa chọn có nhãn 1-4', ['1. mèo', '2. chó', '3. gà', '4. vịt'], '3', 2],
    ['khác hoa thường', ['Mèo', 'Chó', 'Gà', 'Vịt'], 'chó', 1],
    ['khác khoảng trắng và dấu câu', ['Mèo', 'Chó con', 'Gà', 'Vịt'], '  chó   con. ', 1],
    ['khác dấu $ của LaTeX', ['$x=1$', '$x=2$', '$x=3$', '$x=4$'], 'x = 3', 2],
    ['thiếu emoji', ['🐟 Cá heo', '🐙 Bạch tuộc', '🦀 Cua biển', '🐱 Mèo con'], 'Mèo con', 3],
    ['chỉ có emoji', ['🔴', '🔵', '🟢', '🟡'], '🔵 Xanh', 1],
    ['đáp án thiếu đơn vị', ['2 con', '12 con', '4 con', '14 con'], '4', 2],
  ])('%s', (_name, options, answer, expected) => {
    expect(findCorrectOptionIndex(options, answer)).toBe(expected);
  });

  it.each<[string, string[], string]>([
    ['rỗng', ['1', '2'], ''],
    ['không khớp gì', ['Mèo', 'Chó'], 'Gà'],
    ['nhãn ngoài phạm vi', ['Mèo', 'Chó'], 'L'],
    ['số thứ tự ngoài phạm vi và không khớp lựa chọn nào', ['10', '12', '15', '18'], '7'],
    ['nhiều lựa chọn cùng khớp thì không tự đoán', ['4 con mèo', '4 con chó'], '4 con'],
  ])('trả -1 khi %s', (_name, options, answer) => {
    expect(findCorrectOptionIndex(options, answer)).toBe(-1);
  });
});

describe('getDisplayOptions', () => {
  it('bỏ nhãn trùng với nhãn giao diện', () => {
    expect(getDisplayOptions(question({ options: ['A. mèo', 'B. chó'] }))).toEqual(['mèo', 'chó']);
    expect(getDisplayOptions(question({ options: ['1) mèo', '2) chó'] }))).toEqual(['mèo', 'chó']);
  });

  it('giữ nguyên lựa chọn có tiền tố là nội dung thật', () => {
    expect(getDisplayOptions(question({ options: ['x: 5', 'y: 6'] }))).toEqual(['x: 5', 'y: 6']);
    expect(getDisplayOptions(question({ options: ['1.5', '2.5'] }))).toEqual(['1.5', '2.5']);
    expect(getDisplayOptions(question({ options: ['A. mèo', 'chó'] }))).toEqual(['A. mèo', 'chó']);
  });

  it('đúng/sai thiếu options thì dùng mặc định', () => {
    expect(getDisplayOptions(question({ type: 'true_false' }))).toEqual(['Đúng', 'Sai']);
  });
});

describe('đúng/sai', () => {
  it.each<[string, number]>([
    ['Đúng', 0], ['đúng', 0], ['Đ', 0], ['true', 0], ['Đáp án: Sai', 1], ['Sai.', 1], ['S', 1], ['False', 1], ['A', 0], ['B', 1],
  ])('đáp án "%s"', (correctAnswer, expected) => {
    expect(getCorrectOptionIndex(question({ type: 'true_false', options: ['Đúng', 'Sai'], correctAnswer }))).toBe(expected);
  });

  it('options tiếng Anh, đáp án tiếng Việt', () => {
    expect(getCorrectOptionIndex(question({ type: 'true_false', options: ['True', 'False'], correctAnswer: 'Sai' }))).toBe(1);
  });
});

describe('điền khuyết', () => {
  it.each([
    ['Hà Nội', 'hà  nội'],
    ['already', 'Already.'],
    ['0,5', '0.5'],
    ['$\\frac{1}{4}$', '1/4'],
    ['$x = 2$', 'x=2'],
    ['a hoặc an', 'an'],
    ['2 | hai', 'hai'],
    ['Đáp án: goes', 'goes'],
  ])('"%s" chấp nhận "%s"', (correct, user) => {
    expect(isFillAnswerCorrect(user, correct)).toBe(true);
  });

  it.each([
    ['1/4', '1/5'],
    ['goes', 'go'],
    ['x+2', 'x-2'],
    ['goes', ''],
    ['', ''],
  ])('"%s" không chấp nhận "%s"', (correct, user) => {
    expect(isFillAnswerCorrect(user, correct)).toBe(false);
  });

  it('hàm chuẩn hóa chạy được khi nhúng nguyên văn vào file HTML', () => {
    const embedded = new Function(`return ${normalizeAnswerText.toString()}`)() as typeof normalizeAnswerText;
    expect(embedded(' $\\frac{1}{4}$. ')).toBe('1/4');
  });
});

describe('getAnswerMode', () => {
  it('trắc nghiệm thiếu options thì cho nhập câu trả lời', () => {
    expect(getAnswerMode({ type: 'multiple_choice' })).toBe('fill');
    expect(getAnswerMode({ type: 'counting', options: ['1', '2'] })).toBe('options');
  });

  it('nối cột thiếu cặp thì cho viết câu trả lời', () => {
    expect(getAnswerMode({ type: 'matching' })).toBe('text');
  });
});

describe('gradeQuestion', () => {
  it('không còn chấm đúng nhầm khi đáp án là tiền tố của lựa chọn khác', () => {
    const q = question({ options: ['1', '10', '12', '15'], correctAnswer: '1' });
    expect(gradeQuestion(q, '10').isCorrect).toBe(false);
    expect(gradeQuestion(q, '1').isCorrect).toBe(true);
  });

  it('đáp án rỗng không làm mọi lựa chọn thành đúng, cũng không tính sai', () => {
    const q = question({ options: ['Một', 'Hai'], correctAnswer: '' });
    expect(gradeQuestion(q, 'Một')).toEqual({ isGradable: false, isCorrect: false });
    expect(hasUnresolvedAnswer(q)).toBe(true);
  });

  it('so sánh với lựa chọn đã bỏ nhãn', () => {
    expect(gradeQuestion(question({ options: ['A. 60', 'B. 80'], correctAnswer: 'B' }), '80').isCorrect).toBe(true);
  });

  it('nối cột phải đúng tất cả các cặp', () => {
    const q = question({ type: 'matching', matchingPairs: [{ left: 'a', right: '1' }, { left: 'b', right: '2' }] });
    expect(gradeQuestion(q, ['1', '2']).isCorrect).toBe(true);
    expect(gradeQuestion(q, ['2', '1']).isCorrect).toBe(false);
  });

  it('tự luận không tự chấm', () => {
    expect(gradeQuestion(question({ type: 'short_answer', correctAnswer: 'x' }), 'x').isGradable).toBe(false);
  });
});

describe('getMatchingRightOrder', () => {
  const pairs = Array.from({ length: 5 }, (_, i) => ({ left: `l${i}`, right: `r${i}` }));

  it('là hoán vị ổn định và không để cặp đúng nằm cùng hàng', () => {
    for (const id of ['q_1', 'q_2', 'abc', 'xyz', 'q_1773_0']) {
      const order = getMatchingRightOrder({ id, matchingPairs: pairs });
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(order.every((value, i) => value !== i)).toBe(true);
      expect(getMatchingRightOrder({ id, matchingPairs: pairs })).toEqual(order);
    }
  });

  it('đáp án nối cột khớp với thứ tự hiển thị', () => {
    const q = question({ type: 'matching', matchingPairs: pairs });
    const order = getMatchingRightOrder(q);
    formatCorrectAnswer(q).split(', ').forEach((entry, i) => {
      const [left, letter] = entry.split('-');
      expect(Number(left)).toBe(i + 1);
      expect(order[letter.charCodeAt(0) - 97]).toBe(i);
    });
  });
});

describe('đáp án hiển thị', () => {
  it('ghi kèm nhãn lựa chọn', () => {
    expect(formatCorrectAnswer(question({ options: ['1', '2', '3', '4'], correctAnswer: '3' }))).toBe('C. 3');
    expect(formatCorrectAnswer(question({ options: ['L', 'M', 'N', 'Q'], correctAnswer: 'M' }))).toBe('B. M');
    expect(formatCorrectAnswer(question({ type: 'true_false', options: ['Đúng', 'Sai'], correctAnswer: 's' }))).toBe('Sai');
  });

  it('bảng đáp án của phiếu đã lưu dùng theo câu hỏi', () => {
    const ws = { questions: [question({ options: ['60', '80'], correctAnswer: '80' })] };
    expect(getAnswerKeyText(ws, { questionIndex: 1, answer: '80' })).toBe('B. 80');
    expect(getAnswerKeyText(ws, { questionIndex: 9, answer: 'cũ' })).toBe('cũ');
  });
});

describe('normalizeQuestionAnswer', () => {
  it('đưa đáp án về đúng nội dung lựa chọn', () => {
    const q = normalizeQuestionAnswer(question({ options: ['A. 60', 'B. 80', 'C. 100'], correctAnswer: 'B' }));
    expect(q.options).toEqual(['60', '80', '100']);
    expect(q.correctAnswer).toBe('80');
  });

  it('giữ nguyên câu không có lựa chọn', () => {
    const q = question({ type: 'fill_blank', correctAnswer: 'x' });
    expect(normalizeQuestionAnswer(q)).toBe(q);
  });
});

describe('parseGeneratedQuestions', () => {
  const request = { questionTypes: ['multiple_choice', 'fill_blank'] as Question['type'][], difficulty: 'medium' as const };

  it('chuẩn hóa nhãn và đáp án AI trả về', () => {
    const [q] = parseGeneratedQuestions(
      [{ content: 'c', type: 'multiple_choice', options: ['A. 60', 'B. 80'], correctAnswer: 'B', difficulty: 'easy' }],
      request,
    );
    expect(q.options).toEqual(['60', '80']);
    expect(q.correctAnswer).toBe('80');
    expect(q.difficulty).toBe('easy');
  });

  it('giữ được đáp án là số 0', () => {
    const [q] = parseGeneratedQuestions(
      [{ content: 'c', type: 'multiple_choice', options: [2, 1, 0, -1], correctAnswer: 0 }],
      request,
    );
    expect(q.correctAnswer).toBe('0');
    expect(getCorrectOptionIndex(q)).toBe(2);
  });

  it('thay mã dạng và độ khó không hợp lệ bằng giá trị đã yêu cầu', () => {
    const [withOptions, withoutOptions] = parseGeneratedQuestions(
      [
        { content: 'c', type: 'trắc nghiệm', options: ['x', 'y'], correctAnswer: 'x', difficulty: 'rất khó' },
        { content: 'c', correctAnswer: 'x' },
      ],
      { ...request, questionTypes: ['fill_blank', 'multiple_choice'] },
    );
    expect(withOptions.type).toBe('multiple_choice');
    expect(withOptions.difficulty).toBe('medium');
    expect(withoutOptions.type).toBe('fill_blank');
  });
});
