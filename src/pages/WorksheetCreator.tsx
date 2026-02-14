import { useState, useCallback, useRef } from 'react';
import {
  Sparkles, ChevronRight, ChevronLeft, FileText, CheckCircle,
  Loader2, AlertCircle, Upload, FileUp, X, ChevronDown, Zap,
  ArrowUp, ArrowDown, Image,
} from 'lucide-react';
import type {
  QuestionType, Difficulty, GradeLevel, ContentMode, Question, Worksheet,
} from '../types';
import {
  QUESTION_TYPES_DATA, DIFFICULTY_LABELS,
  GRADE_LEVEL_LABELS, CONTENT_MODE_LABELS, CONTENT_MODE_DESCRIPTIONS, LANGUAGES,
} from '../types';
import { generateWorksheetQuestions, analyzeContentForTypes, analyzeImage } from '../utils/geminiApi';
import { generateId, getSettings, saveWorksheet, getAllSubjects } from '../utils/storage';
import { parseUploadedFile, getAcceptedFileTypes, getFileTypeLabel } from '../utils/fileParser';
import QuestionCard from '../components/QuestionCard';
import QuestionEditor from '../components/QuestionEditor';
import SubjectManager from '../components/SubjectManager';

interface Props {
  onCreated: (ws: Worksheet) => void;
}

type Step = 'input' | 'configure' | 'generating' | 'preview';

