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
import type { Exam, ExamMode, ExamRecord, PaperPaper, PaperState } from '../../types';

interface Props {
  exam: Exam;
  paper: PaperPaper;
  mode: ExamMode;
}

function formatTime(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function countWords(text: string): number {
  // Chinese counts: count non-space chars (CJK + others), treat English words specially.
  const stripped = text.replace(/\s+/g, '');
  return Array.from(stripped).length;
}

export default function PaperExam({ exam, paper, mode }: Props) {
  const navigate = useNavigate();

  const initialState = useMemo<PaperState>(() => {
    const saved = loadExamState<PaperState>(exam.id, 'paper', mode);
    if (saved) return saved;
    return {
      selectedTopic: null,
      abstract: '',
      body: '',
      startedAt: Date.now(),
      remainingSec: paper.duration * 60,
    };
  }, [exam.id, mode, paper.duration]);

  const [selectedTopic, setSelectedTopic] = useState<number | null>(initialState.selectedTopic);
  const [abstractText, setAbstractText] = useState(initialState.abstract);
  const [bodyText, setBodyText] = useState(initialState.body);
  const [remainingSec, setRemainingSec] = useState(initialState.remainingSec);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const startedAtRef = useRef(initialState.startedAt);

  useEffect(() => {
    const state: PaperState = {
      selectedTopic,
      abstract: abstractText,
      body: bodyText,
      startedAt: startedAtRef.current,
      remainingSec,
    };
    saveExamState(exam.id, 'paper', mode, state);
  }, [selectedTopic, abstractText, bodyText, remainingSec, exam.id, mode]);

  useEffect(() => {
    if (mode !== 'exam') return;
    const t = setInterval(() => {
      setRemainingSec(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [mode]);

  const doSubmit = useCallback(() => {
    const record: ExamRecord = {
      id: genId(),
      examId: exam.id,
      examTitle: exam.title,
      paperKind: 'paper',
      mode,
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      durationUsed: Math.round((Date.now() - startedAtRef.current) / 1000),
      detail: {
        selectedTopic,
        abstract: abstractText,
        body: bodyText,
        abstractWords: countWords(abstractText),
        bodyWords: countWords(bodyText),
      },
    };
    saveRecord(record);
    clearExamState(exam.id, 'paper', mode);
    navigate(`/result/${record.id}`);
  }, [exam.id, exam.title, mode, selectedTopic, abstractText, bodyText, navigate]);

  useEffect(() => {
    if (mode === 'exam' && remainingSec === 0) {
      doSubmit();
    }
  }, [remainingSec, mode, doSubmit]);

  const activeTopic = paper.topics.find(t => t.index === selectedTopic);

  const timerClass =
    mode === 'exam' && remainingSec < 600
      ? 'timer danger'
      : mode === 'exam' && remainingSec < 1800
        ? 'timer warning'
        : 'timer';

  const abstractWords = countWords(abstractText);
  const bodyWords = countWords(bodyText);

  const bodyCls =
    bodyWords < 1800 ? 'word-count low' : bodyWords > 3500 ? 'word-count low' : 'word-count good';
  const abstractCls =
    abstractWords < 200 ? 'word-count low' : abstractWords > 400 ? 'word-count low' : 'word-count good';

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="exam-header">
        <div>
          <span className="title">{exam.title} · 论文</span>
          <span className="subtitle">
            {mode === 'practice' ? '练习模式' : '考试模式'} · 4 选 1
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
          {paper.topics.map(t => {
            const selected = selectedTopic === t.index;
            return (
              <button
                key={t.index}
                className={'case-nav-btn' + (selected ? ' selected' : '')}
                onClick={() => setSelectedTopic(t.index)}
              >
                {t.title.length > 32 ? t.title.substring(0, 32) + '…' : t.title}
              </button>
            );
          })}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            {selectedTopic ? '已选 1/1' : '请选择一道论文题作答'}
          </div>
        </div>
      </div>

      {!selectedTopic ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>请先在上方选择一道论文题</p>
        </div>
      ) : (
        <div className="split-layout">
          <div className="split-pane">
            <div className="split-pane-title">
              <span>题目</span>
            </div>
            <div className="split-pane-inner">
              <Markdown content={activeTopic!.content} className="case-content" />
              {mode === 'practice' && activeTopic!.answer && (
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
                    参考答案 / 写作要点
                  </div>
                  <Markdown content={activeTopic!.answer} className="case-content" />
                </div>
              )}
            </div>
          </div>

          <div className="split-pane">
            <div className="split-pane-title">
              <span>答题区</span>
              <span style={{ fontSize: 12 }}>
                建议摘要 300字 / 正文 2000-3000字
              </span>
            </div>
            <div className="split-pane-inner">
              <div className="subq-block">
                <div className="subq-label">
                  摘要
                  <span className={abstractCls} style={{ marginLeft: 12, fontWeight: 400 }}>
                    {abstractWords} 字
                  </span>
                </div>
                <textarea
                  className="answer-area"
                  placeholder="请在此撰写论文摘要（建议约300字）..."
                  style={{ minHeight: 120 }}
                  value={abstractText}
                  onChange={e => setAbstractText(e.target.value)}
                />
              </div>
              <div className="subq-block">
                <div className="subq-label">
                  正文
                  <span className={bodyCls} style={{ marginLeft: 12, fontWeight: 400 }}>
                    {bodyWords} 字
                  </span>
                </div>
                <textarea
                  className="answer-area"
                  placeholder="请在此撰写论文正文（建议2000-3000字）..."
                  style={{ minHeight: 500 }}
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubmit && (
        <div className="modal" onClick={() => setShowSubmit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-title">确认交卷</div>
            <div className="modal-body">
              {!selectedTopic ? (
                <span style={{ color: 'var(--danger)' }}>尚未选择论文题目</span>
              ) : (
                <>
                  已选题目：{activeTopic?.title}
                  <br />
                  摘要 {abstractWords} 字 / 正文 {bodyWords} 字
                  <br />
                  论文由人工阅卷，系统仅保存作答内容供回顾。
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowSubmit(false)}>
                继续作答
              </button>
              <button className="btn btn-primary" onClick={doSubmit} disabled={!selectedTopic}>
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
    </div>
  );
}
