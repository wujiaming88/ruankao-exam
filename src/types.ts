export type PaperKind = 'multi_choice' | 'case' | 'paper';

export interface Option {
  key: string;
  text: string;
}

export interface Blank {
  index: number;
  answer: string;
}

export interface MultiChoiceQuestion {
  number: number;
  stem: string;
  options: Option[];
  answer?: string; // Single answer (for single-choice questions)
  blanks?: Blank[]; // Multiple answers (for multi-blank questions)
  explanation: string;
}

export interface MultiChoicePaper {
  duration: number;
  total: number;
  questions: MultiChoiceQuestion[];
}

export interface CaseSection {
  index: number;
  title: string;
  required: boolean;
  content: string;
  answer?: string;
}

export interface CasePaper {
  duration: number;
  required: number;
  choose: number;
  total_choose: number;
  cases: CaseSection[];
}

export interface PaperTopic {
  index: number;
  title: string;
  content: string;
  answer?: string;
}

export interface PaperPaper {
  duration: number;
  choose: number;
  topics: PaperTopic[];
}

export interface Exam {
  id: string;
  kind: '真题' | '模拟题';
  subject: string;
  year: string;
  volume: string | null;
  title: string;
  papers: {
    multi_choice?: MultiChoicePaper;
    case?: CasePaper;
    paper?: PaperPaper;
  };
}

export interface ExamDataset {
  generated_at: string;
  stats: Record<string, number>;
  exams: Exam[];
}

export type ExamMode = 'exam' | 'practice';

export interface MultiChoiceState {
  answers: Record<number, string | Record<number, string>>; // Single answer or blank_index->answer map
  marked: Record<number, boolean>;
  currentIdx: number;
  startedAt: number;
  remainingSec: number;
}

export interface CaseState {
  selectedCases: number[];
  answers: Record<number, Record<string, string>>;
  currentCase: number;
  startedAt: number;
  remainingSec: number;
}

export interface PaperState {
  selectedTopic: number | null;
  abstract: string;
  body: string;
  startedAt: number;
  remainingSec: number;
}

export type ExamState = MultiChoiceState | CaseState | PaperState;

export interface ExamRecord {
  id: string;
  examId: string;
  examTitle: string;
  paperKind: PaperKind;
  mode: ExamMode;
  startedAt: number;
  finishedAt: number;
  durationUsed: number;
  score?: number;
  total?: number;
  correct?: number;
  answers?: Record<number, string | Record<number, string>>;
  detail?: unknown;
}

export interface MistakeItem {
  examId: string;
  examTitle: string;
  questionNumber: number;
  stem: string;
  options: Option[];
  correctAnswer: string | Record<number, string>;
  userAnswer: string | Record<number, string>;
  explanation: string;
  addedAt: number;
}