export default function WorksheetCreator({ onCreated }: Props) {
  const settings = getSettings();
  const [step, setStep] = useState<Step>('input');
  const [rawContent, setRawContent] = useState('');
  const [subjectId, setSubjectId] = useState('math');
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple_choice']);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('secondary');
  const [contentMode, setContentMode] = useState<ContentMode>('exact');
  const [language, setLanguage] = useState('vi');
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState(settings.defaultClassName);
  const [schoolName, setSchoolName] = useState(settings.defaultSchoolName);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showSubjectManager, setShowSubjectManager] = useState(false);

  // File upload state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expand/collapse for question type details
  const [expandedType, setExpandedType] = useState<QuestionType | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const toggleType = (t: QuestionType) => {
    setQuestionTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const text = await parseUploadedFile(file);
      if (!text.trim()) {
        setError('Không thể trích xuất nội dung từ file. Vui lòng thử file khác.');
        return;
      }
      setRawContent(text);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(`Lỗi đọc file: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const text = await analyzeImage(base64, file.type);
      if (!text.trim()) {
        setError('Không nhận dạng được nội dung từ ảnh.');
        return;
      }
      setRawContent(prev => prev ? prev + '\n\n' + text : text);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(`Lỗi OCR: ${err instanceof Error ? err.message : 'Không xác định'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        handleFileUpload(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        handleFileUpload(file);
      }
    }
    e.target.value = '';
  };

  const clearUploadedFile = () => {
    setUploadedFileName('');
    setRawContent('');
  };

  const handleAnalyze = async () => {
    if (!rawContent.trim()) {
      setError('Vui lòng nhập nội dung trước khi phân tích!');
      return;
    }
    if (!settings.geminiApiKey) {
      setError('Vui lòng nhập API Key trong phần Cài đặt!');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const suggested = await analyzeContentForTypes(rawContent, subjectId);
      setQuestionTypes(suggested);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi phân tích nội dung');
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = useCallback(async () => {
    if (!rawContent.trim()) {
      setError('Vui lòng nhập nội dung bài giảng hoặc chủ đề!');
      return;
    }
    if (!settings.geminiApiKey) {
      setError('Vui lòng nhập API Key trong phần Cài đặt!');
      return;
    }
    if (questionTypes.length === 0) {
      setError('Vui lòng chọn ít nhất một dạng bài tập!');
      return;
    }

    setError('');
    setStep('generating');

    try {
      const result = await generateWorksheetQuestions({
        rawContent,
        subjectId,
        questionTypes,
        questionCount,
        difficulty,
        gradeLevel,
        language,
        contentMode,
      });
      setQuestions(result);
      if (!title) {
        const sub = getAllSubjects().find(s => s.id === subjectId);
        setTitle(`Phiếu bài tập ${sub?.name || ''} - ${GRADE_LEVEL_LABELS[gradeLevel]}`);
      }
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setStep('configure');
    }
  }, [rawContent, subjectId, questionTypes, questionCount, difficulty, gradeLevel, contentMode, settings.geminiApiKey, title]);

  const handleSave = () => {
    const sub = getAllSubjects().find(s => s.id === subjectId);
    const ws: Worksheet = {
      id: generateId(),
      title: title || `Phiếu bài tập ${sub?.name || ''}`,
      subjectId,
      subjectName: sub?.name || '',
      gradeLevel,
      className,
      schoolName,
      questions,
      answerKey: questions.map((q, i) => ({
        questionIndex: i + 1,
        answer: q.correctAnswer,
        explanation: q.explanation,
      })),
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveWorksheet(ws);
    onCreated(ws);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (updated: Question) => {
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
    setEditingQuestion(null);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mt-6">AI đang tạo phiếu bài tập...</h3>
        <p className="text-slate-400 text-sm mt-2">Vui lòng đợi trong giây lát</p>
        <div className="mt-6 w-64 h-2 bg-teal-50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full animate-loading-bar" />
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Xem trước phiếu bài tập</h2>
            <p className="text-slate-500 text-sm mt-1">{questions.length} câu hỏi đã được tạo</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('configure')}
              className="btn-raised btn-raised-white flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              onClick={handleSave}
              className="btn-raised btn-raised-teal flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              Lưu phiếu
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-xl font-bold text-slate-800 w-full border-none outline-none bg-transparent"
            placeholder="Tiêu đề phiếu bài tập"
          />
          <div className="flex gap-4 mt-2">
            <input
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              className="text-sm text-slate-400 border-none outline-none bg-transparent"
              placeholder="Tên trường"
            />
            <input
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="text-sm text-slate-400 border-none outline-none bg-transparent"
              placeholder="Lớp"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`btn-raised px-4 py-2 rounded-xl text-sm font-medium transition-all ${showAnswers ? 'bg-emerald-50 text-emerald-700 btn-raised-emerald' : 'bg-slate-100 text-slate-600 btn-raised-white'
              }`}
          >
            {showAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2">
              <div className="flex flex-col gap-1 pt-5">
                <button
                  onClick={() => moveQuestion(i, 'up')}
                  disabled={i === 0}
                  className="p-1 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveQuestion(i, 'down')}
                  disabled={i === questions.length - 1}
                  className="p-1 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <QuestionCard
                  question={q}
                  index={i}
                  showAnswer={showAnswers}
                  onEdit={() => setEditingQuestion(q)}
                  onDelete={() => deleteQuestion(q.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion}
            onSave={updateQuestion}
            onClose={() => setEditingQuestion(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tạo phiếu bài tập mới</h2>
          <p className="text-slate-500 text-sm mt-1">Nhập nội dung và tùy chỉnh để AI tạo phiếu tự động</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            {/* File Upload Zone */}
            <div
              className={`drop-zone rounded-2xl p-6 text-center cursor-pointer transition-all ${dragOver ? 'drag-over' : 'bg-teal-50/30'
                }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={`${getAcceptedFileTypes()},.jpg,.jpeg,.png,.webp`}
                className="hidden"
                onChange={handleFileInputChange}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
                  <p className="text-sm text-teal-600 font-medium">Đang xử lý...</p>
                </div>
              ) : uploadedFileName ? (
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-xl">
                    <FileUp className="w-5 h-5 text-teal-600" />
                    <span className="text-sm font-medium text-teal-700">{uploadedFileName}</span>
                    <span className="text-xs text-teal-500">({getFileTypeLabel(uploadedFileName)})</span>
                    <button
                      onClick={e => { e.stopPropagation(); clearUploadedFile(); }}
                      className="ml-1 p-0.5 rounded-full hover:bg-teal-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-teal-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-teal-500" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Image className="w-6 h-6 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả file hoặc <span className="text-teal-600 underline">chọn file</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ: DOCX, PDF, TXT | Ảnh: JPG, PNG, WebP (OCR)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Nội dung bài giảng / Chủ đề
              </label>
              <textarea
                value={rawContent}
                onChange={e => setRawContent(e.target.value)}
                rows={8}
                placeholder={"Dán nội dung bài giảng, chủ đề, hoặc danh sách câu hỏi thô vào đây...\n\nVí dụ: Bài 5 - Phương trình bậc hai $ax^2 + bx + c = 0$. Tìm nghiệm của phương trình bậc hai bằng công thức delta..."}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">{rawContent.length} ký tự</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!rawContent.trim()) {
                    setError('Vui lòng nhập nội dung!');
                    return;
                  }
                  setError('');
                  setStep('configure');
                }}
                className="btn-raised btn-raised-teal flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold transition-all"
              >
                Tiếp tục
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Settings */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Môn học</label>
                    <button
                      onClick={() => setShowSubjectManager(true)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      + Thêm môn học
                    </button>
                  </div>
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white"
                  >
                    {getAllSubjects().map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cấp học</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(GRADE_LEVEL_LABELS) as [GradeLevel, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setGradeLevel(key)}
                        className={`btn-raised py-2.5 rounded-xl text-sm font-medium transition-all ${gradeLevel === key
                          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25 btn-raised-teal'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 btn-raised-white'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Độ khó</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setDifficulty(key)}
                        className={`btn-raised py-2.5 rounded-xl text-sm font-medium transition-all ${difficulty === key
                          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25 btn-raised-teal'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 btn-raised-white'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Số câu hỏi: {questionCount}</label>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>3</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Content Mode */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Chế độ tạo phiếu</label>
                  <div className="space-y-2">
                    {(Object.entries(CONTENT_MODE_LABELS) as [ContentMode, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setContentMode(key)}
                        className={`btn-raised w-full flex flex-col px-4 py-3 rounded-xl text-sm transition-all text-left ${contentMode === key
                          ? 'bg-teal-50 text-teal-700 border-2 border-teal-300 btn-raised-teal'
                          : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100 btn-raised-white'
                          }`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className={`text-xs mt-0.5 ${contentMode === key ? 'text-teal-500' : 'text-slate-400'}`}>
                          {CONTENT_MODE_DESCRIPTIONS[key]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Ngôn ngữ câu hỏi</label>
                  <div className="flex gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => setLanguage(lang.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${language === lang.id
                          ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column: Question Types */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Dạng bài tập <span className="text-teal-500 font-normal">({questionTypes.length} đã chọn)</span>
                    </label>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing || !rawContent.trim()}
                      className="btn-raised btn-raised-teal flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-400 text-white text-xs font-medium disabled:opacity-50 transition-all"
                    >
                      {analyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      {analyzing ? 'Đang phân tích...' : 'Phân tích AI'}
                    </button>
                  </div>

                  {analyzing && (
                    <div className="mb-3 p-3 rounded-xl bg-teal-50 border border-teal-100 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                      <p className="text-xs text-teal-600">AI đang phân tích nội dung và đề xuất dạng bài phù hợp...</p>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                    {QUESTION_TYPES_DATA.map(typeInfo => {
                      const isSelected = questionTypes.includes(typeInfo.id);
                      const isExpanded = expandedType === typeInfo.id;

                      return (
                        <div key={typeInfo.id} className="rounded-xl overflow-hidden">
                          <div
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all cursor-pointer ${isSelected
                              ? 'bg-teal-50 text-teal-700 border-2 border-teal-200'
                              : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                              }`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleType(typeInfo.id)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300 hover:border-teal-300'
                                }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M3 6L5.5 8.5L9 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>

                            {/* Emoji + Label + Description */}
                            <div
                              className="flex-1 min-w-0"
                              onClick={() => setExpandedType(isExpanded ? null : typeInfo.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">{typeInfo.emoji}</span>
                                <span className="font-medium truncate">{typeInfo.label}</span>
                              </div>
                              <p className={`text-xs mt-0.5 ${isSelected ? 'text-teal-500' : 'text-slate-400'}`}>
                                {typeInfo.description}
                              </p>
                            </div>

                            {/* Expand arrow */}
                            <button
                              onClick={() => setExpandedType(isExpanded ? null : typeInfo.id)}
                              className="p-1 rounded-md hover:bg-teal-100/50 transition-colors flex-shrink-0"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-teal-500' : 'text-slate-400'
                                }`} />
                            </button>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className={`px-4 py-3 text-xs leading-relaxed border-x-2 border-b-2 rounded-b-xl animate-in ${isSelected
                              ? 'bg-teal-50/50 border-teal-200 text-teal-600'
                              : 'bg-slate-50/50 border-transparent text-slate-500'
                              }`}>
                              <p>💡 {typeInfo.detail}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">Nội dung đã nhập</p>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3">{rawContent}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('input')}
                className="btn-raised btn-raised-white flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Quay lại
              </button>
              <button
                onClick={generate}
                className="btn-raised btn-raised-teal flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white text-sm font-semibold transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Tạo phiếu bài tập
              </button>
            </div>
          </div>
        )}
      </div>
      <SubjectManager
        isOpen={showSubjectManager}
        onClose={() => setShowSubjectManager(false)}
      />
    </>
  );
}
