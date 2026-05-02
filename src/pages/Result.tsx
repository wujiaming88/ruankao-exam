import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getExam, paperLabel } from '../data';
import { getRecord } from '../storage';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatAnswer(answer: string | Record<number, string> | undefined): string {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  // Format multi-blank answer as "1:A, 2:B, 3:C"
  return Object.entries(answer)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idx, val]) => `${idx}:${val}`)
    .join(', ');
}

export default function Result() {
  const { recordId } = useParams<{ recordId: string }>();
  const record = useMemo(() => (recordId ? getRecord(recordId) : undefined), [recordId]);

  if (!record) return <Navigate to="/history" replace />;

  const exam = getExam(record.examId);
  const isMc = record.paperKind === 'multi_choice';
  const paper = isMc ? exam?.papers.multi_choice : undefined;

  return (
    <div className="page">
      <div className="result-header">
        <div style={{ fontSize: 16, opacity: 0.9 }}>
          {record.examTitle} · {paperLabel(record.paperKind)}
        </div>
        {isMc && record.score !== undefined && (
          <>
            <div className="result-score">{record.score}</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>
              总分 100 · 答对 {record.correct} / {record.total}
              {record.total !== undefined && paper &&
                record.total < paper.total &&
                ` · 其中 ${paper.total - (record.total ?? 0)} 题无参考答案`}
            </div>
          </>
        )}
        {!isMc && (
          <>
            <div className="result-score">已提交</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>
              {record.paperKind === 'case'
                ? '案例分析由人工阅卷，可在下方查看你的答题'
                : '论文由人工阅卷，可在下方查看你的答题'}
            </div>
          </>
        )}
        <div className="result-meta">
          <span>开始时间 {formatDate(record.startedAt)}</span>
          <span>用时 {formatDuration(record.durationUsed)}</span>
          <span>模式 {record.mode === 'exam' ? '考试' : '练习'}</span>
        </div>
      </div>

      <div className="result-summary">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Link to="/" className="btn">返回首页</Link>
          <Link to="/history" className="btn">成绩记录</Link>
          {isMc && <Link to="/mistakes" className="btn">错题本</Link>}
          {exam && (
            <Link
              to={`/exam/${encodeURIComponent(exam.id)}?paper=${record.paperKind}&mode=practice`}
              className="btn btn-primary"
            >
              再次练习
            </Link>
          )}
        </div>

        {isMc && paper && record.answers && (
          <ResultMcReview paperQuestions={paper.questions} answers={record.answers} />
        )}

        {!isMc && record.paperKind === 'case' && (
          <ResultCaseReview detail={record.detail as CaseResultDetail} />
        )}
        {!isMc && record.paperKind === 'paper' && (
          <ResultPaperReview detail={record.detail as PaperResultDetail} />
        )}
      </div>
    </div>
  );
}

interface CaseResultDetail {
  selectedCases: number[];
  answers: Record<number, Record<string, string>>;
  requiredChoose: number;
}

interface PaperResultDetail {
  selectedTopic: number | null;
  abstract: string;
  body: string;
  abstractWords: number;
  bodyWords: number;
}

