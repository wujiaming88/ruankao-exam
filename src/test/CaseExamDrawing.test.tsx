import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CaseExam from '../pages/exam/CaseExam'
import type { CasePaper, Exam } from '../types'

const mockExam: Exam = {
  id: 'test-exam-1',
  kind: '真题',
  subject: '系统架构设计师',
  year: '2024',
  volume: null,
  title: '2024年系统架构设计师',
  papers: {},
}

const mockPaper: CasePaper = {
  duration: 90,
  required: 1,
  choose: 1,
  total_choose: 3,
  cases: [
    {
      index: 1,
      title: '【问题1】数据库设计',
      required: true,
      content: '## 试题一\n\n某公司需要设计数据库...\n\n【问题1】请画出ER图\n\n【问题2】请写出SQL',
      answer: '参考答案...',
    },
    {
      index: 2,
      title: '【问题2】项目管理',
      required: false,
      content: '## 试题二\n\n项目网络图...\n\n【问题1】绘制网络图\n\n【问题2】计算关键路径',
    },
    {
      index: 3,
      title: '【问题3】UML设计',
      required: false,
      content: '## 试题三\n\nUML建模...\n\n【问题1】画类图\n\n【问题2】画时序图',
    },
  ],
}

function renderCaseExam(mode: 'exam' | 'practice' = 'practice') {
  return render(
    <MemoryRouter>
      <CaseExam exam={mockExam} paper={mockPaper} mode={mode} />
    </MemoryRouter>
  )
}

describe('CaseExam Drawing Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render insert drawing buttons for each sub-question', () => {
    renderCaseExam()
    // Case 1 is required and selected by default, has 2 sub-questions
    const drawingBtns = screen.getAllByText(/插入图表/)
    expect(drawingBtns.length).toBeGreaterThanOrEqual(2)
  })

  it('should open drawing modal when insert button clicked', () => {
    renderCaseExam()
    const btn = screen.getByTestId('btn-drawing-问题1')
    fireEvent.click(btn)
    expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
  })

  it('should close drawing modal when close button clicked', () => {
    renderCaseExam()
    const btn = screen.getByTestId('btn-drawing-问题1')
    fireEvent.click(btn)
    expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()

    const closeBtn = screen.getByTestId('btn-close-drawing')
    fireEvent.click(closeBtn)
    expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
  })

  it('should show edit button after saving a drawing', () => {
    renderCaseExam()
    const btn = screen.getByTestId('btn-drawing-问题1')
    fireEvent.click(btn)

    // Select a template to have some shapes
    const templateBtn = screen.getByTestId('template-er')
    fireEvent.click(templateBtn)

    // Save
    const saveBtn = screen.getByTestId('btn-save-drawing')
    fireEvent.click(saveBtn)

    // Should now show "编辑图表" instead of "插入图表" for that sub-question
    expect(screen.getByTestId('btn-drawing-问题1')).toHaveTextContent('编辑图表')
  })

  it('should show drawing thumbnail after saving', () => {
    renderCaseExam()
    const btn = screen.getByTestId('btn-drawing-问题1')
    fireEvent.click(btn)

    // Select template
    const templateBtn = screen.getByTestId('template-aon')
    fireEvent.click(templateBtn)

    // Save
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    // Thumbnail should be visible
    expect(screen.getByTestId('drawing-thumb-问题1')).toBeInTheDocument()
  })

  it('should persist drawings with exam state', () => {
    renderCaseExam()
    const btn = screen.getByTestId('btn-drawing-问题1')
    fireEvent.click(btn)

    // Select template
    fireEvent.click(screen.getByTestId('template-class'))
    // Save
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    // Check localStorage
    const stateKey = 'ruankao.state.test-exam-1.case.practice'
    const savedState = JSON.parse(localStorage.getItem(stateKey) || '{}')
    expect(savedState.drawings).toBeDefined()
    expect(savedState.drawings[1]).toBeDefined()
    expect(savedState.drawings[1]['问题1']).toBeTruthy()
  })

  it('should restore saved drawing when reopening editor', () => {
    renderCaseExam()

    // Open and save a drawing
    fireEvent.click(screen.getByTestId('btn-drawing-问题1'))
    fireEvent.click(screen.getByTestId('template-aon'))
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    // Reopen the editor
    fireEvent.click(screen.getByTestId('btn-drawing-问题1'))

    // Should not show template modal (has existing data)
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    // Should show the canvas with shapes
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
  })

  it('text answer areas still work alongside drawings', () => {
    renderCaseExam()
    const textarea = screen.getAllByPlaceholderText(/请在此作答/)[0]
    fireEvent.change(textarea, { target: { value: '这是我的答案' } })
    expect(textarea).toHaveValue('这是我的答案')
  })

  it('should render drawing editor inside modal', () => {
    renderCaseExam()
    fireEvent.click(screen.getByTestId('btn-drawing-问题2'))
    expect(screen.getByTestId('drawing-editor')).toBeInTheDocument()
    expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
  })
})
