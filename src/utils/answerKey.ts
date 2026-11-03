import type { AnswerKeyItem, Question, Worksheet } from '../types';

export type AnswerMode = 'options' | 'true_false' | 'fill' | 'matching' | 'text';

type QuestionAnswerFields = Pick<Question, 'type' | 'options' | 'correctAnswer'>;

const OPTION_TYPES = ['multiple_choice', 'counting', 'circle_odd', 'pattern_sequence'];
const MATCHING_TYPES = ['matching', 'shadow_match', 'card_match'];
const TRUE_FALSE_DEFAULT_OPTIONS = ['Đúng', 'Sai'];
const TRUE_ALIASES = ['đúng', 'dung', 'đ', 'true', 't', 'yes', 'right', 'correct', 'vrai'];
const FALSE_ALIASES = ['sai', 's', 'false', 'f', 'no', 'wrong', 'incorrect', 'faux'];

const ANSWER_INTRO = /^(?:đáp án(?:\s+đúng)?(?:\s+là)?|phương án|lựa chọn|chọn|answer(?:\s+is)?|option)\s*[:：-]?\s*/iu;
const BARE_LABEL = /^\(?([A-Za-z]|\d)\)?[.):]?$/u;
const LABELED_TEXT = /^\(?([A-Za-z]|\d)([.):])\s+(.+)$/su;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function getMatchingLabel(index: number): string {
  return String.fromCharCode(97 + index);
}

export function getAnswerMode(q: Pick<Question, 'type' | 'options' | 'matchingPairs'>): AnswerMode {
  if (q.type === 'true_false') return 'true_false';
  if (q.type === 'fill_blank') return 'fill';
  // AI đôi khi bỏ sót options; khi đó học sinh vẫn phải nhập được câu trả lời
  if (OPTION_TYPES.includes(q.type)) return (q.options?.length ?? 0) >= 2 ? 'options' : 'fill';
  if (MATCHING_TYPES.includes(q.type)) return q.matchingPairs?.length ? 'matching' : 'text';
  return 'text';
}

// Hàm này được nhúng nguyên văn vào file HTML xuất ra (qua toString), nên không được gọi hàm hay hằng bên ngoài
export function normalizeAnswerText(text: string): string {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\left|\\right/g, '')
    .replace(/\$|\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/[−–]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([=+\-*/<>,;:])\s*/g, '$1')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/^["'“”‘’\s]+|["'“”‘’.,;:!?…\s]+$/g, '');
}

// Bỏ nhãn AI tự thêm ("A. ...", "1) ...") vì giao diện đã tự đánh nhãn A, B, C, D
function stripOptionLabels(options: string[]): string[] {
  const matches = options.map(o => LABELED_TEXT.exec(o.trim()));
  if (options.length < 2 || matches.some(m => !m)) return options;

  const labels = matches.map(m => m![1].toUpperCase());
  const isSequential = labels.every((l, i) => l === getOptionLabel(i) || l === String(i + 1));
  const isDistinctDotted = new Set(labels).size === labels.length
    && matches.every(m => m![2] === '.' && /[A-Z]/.test(m![1]));

  return isSequential || isDistinctDotted ? matches.map(m => m![3]) : options;
}

function startsWithWord(text: string, prefix: string): boolean {
  return text === prefix || (text.startsWith(prefix) && /^\s/.test(text.slice(prefix.length)));
}

function findLooseOptionIndex(options: string[], answer: string): number {
  const toKeys = [
    normalizeAnswerText,
    (text: string) => normalizeAnswerText(text.replace(EMOJI, '')),
  ];

  for (const toKey of toKeys) {
    const answerKey = toKey(answer);
    if (!answerKey) continue;
    const matched = options.flatMap((option, i) => {
      const optionKey = toKey(option);
      return optionKey && (startsWithWord(optionKey, answerKey) || startsWithWord(answerKey, optionKey)) ? [i] : [];
    });
    if (matched.length === 1) return matched[0];
  }
  return -1;
}

// Thứ tự ưu tiên: khớp nội dung lựa chọn trước, sau đó mới coi là nhãn vị trí.
// Nhờ vậy options ["1","2","3","4"] với đáp án "3" là lựa chọn C, không phải vị trí thứ 3.
export function findCorrectOptionIndex(options: string[], correctAnswer: string): number {
  const raw = String(correctAnswer ?? '').trim();
  if (!raw || options.length === 0) return -1;

  const exact = options.findIndex(o => o.trim() === raw);
  if (exact !== -1) return exact;

  const answer = raw.replace(ANSWER_INTRO, '').trim() || raw;
  const labeled = LABELED_TEXT.exec(answer);
  const bare = BARE_LABEL.exec(answer);
  const plainOptions = stripOptionLabels(options);

  for (const candidate of [answer, labeled?.[3]]) {
    if (!candidate) continue;
    const key = normalizeAnswerText(candidate);
    for (const list of [options, plainOptions]) {
      const index = list.findIndex(o => normalizeAnswerText(o) === key);
      if (index !== -1) return index;
    }
  }

  if (labeled) {
    const index = findLooseOptionIndex(plainOptions, labeled[3]);
    if (index !== -1) return index;
  }

  const label = (bare?.[1] ?? labeled?.[1])?.toUpperCase();
  if (label) {
    const byOwnLabel = options.findIndex(o => LABELED_TEXT.exec(o.trim())?.[1].toUpperCase() === label);
    if (byOwnLabel !== -1) return byOwnLabel;
  }

  const looseIndex = findLooseOptionIndex(plainOptions, answer);
  if (looseIndex !== -1 || !label) return looseIndex;

  const position = /\d/.test(label) ? Number(label) - 1 : label.charCodeAt(0) - 65;
  return position >= 0 && position < options.length ? position : -1;
}

