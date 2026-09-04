import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Key, ExternalLink, CheckCircle, Cpu, Server } from 'lucide-react';
import { GEMINI_MODELS, AGENT_PLATFORM_MODELS } from '../types';
import type { AppSettings, AiProvider } from '../types';
import { getSettings, saveSettings } from '../utils/storage';
import { isValidGoogleAiApiKey, testGoogleAiConnection } from '../utils/geminiApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: Props) {
  const [settings, setLocalSettings] = useState<AppSettings>(getSettings());
  const [activeProvider, setActiveProvider] = useState<AiProvider>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [agentPlatformKey, setAgentPlatformKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const s = getSettings();
      setLocalSettings(s);
      const prov: AiProvider = s.google_ai_provider === 'agent-platform' ? 'agent-platform' : 'gemini';
      setActiveProvider(prov);
      setGeminiKey(s.gemini_api_key || s.geminiApiKey || '');
      setAgentPlatformKey(s.agent_platform_api_key || '');

      const validModels = prov === 'agent-platform'
        ? AGENT_PLATFORM_MODELS.map(m => m.id)
        : GEMINI_MODELS.map(m => m.id);

      if (!validModels.includes(s.selectedModel)) {
        setLocalSettings(prev => ({ ...prev, selectedModel: validModels[0] }));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const availableModels = activeProvider === 'agent-platform' ? AGENT_PLATFORM_MODELS : GEMINI_MODELS;
  const currentKey = activeProvider === 'agent-platform' ? agentPlatformKey : geminiKey;

  const handleProviderChange = (provider: AiProvider) => {
    setActiveProvider(provider);
    setTestStatus('idle');
    setTestMessage('');

    const validModels = provider === 'agent-platform'
      ? AGENT_PLATFORM_MODELS.map(m => m.id)
      : GEMINI_MODELS.map(m => m.id);

    if (!validModels.includes(settings.selectedModel)) {
      setLocalSettings(s => ({ ...s, selectedModel: validModels[0] }));
    }
  };

  const handleSave = () => {
    const trimmedGeminiKey = geminiKey.trim();
    const trimmedAgentKey = agentPlatformKey.trim();

    const updated = saveSettings({
      ...settings,
      gemini_api_key: trimmedGeminiKey,
      geminiApiKey: trimmedGeminiKey,
      agent_platform_api_key: trimmedAgentKey,
      google_ai_provider: activeProvider,
      google_ai_provider_selection_source: 'manual',
    });

    setLocalSettings(updated);
    onSave();
    onClose();
  };

  const testApiKey = async () => {
    const apiKey = currentKey.trim();
    if (!apiKey) return;

    if (!isValidGoogleAiApiKey(apiKey)) {
      setTestStatus('error');
      setTestMessage('API Key cần bắt đầu bằng AIzaSy hoặc AQ.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');
    try {
      await testGoogleAiConnection(apiKey, activeProvider, settings.selectedModel);
      setTestStatus('success');
      setTestMessage(`Kết nối thành công với ${activeProvider === 'agent-platform' ? 'Agent Platform API' : 'Google Gemini API'}.`);
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error instanceof Error ? error.message : 'Không thể kiểm tra API Key.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in my-auto">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-400 p-5 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <Key className="w-6 h-6" />
              <h2 className="text-xl font-bold">Cài đặt API Key & AI Provider</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-2">
            Cấu hình API Key và chọn nhà cung cấp AI để sử dụng tính năng tạo phiếu học tập tự động.
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nhà cung cấp AI (Provider)</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeProvider === 'gemini'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-4 h-4 text-teal-500" />
                Google Gemini API
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('agent-platform')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeProvider === 'agent-platform'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-4 h-4 text-emerald-500" />
                Agent Platform API
              </button>
            </div>
          </div>

          {/* Key Inputs */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {activeProvider === 'agent-platform' ? 'Agent Platform API Key' : 'Google Gemini API Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={e => {
                  const val = e.target.value;
                  if (activeProvider === 'agent-platform') {
                    setAgentPlatformKey(val);
                  } else {
                    setGeminiKey(val);
                  }
                  setTestStatus('idle');
                  setTestMessage('');
                }}
                placeholder="AIzaSy... hoặc AQ..."
                className="w-full px-4 py-3 pr-20 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal-500 hover:text-teal-600 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              {activeProvider === 'agent-platform' ? 'Quản lý Key cho Agent Platform' : 'Lấy API Key tại Google AI Studio'}
            </a>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Model AI</label>
            <select
              value={settings.selectedModel}
              onChange={e => setLocalSettings(s => ({ ...s, selectedModel: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all bg-white"
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Default Info */}
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

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={testApiKey}
              disabled={!currentKey || testStatus === 'testing'}
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
              <span className="text-xs text-red-500">{testMessage || 'Không thể kết nối API'}</span>
            )}
            {testStatus === 'success' && testMessage && (
              <span className="text-xs text-emerald-600">{testMessage}</span>
            )}
          </div>
        </div>

        <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={onClose}
            className="btn-raised btn-raised-white flex-1 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-raised btn-raised-teal flex-1 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
