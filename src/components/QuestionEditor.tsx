import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { Question, QuestionType, Difficulty } from '../types';
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import { getCorrectOptionIndex, getDisplayOptions, getOptionLabel } from '../utils/answerKey';

const OPTION_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'counting', 'circle_odd', 'pattern_sequence'];

function getInitialOptions(question: Question): string[] {
    const options = getDisplayOptions(question);
    return options.length > 0 ? options : ['', '', '', ''];
}

interface Props {
    question: Question;
    onSave: (updated: Question) => void;
    onClose: () => void;
}

export default function QuestionEditor({ question, onSave, onClose }: Props) {
    const [content, setContent] = useState(question.content);
    const [type, setType] = useState<QuestionType>(question.type);
    const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty);
    const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
    const [explanation, setExplanation] = useState(question.explanation || '');
    const [options, setOptions] = useState<string[]>(getInitialOptions(question));
    const [correctIndex, setCorrectIndex] = useState(getCorrectOptionIndex(question));
    const [matchingPairs, setMatchingPairs] = useState(
        question.matchingPairs || [{ left: '', right: '' }]
    );

    useEffect(() => {
        setContent(question.content);
        setType(question.type);
        setDifficulty(question.difficulty);
        setCorrectAnswer(question.correctAnswer);
        setExplanation(question.explanation || '');
        setOptions(getInitialOptions(question));
        setCorrectIndex(getCorrectOptionIndex(question));
        setMatchingPairs(question.matchingPairs || [{ left: '', right: '' }]);
    }, [question]);

    const hasOptions = OPTION_TYPES.includes(type);
    const hasMatching = ['matching', 'shadow_match', 'card_match'].includes(type);

    const handleTypeChange = (nextType: QuestionType) => {
        setType(nextType);
        if (nextType === 'true_false') {
            setOptions(['Đúng', 'Sai']);
            setCorrectIndex(-1);
        } else if (type === 'true_false' && OPTION_TYPES.includes(nextType)) {
            setOptions(['', '', '', '']);
            setCorrectIndex(-1);
        }
    };

    const isCorrectOptionMissing = hasOptions && !options[correctIndex]?.trim();

    const handleSave = () => {
        if (isCorrectOptionMissing) return;
        const updated: Question = {
            ...question,
            content,
            type,
            difficulty,
            // Lưu đúng nội dung lựa chọn để đáp án không lệch khi giáo viên sửa chữ trong lựa chọn
            correctAnswer: hasOptions ? options[correctIndex] : correctAnswer,
            explanation: explanation || undefined,
            options: hasOptions ? options.filter(o => o.trim()) : undefined,
            matchingPairs: hasMatching ? matchingPairs : undefined,
        };
        onSave(updated);
    };

    const updateOption = (index: number, value: string) => {
        setOptions(prev => prev.map((o, i) => (i === index ? value : o)));
    };

    const addOption = () => setOptions(prev => [...prev, '']);
    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(prev => prev.filter((_, i) => i !== index));
        setCorrectIndex(prev => (prev === index ? -1 : prev > index ? prev - 1 : prev));
    };

    const addMatchingPair = () => setMatchingPairs(prev => [...prev, { left: '', right: '' }]);
    const removeMatchingPair = (index: number) => {
        if (matchingPairs.length <= 1) return;
        setMatchingPairs(prev => prev.filter((_, i) => i !== index));
    };
    const updateMatchingPair = (index: number, side: 'left' | 'right', value: string) => {
        setMatchingPairs(prev =>
            prev.map((p, i) => (i === index ? { ...p, [side]: value } : p))
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-400 p-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Chỉnh sửa câu hỏi</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Content */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nội dung câu hỏi</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all resize-none"
                        />
                    </div>

                    {/* Type & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Loại câu hỏi</label>
                            <select
                                value={type}
                                onChange={e => handleTypeChange(e.target.value as QuestionType)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white"
                            >
                                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Độ khó</label>
                            <div className="flex gap-2">
                                {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                                    <button
                                        key={k}
                                        onClick={() => setDifficulty(k)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${difficulty === k
                                            ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    {hasOptions && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Các lựa chọn đáp án</label>
                            <p className="text-xs text-slate-500 mb-2">Bấm vào ô tròn bên trái để chọn đáp án đúng.</p>
                            <div className="space-y-2">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct-option"
                                            checked={correctIndex === i}
                                            onChange={() => setCorrectIndex(i)}
                                            aria-label={`Chọn ${getOptionLabel(i)} là đáp án đúng`}
                                            className="w-4 h-4 accent-teal-600 flex-shrink-0"
                                        />
                                        <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {getOptionLabel(i)}
                                        </span>
                                        <input
                                            value={opt}
                                            onChange={e => updateOption(i, e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm"
                                            placeholder={`Lựa chọn ${getOptionLabel(i)}`}
                                        />
                                        {options.length > 2 && (
                                            <button
                                                onClick={() => removeOption(i)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {type !== 'true_false' && (
                                <button
                                    onClick={addOption}
                                    className="mt-2 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm lựa chọn
                                </button>
                            )}
                        </div>
                    )}

                    {/* Matching pairs */}
                    {hasMatching && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Cặp nối tương ứng</label>
                            <div className="space-y-2">
                                {matchingPairs.map((pair, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-5 text-center">{i + 1}</span>
                                        <input
                                            value={pair.left}
                                            onChange={e => updateMatchingPair(i, 'left', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50/30 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm"
                                            placeholder="Hình ảnh / Cột A"
                                        />
                                        <span className="text-slate-300">→</span>
                                        <input
                                            value={pair.right}
                                            onChange={e => updateMatchingPair(i, 'right', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                                            placeholder="Bóng / Đối ứng / Cột B"
                                        />
                                        {matchingPairs.length > 1 && (
                                            <button
                                                onClick={() => removeMatchingPair(i)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addMatchingPair}
                                className="mt-2 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm cặp nối
                            </button>
                        </div>
                    )}

                    {/* Correct Answer */}
                    {hasOptions ? (
                        isCorrectOptionMissing && (
                            <p role="alert" className="text-sm font-medium text-red-600">
                                Chưa chọn đáp án đúng. Hãy bấm vào ô tròn cạnh một lựa chọn đã có nội dung.
                            </p>
                        )
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Đáp án đúng</label>
                            <input
                                value={correctAnswer}
                                onChange={e => setCorrectAnswer(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm"
                                placeholder="Nhập đáp án đúng"
                            />
                        </div>
                    )}

                    {/* Explanation */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Giải thích (tùy chọn)</label>
                        <textarea
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all resize-none"
                            placeholder="Giải thích đáp án..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isCorrectOptionMissing}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
