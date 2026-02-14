import { useState, useRef } from 'react';
import {
  ArrowLeft, Download, FileText, FileDown, Eye, EyeOff,
  Trash2, Printer, Share2,
} from 'lucide-react';
import type { Worksheet } from '../types';
import { GRADE_LEVEL_LABELS } from '../types';
import QuestionCard from '../components/QuestionCard';
import MathRenderer from '../components/MathRenderer';
import { exportWorksheetToPdf } from '../utils/exportPdf';
import { exportWorksheetToWord } from '../utils/exportWord';
import { deleteWorksheet } from '../utils/storage';
import ShareModal from '../components/ShareModal';

interface Props {
  worksheet: Worksheet;
  onBack: () => void;
  onDeleted: () => void;
}

export default function WorksheetViewer({ worksheet, onBack, onDeleted }: Props) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [includeAnswersInExport, setIncludeAnswersInExport] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportWorksheetToPdf(worksheet, includeAnswersInExport, printAreaRef.current);
    } finally {
      setExporting(false);
      setShowExport(false);
    }
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      await exportWorksheetToWord(worksheet, includeAnswersInExport);
    } finally {
      setExporting(false);
      setShowExport(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc muốn xóa phiếu này?')) {
      deleteWorksheet(worksheet.id);
      onDeleted();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <button
          onClick={onBack}
          className="btn-raised btn-raised-white flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`btn-raised flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showAnswers ? 'bg-emerald-50 text-emerald-700 btn-raised-emerald' : 'bg-slate-100 text-slate-600 btn-raised-white'
              }`}
          >
            {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          <button
            onClick={handlePrint}
            className="btn-raised btn-raised-white flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In</span>
          </button>
          <button
            onClick={() => setShowExport(!showExport)}
            className="btn-raised btn-raised-teal flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Xuất file
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="btn-raised btn-raised-emerald flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium transition-all"
          >
            <Share2 className="w-4 h-4" />
            Chia sẻ online
          </button>
          <button
            onClick={handleDelete}
            className="btn-raised btn-raised-red p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showExport && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-4 no-print">
          <h3 className="font-semibold text-slate-800">Xuất phiếu bài tập</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswersInExport}
              onChange={e => setIncludeAnswersInExport(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-500"
            />
            <span className="text-sm text-slate-600">Kèm theo đáp án</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="btn-raised btn-raised-red flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-5 h-5" />
              Xuất PDF
            </button>
            <button
              onClick={handleExportWord}
              disabled={exporting}
              className="btn-raised btn-raised-teal flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-50 text-teal-600 font-medium text-sm hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              Xuất Word
            </button>
          </div>
        </div>
      )}

      <div ref={printAreaRef} className="bg-white rounded-2xl border border-slate-200/60 p-6 print-area">
        {worksheet.schoolName && (
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">
            {worksheet.schoolName}
          </p>
        )}
        {worksheet.className && (
          <p className="text-center text-sm text-slate-400">{worksheet.className}</p>
        )}

        <h2 className="text-2xl font-bold text-center mt-3 bg-gradient-to-r from-teal-500 to-emerald-400 bg-clip-text text-transparent">
          PHIẾU HỌC TẬP
        </h2>
        <h3 className="text-lg font-semibold text-center text-slate-700 mt-1">{worksheet.title}</h3>

        <div className="flex justify-center gap-4 mt-2 mb-6">
          <span className="text-xs text-slate-400">Môn: {worksheet.subjectName}</span>
          <span className="text-xs text-slate-400">Cấp: {GRADE_LEVEL_LABELS[worksheet.gradeLevel]}</span>
          <span className="text-xs text-slate-400">{worksheet.questions.length} câu</span>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent mb-6" />

        <div className="space-y-4">
          {worksheet.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              showActions={false}
              showAnswer={showAnswers}
            />
          ))}
        </div>
      </div>

      {showAnswers && (
        <div className="bg-white rounded-2xl border border-emerald-200/60 p-6">
          <h3 className="text-lg font-bold text-emerald-700 mb-4">Bảng đáp án</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {worksheet.answerKey.map(ak => (
              <div key={ak.questionIndex} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50">
                <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {ak.questionIndex}
                </span>
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    <MathRenderer content={ak.answer} />
                  </p>
                  {ak.explanation && (
                    <p className="text-xs text-emerald-600/70 mt-0.5">
                      <MathRenderer content={ak.explanation} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ShareModal
        worksheet={worksheet}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
}
