import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DrawingEditor from '../drawing/DrawingEditor'
import { createEmptyDrawing, createTemplateDrawing } from '../drawing/templates'

describe('DrawingEditor Component', () => {
  const mockOnSave = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnSave.mockClear()
    mockOnClose.mockClear()
  })

  it('should render the editor with toolbar', () => {
    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('drawing-editor')).toBeInTheDocument()
    expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument()
  })

  it('should show template modal when no initial data', () => {
    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('template-modal')).toBeInTheDocument()
  })

  it('should not show template modal when initial data provided', () => {
    const data = createTemplateDrawing('aon')
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
  })

  it('should render all tool buttons', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('tool-select')).toBeInTheDocument()
    expect(screen.getByTestId('tool-rect')).toBeInTheDocument()
    expect(screen.getByTestId('tool-ellipse')).toBeInTheDocument()
    expect(screen.getByTestId('tool-diamond')).toBeInTheDocument()
    expect(screen.getByTestId('tool-arrow')).toBeInTheDocument()
    expect(screen.getByTestId('tool-line')).toBeInTheDocument()
    expect(screen.getByTestId('tool-text')).toBeInTheDocument()
  })

  it('should render save and close buttons', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('btn-save-drawing')).toBeInTheDocument()
    expect(screen.getByTestId('btn-close-drawing')).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('btn-close-drawing'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onSave and onClose when save button clicked', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('btn-save-drawing'))
    expect(mockOnSave).toHaveBeenCalledTimes(1)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should show canvas component', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('drawing-canvas')).toBeInTheDocument()
  })

  it('should highlight active tool', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    // Select tool should be active by default
    const selectBtn = screen.getByTestId('tool-select')
    expect(selectBtn.classList.contains('active')).toBe(true)
  })

  it('should switch active tool on click', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    const rectBtn = screen.getByTestId('tool-rect')
    fireEvent.click(rectBtn)
    expect(rectBtn.classList.contains('active')).toBe(true)
    const selectBtn = screen.getByTestId('tool-select')
    expect(selectBtn.classList.contains('active')).toBe(false)
  })

  it('should open template modal when template button clicked', () => {
    const data = createEmptyDrawing()
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    // No template modal initially (has initialData)
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('btn-templates'))
    expect(screen.getByTestId('template-modal')).toBeInTheDocument()
  })

  it('should render all template options in modal', () => {
    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('template-blank')).toBeInTheDocument()
    expect(screen.getByTestId('template-aon')).toBeInTheDocument()
    expect(screen.getByTestId('template-aoa')).toBeInTheDocument()
    expect(screen.getByTestId('template-class')).toBeInTheDocument()
    expect(screen.getByTestId('template-sequence')).toBeInTheDocument()
    expect(screen.getByTestId('template-er')).toBeInTheDocument()
  })

  it('should close template modal after selecting a template', () => {
    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('template-aon'))
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
  })

  it('should clear the drawing when clear button clicked', () => {
    const data = createTemplateDrawing('aon')
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('btn-clear'))
    // After clear, save should give empty drawing
    fireEvent.click(screen.getByTestId('btn-save-drawing'))
    const savedData = mockOnSave.mock.calls[0][0]
    expect(savedData.shapes).toHaveLength(0)
  })

  it('should pass initial data to canvas', () => {
    const data = createTemplateDrawing('er')
    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)
    // The SVG should be rendered
    const canvas = screen.getByTestId('drawing-canvas')
    const svg = canvas.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should dismiss template modal when cancel is clicked', () => {
    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)
    expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    const cancelBtn = screen.getByText('取消')
    fireEvent.click(cancelBtn)
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
  })
})
