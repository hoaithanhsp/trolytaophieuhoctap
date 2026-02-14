import { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ApiKeyModal from './components/ApiKeyModal';
import Dashboard from './pages/Dashboard';
import WorksheetCreator from './pages/WorksheetCreator';
import WorksheetViewer from './pages/WorksheetViewer';
import WorksheetLibrary from './pages/WorksheetLibrary';
import AIChatPage from './pages/AIChatPage';
import StatsPage from './pages/StatsPage';
import OnlineWorksheet from './pages/OnlineWorksheet';
import type { Page } from './components/Sidebar';
import type { Worksheet } from './types';
import { getWorksheets, getSettings, exportAllData, importData, saveWorksheet } from './utils/storage';
import { SAMPLE_WORKSHEETS } from './utils/sampleData';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [viewingWorksheet, setViewingWorksheet] = useState<Worksheet | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [onlineData, setOnlineData] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(() => {
    const ws = getWorksheets();
    setWorksheets(ws);
    setHasApiKey(!!getSettings().geminiApiKey);
  }, []);

  useEffect(() => {
    // Check for online worksheet in hash
    const hash = window.location.hash;
    if (hash.startsWith('#/online/')) {
      setOnlineData(hash.replace('#/online/', ''));
      return;
    }
    const ws = getWorksheets();
    if (ws.length === 0) {
      SAMPLE_WORKSHEETS.forEach(s => saveWorksheet(s));
    }
    refreshData();
  }, [refreshData]);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setViewingWorksheet(null);
  };

  const handleViewWorksheet = (ws: Worksheet) => {
    setViewingWorksheet(ws);
    setCurrentPage('library');
  };

  const handleCreated = (ws: Worksheet) => {
    refreshData();
    setViewingWorksheet(ws);
    setCurrentPage('library');
  };

  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edusheet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    importRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importData(text)) {
        refreshData();
        alert('Phục hồi dữ liệu thành công!');
      } else {
        alert('File không hợp lệ!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderPage = () => {
    if (viewingWorksheet && currentPage === 'library') {
      return (
        <WorksheetViewer
          worksheet={viewingWorksheet}
          onBack={() => setViewingWorksheet(null)}
          onDeleted={() => { setViewingWorksheet(null); refreshData(); }}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            worksheets={worksheets}
            onNavigate={handleNavigate}
            onViewWorksheet={handleViewWorksheet}
          />
        );
      case 'create':
        return <WorksheetCreator onCreated={handleCreated} />;
      case 'library':
        return (
          <WorksheetLibrary
            worksheets={worksheets}
            onViewWorksheet={handleViewWorksheet}
          />
        );
      case 'chat':
        return <AIChatPage />;
      case 'stats':
        return <StatsPage worksheets={worksheets} />;
      default:
        return null;
    }
  };

  // Online worksheet mode: fullscreen, no sidebar/header
  if (onlineData) {
    return <OnlineWorksheet encodedData={onlineData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/20">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        hasApiKey={hasApiKey}
      />
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
      <main className="pt-16 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {renderPage()}
        </div>
      </main>
      <ApiKeyModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={refreshData}
      />
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileImport}
      />
    </div>
  );
}
