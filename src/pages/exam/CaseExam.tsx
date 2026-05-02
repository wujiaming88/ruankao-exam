import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Markdown from '../../components/Markdown';
import {
  clearExamState,
  genId,
  loadExamState,
  saveExamState,
  saveRecord,
} from '../../storage';
import type { CasePaper, CaseState, Exam, ExamMode, ExamRecord } from '../../types';
import { DrawingEditor, deserializeDrawing, serializeDrawing } from '../../drawing';
import type { DrawingData } from '../../drawing';
import '../../drawing/drawing.css';

interface Props {
  exam: Exam;
  paper: CasePaper;
  mode: ExamMode;
}

function formatTime(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Derive number of sub-questions by looking for "【问题X】" or "问题X（"  or "### 问题X" in case content.
function extractSubQuestions(content: string): string[] {
  const ms = [
    ...content.matchAll(/(?:###+\s*)?(?:【问题\s*(\d+)】|问题\s*(\d+)\s*[（(])/g),
  ];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const m of ms) {
    const num = m[1] || m[2];
    if (!num) continue;
    if (seen.has(num)) continue;
    seen.add(num);
    labels.push(`问题${num}`);
  }
  if (labels.length === 0) return ['作答'];
  return labels;
}

export default function CaseExam({ exam, paper, mode }: Props) {
  const navigate = useNavigate();

  const initialState = useMemo<CaseState>(() => {
    const saved = loadExamState<CaseState>(exam.id, 'case', mode);
    if (saved) return saved;
    const required = paper.cases.filter(c => c.required).map(c => c.index);
    return {
      selectedCases: [...required],
      answers: {},
      currentCase: required[0] ?? paper.cases[0].index,
      startedAt: Date.now(),
      remainingSec: paper.duration * 60,
    };
  }, [exam.id, mode, paper.duration, paper.cases]);

  const [selectedCases, setSelectedCases] = useState<number[]>(initialState.selectedCases);
  const [answers, setAnswers] = useState<Record<number, Record<string, string>>>(initialState.answers);
  const [drawings, setDrawings] = useState<Record<number, Record<string, string>>>(initialState.drawings ?? {});
  const [currentCase, setCurrentCase] = useState<number>(initialState.currentCase);
  const [remainingSec, setRemainingSec] = useState<number>(initialState.remainingSec);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [drawingTarget, setDrawingTarget] = useState<{ caseIdx: number; sub: string } | null>(null);
  const startedAtRef = useRef(initialState.startedAt);

  useEffect(() => {
    const state: CaseState = {
      selectedCases,
      answers,
      drawings,
      currentCase,
      startedAt: startedAtRef.current,
      remainingSec,
    };
    saveExamState(exam.id, 'case', mode, state);
  }, [selectedCases, answers, drawings, currentCase, remainingSec, exam.id, mode]);

  useEffect(() => {
    if (mode !== 'exam') return;
    const t = setInterval(() => {
      setRemainingSec(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [mode]);

  const activeCase = paper.cases.find(c => c.index === currentCase) ?? paper.cases[0];
  const subQuestions = useMemo(() => extractSubQuestions(activeCase.content), [activeCase]);

  const doSubmit = useCallback(() => {
    const record: ExamRecord = {
      id: genId(),
      examId: exam.id,
      examTitle: exam.title,
      paperKind: 'case',
      mode,
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      durationUsed: Math.round((Date.now() - startedAtRef.current) / 1000),
      detail: {
        selectedCases,
        answers,
        drawings,
        requiredChoose: paper.required + paper.choose,
      },
    };
    saveRecord(record);
    clearExamState(exam.id, 'case', mode);
    navigate(`/result/${record.id}`);
  }, [exam.id, exam.title, mode, selectedCases, answers, paper.required, paper.choose, navigate]);

  useEffect(() => {
    if (mode === 'exam' && remainingSec === 0) {
      doSubmit();
    }
  }, [remainingSec, mode, doSubmit]);

  const toggleSelectCase = (idx: number) => {
    const caseItem = paper.cases.find(c => c.index === idx);
    if (!caseItem) return;
    if (caseItem.required) return; // can't deselect required
    setSelectedCases(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      }
      const nonReq = prev.filter(i => !paper.cases.find(c => c.index === i)?.required);
      if (nonReq.length >= paper.choose) {
        // replace oldest non-required
        const withoutFirst = prev.filter(i => i !== nonReq[0]);
        return [...withoutFirst, idx];
      }
      return [...prev, idx];
    });
  };

  const updateAnswer = (caseIdx: number, sub: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [caseIdx]: { ...(prev[caseIdx] || {}), [sub]: value },
    }));
  };

  const openDrawing = (caseIdx: number, sub: string) => {
    setDrawingTarget({ caseIdx, sub });
  };

  const handleSaveDrawing = useCallback((drawingData: DrawingData) => {
    if (!drawingTarget) return;
    const serialized = serializeDrawing(drawingData);
    setDrawings(prev => ({
      ...prev,
      [drawingTarget.caseIdx]: { ...(prev[drawingTarget.caseIdx] || {}), [drawingTarget.sub]: serialized },
    }));
  }, [drawingTarget]);

  const handleCloseDrawing = useCallback(() => {
    setDrawingTarget(null);
  }, []);

  const timerClass =
    mode === 'exam' && remainingSec < 300
      ? 'timer danger'
      : mode === 'exam' && remainingSec < 900
        ? 'timer warning'
        : 'timer';

  const totalRequired = paper.required + paper.choose;
  const selectedAll = selectedCases.length;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="exam-header">
        <div>
          <span className="title">{exam.title} · 案例分析</span>
          <span className="subtitle">
            {mode === 'practice' ? '练习模式' : '考试模式'} · 必答 {paper.required} 题 + 选答 {paper.choose} 题
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

      <div style={{ padding: '12px 20px', background: '#fafbfc', borderBottom: '1px solid var(--border)' }}>
        <div className="case-nav">
          {paper.cases.map(c => {
            const selected = selectedCases.includes(c.index);
            const isCurrent = currentCase === c.index;
            const cls =
              'case-nav-btn' +
              (c.required ? ' required' : '') +
              (selected ? ' selected' : '') +
              (isCurrent ? ' current' : '');
            return (
              <button
                key={c.index}
                className={cls}
                onClick={() => {
                  setCurrentCase(c.index);
                  if (!selected) toggleSelectCase(c.index);
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  toggleSelectCase(c.index);
                }}
                title={c.required ? '必答题' : '右键取消选择'}
              >
                {c.title.length > 30 ? c.title.substring(0, 30) + '…' : c.title}
              </button>
            );
          })}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            已选 {selectedAll} / {totalRequired}
          </div>
        </div>
      </div>

      <div className="split-layout">
        <div className="split-pane">
          <div className="split-pane-title">
            <span>试题内容</span>
            <span style={{ fontSize: 12 }}>
              {activeCase.required ? '必答题' : '选答题'}
            </span>
          </div>
          <div className="split-pane-inner">
            <Markdown content={activeCase.content} className="case-content" />
            {mode === 'practice' && activeCase.answer && (
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  background: '#f5f7fa',
                  borderLeft: '3px solid var(--success)',
                  borderRadius: 3,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--success)' }}>
                  参考答案
                </div>
                <Markdown content={activeCase.answer} className="case-content" />
              </div>
            )}
          </div>
        </div>

        <div className="split-pane">
          <div className="split-pane-title">
            <span>答题区</span>
            {!selectedCases.includes(currentCase) && (
              <span style={{ fontSize: 12, color: 'var(--marked)' }}>
                请先选择本题作答
              </span>
            )}
          </div>
          <div className="split-pane-inner">
            {!selectedCases.includes(currentCase) ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>该题尚未被选择作答</p>
                <button className="btn btn-primary" onClick={() => toggleSelectCase(currentCase)}>
                  选择该题作答
                </button>
              </div>
            ) : (
              subQuestions.map(sq => (
                <div key={sq} className="subq-block">
                  <div className="subq-label">{sq}</div>
                  <textarea
                    className="answer-area"
                    placeholder={`请在此作答 ${sq}...`}
                    value={(answers[currentCase]?.[sq]) ?? ''}
                    onChange={e => updateAnswer(currentCase, sq, e.target.value)}
                  />
                  <div style={{ marginTop: 6 }}>
                    <button
                      className="insert-drawing-btn"
                      onClick={() => openDrawing(currentCase, sq)}
                      data-testid={`btn-drawing-${sq}`}
                    >
                      ✏️ {drawings[currentCase]?.[sq] ? '编辑图表' : '插入图表'}
                    </button>
                    {drawings[currentCase]?.[sq] && (
                      <div
                        className="drawing-thumbnail"
                        onClick={() => openDrawing(currentCase, sq)}
                        data-testid={`drawing-thumb-${sq}`}
                      >
                        <div style={{ fontSize: 11, color: '#666', padding: '4px 0' }}>
                          📊 已插入图表（点击编辑）
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showSubmit && (
        <div className="modal" onClick={() => setShowSubmit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">确认交卷</div>
            <div className="modal-body">
              已选 {selectedAll} / {totalRequired} 题
              {selectedAll < totalRequired && (
                <span style={{ color: 'var(--marked)' }}>
                  ，还需选择 {totalRequired - selectedAll} 题
                </span>
              )}
              。案例分析由人工阅卷，系统仅保存作答内容供回顾。
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
              <button className="btn btn-danger" onClick={() => navigate('/')}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}

      {drawingTarget && (
        <div className="modal" data-testid="drawing-modal">
          <div className="modal-content" style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <DrawingEditor
              initialData={drawings[drawingTarget.caseIdx]?.[drawingTarget.sub] ? deserializeDrawing(drawings[drawingTarget.caseIdx][drawingTarget.sub]) : null}
              onSave={handleSaveDrawing}
              onClose={handleCloseDrawing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
