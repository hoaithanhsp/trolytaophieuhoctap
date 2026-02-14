import { useMemo } from 'react';
import {
    BarChart3, Calendar, BookOpen, Layers, TrendingUp,
} from 'lucide-react';
import type { Worksheet, QuestionType, Difficulty } from '../types';
import { QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import { getAllSubjects } from '../utils/storage';

interface Props {
    worksheets: Worksheet[];
}

export default function StatsPage({ worksheets }: Props) {
    const allSubjects = useMemo(() => getAllSubjects(), []);

    const timeStats = useMemo(() => {
        const days: { label: string; count: number }[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' });
            const count = worksheets.filter(w => {
                const wd = new Date(w.createdAt);
                return wd.toDateString() === d.toDateString();
            }).length;
            days.push({ label: dayStr, count });
        }
        return days;
    }, [worksheets]);

    const subjectStats = useMemo(() => {
        return allSubjects.map(s => ({
            name: s.name,
            color: s.color,
            count: worksheets.filter(w => w.subjectId === s.id).length,
            questions: worksheets.filter(w => w.subjectId === s.id).reduce((sum, w) => sum + w.questions.length, 0),
        })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
    }, [worksheets, allSubjects]);

    const difficultyStats = useMemo(() => {
        const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
        worksheets.forEach(w => w.questions.forEach(q => { counts[q.difficulty]++; }));
        return counts;
    }, [worksheets]);

    const typeStats = useMemo(() => {
        const counts: Partial<Record<QuestionType, number>> = {};
        worksheets.forEach(w => w.questions.forEach(q => { counts[q.type] = (counts[q.type] || 0) + 1; }));
        return Object.entries(counts)
            .map(([type, count]) => ({ type: type as QuestionType, label: QUESTION_TYPE_LABELS[type as QuestionType], count: count || 0 }))
            .sort((a, b) => b.count - a.count);
    }, [worksheets]);

    const totalQuestions = worksheets.reduce((sum, w) => sum + w.questions.length, 0);
    const maxTime = Math.max(...timeStats.map(d => d.count), 1);
    const maxSubj = Math.max(...subjectStats.map(s => s.count), 1);
    const maxDiff = Math.max(...Object.values(difficultyStats), 1);
    const maxType = Math.max(...typeStats.map(t => t.count), 1);

    const diffColors: Record<Difficulty, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Thống kê</h2>
                <p className="text-slate-500 text-sm mt-1">Tổng cộng {worksheets.length} phiếu · {totalQuestions} câu hỏi</p>
            </div>

            {worksheets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-teal-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Chưa có dữ liệu thống kê</p>
                    <p className="text-slate-400 text-sm mt-1">Tạo phiếu bài tập để xem thống kê.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Time chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Calendar className="w-5 h-5 text-teal-500" />
                            <h3 className="font-bold text-slate-800">7 ngày gần đây</h3>
                        </div>
                        <div className="flex items-end gap-2 h-40">
                            {timeStats.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-teal-600">{day.count || ''}</span>
                                    <div
                                        className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-teal-400 transition-all duration-700 ease-out"
                                        style={{ height: `${Math.max((day.count / maxTime) * 100, day.count > 0 ? 10 : 2)}%`, opacity: day.count > 0 ? 1 : 0.2 }}
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Subject chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <BookOpen className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-slate-800">Theo môn học</h3>
                        </div>
                        {subjectStats.length === 0 ? (
                            <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
                        ) : (
                            <div className="space-y-3">
                                {subjectStats.slice(0, 8).map(s => (
                                    <div key={s.name} className="flex items-center gap-3">
                                        <span className="text-sm text-slate-600 w-20 truncate">{s.name}</span>
                                        <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-2"
                                                style={{ width: `${Math.max((s.count / maxSubj) * 100, 10)}%`, backgroundColor: s.color }}
                                            >
                                                <span className="text-[11px] font-bold text-white">{s.count}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 w-16 text-right">{s.questions} câu</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Difficulty chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Layers className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-slate-800">Theo độ khó</h3>
                        </div>
                        <div className="flex items-end gap-6 h-40 justify-center">
                            {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([key, label]) => {
                                const count = difficultyStats[key];
                                return (
                                    <div key={key} className="flex flex-col items-center gap-1 w-24">
                                        <span className="text-sm font-bold" style={{ color: diffColors[key] }}>{count}</span>
                                        <div
                                            className="w-16 rounded-t-xl transition-all duration-700 ease-out"
                                            style={{ height: `${Math.max((count / maxDiff) * 100, count > 0 ? 10 : 2)}%`, backgroundColor: diffColors[key], opacity: count > 0 ? 0.85 : 0.15 }}
                                        />
                                        <span className="text-xs font-medium text-slate-500 mt-1">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question type chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp className="w-5 h-5 text-violet-500" />
                            <h3 className="font-bold text-slate-800">Theo loại câu hỏi</h3>
                        </div>
                        {typeStats.length === 0 ? (
                            <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
                        ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {typeStats.map(t => (
                                    <div key={t.type} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-600 w-28 truncate">{t.label}</span>
                                        <div className="flex-1 h-5 bg-slate-50 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700 ease-out flex items-center px-2"
                                                style={{ width: `${Math.max((t.count / maxType) * 100, 10)}%` }}
                                            >
                                                <span className="text-[10px] font-bold text-white">{t.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
