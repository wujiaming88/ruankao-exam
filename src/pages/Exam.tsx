import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { getExam, paperLabel } from '../data';
import MultiChoiceExam from './exam/MultiChoiceExam';
import CaseExam from './exam/CaseExam';
import PaperExam from './exam/PaperExam';
import type { ExamMode, PaperKind } from '../types';

export default function Exam() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const paperKind = (searchParams.get('paper') as PaperKind) || 'multi_choice';
  const mode = (searchParams.get('mode') as ExamMode) || 'exam';

  if (!examId) return <Navigate to="/" replace />;
  const exam = getExam(decodeURIComponent(examId));
  if (!exam) return <Navigate to="/" replace />;

  const paper = exam.papers[paperKind];
  if (!paper) {
    return (
      <div className="empty-state">
        <p>
          该考试没有 {paperLabel(paperKind)} 试卷
        </p>
      </div>
    );
  }

  if (paperKind === 'multi_choice') {
    return <MultiChoiceExam exam={exam} paper={exam.papers.multi_choice!} mode={mode} />;
  }
  if (paperKind === 'case') {
    return <CaseExam exam={exam} paper={exam.papers.case!} mode={mode} />;
  }
  return <PaperExam exam={exam} paper={exam.papers.paper!} mode={mode} />;
}
