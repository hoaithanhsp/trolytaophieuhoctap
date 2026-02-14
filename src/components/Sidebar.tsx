import {
  LayoutDashboard, PlusCircle, Library, MessageSquare,
  Download, Upload, X, BarChart3,
} from 'lucide-react';

export type Page = 'dashboard' | 'create' | 'library' | 'chat' | 'stats';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
  onExportData: () => void;
  onImportData: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'create', label: 'Tạo phiếu mới', icon: PlusCircle },
  { id: 'library', label: 'Thư viện', icon: Library },
  { id: 'stats', label: 'Thống kê', icon: BarChart3 },
  { id: 'chat', label: 'Trợ lý AI', icon: MessageSquare },
];

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose, onExportData, onImportData }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-16 left-0 bottom-0 z-40 w-64 bg-white border-r border-teal-100/60 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <nav className="flex-1 p-4 space-y-1">
          <button className="lg:hidden absolute top-3 right-3 p-1" onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>

          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={`btn-raised w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 btn-raised-teal'
                  : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700 btn-raised-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-teal-100/60 space-y-2">
          <button
            onClick={onExportData}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Sao lưu dữ liệu
          </button>
          <button
            onClick={onImportData}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Phục hồi dữ liệu
          </button>
        </div>
      </aside>
    </>
  );
}
