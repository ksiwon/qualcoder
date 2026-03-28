export interface TranscriptRow {
  time: string;
  speaker: string;
  content: string;
}

export interface Document {
  id: string;
  name: string;
  rows: TranscriptRow[];
  codes: number;
  quotations: number;
  status: string;
}

export interface Quotation {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  rowIndex: number;
  startOffset: number;
  endOffset: number;
  codes: string[];
  comment: string;
  color: string;
  createdAt: number;
}

export interface Code {
  id: string;
  name: string;
  comment: string;
  color: string;
  category?: string;
  quotationIds: string[];
  memo?: string;
  createdAt?: number;
}

export interface CodeGroup {
  id: string;
  name: string;
  color: string;
  codeId: string;
}

export interface AnalyticMemo {
  id: string;
  title: string;
  body: string;
  linkedCodeIds: string[];
  linkedQuotationIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  geminiApiKey: string;
  model: string;
  autoSave: boolean;
  theme: 'light' | 'dark';
  defaultCategory: string;
  interviewerLabel: string;
}

export interface ProjectData {
  version: string;
  savedAt: number;
  projectName: string;
  documents: Document[];
  quotations: Quotation[];
  codes: Code[];
  codeGroups: CodeGroup[];
  memos: AnalyticMemo[];
}

export type ActiveView =
  | 'documents' | 'codes' | 'board' | 'network'
  | 'query' | 'matrix' | 'memos' | 'transcribe' | 'settings';
