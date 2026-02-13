import type { Worksheet, Question } from '../types';

const sampleMathQuestions: Question[] = [
  {
    id: 'demo_1',
    content: 'Kết quả của phép tính $15 \\times 4 + 20$ là bao nhiêu?',
    type: 'multiple_choice',
    options: ['60', '80', '100', '75'],
    correctAnswer: '80',
    explanation: '$15 \\times 4 = 60$, sau đó $60 + 20 = 80$',
    difficulty: 'easy',
  },
  {
    id: 'demo_2',
    content: 'Điền số thích hợp vào chỗ trống: $\\frac{3}{4} + \\text{___} = 1$',
    type: 'fill_blank',
    correctAnswer: '1/4',
    explanation: '$1 - \\frac{3}{4} = \\frac{4}{4} - \\frac{3}{4} = \\frac{1}{4}$',
    difficulty: 'easy',
  },
  {
    id: 'demo_3',
    content: 'Nối các hình với số cạnh tương ứng:',
    type: 'matching',
    correctAnswer: 'Tam giác - 3 cạnh, Tứ giác - 4 cạnh, Ngũ giác - 5 cạnh, Lục giác - 6 cạnh',
    matchingPairs: [
      { left: 'Tam giác', right: '3 cạnh' },
      { left: 'Tứ giác', right: '4 cạnh' },
      { left: 'Ngũ giác', right: '5 cạnh' },
      { left: 'Lục giác', right: '6 cạnh' },
    ],
    difficulty: 'easy',
  },
  {
    id: 'demo_4',
    content: 'Đúng hay sai: "Tổng ba góc trong một tam giác bằng $180°$"',
    type: 'true_false',
    options: ['Đúng', 'Sai'],
    correctAnswer: 'Đúng',
    explanation: 'Đây là định lý cơ bản trong hình học phẳng',
    difficulty: 'easy',
  },
];

const sampleEnglishQuestions: Question[] = [
  {
    id: 'demo_5',
    content: 'Choose the correct form: She ___ to school every day.',
    type: 'multiple_choice',
    options: ['go', 'goes', 'going', 'went'],
    correctAnswer: 'goes',
    explanation: 'Subject "She" requires third person singular form "goes" in present simple tense.',
    difficulty: 'easy',
  },
  {
    id: 'demo_6',
    content: 'Fill in the blank: I have ___ finished my homework.',
    type: 'fill_blank',
    correctAnswer: 'already',
    explanation: '"Already" is used with present perfect tense to indicate completion.',
    difficulty: 'medium',
  },
  {
    id: 'demo_7',
    content: 'Nối từ tiếng Anh với nghĩa tiếng Việt:',
    type: 'matching',
    correctAnswer: 'Beautiful - Đẹp, Intelligent - Thông minh, Brave - Dũng cảm, Kind - Tốt bụng',
    matchingPairs: [
      { left: 'Beautiful', right: 'Đẹp' },
      { left: 'Intelligent', right: 'Thông minh' },
      { left: 'Brave', right: 'Dũng cảm' },
      { left: 'Kind', right: 'Tốt bụng' },
    ],
    difficulty: 'easy',
  },
];

export const SAMPLE_WORKSHEETS: Worksheet[] = [
  {
    id: 'sample_1',
    title: 'Ôn tập Toán lớp 5 - Phép tính và Hình học',
    subjectId: 'math',
    subjectName: 'Toán học',
    gradeLevel: 'primary',
    className: 'Lớp 5A1',
    schoolName: 'Trường Tiểu học Nguyễn Trãi',
    questions: sampleMathQuestions,
    answerKey: sampleMathQuestions.map((q, i) => ({
      questionIndex: i + 1,
      answer: q.correctAnswer,
      explanation: q.explanation,
    })),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['ôn-tập', 'học-kỳ-1'],
  },
  {
    id: 'sample_2',
    title: 'English Grammar - Present Tenses',
    subjectId: 'english',
    subjectName: 'Tiếng Anh',
    gradeLevel: 'secondary',
    className: 'Lớp 7A2',
    schoolName: 'Trường THCS Lê Lợi',
    questions: sampleEnglishQuestions,
    answerKey: sampleEnglishQuestions.map((q, i) => ({
      questionIndex: i + 1,
      answer: q.correctAnswer,
      explanation: q.explanation,
    })),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    tags: ['grammar', 'present-tense'],
  },
];