function ResultMcReview({
  paperQuestions,
  answers,
}: {
  paperQuestions: import('../types').MultiChoiceQuestion[];
  answers: Record<number, string | Record<number, string>>;
}) {
  // Trim answers for comparison to handle whitespace issues in source data
  const onlyWrong = paperQuestions.filter(q => {
    const ua = answers[q.number];
    if (q.blanks && q.blanks.length > 0) {
      // Multi-blank: wrong if any blank is incorrect
      if (!ua || typeof ua !== 'object') return true;
      return !q.blanks.every(blank => ua[blank.index]?.trim() === blank.answer.trim());
    } else if (q.answer) {
      // Single answer
      return ua && typeof ua === 'string' && ua.trim() !== q.answer.trim();
    }
    return false;
  });
  const unanswered = paperQuestions.filter(q => {
    const hasAnswer = q.answer || (q.blanks && q.blanks.length > 0);
    return hasAnswer && !answers[q.number];
  });

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)',
          gap: 4,
          marginBottom: 20,
        }}
      >
        {paperQuestions.map(q => {
          const ua = answers[q.number];
          let cls = 'q-btn';
          let isCorrect = false;
          const hasAnswer = q.answer || (q.blanks && q.blanks.length > 0);

          if (!hasAnswer) {
            cls += '';
          } else if (!ua) {
            cls += '';
          } else if (q.blanks && q.blanks.length > 0) {
            // Multi-blank
            isCorrect = typeof ua === 'object' &&
                       q.blanks.every(blank => ua[blank.index]?.trim() === blank.answer.trim());
            cls += isCorrect ? ' correct' : ' wrong';
          } else if (q.answer) {
            // Single answer
            isCorrect = typeof ua === 'string' && ua.trim() === q.answer.trim();
            cls += isCorrect ? ' correct' : ' wrong';
          }

          const correctAnswerText = q.blanks && q.blanks.length > 0
            ? q.blanks.map(b => `${b.index}:${b.answer}`).join(', ')
            : q.answer?.trim() || '';
          const tooltipText = hasAnswer
            ? (isCorrect
                ? '✓'
                : ua
                  ? `✗ ${formatAnswer(ua)}→${correctAnswerText}`
                  : '未答')
            : '无答案';
          return (
            <div key={q.number} className={cls} title={`第${q.number}题: ${tooltipText}`} style={{ cursor: 'default' }}>
              {q.number}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        错题 {onlyWrong.length} 题 · 未答 {unanswered.length} 题
      </div>
      <div className="review-list">
        {onlyWrong.slice(0, 20).map(q => {
          const ua = answers[q.number];
          const correctAnswerText = q.blanks && q.blanks.length > 0
            ? q.blanks.map(b => `第${b.index}空: ${b.answer}`).join('，')
            : q.answer || '';

          return (
            <div className="review-item" key={q.number}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                第 {q.number} 题 <span style={{ color: 'var(--danger)' }}>✗</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontWeight: 400 }}>
                  你的答案: {formatAnswer(ua)} · 正确答案: {correctAnswerText}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>{q.stem}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {q.options.map(o => {
                  const userAnswerStr = typeof ua === 'string' ? ua : '';
                  const isUserChoice = q.blanks && q.blanks.length > 0
                    ? (typeof ua === 'object' && ua !== null && Object.values(ua).includes(o.key))
                    : o.key === userAnswerStr;
                  const isCorrectChoice = q.blanks && q.blanks.length > 0
                    ? q.blanks.some(b => b.answer === o.key)
                    : o.key === q.answer;

                  return (
                    <div
                      key={o.key}
                      style={{
                        fontSize: 13,
                        color:
                          isCorrectChoice
                            ? 'var(--success)'
                            : isUserChoice
                              ? 'var(--danger)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {o.key}. {o.text}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', background: '#f5f7fa', padding: 8, borderRadius: 3 }}>
                  解析：{q.explanation}
                </div>
              )}
            </div>
          );
        })}
        {onlyWrong.length > 20 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
            仅显示前 20 道错题，更多请前往错题本
          </div>
        )}
      </div>
    </>
  );
}

function ResultCaseReview({ detail }: { detail: CaseResultDetail }) {
  if (!detail) return null;
  return (
    <div className="review-list">
      {detail.selectedCases.map(idx => (
        <div className="review-item" key={idx}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            试题 {idx}
          </div>
          {Object.entries(detail.answers[idx] || {}).map(([sub, ans]) => (
            <div key={sub} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 4 }}>
                {sub}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, padding: 8, background: '#f5f7fa', borderRadius: 3 }}>
                {ans || <span style={{ color: 'var(--text-muted)' }}>（未作答）</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultPaperReview({ detail }: { detail: PaperResultDetail }) {
  if (!detail) return null;
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        摘要 {detail.abstractWords} 字 · 正文 {detail.bodyWords} 字
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 4 }}>
          摘要
        </div>
        <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#f5f7fa', borderRadius: 3, fontSize: 13, lineHeight: 1.7 }}>
          {detail.abstract || <span style={{ color: 'var(--text-muted)' }}>（未作答）</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand)', marginBottom: 4 }}>
          正文
        </div>
        <div style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#f5f7fa', borderRadius: 3, fontSize: 13, lineHeight: 1.7 }}>
          {detail.body || <span style={{ color: 'var(--text-muted)' }}>（未作答）</span>}
        </div>
      </div>
    </div>
  );
}