function getTrueFalseValue(text: string): boolean | null {
  const key = normalizeAnswerText(text);
  if (TRUE_ALIASES.includes(key)) return true;
  if (FALSE_ALIASES.includes(key)) return false;
  return null;
}

export function getDisplayOptions(q: Pick<Question, 'type' | 'options'>): string[] {
  const options = q.options?.length ? q.options : q.type === 'true_false' ? TRUE_FALSE_DEFAULT_OPTIONS : [];
  return stripOptionLabels(options);
}

export function getCorrectOptionIndex(q: QuestionAnswerFields): number {
  const options = q.options?.length ? q.options : q.type === 'true_false' ? TRUE_FALSE_DEFAULT_OPTIONS : [];
  if (q.type === 'true_false') {
    const value = getTrueFalseValue(String(q.correctAnswer ?? '').replace(ANSWER_INTRO, ''));
    if (value !== null) {
      const index = options.findIndex(o => getTrueFalseValue(o) === value);
      if (index !== -1) return index;
    }
  }
  return findCorrectOptionIndex(options, q.correctAnswer);
}

// Câu chọn đáp án mà không xác định được đáp án đúng: giáo viên cần sửa, học sinh không bị tính sai
export function hasUnresolvedAnswer(q: Question): boolean {
  const mode = getAnswerMode(q);
  return (mode === 'options' || mode === 'true_false') && getCorrectOptionIndex(q) === -1;
}

export function getAcceptedFillAnswers(correctAnswer: string): string[] {
  const raw = String(correctAnswer ?? '').trim();
  const parts = [raw, raw.replace(ANSWER_INTRO, ''), ...raw.split(/\s+(?:hoặc|or)\s+|\s*\|\s*|\s+\/\s+/iu)];
  return Array.from(new Set(parts.map(normalizeAnswerText).filter(Boolean)));
}

export function isFillAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  return getAcceptedFillAnswers(correctAnswer).includes(normalizeAnswerText(userAnswer));
}

// Trộn cột phải cố định theo id câu hỏi, để phiếu in và đáp án luôn khớp nhau và không có cặp nào nằm cùng hàng
export function getMatchingRightOrder(q: Pick<Question, 'id' | 'matchingPairs'>): number[] {
  const count = q.matchingPairs?.length ?? 0;
  const identity = Array.from({ length: count }, (_, i) => i);
  if (count < 2) return identity;

  let seed = 7;
  for (const char of q.id) seed = (seed * 31 + char.charCodeAt(0)) & 0x7fffffff;

  for (let attempt = 0; attempt < 50; attempt++) {
    const order = [...identity];
    for (let i = count - 1; i > 0; i--) {
      seed = (seed * 16807 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((value, i) => value !== i)) return order;
  }
  return identity.map(i => (i + 1) % count);
}

export function formatCorrectAnswer(q: Question): string {
  const mode = getAnswerMode(q);
  if (mode === 'options' || mode === 'true_false') {
    const index = getCorrectOptionIndex(q);
    if (index === -1) return q.correctAnswer;
    const text = getDisplayOptions(q)[index];
    return mode === 'options' ? `${getOptionLabel(index)}. ${text}` : text;
  }
  if (mode === 'matching') {
    const order = getMatchingRightOrder(q);
    return (q.matchingPairs ?? []).map((_, i) => `${i + 1}-${getMatchingLabel(order.indexOf(i))}`).join(', ');
  }
  return q.correctAnswer;
}

export function getAnswerKeyText(worksheet: Pick<Worksheet, 'questions'>, item: AnswerKeyItem): string {
  const question = worksheet.questions[item.questionIndex - 1];
  return question ? formatCorrectAnswer(question) : item.answer;
}

export function gradeQuestion(q: Question, answer: string | string[]): { isGradable: boolean; isCorrect: boolean } {
  const mode = getAnswerMode(q);

  if (mode === 'options' || mode === 'true_false') {
    const index = getCorrectOptionIndex(q);
    if (index === -1) return { isGradable: false, isCorrect: false };
    return { isGradable: true, isCorrect: answer === getDisplayOptions(q)[index] };
  }
  if (mode === 'fill') {
    if (getAcceptedFillAnswers(q.correctAnswer).length === 0) return { isGradable: false, isCorrect: false };
    return { isGradable: true, isCorrect: isFillAnswerCorrect(String(answer), q.correctAnswer) };
  }
  if (mode === 'matching') {
    const picked = Array.isArray(answer) ? answer : [];
    return { isGradable: true, isCorrect: (q.matchingPairs ?? []).every((pair, i) => picked[i] === pair.right) };
  }
  return { isGradable: false, isCorrect: false };
}

// Đưa câu AI vừa sinh về dạng chuẩn: options không có nhãn, correctAnswer đúng bằng một lựa chọn
export function normalizeQuestionAnswer(q: Question): Question {
  const mode = getAnswerMode(q);
  if (mode !== 'options' && mode !== 'true_false') return q;

  const options = getDisplayOptions(q);
  const index = getCorrectOptionIndex(q);
  return { ...q, options, correctAnswer: index === -1 ? q.correctAnswer : options[index] };
}
