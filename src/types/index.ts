export type QuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'matching'
  | 'true_false'
  | 'short_answer'
  | 'find_error'
  | 'situation'
  | 'mind_map'
  | 'role_play'
  | 'chart_analysis'
  | 'compare'
  | 'extended_writing'
  | 'mini_project'
  | 'card_match'
  | 'self_assess';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GradeLevel = 'primary' | 'secondary' | 'high_school';
export type ContentMode = 'exact' | 'change_context' | 'change_numbers' | 'change_both';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  questionsCount: number;
}

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: Difficulty;
  matchingPairs?: { left: string; right: string }[];
}

export interface Worksheet {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: GradeLevel;
  className?: string;
  schoolName?: string;
  schoolLogo?: string;
  questions: Question[];
  answerKey: AnswerKeyItem[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  language?: string;
}

export interface AnswerKeyItem {
  questionIndex: number;
  answer: string;
  explanation?: string;
}

export type AiProvider = 'gemini' | 'agent-platform';

export interface AppSettings {
  theme: 'light' | 'dark';
  geminiApiKey: string;
  gemini_api_key?: string;
  agent_platform_api_key?: string;
  google_ai_provider?: AiProvider;
  google_ai_provider_selection_source?: 'manual';
  selectedModel: string;
  autoSave: boolean;
  defaultSchoolName: string;
  defaultClassName: string;
}

export interface WorksheetGenerationRequest {
  rawContent: string;
  subjectId: string;
  questionTypes: QuestionType[];
  questionCount: number;
  difficulty: Difficulty;
  gradeLevel: GradeLevel;
  language: string;
  contentMode: ContentMode;
}

export const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Mặc định)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
];

export const AGENT_PLATFORM_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Mặc định)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
];

export interface QuestionTypeInfo {
  id: QuestionType;
  label: string;
  emoji: string;
  description: string;
  detail: string;
}

export const QUESTION_TYPES_DATA: QuestionTypeInfo[] = [
  {
    id: 'multiple_choice',
    label: 'Trắc nghiệm',
    emoji: '📝',
    description: 'Chọn đáp án đúng (A, B, C, D)',
    detail: 'Kiểm tra nhanh mức độ ghi nhớ kiến thức. Phù hợp tất cả môn học.',
  },
  {
    id: 'fill_blank',
    label: 'Điền khuyết',
    emoji: '✏️',
    description: 'Điền từ/cụm từ còn thiếu vào chỗ trống',
    detail: 'Rèn khả năng ghi nhớ chính xác nội dung trọng tâm.',
  },
  {
    id: 'matching',
    label: 'Nối cột',
    emoji: '🔗',
    description: 'Ghép thông tin giữa hai cột tương ứng',
    detail: 'Giúp học sinh nhận diện mối liên hệ kiến thức.',
  },
  {
    id: 'true_false',
    label: 'Đúng/Sai',
    emoji: '✅',
    description: 'Xác định tính chính xác của nhận định',
    detail: 'Phù hợp kiểm tra hiểu biết cơ bản.',
  },
  {
    id: 'short_answer',
    label: 'Tự luận ngắn',
    emoji: '🖊️',
    description: 'Trả lời ngắn gọn theo yêu cầu',
    detail: 'Đánh giá khả năng diễn đạt và hiểu vấn đề.',
  },
  {
    id: 'find_error',
    label: 'Tìm lỗi sai',
    emoji: '🔎',
    description: 'Phát hiện và sửa nội dung chưa chính xác',
    detail: 'Rèn tư duy phản biện và phân tích. Phù hợp Toán, Ngữ văn, Tiếng Anh.',
  },
  {
    id: 'situation',
    label: 'Tình huống – Giải quyết vấn đề',
    emoji: '💡',
    description: 'Đưa ra tình huống thực tế',
    detail: 'Học sinh đề xuất phương án xử lý phù hợp. Rèn kỹ năng tư duy ứng dụng.',
  },
  {
    id: 'mind_map',
    label: 'Sơ đồ tư duy',
    emoji: '🧠',
    description: 'Hoàn thành sơ đồ còn thiếu hoặc tự thiết kế',
    detail: 'Giúp hệ thống hóa và ghi nhớ kiến thức sâu hơn.',
  },
  {
    id: 'role_play',
    label: 'Nhập vai',
    emoji: '🎭',
    description: 'Đóng vai nhân vật hoặc chuyên gia',
    detail: 'Viết bài phát biểu, nhật ký, phỏng vấn sáng tạo. Phù hợp Ngữ văn, Lịch sử.',
  },
  {
    id: 'chart_analysis',
    label: 'Phân tích bảng / biểu đồ',
    emoji: '📊',
    description: 'Quan sát số liệu và rút ra nhận xét',
    detail: 'Phát triển kỹ năng phân tích và tổng hợp. Phù hợp Toán, Địa lý, Sinh học.',
  },
  {
    id: 'compare',
    label: 'So sánh – Đối chiếu',
    emoji: '⚖️',
    description: 'Chỉ ra điểm giống và khác giữa hai nội dung',
    detail: 'Thường trình bày dưới dạng bảng để rõ ràng hơn.',
  },
  {
    id: 'extended_writing',
    label: 'Viết mở rộng',
    emoji: '✍️',
    description: 'Viết đoạn nghị luận hoặc cảm nhận sâu hơn',
    detail: 'Khuyến khích tư duy sáng tạo và diễn đạt cá nhân.',
  },
  {
    id: 'mini_project',
    label: 'Dự án nhỏ (Mini Project)',
    emoji: '🎯',
    description: 'Tìm hiểu chủ đề trong 1–3 ngày',
    detail: 'Có sản phẩm: poster, video, thuyết trình. Phù hợp học tập theo dự án.',
  },
  {
    id: 'card_match',
    label: 'Ghép thẻ kiến thức',
    emoji: '🧩',
    description: 'Cắt rời nội dung → học sinh sắp xếp logic',
    detail: 'Tăng tính tương tác và ghi nhớ sâu.',
  },
  {
    id: 'self_assess',
    label: 'Tự đánh giá',
    emoji: '📌',
    description: 'Học sinh tự chấm mức độ hiểu bài',
    detail: 'Tự phản hồi sau giờ học. Phù hợp cuối tiết hoặc cuối chương.',
  },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES_DATA.map(t => [t.id, t.label])
) as Record<QuestionType, string>;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  primary: 'Tiểu học',
  secondary: 'THCS',
  high_school: 'THPT',
};

