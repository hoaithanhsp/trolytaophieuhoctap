import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Key, ExternalLink, CheckCircle } from 'lucide-react';
import { GEMINI_MODELS } from '../types';
import type { AppSettings } from '../types';
import { getSettings, saveSettings } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: Props) {
  const [settings, setLocalSettings] = useState<AppSettings>(getSettings());
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) setLocalSettings(getSettings());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSettings(settings);
    onSave();
    onClose();
  };

  const testApiKey = async () => {
    if (!settings.geminiApiKey) return;
    setTestStatus('testing');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.selectedModel}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );
      setTestStatus(res.ok ? 'success' : 'error');
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-400 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <Key className="w-6 h-6" />
              <h2 className="text-xl font-bold">Cài đặt API Key</h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-2">
            Nhập Gemini API Key để sử dụng tính năng AI tạo phiếu học tập tự động.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Gemini API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.geminiApiKey}
                onChange={e => setLocalSettings(s => ({ ...s, geminiApiKey: e.target.value }))}
                placeholder="AIza..."
                className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal-500 hover:text-teal-600 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              Lấy API Key tại Google AI Studio
            </a>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Model AI</label>
            <select
              value={settings.selectedModel}
              onChange={e => setLocalSettings(s => ({ ...s, selectedModel: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all bg-white"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Thông tin mặc định</label>
            <input
              value={settings.defaultSchoolName}
              onChange={e => setLocalSettings(s => ({ ...s, defaultSchoolName: e.target.value }))}
              placeholder="Tên trường học"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all mb-2"
            />
            <input
              value={settings.defaultClassName}
              onChange={e => setLocalSettings(s => ({ ...s, defaultClassName: e.target.value }))}
              placeholder="Lớp học (VD: Lớp 10A1)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testApiKey}
              disabled={!settings.geminiApiKey || testStatus === 'testing'}
              className="btn-raised btn-raised-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              {testStatus === 'testing' ? (
                <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              ) : testStatus === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Key className="w-4 h-4 text-slate-500" />
              )}
              {testStatus === 'testing' ? 'Đang kiểm tra...' : testStatus === 'success' ? 'Kết nối thành công!' : 'Kiểm tra kết nối'}
            </button>
            {testStatus === 'error' && (
              <span className="text-xs text-red-500">API Key không hợp lệ</span>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="btn-raised btn-raised-white flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="btn-raised btn-raised-teal flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold transition-all"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
