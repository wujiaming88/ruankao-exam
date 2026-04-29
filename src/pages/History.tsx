import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paperLabel } from '../data';
import { deleteRecord, loadRecords } from '../storage';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState(loadRecords());

  const onDelete = (id: string) => {
    if (!window.confirm('确定要删除这条成绩记录吗？')) return;
    deleteRecord(id);
    setRecords(loadRecords());
  };

  return (
    <div className="container">
        {records.length === 0 ? (
          <div className="empty-state">
            <p>暂无考试记录</p>
            <Link to="/" className="btn btn-primary">去考试</Link>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>考试</th>
                <th>试卷</th>
                <th>模式</th>
                <th>成绩</th>
                <th>用时</th>
                <th>时间</th>
                <th style={{ width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.examTitle}</td>
                  <td>{paperLabel(r.paperKind)}</td>
                  <td>
                    <span
                      className={`mode-badge ${r.mode === 'exam' ? 'real' : 'mock'}`}
                      style={{ margin: 0 }}
                    >
                      {r.mode === 'exam' ? '考试' : '练习'}
                    </span>
                  </td>
                  <td>
                    {r.paperKind === 'multi_choice' && r.score !== undefined ? (
                      <strong
                        style={{
                          color: r.score >= 45 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {r.score}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                          {' '}/ 100
                        </span>
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>人工阅卷</span>
                    )}
                  </td>
                  <td>{formatDuration(r.durationUsed)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDate(r.finishedAt)}
                  </td>
                  <td>
                    <button
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: 12, marginRight: 6 }}
                      onClick={() => navigate(`/result/${r.id}`)}
                    >
                      查看
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: 12, color: 'var(--danger)', borderColor: '#ffa39e' }}
                      onClick={() => onDelete(r.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}
