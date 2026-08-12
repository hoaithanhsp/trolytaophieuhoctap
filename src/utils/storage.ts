import type { Worksheet, AppSettings, Subject, AiProvider } from '../types';
import { DEFAULT_SUBJECTS, GEMINI_MODELS, AGENT_PLATFORM_MODELS } from '../types';

const WORKSHEETS_KEY = 'edusheet_worksheets';
const SETTINGS_KEY = 'edusheet_settings';
const CUSTOM_SUBJECTS_KEY = 'edusheet_custom_subjects';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  geminiApiKey: '',
  gemini_api_key: '',
  agent_platform_api_key: '',
  google_ai_provider: 'gemini',
  google_ai_provider_selection_source: 'manual',
  selectedModel: GEMINI_MODELS[0].id,
  autoSave: true,
  defaultSchoolName: '',
  defaultClassName: '',
};

export function getProvider(settings?: AppSettings): AiProvider {
  const provider = settings?.google_ai_provider;
  if ((provider as string) === 'vertex') return 'gemini';
  return provider === 'agent-platform' ? 'agent-platform' : 'gemini';
}

export function getActiveApiKey(settings?: AppSettings): string {
  const s = settings || getSettings();
  const provider = getProvider(s);
  if (provider === 'agent-platform') {
    return s.agent_platform_api_key || '';
  }
  return s.gemini_api_key || s.geminiApiKey || '';
}

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const settings: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
      
      // Normalize legacy provider 'vertex' to 'gemini'
      if ((settings.google_ai_provider as string) === 'vertex') {
        settings.google_ai_provider = 'gemini';
      }

      // Sync legacy geminiApiKey and gemini_api_key
      if (settings.gemini_api_key && !settings.geminiApiKey) {
        settings.geminiApiKey = settings.gemini_api_key;
      } else if (settings.geminiApiKey && !settings.gemini_api_key) {
        settings.gemini_api_key = settings.geminiApiKey;
      }

      const provider = getProvider(settings);
      const validModels = provider === 'agent-platform'
        ? AGENT_PLATFORM_MODELS.map(m => m.id)
        : GEMINI_MODELS.map(m => m.id);

      if (!validModels.includes(settings.selectedModel)) {
        settings.selectedModel = validModels[0];
      }

      return settings;
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  
  if (updated.gemini_api_key && !updated.geminiApiKey) {
    updated.geminiApiKey = updated.gemini_api_key;
  } else if (updated.geminiApiKey && !updated.gemini_api_key) {
    updated.gemini_api_key = updated.geminiApiKey;
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function getWorksheets(): Worksheet[] {
  try {
    const stored = localStorage.getItem(WORKSHEETS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export function saveWorksheet(worksheet: Worksheet): void {
  const worksheets = getWorksheets();
  const index = worksheets.findIndex(w => w.id === worksheet.id);
  if (index >= 0) {
    worksheets[index] = worksheet;
  } else {
    worksheets.unshift(worksheet);
  }
  localStorage.setItem(WORKSHEETS_KEY, JSON.stringify(worksheets));
}

export function deleteWorksheet(id: string): void {
  const worksheets = getWorksheets().filter(w => w.id !== id);
  localStorage.setItem(WORKSHEETS_KEY, JSON.stringify(worksheets));
}

export function exportAllData(): string {
  return JSON.stringify({
    worksheets: getWorksheets(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.worksheets) localStorage.setItem(WORKSHEETS_KEY, JSON.stringify(data.worksheets));
    if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    return true;
  } catch {
    return false;
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Custom Subjects
export function getCustomSubjects(): Subject[] {
  try {
    const stored = localStorage.getItem(CUSTOM_SUBJECTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export function saveCustomSubject(subject: Subject): void {
  const subjects = getCustomSubjects();
  const index = subjects.findIndex(s => s.id === subject.id);
  if (index >= 0) {
    subjects[index] = subject;
  } else {
    subjects.push(subject);
  }
  localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(subjects));
}

export function deleteCustomSubject(id: string): void {
  const subjects = getCustomSubjects().filter(s => s.id !== id);
  localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(subjects));
}

export function getAllSubjects(): Subject[] {
  return [...DEFAULT_SUBJECTS, ...getCustomSubjects()];
}
