import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CaseExam from '../pages/exam/CaseExam'
import type { Exam, CasePaper } from '../types'
import * as storage from '../storage'

// Mock storage module
vi.mock('../storage', () => ({
  loadExamState: vi.fn(),
  saveExamState: vi.fn(),
  clearExamState: vi.fn(),
  saveRecord: vi.fn(),
  genId: vi.fn(() => 'mock-id'),
}))

// Mock Excalidraw
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: vi.fn(({ onChange, initialData }) => (
    <div data-testid="excalidraw-mock">
      <button
        data-testid="mock-add-element"
        onClick={() => {
          const newElement = {
            id: 'test-elem',
            type: 'rectangle',
            x: 10,
            y: 10,
            width: 50,
            height: 50,
          }
          onChange?.([...initialData.elements, newElement])
        }}
      >
        Add
      </button>
    </div>
  )),
}))

describe('CaseExam Drawing Integration', () => {
  const mockExam: Exam = {
    id: 'exam-1',
    title: '测试考试',
    year: '2024',
    subject: 'test',
    papers: {},
  }

  const mockPaper: CasePaper = {
    kind: 'case',
    duration: 60,
    required: 2,
    choose: 1,
    cases: [
      {
        index: 1,
        title: '案例一',
        content: '### 问题1\n测试问题1',
        answer: '参考答案1',
        required: true,
        topics: [],
      },
      {
        index: 2,
        title: '案例二',
        content: '### 问题1\n测试问题2',
        answer: '参考答案2',
        required: true,
        topics: [],
      },
      {
        index: 3,
        title: '案例三',
        content: '### 问题1\n测试问题3',
        answer: '参考答案3',
        required: false,
        topics: [],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storage.loadExamState).mockReturnValue(null)
  })

  it('should render drawing button for each sub-question', () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // Default label when no "问题X" markers found is "作答"
    expect(screen.getByTestId('btn-drawing-作答')).toBeInTheDocument()
  })

  it('should open drawing modal when drawing button clicked', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
      expect(screen.getByTestId('drawing-editor')).toBeInTheDocument()
    })
  })

  it('should close drawing modal when close button clicked', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    const closeBtn = screen.getByTestId('btn-close-drawing')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })
  })

  it('should save drawing and close modal when save button clicked', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    // Close template modal first
    const cancelTemplate = screen.getByTestId('btn-cancel-template')
    fireEvent.click(cancelTemplate)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })

    const saveBtn = screen.getByTestId('btn-save-drawing')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })
  })

  it('should show drawing thumbnail after saving', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // Open drawing modal
    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    // Close template modal
    const cancelTemplate = screen.getByTestId('btn-cancel-template')
    fireEvent.click(cancelTemplate)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })

    // Save drawing
    const saveBtn = screen.getByTestId('btn-save-drawing')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })

    // Check thumbnail appears
    await waitFor(() => {
      expect(screen.getByTestId('drawing-thumb-作答')).toBeInTheDocument()
    })
  })

  it('should restore saved drawing when reopening', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // First save
    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-cancel-template'))

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })

    // Reopen - should not show template modal
    fireEvent.click(drawingBtn)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
      // Template modal should not appear since we have saved data
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })
  })

  it('should persist drawings in exam state', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // Open and save drawing
    fireEvent.click(screen.getByTestId('btn-drawing-作答'))

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-cancel-template'))
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })

    // Check saveExamState was called with drawings
    await waitFor(() => {
      expect(storage.saveExamState).toHaveBeenCalled()

      const calls = vi.mocked(storage.saveExamState).mock.calls
      const lastCall = calls[calls.length - 1]
      const state = lastCall[3] as { drawings?: Record<number, Record<string, string>> }

      expect(state.drawings).toBeDefined()
      expect(state.drawings![1]).toBeDefined()
      expect(state.drawings![1]['作答']).toBeDefined()
    })
  })

  it('should load saved drawings from storage', () => {
    const savedState = {
      selectedCases: [1, 2],
      answers: {},
      drawings: {
        1: {
          '作答': '{"elements":[],"version":1}',
        },
      },
      currentCase: 1,
      startedAt: Date.now(),
      remainingSec: 3600,
    }

    vi.mocked(storage.loadExamState).mockReturnValue(savedState)

    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // Should show thumbnail for saved drawing
    expect(screen.getByTestId('drawing-thumb-作答')).toBeInTheDocument()
  })

  it('should show "插入图表" when no drawing exists', () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    expect(drawingBtn.textContent).toContain('插入图表')
  })

  it('should show "编辑图表" when drawing exists', async () => {
    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={mockPaper} mode="practice" />
      </MemoryRouter>
    )

    // Save a drawing first
    fireEvent.click(screen.getByTestId('btn-drawing-作答'))

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-cancel-template'))
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    await waitFor(() => {
      expect(screen.queryByTestId('drawing-modal')).not.toBeInTheDocument()
    })

    // Button should now say "编辑图表"
    const drawingBtn = screen.getByTestId('btn-drawing-作答')
    expect(drawingBtn.textContent).toContain('编辑图表')
  })

  it('should handle multiple sub-questions with separate drawings', async () => {
    const multiQuestionPaper: CasePaper = {
      ...mockPaper,
      cases: [
        {
          index: 1,
          title: '案例一',
          content: '【问题1】问题1内容\n【问题2】问题2内容',
          answer: '答案',
          required: true,
          topics: [],
        },
      ],
    }

    render(
      <MemoryRouter>
        <CaseExam exam={mockExam} paper={multiQuestionPaper} mode="practice" />
      </MemoryRouter>
    )

    // Should have separate drawing buttons
    expect(screen.getByTestId('btn-drawing-问题1')).toBeInTheDocument()
    expect(screen.getByTestId('btn-drawing-问题2')).toBeInTheDocument()

    // Save drawing for 问题1
    fireEvent.click(screen.getByTestId('btn-drawing-问题1'))

    await waitFor(() => {
      expect(screen.getByTestId('drawing-modal')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-cancel-template'))
    fireEvent.click(screen.getByTestId('btn-save-drawing'))

    await waitFor(() => {
      expect(screen.getByTestId('drawing-thumb-问题1')).toBeInTheDocument()
    })

    // 问题2 should not have a thumbnail yet
    expect(screen.queryByTestId('drawing-thumb-问题2')).not.toBeInTheDocument()
  })
})
