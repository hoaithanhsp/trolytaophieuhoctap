import {
  Calculator, Atom, FlaskConical, Leaf, BookOpen, Globe, Landmark, MapPin, Monitor,
  FileText, TrendingUp, Clock, PlusCircle,
} from 'lucide-react';
import type { Worksheet, Subject } from '../types';
import { DEFAULT_SUBJECTS, GRADE_LEVEL_LABELS } from '../types';

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator, Atom, FlaskConical, Leaf, BookOpen, Globe, Landmark, MapPin, Monitor,
};

interface Props {
  worksheets: Worksheet[];
  onNavigate: (page: 'create' | 'library') => void;
  onViewWorksheet: (ws: Worksheet) => void;
}

export default function Dashboard({ worksheets, onNavigate, onViewWorksheet }: Props) {
  const subjects: Subject[] = DEFAULT_SUBJECTS.map(s => ({
    ...s,
    questionsCount: worksheets
      .filter(w => w.subjectId === s.id)
      .reduce((sum, w) => sum + w.questions.length, 0),
  }));

  const totalQuestions = worksheets.reduce((sum, w) => sum + w.questions.length, 0);
  const recentWorksheets = worksheets.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Tổng quan</h2>
        <p className="text-slate-500 mt-1">Quản lý phiếu học tập và theo dõi tiến độ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Tổng phiếu"
          value={worksheets.length}
          color="from-teal-500 to-teal-600"
          shadow="shadow-teal-500/20"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Tổng câu hỏi"
          value={totalQuestions}
          color="from-emerald-500 to-emerald-600"
          shadow="shadow-emerald-500/20"
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Môn học"
          value={new Set(worksheets.map(w => w.subjectId)).size}
          color="from-cyan-500 to-cyan-600"
          shadow="shadow-cyan-500/20"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Tuần này"
          value={worksheets.filter(w => {
            const d = new Date(w.createdAt);
            const now = new Date();
            const diff = now.getTime() - d.getTime();
            return diff < 7 * 86400000;
          }).length}
          color="from-amber-500 to-amber-600"
          shadow="shadow-amber-500/20"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Môn học</h3>
          <button
            onClick={() => onNavigate('create')}
            className="btn-raised btn-raised-teal flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Tạo phiếu mới
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map(subject => {
            const Icon = ICON_MAP[subject.icon] || BookOpen;
            return (
              <button
                key={subject.id}
                onClick={() => onNavigate('create')}
                className="group bg-white rounded-2xl border border-slate-200/60 p-5 text-left hover:shadow-lg hover:shadow-teal-100/50 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: subject.color + '15', color: subject.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{subject.name}</p>
                <p className="text-xs text-slate-400 mt-1">{subject.questionsCount} câu hỏi</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Phiếu gần đây</h3>
          {worksheets.length > 0 && (
            <button
              onClick={() => onNavigate('library')}
              className="text-sm text-teal-500 hover:text-teal-600 font-medium"
            >
              Xem tất cả
            </button>
          )}
        </div>

        {recentWorksheets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-teal-300" />
            </div>
            <p className="text-slate-500 font-medium">Chưa có phiếu học tập nào</p>
            <p className="text-slate-400 text-sm mt-1">Bắt đầu tạo phiếu đầu tiên của bạn</p>
            <button
              onClick={() => onNavigate('create')}
              className="btn-raised btn-raised-teal mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium transition-all"
            >
              Tạo phiếu mới
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentWorksheets.map(ws => (
              <button
                key={ws.id}
                onClick={() => onViewWorksheet(ws)}
                className="w-full bg-white rounded-2xl border border-slate-200/60 p-4 flex items-center gap-4 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300 text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{ws.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ws.subjectName} &middot; {GRADE_LEVEL_LABELS[ws.gradeLevel]} &middot; {ws.questions.length} câu &middot; {new Date(ws.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, shadow }: { icon: React.ReactNode; label: string; value: number; color: string; shadow: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} ${shadow} shadow-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
