import Papa from 'papaparse';
import mammoth from 'mammoth';
import type { TranscriptRow, Document } from '../types';

export function parseCSV(file: File): Promise<Document> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rows: TranscriptRow[] = (results.data as Record<string, string>[]).map((row) => ({
          time: row['시간'] || row['time'] || '',
          speaker: row['화자'] || row['speaker'] || '',
          content: row['내용'] || row['content'] || ''
        })).filter(r => r.content.trim());

        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          rows,
          codes: 0,
          quotations: 0,
          status: '진행중'
        });
      },
      error: reject
    });
  });
}

export async function parseDOCX(file: File): Promise<Document> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  const lines = text.split('\n').filter((l: string) => l.trim());
  const rows: TranscriptRow[] = [];

  for (const line of lines) {
    const timeMatch = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)/);
    if (timeMatch) {
      const rest = timeMatch[2].trim();
      const speakerMatch = rest.match(/^([가-힣a-zA-Z\s·]+?)[:：]\s*(.+)/);
      if (speakerMatch) {
        rows.push({ time: timeMatch[1], speaker: speakerMatch[1].trim(), content: speakerMatch[2].trim() });
      } else {
        rows.push({ time: timeMatch[1], speaker: '', content: rest });
      }
    } else {
      const speakerMatch = line.match(/^([가-힣a-zA-Z\s·]{1,10})[:：]\s*(.+)/);
      if (speakerMatch) {
        rows.push({ time: '', speaker: speakerMatch[1].trim(), content: speakerMatch[2].trim() });
      } else if (line.trim()) {
        rows.push({ time: '', speaker: '', content: line.trim() });
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    rows: rows.filter(r => r.content.trim()),
    codes: 0,
    quotations: 0,
    status: '진행중'
  };
}

export async function parseFile(file: File): Promise<Document> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCSV(file);
  if (name.endsWith('.docx')) return parseDOCX(file);
  return parseCSV(file);
}

const SPEAKER_COLORS: Record<string, string> = {
  '인터뷰어': '#3D6B9E',
  '어르신': '#7A5230',
  '화자불명': '#666',
  '모더레이터': '#3D6B9E',
  '연구자': '#3D6B9E',
};

const SPEAKER_BG: Record<string, string> = {
  '인터뷰어': '#E8F0FA',
  '어르신': '#F5ECE3',
  '화자불명': '#EFEFEF',
  '모더레이터': '#E8F0FA',
  '연구자': '#E8F0FA',
};

const PRESET_COLORS = ['#4A6FA5','#7B5EA7','#2A9A6E','#C9543E','#B07D2A'];
let colorIdx = 0;
const speakerColorCache: Record<string, string> = {};
const speakerBgCache: Record<string, string> = {};

export function getSpeakerColor(speaker: string): string {
  if (SPEAKER_COLORS[speaker]) return SPEAKER_COLORS[speaker];
  if (!speakerColorCache[speaker]) {
    speakerColorCache[speaker] = PRESET_COLORS[colorIdx % PRESET_COLORS.length];
    speakerBgCache[speaker] = PRESET_COLORS[colorIdx % PRESET_COLORS.length] + '18';
    colorIdx++;
  }
  return speakerColorCache[speaker];
}

export function getSpeakerBadgeColor(speaker: string): string {
  if (SPEAKER_BG[speaker]) return SPEAKER_BG[speaker];
  if (!speakerBgCache[speaker]) getSpeakerColor(speaker);
  return speakerBgCache[speaker] || '#F0F0F0';
}
