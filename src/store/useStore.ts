import { create } from 'zustand';
import type { Document, Quotation, Code, CodeGroup, AnalyticMemo, AppSettings } from '../types';

const CODE_COLORS = [
  '#E07B54','#5B8FF9','#61D9A5','#F6BD16','#E96472',
  '#7B5EA7','#26C9C3','#F7A04B','#78B9EB','#A3CF62',
  '#C27BA0','#6D9EEB','#93C47D','#FFD966','#E06666',
];
let colorIndex = 0;
const getNextColor = () => CODE_COLORS[colorIndex++ % CODE_COLORS.length];

const LS_PROJECT = 'qualcoder_project_v2';
const LS_SETTINGS = 'qualcoder_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  model: 'gemini-3.1-flash-lite-preview',
  autoSave: true,
  theme: 'light',
  defaultCategory: '사용자 경험',
  interviewerLabel: '인터뷰어',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

interface AppState {
  documents: Document[];
  quotations: Quotation[];
  codes: Code[];
  codeGroups: CodeGroup[];
  memos: AnalyticMemo[];
  activeDocumentId: string | null;
  selectedCodeId: string | null;
  activeView: string;
  projectName: string;
  settings: AppSettings;
  isDirty: boolean;
  lastSavedAt: number | null;

  // Documents
  addDocument: (doc: Document) => void;
  setActiveDocument: (id: string) => void;
  removeDocument: (id: string) => void;

  // Quotations
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;

  // Codes
  addCode: (name: string, comment?: string, category?: string) => Code;
  updateCode: (id: string, updates: Partial<Code>) => void;
  deleteCode: (id: string) => void;
  setSelectedCode: (id: string | null) => void;
  importCodes: (codes: Partial<Code>[]) => void;

  // Code-Quotation
  assignCodeToQuotation: (codeId: string, quotationId: string) => void;
  removeCodeFromQuotation: (codeId: string, quotationId: string) => void;

  // CodeGroups
  addCodeGroup: (codeId: string, name: string) => CodeGroup;
  updateCodeGroup: (id: string, updates: Partial<CodeGroup>) => void;
  deleteCodeGroup: (id: string) => void;

  // Memos
  addMemo: (title: string, body?: string) => AnalyticMemo;
  updateMemo: (id: string, updates: Partial<AnalyticMemo>) => void;
  deleteMemo: (id: string) => void;

  // Settings
  updateSettings: (s: Partial<AppSettings>) => void;

  // View
  setActiveView: (view: string) => void;
  setProjectName: (name: string) => void;

  // Persistence
  saveProject: () => void;
  loadProject: () => boolean;
  exportProject: () => string;
  importProjectData: (json: string) => boolean;
  clearProject: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  documents: [],
  quotations: [],
  codes: [],
  codeGroups: [],
  memos: [],
  activeDocumentId: null,
  selectedCodeId: null,
  activeView: 'transcribe',
  projectName: '새 프로젝트',
  settings: loadSettings(),
  isDirty: false,
  lastSavedAt: null,

  addDocument: (doc) => set(s => ({
    documents: [...s.documents, doc], isDirty: true
  })),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  removeDocument: (id) => set(s => ({
    documents: s.documents.filter(d => d.id !== id),
    quotations: s.quotations.filter(q => q.documentId !== id),
    isDirty: true,
  })),

  addQuotation: (q) => set(s => ({
    quotations: [...s.quotations, q],
    documents: s.documents.map(d => d.id === q.documentId ? { ...d, quotations: d.quotations + 1 } : d),
    isDirty: true,
  })),
  updateQuotation: (id, updates) => set(s => ({
    quotations: s.quotations.map(q => q.id === id ? { ...q, ...updates } : q), isDirty: true,
  })),
  deleteQuotation: (id) => {
    const q = get().quotations.find(q => q.id === id);
    set(s => ({
      quotations: s.quotations.filter(x => x.id !== id),
      codes: s.codes.map(c => ({ ...c, quotationIds: c.quotationIds.filter(qid => qid !== id) })),
      documents: s.documents.map(d => d.id === q?.documentId ? { ...d, quotations: Math.max(0, d.quotations - 1) } : d),
      isDirty: true,
    }));
  },

  addCode: (name, comment = '', category) => {
    const s = get();
    const newCode: Code = {
      id: crypto.randomUUID(), name, comment, color: getNextColor(),
      category: category ?? s.settings.defaultCategory,
      quotationIds: [], memo: '', createdAt: Date.now(),
    };
    set(s => ({ codes: [...s.codes, newCode], isDirty: true }));
    return newCode;
  },
  updateCode: (id, updates) => set(s => ({
    codes: s.codes.map(c => c.id === id ? { ...c, ...updates } : c), isDirty: true,
  })),
  deleteCode: (id) => set(s => ({
    codes: s.codes.filter(c => c.id !== id),
    quotations: s.quotations.map(q => ({ ...q, codes: q.codes.filter(cid => cid !== id) })),
    codeGroups: s.codeGroups.filter(g => g.codeId !== id),
    isDirty: true,
  })),
  setSelectedCode: (id) => set({ selectedCodeId: id }),
  importCodes: (incoming) => {
    const existing = get().codes;
    const newCodes: Code[] = incoming
      .filter(ic => ic.name && !existing.find(e => e.name === ic.name))
      .map(ic => ({
        id: crypto.randomUUID(),
        name: ic.name!,
        comment: ic.comment || '',
        color: ic.color || getNextColor(),
        category: ic.category || '',
        quotationIds: [],
        memo: '',
        createdAt: Date.now(),
      }));
    set(s => ({ codes: [...s.codes, ...newCodes], isDirty: true }));
    return newCodes;
  },

