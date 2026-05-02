import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadMistakes, removeMistake } from '../storage';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function formatAnswer(answer: string | Record<number, string>): string {
  if (typeof answer === 'string') return answer;
  // Format multi-blank answer as "1:A, 2:B, 3:C"
  return Object.entries(answer)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idx, val]) => `${idx}:${val}`)
    .join(', ');
}

export default function Mistakes() {
  const [mistakes, setMistakes] = useState(loadMistakes());
  const [searchParams, setSearchParams] = useSearchParams();
  const examFilter = searchParams.get('exam') || 'all';

  const byExam = useMemo(() => {
    const m = new Map<string, { title: string; items: typeof mistakes }>();
    for (const it of mistakes) {
      if (!m.has(it.examId)) m.set(it.examId, { title: it.examTitle, items: [] });
      m.get(it.examId)!.items.push(it);
    }
    return Array.from(m.entries());
  }, [mistakes]);

  const filtered = examFilter === 'all' ? mistakes : mistakes.filter(m => m.examId === examFilter);

  const handleExamFilterChange = (examId: string) => {
    const params = new URLSearchParams(searchParams);
    if (examId === 'all') {
      params.delete('exam');
    } else {
      params.set('exam', examId);
    }
    setSearchParams(params);
  };

  const onRemove = (examId: string, number: number) => {
    removeMistake(examId, number);
    setMistakes(loadMistakes());
  };

  return (
    <div className="container" style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          筛选考试:
        </span>
        <select
          value={examFilter}
          onChange={e => handleExamFilterChange(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)', maxWidth: 280 }}
        >
          <option value="all">全部 ({mistakes.length})</option>
          {byExam.map(([id, g]) => (
            <option key={id} value={id}>
              {g.title} ({g.items.length})
            </option>
          ))}
        </select>
      </div>
      <div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>错题本是空的</p>
            <Link to="/" className="btn btn-primary">
              去考试
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 4, padding: 16 }}>
            {filtered.map(m => (
              <div
                key={`${m.examId}-${m.questionNumber}`}
                style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {m.examTitle} · 第 {m.questionNumber} 题
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(m.addedAt)}
                    </span>
                    <button
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: 12 }}
                      onClick={() => onRemove(m.examId, m.questionNumber)}
                    >
                      移除
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>{m.stem}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {m.options.map(o => {
                    const isUserChoice = typeof m.userAnswer === 'string'
                      ? o.key === m.userAnswer
                      : typeof m.userAnswer === 'object' && m.userAnswer !== null
                        ? Object.values(m.userAnswer).includes(o.key)
                        : false;
                    const isCorrectChoice = typeof m.correctAnswer === 'string'
                      ? o.key === m.correctAnswer
                      : typeof m.correctAnswer === 'object' && m.correctAnswer !== null
                        ? Object.values(m.correctAnswer).includes(o.key)
                        : false;

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
                        {isCorrectChoice && ' ✓'}
                        {isUserChoice && !isCorrectChoice && ' ✗'}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  你的答案: <span style={{ color: 'var(--danger)' }}>{formatAnswer(m.userAnswer)}</span>
                  {' · '}
                  正确答案: <span style={{ color: 'var(--success)' }}>{formatAnswer(m.correctAnswer)}</span>
                </div>
                {m.explanation && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      background: '#f5f7fa',
                      padding: 8,
                      borderRadius: 3,
                    }}
                  >
                    解析：{m.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
