import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Markdown from '../../components/Markdown';
import type { Exam, ExamMode, ExamRecord, MistakeItem, MultiChoicePaper, MultiChoiceState } from '../../types';
import {
  addMistakes,
  clearExamState,
  genId,
  loadExamState,
  saveExamState,
  saveRecord,
} from '../../storage';

interface Props {
  exam: Exam;
  paper: MultiChoicePaper;
  mode: ExamMode;
}

function formatTime(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function MultiChoiceExam({ exam, paper, mode }: Props) {
  const navigate = useNavigate();

  const initialState = useMemo<MultiChoiceState>(() => {
    const saved = loadExamState<MultiChoiceState>(exam.id, 'multi_choice', mode);
    if (saved) return saved;
    return {
      answers: {},
      marked: {},
      currentIdx: 0,
      startedAt: Date.now(),
      remainingSec: paper.duration * 60,
    };
  }, [exam.id, mode, paper.duration]);

  const [answers, setAnswers] = useState<Record<number, string>>(initialState.answers);
  const [marked, setMarked] = useState<Record<number, boolean>>(initialState.marked);
  const [currentIdx, setCurrentIdx] = useState<number>(initialState.currentIdx);
  const [remainingSec, setRemainingSec] = useState<number>(initialState.remainingSec);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const startedAtRef = useRef<number>(initialState.startedAt);

  const current = paper.questions[currentIdx];

  // Clean stem: remove embedded options
  const cleanedStem = useMemo(() => {
    let stem = current.stem;
    // Remove embedded markdown options (e.g., "- A. text\n- B. text\n...")
    stem = stem.replace(/^[\s]*[-*]\s+[A-D]\.\s+.+$/gm, '').trim();
    return stem;
  }, [current.stem]);

  // Autosave
  useEffect(() => {
    const state: MultiChoiceState = {
      answers,
      marked,
      currentIdx,
      startedAt: startedAtRef.current,
      remainingSec,
    };
    saveExamState(exam.id, 'multi_choice', mode, state);
  }, [answers, marked, currentIdx, remainingSec, exam.id, mode]);

  // Timer
  useEffect(() => {
    if (mode !== 'exam') return;
    const t = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(t);
          // auto submit via state effect
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode]);

  const doSubmit = useCallback(() => {
    // Calculate score
    let correct = 0;
    let scored = 0;
    for (const q of paper.questions) {
      if (!q.answer) continue;
      scored++;
      const ua = answers[q.number];
      if (ua && ua.trim() === q.answer.trim()) correct++;
    }
    const total = scored;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Collect mistakes
    const mistakes: MistakeItem[] = [];
    for (const q of paper.questions) {
      if (!q.answer) continue;
      const ua = answers[q.number];
      const isWrong = !ua || ua.trim() !== q.answer.trim();

      if (isWrong && ua) {
        mistakes.push({
          examId: exam.id,
          examTitle: exam.title,
          questionNumber: q.number,
          stem: q.stem,
          options: q.options,
          correctAnswer: q.answer,
          userAnswer: ua,
          explanation: q.explanation,
          addedAt: Date.now(),
        });
      }
    }
    if (mode === 'exam' && mistakes.length > 0) addMistakes(mistakes);

    const record: ExamRecord = {
      id: genId(),
      examId: exam.id,
      examTitle: exam.title,
      paperKind: 'multi_choice',
      mode,
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      durationUsed: Math.round((Date.now() - startedAtRef.current) / 1000),
      score,
      total,
      correct,
      answers,
      detail: { totalQuestions: paper.questions.length },
    };
    saveRecord(record);
    clearExamState(exam.id, 'multi_choice', mode);
    navigate(`/result/${record.id}`);
  }, [answers, paper.questions, exam.id, exam.title, mode, navigate]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (mode === 'exam' && remainingSec === 0) {
      doSubmit();
    }
  }, [remainingSec, mode, doSubmit]);

  const selectAnswer = (letter: string) => {
    setAnswers(prev => ({ ...prev, [current.number]: letter }));
  };

  const toggleMark = () => {
    setMarked(prev => ({ ...prev, [current.number]: !prev[current.number] }));
  };

  const jumpTo = (idx: number) => {
    if (idx < 0 || idx >= paper.questions.length) return;
    setCurrentIdx(idx);
  };

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;

  const timerClass =
    mode === 'exam' && remainingSec < 300
      ? 'timer danger'
      : mode === 'exam' && remainingSec < 900
        ? 'timer warning'
        : 'timer';

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="exam-header">
        <div>
          <span className="title">{exam.title} · 综合知识</span>
          <span className="subtitle">
            {mode === 'practice' ? '练习模式' : '考试模式'} · 共 {paper.questions.length} 题
          </span>
        </div>
        <div className="actions">
          {mode === 'exam' ? (
            <div className={timerClass}>剩余 {formatTime(remainingSec)}</div>
          ) : (
            <div className="timer">练习模式</div>
          )}
          <button className="btn btn-ghost" onClick={() => setShowExit(true)}>
            退出
          </button>
          <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>
            交卷
          </button>
        </div>
      </div>

      <div className="mc-layout">
        <div className="mc-main">
          <div className="mc-question-no">
            第 <strong>{current.number}</strong> 题 / 共 {paper.questions.length} 题
            {marked[current.number] && (
              <span style={{ color: 'var(--marked)', marginLeft: 12 }}>● 已标记</span>
            )}
          </div>
          <div className="mc-stem"><Markdown content={cleanedStem} /></div>

          {current.options.length === 0 && (
            <div
              style={{
                padding: '8px 12px',
                background: '#fff7e6',
                border: '1px solid #ffd591',
                color: '#d46b08',
                borderRadius: 3,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              提示：该题选项在源数据中嵌入题干文本，请阅读题干选择 A/B/C/D 作答。
            </div>
          )}

          <div className="mc-options">
            {(current.options.length >= 4
              ? current.options
              : ['A', 'B', 'C', 'D'].map(k => ({ key: k, text: `选项 ${k}` }))
            ).map(opt => {
              const userAnswer = answers[current.number];
              const selected = userAnswer === opt.key;
              let cls = 'mc-option';
              if (selected) cls += ' selected';
              if (mode === 'practice' && userAnswer && current.answer) {
                if (opt.key === current.answer.trim()) cls += ' correct';
                else if (selected && opt.key !== current.answer.trim()) cls += ' wrong';
              }
              return (
                <div
                  key={opt.key}
                  className={cls}
                  onClick={() => selectAnswer(opt.key)}
                >
                  <div className="key">{opt.key}</div>
                  <div className="text">{opt.text}</div>
                </div>
              );
            })}
          </div>

          {mode === 'practice' && answers[current.number] && current.answer && (
            <div className="mc-explanation">
              <div>
                <strong>正确答案：{current.answer.trim()}</strong>
                {answers[current.number].trim() === current.answer.trim() ? ' ✓ 回答正确' : ' ✗ 回答错误'}
              </div>
              {current.explanation && (
                <div style={{ marginTop: 6 }}>解析：{current.explanation}</div>
              )}
            </div>
          )}

          <div className="mc-nav-bar">
            <button
              className="btn"
              onClick={() => jumpTo(currentIdx - 1)}
              disabled={currentIdx === 0}
            >
              上一题
            </button>
            <button
              className="btn"
              onClick={toggleMark}
              style={{
                color: marked[current.number] ? 'var(--marked)' : undefined,
                borderColor: marked[current.number] ? 'var(--marked)' : undefined,
              }}
            >
              {marked[current.number] ? '取消标记' : '标记'}
            </button>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-primary"
              onClick={() => jumpTo(currentIdx + 1)}
              disabled={currentIdx === paper.questions.length - 1}
            >
              下一题
            </button>
          </div>
        </div>

        <div className="mc-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-title">答题进度</div>
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot unanswered" /> 未答
              </div>
              <div className="legend-item">
                <span className="legend-dot answered" /> 已答
              </div>
              <div className="legend-item">
                <span className="legend-dot marked" /> 标记
              </div>
            </div>
            <div className="question-grid">
              {paper.questions.map((q, i) => {
                let cls = 'q-btn';
                if (answers[q.number]) cls += ' answered';
                if (marked[q.number]) cls += ' marked';
                if (i === currentIdx) cls += ' current';
                return (
                  <button
                    key={q.number}
                    className={cls}
                    onClick={() => jumpTo(i)}
                    title={`第${q.number}题`}
                  >
                    {q.number}
                  </button>
                );
              })}
            </div>
            <div className="progress-text">
              已答 <strong>{answeredCount}</strong> / {paper.questions.length}
              {markedCount > 0 && <> · 标记 {markedCount}</>}
            </div>
          </div>
        </div>
      </div>

      {showSubmit && (
        <div className="modal" onClick={() => setShowSubmit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">确认交卷</div>
            <div className="modal-body">
              已答 {answeredCount} / {paper.questions.length} 题
              {answeredCount < paper.questions.length && (
                <span style={{ color: 'var(--marked)' }}>
                  ，还有 {paper.questions.length - answeredCount} 题未作答
                </span>
              )}
              ，交卷后将无法修改答案。
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowSubmit(false)}>
                继续作答
              </button>
              <button className="btn btn-primary" onClick={doSubmit}>
                确认交卷
              </button>
            </div>
          </div>
        </div>
      )}

      {showExit && (
        <div className="modal" onClick={() => setShowExit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">退出考试</div>
            <div className="modal-body">
              退出后作答进度已保存到本地，下次进入可继续。确定要退出吗？
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowExit(false)}>
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={() => navigate('/')}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
