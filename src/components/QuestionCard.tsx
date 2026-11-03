import { Trash2, Edit3, GripVertical, AlertTriangle } from 'lucide-react';
import type { Question } from '../types';
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import MathRenderer from './MathRenderer';
import {
  formatCorrectAnswer,
  getAnswerMode,
  getCorrectOptionIndex,
  getDisplayOptions,
  getMatchingLabel,
  getMatchingRightOrder,
  getOptionLabel,
  hasUnresolvedAnswer,
} from '../utils/answerKey';

interface Props {
  question: Question;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  showAnswer?: boolean;
}

export default function QuestionCard({ question, index, onEdit, onDelete, showActions = true, showAnswer = false }: Props) {
  const diffColors = {
    easy: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    hard: 'bg-red-50 text-red-700',
  };
  const mode = getAnswerMode(question);
  const displayOptions = getDisplayOptions(question);
  const correctIndex = getCorrectOptionIndex(question);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300">
      <div className="flex items-start gap-3">
        {showActions && (
          <div className="pt-1 cursor-grab text-slate-300 hover:text-slate-400">
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xs font-bold">
              {index + 1}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-teal-50 text-teal-600">
              {QUESTION_TYPE_LABELS[question.type]}
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium ${diffColors[question.difficulty]}`}>
              {DIFFICULTY_LABELS[question.difficulty]}
            </span>
          </div>

          <div className="text-slate-800 font-medium leading-relaxed mb-3">
            <MathRenderer content={question.content} />
          </div>

          {/* Options for multiple_choice, counting, circle_odd, pattern_sequence */}
          {(mode === 'options' || mode === 'true_false') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayOptions.map((opt, i) => {
                const label = getOptionLabel(i);
                const isCorrect = showAnswer && i === correctIndex;
                return (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-xl text-sm border transition-colors ${isCorrect
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium'
                        : 'border-slate-100 bg-slate-50/50 text-slate-600'
                      }`}
                  >
                    <span className="font-semibold mr-2">{label}.</span>
                    <MathRenderer content={opt} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Matching pairs for matching, shadow_match, card_match */}
          {['matching', 'shadow_match', 'card_match'].includes(question.type) && question.matchingPairs && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {question.type === 'shadow_match' ? 'Hình ảnh' : 'Cột A'}
                </p>
                {question.matchingPairs.map((pair, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm border border-teal-100">
                    {i + 1}. <MathRenderer content={pair.left} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {question.type === 'shadow_match' ? 'Bóng / Ghép đôi' : 'Cột B'}
                </p>
                {getMatchingRightOrder(question).map((pairIndex, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">
                    {getMatchingLabel(i)}. <MathRenderer content={question.matchingPairs![pairIndex].right} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Preschool Cards (coloring, dot_to_dot, maze, tracing) */}
          {question.type === 'coloring' && (
            <div className="p-3 rounded-xl bg-pink-50/60 border border-dashed border-pink-200 text-xs text-pink-700 flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <span>Bé hãy dùng bút sáp màu tô thật khéo léo theo hướng dẫn nhé!</span>
            </div>
          )}

          {question.type === 'dot_to_dot' && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-dashed border-indigo-200 text-xs text-indigo-700 flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <span>Bé dùng bút nối lần lượt các số theo thứ tự 1 → 2 → 3... để tạo thành hình vẽ nhé!</span>
            </div>
          )}

          {question.type === 'maze' && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-dashed border-amber-200 text-xs text-amber-700 flex items-center gap-2">
              <span className="text-lg">🌀</span>
              <span>Bé quan sát kỹ và vẽ đường đi thông minh nhất trong mê cung nhé!</span>
            </div>
          )}

          {question.type === 'tracing' && (
            <div className="p-3 rounded-xl bg-sky-50/60 border border-dashed border-sky-200 text-xs text-sky-700 flex items-center gap-2">
              <span className="text-lg">✍️</span>
              <span>Bé cầm bút thật chắc và đồ theo đúng các nét đứt đứt này nhé!</span>
            </div>
          )}

          {showActions && hasUnresolvedAnswer(question) && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Chưa xác định được đáp án đúng{question.correctAnswer ? ` (AI ghi "${question.correctAnswer}")` : ""}. Hãy bấm sửa câu này và chọn đáp án đúng, nếu không câu này sẽ không được tính điểm.</span>
            </div>
          )}

          {showAnswer && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-700">
                Đáp án: <MathRenderer content={formatCorrectAnswer(question)} />
              </p>
              {question.explanation && (
                <p className="text-xs text-emerald-600/80 mt-1">
                  <MathRenderer content={question.explanation} />
                </p>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-500 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