export const CONTENT_MODE_LABELS: Record<ContentMode, string> = {
  exact: 'Giữ nguyên nội dung gốc',
  change_context: 'Thay đổi ngữ cảnh',
  change_numbers: 'Thay đổi con số',
  change_both: 'Đổi ngữ cảnh + con số',
};

export const CONTENT_MODE_DESCRIPTIONS: Record<ContentMode, string> = {
  exact: 'Tạo phiếu bám sát nội dung gốc, không thay đổi',
  change_context: 'Giữ dạng bài, đổi ngữ cảnh/tình huống mới',
  change_numbers: 'Giữ cấu trúc, thay đổi số liệu/dữ kiện',
  change_both: 'Đổi cả ngữ cảnh lẫn số liệu, tạo bài hoàn toàn mới',
};

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'math', name: 'Toán học', icon: 'Calculator', color: '#14b8a6', questionsCount: 0 },
  { id: 'physics', name: 'Vật lý', icon: 'Atom', color: '#f59e0b', questionsCount: 0 },
  { id: 'chemistry', name: 'Hóa học', icon: 'FlaskConical', color: '#10b981', questionsCount: 0 },
  { id: 'biology', name: 'Sinh học', icon: 'Leaf', color: '#22c55e', questionsCount: 0 },
  { id: 'literature', name: 'Ngữ văn', icon: 'BookOpen', color: '#ef4444', questionsCount: 0 },
  { id: 'english', name: 'Tiếng Anh', icon: 'Globe', color: '#8b5cf6', questionsCount: 0 },
  { id: 'history', name: 'Lịch sử', icon: 'Landmark', color: '#f59e0b', questionsCount: 0 },
  { id: 'geography', name: 'Địa lý', icon: 'MapPin', color: '#06b6d4', questionsCount: 0 },
  { id: 'informatics', name: 'Tin học', icon: 'Monitor', color: '#6366f1', questionsCount: 0 },
];

export const LANGUAGES = [
  { id: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
];

export const SUBJECT_ICON_OPTIONS = [
  'Calculator', 'Atom', 'FlaskConical', 'Leaf', 'BookOpen',
  'Globe', 'Landmark', 'MapPin', 'Monitor', 'Music',
  'Palette', 'Heart', 'Dumbbell', 'Scale', 'Lightbulb',
  'Microscope', 'Wrench', 'GraduationCap', 'Building', 'Star',
];
