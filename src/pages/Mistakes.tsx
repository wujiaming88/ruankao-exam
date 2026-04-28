import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadMistakes, removeMistake } from '../storage';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export default function Mistakes() {
  const [mistakes, setMistakes] = useState(loadMistakes());
  const [filter, setFilter] = useState<string>('all');

  const byExam = useMemo(() => {
    const m = new Map<string, { title: string; items: typeof mistakes }>();
    for (const it of mistakes) {
      if (!m.has(it.examId)) m.set(it.examId, { title: it.examTitle, items: [] });
      m.get(it.examId)!.items.push(it);
    }
    return Array.from(m.entries());
  }, [mistakes]);

  const filtered = filter === 'all' ? mistakes : mistakes.filter(m => m.examId === filter);

  const onRemove = (examId: string, number: number) => {
    removeMistake(examId, number);
    setMistakes(loadMistakes());
  };

  return (
    <div className="page">
      <div className="home-header">
        <div className="home-header-inner">
          <h1>错题本</h1>
          <p>自动收集考试模式中答错的综合知识题目</p>
        </div>
      </div>

      <div className="home-nav">
        <Link to="/">首页</Link>
        <Link to="/history">成绩记录</Link>
        <Link to="/mistakes">错题本</Link>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 8 }}>
          筛选考试:
        </span>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
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

      <div className="container">
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
                  {m.options.map(o => (
                    <div
                      key={o.key}
                      style={{
                        fontSize: 13,
                        color:
                          o.key === m.correctAnswer
                            ? 'var(--success)'
                            : o.key === m.userAnswer
                              ? 'var(--danger)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {o.key}. {o.text}
                      {o.key === m.correctAnswer && ' ✓'}
                      {o.key === m.userAnswer && o.key !== m.correctAnswer && ' ✗'}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  你的答案: <span style={{ color: 'var(--danger)' }}>{m.userAnswer}</span>
                  {' · '}
                  正确答案: <span style={{ color: 'var(--success)' }}>{m.correctAnswer}</span>
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
