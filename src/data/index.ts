import raw from './exams.json';
import type { ExamDataset, Exam, PaperKind } from '../types';

const dataset = raw as unknown as ExamDataset;

export const exams: Exam[] = dataset.exams;

export function getExam(id: string): Exam | undefined {
  return dataset.exams.find(e => e.id === id);
}

export function paperLabel(kind: PaperKind): string {
  switch (kind) {
    case 'multi_choice':
      return '综合知识';
    case 'case':
      return '案例分析';
    case 'paper':
      return '论文';
  }
}

export function availablePapers(exam: Exam): PaperKind[] {
  const out: PaperKind[] = [];
  if (exam.papers.multi_choice) out.push('multi_choice');
  if (exam.papers.case) out.push('case');
  if (exam.papers.paper) out.push('paper');
  return out;
}