  assignCodeToQuotation: (codeId, quotationId) => set(s => {
    const quotations = s.quotations.map(q =>
      q.id === quotationId && !q.codes.includes(codeId) ? { ...q, codes: [...q.codes, codeId] } : q
    );
    const codes = s.codes.map(c =>
      c.id === codeId && !c.quotationIds.includes(quotationId) ? { ...c, quotationIds: [...c.quotationIds, quotationId] } : c
    );
    const q = quotations.find(q => q.id === quotationId);
    const docs = s.documents.map(d => {
      if (d.id !== q?.documentId) return d;
      return { ...d, codes: new Set(quotations.filter(q => q.documentId === d.id).flatMap(q => q.codes)).size };
    });
    return { quotations, codes, documents: docs, isDirty: true };
  }),
  removeCodeFromQuotation: (codeId, quotationId) => set(s => {
    const quotations = s.quotations.map(q =>
      q.id === quotationId ? { ...q, codes: q.codes.filter(c => c !== codeId) } : q
    );
    const codes = s.codes.map(c =>
      c.id === codeId ? { ...c, quotationIds: c.quotationIds.filter(id => id !== quotationId) } : c
    );
    const q = quotations.find(q => q.id === quotationId);
    const docs = s.documents.map(d => {
      if (d.id !== q?.documentId) return d;
      return { ...d, codes: new Set(quotations.filter(q => q.documentId === d.id).flatMap(q => q.codes)).size };
    });
    return { quotations, codes, documents: docs, isDirty: true };
  }),

  addCodeGroup: (codeId, name) => {
    const group: CodeGroup = { id: crypto.randomUUID(), name, color: getNextColor(), codeId };
    set(s => ({ codeGroups: [...s.codeGroups, group], isDirty: true }));
    return group;
  },
  updateCodeGroup: (id, updates) => set(s => ({
    codeGroups: s.codeGroups.map(g => g.id === id ? { ...g, ...updates } : g), isDirty: true,
  })),
  deleteCodeGroup: (id) => set(s => ({ codeGroups: s.codeGroups.filter(g => g.id !== id), isDirty: true })),

  addMemo: (title, body = '') => {
    const memo: AnalyticMemo = {
      id: crypto.randomUUID(), title, body,
      linkedCodeIds: [], linkedQuotationIds: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    set(s => ({ memos: [...s.memos, memo], isDirty: true }));
    return memo;
  },
  updateMemo: (id, updates) => set(s => ({
    memos: s.memos.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m), isDirty: true,
  })),
  deleteMemo: (id) => set(s => ({ memos: s.memos.filter(m => m.id !== id), isDirty: true })),

  updateSettings: (updates) => {
    const next = { ...get().settings, ...updates };
    localStorage.setItem(LS_SETTINGS, JSON.stringify(next));
    set({ settings: next });
  },

  setActiveView: (view) => set({ activeView: view }),
  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  saveProject: () => {
    const s = get();
    const data = {
      version: '2.0', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
    };
    localStorage.setItem(LS_PROJECT, JSON.stringify(data));
    set({ isDirty: false, lastSavedAt: Date.now() });
  },
  loadProject: () => {
    try {
      const raw = localStorage.getItem(LS_PROJECT);
      if (!raw) return false;
      const data = JSON.parse(raw);
      set({
        documents: data.documents || [], quotations: data.quotations || [],
        codes: data.codes || [], codeGroups: data.codeGroups || [],
        memos: data.memos || [], projectName: data.projectName || '새 프로젝트',
        isDirty: false, lastSavedAt: data.savedAt || null,
      });
      return true;
    } catch { return false; }
  },
  exportProject: () => {
    const s = get();
    const data = {
      version: '2.0', savedAt: Date.now(), projectName: s.projectName,
      documents: s.documents, quotations: s.quotations,
      codes: s.codes, codeGroups: s.codeGroups, memos: s.memos,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.projectName}_${new Date().toISOString().slice(0,10)}.qualcoder.json`;
    a.click();
    return json;
  },
  importProjectData: (json) => {
    try {
      const data = JSON.parse(json);
      set({
        documents: data.documents || [], quotations: data.quotations || [],
        codes: data.codes || [], codeGroups: data.codeGroups || [],
        memos: data.memos || [], projectName: data.projectName || '불러온 프로젝트',
        isDirty: false, lastSavedAt: data.savedAt || null,
      });
      // Sync colorIndex
      colorIndex = (data.codes || []).length;
      return true;
    } catch { return false; }
  },
  clearProject: () => {
    localStorage.removeItem(LS_PROJECT);
    colorIndex = 0;
    set({
      documents: [], quotations: [], codes: [], codeGroups: [],
      memos: [], activeDocumentId: null, selectedCodeId: null,
      projectName: '새 프로젝트', isDirty: false, lastSavedAt: null,
    });
  },
}));
