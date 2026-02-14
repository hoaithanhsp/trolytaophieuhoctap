import { useState, useMemo } from 'react';
import {
    CheckCircle, XCircle, RotateCcw, Send,
    FileText, Award, Clock,
} from 'lucide-react';
import type { Question, QuestionType, Difficulty, GradeLevel } from '../types';
import { GRADE_LEVEL_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import MathRenderer from '../components/MathRenderer';

interface ShareData {
    t: string;
    s: string;
    g: GradeLevel;
    sn?: string;
    cn?: string;
    q: {
        i: string;
        c: string;
        tp: QuestionType;
        o?: string[];
        ca: string;
        ex?: string;
        d: Difficulty;
        mp?: { left: string; right: string }[];
    }[];
}

interface Props {
    encodedData: string;
}

function decompressData(encoded: string): string {
    try {
        return decodeURIComponent(atob(encoded));
    } catch {
        try {
            return decodeURIComponent(escape(atob(encoded)));
        } catch {
            return '';
        }
    }
}

export default function OnlineWorksheet({ encodedData }: Props) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [startTime] = useState(Date.now());
    const [endTime, setEndTime] = useState<number | null>(null);

    const data = useMemo<ShareData | null>(() => {
        try {
            const json = decompressData(encodedData);
            return JSON.parse(json);
        } catch {
            return null;
        }
    }, [encodedData]);

    const questions = useMemo<Question[]>(() => {
        if (!data) return [];
        return data.q.map(q => ({
            id: q.i,
            content: q.c,
            type: q.tp,
            options: q.o,
            correctAnswer: q.ca,
            explanation: q.ex,
            difficulty: q.d,
            matchingPairs: q.mp,
        }));
    }, [data]);

    if (!data || questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/20 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Link không hợp lệ</h2>
                    <p className="text-slate-400 text-sm mt-2">Link bài tập đã hết hạn hoặc bị lỗi. Vui lòng liên hệ giáo viên để lấy link mới.</p>
                </div>
            </div>
        );
    }

    const autoGradable = (type: QuestionType) =>
        ['multiple_choice', 'true_false', 'fill_blank'].includes(type);

    const results = useMemo(() => {
        if (!submitted) return null;
        let correct = 0;
        let total = 0;
        const details = questions.map(q => {
            const userAnswer = (answers[q.id] || '').trim();
            const isGradable = autoGradable(q.type);
            let isCorrect = false;

            if (isGradable) {
                total++;
                if (q.type === 'fill_blank') {
                    isCorrect = userAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
                } else {
                    isCorrect = userAnswer === q.correctAnswer;
                }
                if (isCorrect) correct++;
            }

            return { question: q, userAnswer, isCorrect, isGradable };
        });

        return { correct, total, details, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 };
    }, [submitted, questions, answers]);

    const handleSubmit = () => {
        if (window.confirm('Bạn có chắc muốn nộp bài? Không thể thay đổi sau khi nộp.')) {
            setSubmitted(true);
            setEndTime(Date.now());
        }
    };

    const handleReset = () => {
        setAnswers({});
        setSubmitted(false);
        setEndTime(null);
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes} phút ${secs} giây`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/20">
            <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
                    {data.sn && (
                        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">{data.sn}</p>
                    )}
                    <h1 className="text-2xl font-bold text-center mt-2 bg-gradient-to-r from-teal-500 to-emerald-400 bg-clip-text text-transparent">
                        PHIẾU BÀI TẬP TRỰC TUYẾN
                    </h1>
                    <h2 className="text-lg font-semibold text-center text-slate-700 mt-1">{data.t}</h2>
                    <div className="flex justify-center gap-4 mt-2">
                        <span className="text-xs text-slate-400">Môn: {data.s}</span>
                        <span className="text-xs text-slate-400">Cấp: {GRADE_LEVEL_LABELS[data.g]}</span>
                        <span className="text-xs text-slate-400">{questions.length} câu</span>
                    </div>
                    {data.cn && <p className="text-center text-xs text-slate-400 mt-1">{data.cn}</p>}
                </div>

                {/* Results */}
                {submitted && results && (
                    <div className="bg-white rounded-2xl border border-emerald-200/60 p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Award className="w-6 h-6 text-emerald-500" />
                            <h3 className="text-lg font-bold text-emerald-700">Kết quả</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-xl bg-emerald-50">
                                <p className="text-3xl font-bold text-emerald-600">{results.percentage}%</p>
                                <p className="text-xs text-emerald-500 mt-1">Tỷ lệ đúng</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-teal-50">
                                <p className="text-3xl font-bold text-teal-600">{results.correct}/{results.total}</p>
                                <p className="text-xs text-teal-500 mt-1">Câu đúng</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-amber-50">
                                <p className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {endTime ? formatTime(endTime - startTime) : '--'}
                                </p>
                                <p className="text-xs text-amber-500 mt-1">Thời gian</p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Làm lại
                        </button>
                    </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                    {questions.map((q, i) => {
                        const result = results?.details[i];
                        const borderClass = submitted
                            ? result?.isGradable
                                ? result.isCorrect ? 'border-emerald-300' : 'border-red-300'
                                : 'border-slate-200/60'
                            : 'border-slate-200/60';

                        return (
                            <div key={q.id} className={`bg-white rounded-2xl border ${borderClass} p-5 transition-colors`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-teal-50 text-teal-600">
                                        {QUESTION_TYPE_LABELS[q.type]}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium ${q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700' :
                                            q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {DIFFICULTY_LABELS[q.difficulty]}
                                    </span>
                                    {submitted && result?.isGradable && (
                                        result.isCorrect
                                            ? <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                                            : <XCircle className="w-5 h-5 text-red-500 ml-auto" />
                                    )}
                                </div>

                                <div className="text-slate-800 font-medium leading-relaxed mb-3">
                                    <MathRenderer content={q.content} />
                                </div>

                                {/* Multiple choice */}
                                {q.type === 'multiple_choice' && q.options && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, j) => {
                                            const label = String.fromCharCode(65 + j);
                                            const isSelected = answers[q.id] === opt;
                                            const isCorrectAnswer = submitted && opt === q.correctAnswer;
                                            const isWrong = submitted && isSelected && opt !== q.correctAnswer;

                                            return (
                                                <button
                                                    key={j}
                                                    onClick={() => !submitted && setAnswers(p => ({ ...p, [q.id]: opt }))}
                                                    disabled={submitted}
                                                    className={`px-3 py-2 rounded-xl text-sm text-left border transition-all ${isCorrectAnswer ? 'border-emerald-400 bg-emerald-50 text-emerald-800' :
                                                            isWrong ? 'border-red-300 bg-red-50 text-red-700' :
                                                                isSelected ? 'border-teal-400 bg-teal-50 text-teal-700' :
                                                                    'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-teal-200 hover:bg-teal-50/30'
                                                        }`}
                                                >
                                                    <span className="font-semibold mr-2">{label}.</span>
                                                    <MathRenderer content={opt} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* True/False */}
                                {q.type === 'true_false' && q.options && (
                                    <div className="flex gap-3">
                                        {q.options.map((opt, j) => {
                                            const isSelected = answers[q.id] === opt;
                                            const isCorrectAnswer = submitted && opt === q.correctAnswer;
                                            const isWrong = submitted && isSelected && opt !== q.correctAnswer;

                                            return (
                                                <button
                                                    key={j}
                                                    onClick={() => !submitted && setAnswers(p => ({ ...p, [q.id]: opt }))}
                                                    disabled={submitted}
                                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${isCorrectAnswer ? 'border-emerald-400 bg-emerald-50 text-emerald-800' :
                                                            isWrong ? 'border-red-300 bg-red-50 text-red-700' :
                                                                isSelected ? 'border-teal-400 bg-teal-50 text-teal-700' :
                                                                    'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-teal-200'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Fill blank */}
                                {q.type === 'fill_blank' && (
                                    <input
                                        value={answers[q.id] || ''}
                                        onChange={e => !submitted && setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                                        disabled={submitted}
                                        placeholder="Nhập câu trả lời..."
                                        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${submitted
                                                ? answers[q.id]?.toLowerCase().trim() === q.correctAnswer.toLowerCase()
                                                    ? 'border-emerald-300 bg-emerald-50'
                                                    : 'border-red-300 bg-red-50'
                                                : 'border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100'
                                            }`}
                                    />
                                )}

                                {/* Short answer / other types */}
                                {!['multiple_choice', 'true_false', 'fill_blank', 'matching'].includes(q.type) && (
                                    <textarea
                                        value={answers[q.id] || ''}
                                        onChange={e => !submitted && setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                                        disabled={submitted}
                                        rows={3}
                                        placeholder="Nhập câu trả lời..."
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all resize-none disabled:bg-slate-50"
                                    />
                                )}

                                {/* Matching */}
                                {q.type === 'matching' && q.matchingPairs && (
                                    <div className="space-y-2">
                                        {q.matchingPairs.map((pair, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm border border-teal-100 flex-1">
                                                    {j + 1}. <MathRenderer content={pair.left} />
                                                </div>
                                                <span className="text-slate-300">→</span>
                                                <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100 flex-1">
                                                    {String.fromCharCode(97 + j)}. <MathRenderer content={pair.right} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Show answer after submit */}
                                {submitted && (
                                    <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <p className="text-sm font-medium text-emerald-700">
                                            Đáp án: <MathRenderer content={q.correctAnswer} />
                                        </p>
                                        {q.explanation && (
                                            <p className="text-xs text-emerald-600/80 mt-1">
                                                <MathRenderer content={q.explanation} />
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Submit button */}
                {!submitted && (
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white text-sm font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all"
                        >
                            <Send className="w-5 h-5" />
                            Nộp bài
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs">EduSheet - Phiếu học tập trực tuyến</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
