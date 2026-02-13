import { useState, useMemo } from 'react';
import { Search, Filter, FileText, Calendar, Tag } from 'lucide-react';
import type { Worksheet, GradeLevel } from '../types';
import { DEFAULT_SUBJECTS, GRADE_LEVEL_LABELS } from '../types';

interface Props {
  worksheets: Worksheet[];
  onViewWorksheet: (ws: Worksheet) => void;
}

export default function WorksheetLibrary({ worksheets, onViewWorksheet }: Props) {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'all'>('all');

  const filtered = useMemo(() => {
    return worksheets.filter(ws => {
      const matchSearch = !search || ws.title.toLowerCase().includes(search.toLowerCase()) ||
        ws.subjectName.toLowerCase().includes(search.toLowerCase());
      const matchSubject = subjectFilter === 'all' || ws.subjectId === subjectFilter;
      const matchGrade = gradeFilter === 'all' || ws.gradeLevel === gradeFilter;
      return matchSearch && matchSubject && matchGrade;
    });
  }, [worksheets, search, subjectFilter, gradeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Thư viện phiếu học tập</h2>
        <p className="text-slate-500 text-sm mt-1">{worksheets.length} phiếu đã tạo</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm phiếu..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white"
            >
              <option value="all">Tất cả môn</option>
              {DEFAULT_SUBJECTS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value as GradeLevel | 'all')}
            className="px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm bg-white"
          >
            <option value="all">Tất cả cấp</option>
            {(Object.entries(GRADE_LEVEL_LABELS) as [GradeLevel, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-teal-300" />
          </div>
          <p className="text-slate-500 font-medium">
            {worksheets.length === 0 ? 'Chưa có phiếu học tập nào' : 'Không tìm thấy phiếu phù hợp'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {worksheets.length === 0 ? 'Hãy tạo phiếu đầu tiên của bạn!' : 'Thử thay đổi bộ lọc'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(ws => (
            <button
              key={ws.id}
              onClick={() => onViewWorksheet(ws)}
              className="bg-white rounded-2xl border border-slate-200/60 p-5 text-left hover:shadow-lg hover:shadow-teal-100/50 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{ws.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Tag className="w-3 h-3" />
                      {ws.subjectName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {GRADE_LEVEL_LABELS[ws.gradeLevel]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {ws.questions.length} câu
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(ws.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
