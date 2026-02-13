import { Settings, GraduationCap, Menu } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  hasApiKey: boolean;
}

export default function Header({ onOpenSettings, onToggleSidebar, hasApiKey }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-teal-100/60">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-teal-50 transition-colors"
          >
            <Menu className="w-5 h-5 text-teal-600" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">EduSheet</h1>
              <p className="text-[10px] text-teal-500 leading-none font-medium">Tạo phiếu học tập thông minh</p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className={`btn-raised flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${hasApiKey
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 btn-raised-emerald'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 animate-pulse'
            }`}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{hasApiKey ? 'API Key đã cấu hình' : 'Nhập API Key'}</span>
        </button>
      </div>
    </header>
  );
}
