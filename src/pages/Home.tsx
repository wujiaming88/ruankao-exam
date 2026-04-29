import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exams, paperLabel, availablePapers } from '../data';
import type { Exam, ExamMode, PaperKind } from '../types';

interface SelectTarget {
  exam: Exam;
  paperKind: PaperKind;
}

function groupExams() {
  const bySubject = new Map<string, Map<string, Exam[]>>();
  for (const e of exams) {
    if (!bySubject.has(e.subject)) bySubject.set(e.subject, new Map());
    const byYear = bySubject.get(e.subject)!;
    const year = e.kind === '真题' ? e.year : `${e.year} (模拟题)`;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(e);
  }
  // Sort: real exams first, then mock. Inside subject: year desc
  const subjects = Array.from(bySubject.keys()).sort();
  return subjects.map(subj => {
    const byYear = bySubject.get(subj)!;
    const years = Array.from(byYear.keys()).sort((a, b) => b.localeCompare(a));
    return { subject: subj, years: years.map(y => ({ year: y, items: byYear.get(y)! })) };
  });
}

export default function Home() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | '真题' | '模拟题'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selectTarget, setSelectTarget] = useState<SelectTarget | null>(null);
  const [mode, setMode] = useState<ExamMode>('exam');

  const subjects = useMemo(
    () => Array.from(new Set(exams.map(e => e.subject))).sort(),
    []
  );

  // 统计每个科目的试卷数量
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const exam of exams) {
      const current = counts.get(exam.subject) || 0;
      const filtered = filter === 'all' || exam.kind === filter;
      if (filtered) counts.set(exam.subject, current + 1);
    }
    return counts;
  }, [filter]);

  const groups = useMemo(() => {
    const all = groupExams();
    return all
      .filter(g => subjectFilter === 'all' || g.subject === subjectFilter)
      .map(g => ({
        ...g,
        years: g.years
          .map(y => ({
            ...y,
            items: y.items.filter(e => filter === 'all' || e.kind === filter),
          }))
          .filter(y => y.items.length > 0),
      }))
      .filter(g => g.years.length > 0);
  }, [filter, subjectFilter]);

  const startExam = () => {
    if (!selectTarget) return;
    const { exam, paperKind } = selectTarget;
    setSelectTarget(null);
    navigate(
      `/exam/${encodeURIComponent(exam.id)}?paper=${paperKind}&mode=${mode}`
    );
  };

  return (
    <div className="page">
      <div className="home-header">
        <div className="home-header-inner">
          <h1>软考仿真机考系统</h1>
          <p>覆盖历年真题与模拟题 · 综合知识 / 案例分析 / 论文 全流程仿真</p>
        </div>
      </div>

      <div className="home-nav">
        <Link to="/">首页</Link>
        <Link to="/history">成绩记录</Link>
        <Link to="/mistakes">错题本</Link>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 8 }}>
          类型:
        </span>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | '真题' | '模拟题')}
          style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)' }}
        >
          <option value="all">全部</option>
          <option value="真题">真题</option>
          <option value="模拟题">模拟题</option>
        </select>
      </div>

      <div className="home-main-layout">
        {/* 左侧科目导航栏 */}
        <aside className="subject-sidebar">
          <div className="sidebar-title">科目列表</div>
          <nav className="subject-nav">
            <button
              className={`subject-nav-item ${subjectFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSubjectFilter('all')}
            >
              <span className="subject-name">全部科目</span>
              <span className="subject-count">{exams.filter(e => filter === 'all' || e.kind === filter).length}</span>
            </button>
            {subjects.map(s => (
              <button
                key={s}
                className={`subject-nav-item ${subjectFilter === s ? 'active' : ''}`}
                onClick={() => setSubjectFilter(s)}
              >
                <span className="subject-name">{s}</span>
                <span className="subject-count">{subjectCounts.get(s) || 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧试卷列表 */}
        <main className="exam-main-area">
          {groups.length === 0 && (
            <div className="empty-state">
              <p>没有符合条件的考试</p>
            </div>
          )}
          {groups.map(g => (
            <div className="subject-section" key={g.subject}>
              <h2 className="section-subject-title">{g.subject}</h2>
              {g.years.map(y => (
                <div className="year-section" key={y.year}>
                  <h3 className="section-year-title">{y.year}</h3>
                  <div className="exam-grid">
                    {y.items.map(exam => (
                      <div className="exam-card" key={exam.id}>
                        <div className="exam-card-header">
                          <span className={`mode-badge ${exam.kind === '真题' ? 'real' : 'mock'}`}>
                            {exam.kind}
                          </span>
                          <div className="exam-title">{exam.title}</div>
                        </div>
                        <div className="exam-meta">
                          {availablePapers(exam).map(p => {
                            const count =
                              p === 'multi_choice'
                                ? `${exam.papers.multi_choice!.total}题`
                                : p === 'case'
                                ? `${exam.papers.case!.cases.length}题`
                                : `${exam.papers.paper!.topics.length}题`;
                            return (
                              <span key={p} className="paper-info">
                                {paperLabel(p)} · {count}
                              </span>
                            );
                          })}
                        </div>
                        <div className="paper-btns">
                          {availablePapers(exam).map(p => (
                            <button
                              key={p}
                              className="paper-btn"
                              onClick={() => {
                                setSelectTarget({ exam, paperKind: p });
                                setMode('exam');
                              }}
                            >
                              进入 {paperLabel(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </main>
      </div>

      {selectTarget && (
        <div className="mode-dialog-backdrop" onClick={() => setSelectTarget(null)}>
          <div className="mode-dialog" onClick={e => e.stopPropagation()}>
            <h3>选择作答模式</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {selectTarget.exam.title} · {paperLabel(selectTarget.paperKind)}
            </div>
            <div className="mode-options">
              <div
                className={`mode-option ${mode === 'exam' ? 'selected' : ''}`}
                onClick={() => setMode('exam')}
              >
                <div className="mode-name">考试模式</div>
                <div className="mode-desc">
                  倒计时作答
                  <br />
                  交卷后查看结果
                </div>
              </div>
              <div
                className={`mode-option ${mode === 'practice' ? 'selected' : ''}`}
                onClick={() => setMode('practice')}
              >
                <div className="mode-name">练习模式</div>
                <div className="mode-desc">
                  即时查看答案
                  <br />
                  不计入成绩
                </div>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setSelectTarget(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={startExam}>
                开始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
