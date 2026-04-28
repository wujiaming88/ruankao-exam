import type { ExamRecord, ExamState, MistakeItem, PaperKind } from './types';

const RECORDS_KEY = 'ruankao.records';
const MISTAKES_KEY = 'ruankao.mistakes';
const STATE_PREFIX = 'ruankao.state.';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadRecords(): ExamRecord[] {
  return safeGet<ExamRecord[]>(RECORDS_KEY, []);
}

export function saveRecord(record: ExamRecord) {
  const list = loadRecords();
  list.unshift(record);
  safeSet(RECORDS_KEY, list);
}

export function getRecord(id: string): ExamRecord | undefined {
  return loadRecords().find(r => r.id === id);
}

export function deleteRecord(id: string) {
  const list = loadRecords().filter(r => r.id !== id);
  safeSet(RECORDS_KEY, list);
}

export function loadMistakes(): MistakeItem[] {
  return safeGet<MistakeItem[]>(MISTAKES_KEY, []);
}

export function saveMistakes(items: MistakeItem[]) {
  safeSet(MISTAKES_KEY, items);
}

export function removeMistake(examId: string, number: number) {
  const list = loadMistakes().filter(
    m => !(m.examId === examId && m.questionNumber === number)
  );
  safeSet(MISTAKES_KEY, list);
}

export function addMistakes(items: MistakeItem[]) {
  const list = loadMistakes();
  for (const it of items) {
    const i = list.findIndex(
      m => m.examId === it.examId && m.questionNumber === it.questionNumber
    );
    if (i >= 0) list[i] = it;
    else list.push(it);
  }
  safeSet(MISTAKES_KEY, list);
}

function stateKey(examId: string, paperKind: PaperKind, mode: string) {
  return `${STATE_PREFIX}${examId}.${paperKind}.${mode}`;
}

export function saveExamState(
  examId: string,
  paperKind: PaperKind,
  mode: string,
  state: ExamState
) {
  safeSet(stateKey(examId, paperKind, mode), state);
}

export function loadExamState<T extends ExamState>(
  examId: string,
  paperKind: PaperKind,
  mode: string
): T | null {
  return safeGet<T | null>(stateKey(examId, paperKind, mode), null);
}

export function clearExamState(examId: string, paperKind: PaperKind, mode: string) {
  try {
    localStorage.removeItem(stateKey(examId, paperKind, mode));
  } catch {
    // ignore
  }
}

export function genId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}
