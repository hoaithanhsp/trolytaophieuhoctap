import { useState, useEffect } from 'react';
import { X, Plus, Trash2, BookOpen, Palette, Check } from 'lucide-react';
import type { Subject } from '../types';
import { SUBJECT_ICON_OPTIONS } from '../types';
import { getCustomSubjects, saveCustomSubject, deleteCustomSubject, generateId } from '../utils/storage';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const COLOR_OPTIONS = [
    '#14b8a6', '#f59e0b', '#10b981', '#22c55e', '#ef4444',
    '#8b5cf6', '#06b6d4', '#6366f1', '#ec4899', '#f97316',
    '#84cc16', '#0ea5e9', '#a855f7', '#d946ef', '#64748b',
];

export default function SubjectManager({ isOpen, onClose }: Props) {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('BookOpen');
    const [color, setColor] = useState('#14b8a6');

    useEffect(() => {
        if (isOpen) setSubjects(getCustomSubjects());
    }, [isOpen]);

    const handleAdd = () => {
        if (!name.trim()) return;
        const sub: Subject = {
            id: `custom_${generateId()}`,
            name: name.trim(),
            icon,
            color,
            questionsCount: 0,
        };
        saveCustomSubject(sub);
        setSubjects(prev => [...prev, sub]);
        setName('');
        setIcon('BookOpen');
        setColor('#14b8a6');
        setShowAdd(false);
    };

    const handleDelete = (id: string) => {
        deleteCustomSubject(id);
        setSubjects(prev => prev.filter(s => s.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Quản lý môn học</h2>
                            <p className="text-xs text-slate-400">Thêm hoặc xóa môn học tùy chỉnh</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {subjects.length === 0 && !showAdd ? (
                        <div className="text-center py-8">
                            <Palette className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">Chưa có môn học tùy chỉnh</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subjects.map(s => (
                                <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl group">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                        style={{ backgroundColor: s.color }}
                                    >
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-slate-700">{s.name}</span>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAdd && (
                        <div className="bg-teal-50/50 rounded-xl p-4 space-y-4 border border-teal-100">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên môn học</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ví dụ: Giáo dục công dân"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-teal-400 scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                        >
                                            {color === c && <Check className="w-3.5 h-3.5 text-white mx-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Biểu tượng</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {SUBJECT_ICON_OPTIONS.slice(0, 10).map(ic => (
                                        <button
                                            key={ic}
                                            onClick={() => setIcon(ic)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${icon === ic
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setShowAdd(false)}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={!name.trim()}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!showAdd && (
                    <div className="p-5 border-t border-slate-100">
                        <button
                            onClick={() => setShowAdd(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm môn học mới
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
