import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SvgCanvas from '../drawing/SvgCanvas'
import { createEmptyDrawing, createTemplateDrawing } from '../drawing/templates'
import type { DrawingData, DrawTool } from '../drawing/types'

describe('SvgCanvas Component', () => {
  const mockOnChange = vi.fn()
  const mockOnToolReset = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    mockOnToolReset.mockClear()
  })

  function renderCanvas(data?: DrawingData, tool: DrawTool = 'select') {
    const drawingData = data || createEmptyDrawing()
    return render(
      <SvgCanvas
        data={drawingData}
        onChange={mockOnChange}
        tool={tool}
        onToolReset={mockOnToolReset}
      />
    )
  }

  it('should render SVG element', () => {
    renderCanvas()
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should render with correct dimensions', () => {
    const data = createEmptyDrawing()
    data.width = 900
    data.height = 600
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '900')
    expect(svg).toHaveAttribute('height', '600')
  })

  it('should render shapes from data', () => {
    const data = createTemplateDrawing('aon')
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const shapesWithIds = container.querySelectorAll('[data-shape-id]')
    expect(shapesWithIds.length).toBe(data.shapes.length)
  })

  it('should render rect shapes', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-rect', kind: 'rect',
      x: 10, y: 20, width: 100, height: 50,
      label: 'Test', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const rect = container.querySelector('rect[x="10"]')
    expect(rect).toBeInTheDocument()
  })

  it('should render ellipse shapes', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-ellipse', kind: 'ellipse',
      x: 100, y: 100, rx: 40, ry: 30,
      label: 'E', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const ellipse = container.querySelector('ellipse')
    expect(ellipse).toBeInTheDocument()
    expect(ellipse).toHaveAttribute('cx', '100')
    expect(ellipse).toHaveAttribute('cy', '100')
  })

  it('should render diamond shapes', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-diamond', kind: 'diamond',
      x: 50, y: 50, width: 80, height: 60,
      label: 'D', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const polygon = container.querySelector('polygon')
    expect(polygon).toBeInTheDocument()
  })

  it('should render arrow shapes with marker', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-arrow', kind: 'arrow',
      x: 10, y: 10, x2: 100, y2: 100,
      label: '', strokeColor: '#333', fillColor: 'transparent'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const line = container.querySelector('line[marker-end]')
    expect(line).toBeInTheDocument()
  })

  it('should render line shapes without marker', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-line', kind: 'line',
      x: 10, y: 10, x2: 200, y2: 200,
      label: '', strokeColor: '#333', fillColor: 'transparent'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    // All visible lines - including the transparent hit area
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(2) // One visible + one transparent hit area
  })

  it('should render text shapes', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'test-text', kind: 'text',
      x: 50, y: 50,
      label: 'Hello World', strokeColor: '#333', fillColor: 'transparent', fontSize: 14
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const textEl = container.querySelector('[data-shape-id="test-text"] text')
    expect(textEl).toBeInTheDocument()
  })

  it('should handle mousedown on empty area in select mode', () => {
    renderCanvas(createEmptyDrawing(), 'select')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!
    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    // Should not crash, nothing selected
  })

  it('should create a rect on mouse drag with rect tool', () => {
    renderCanvas(createEmptyDrawing(), 'rect')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    // Mock getBoundingClientRect
    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 100 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('rect')
  })

  it('should create an ellipse on mouse drag with ellipse tool', () => {
    renderCanvas(createEmptyDrawing(), 'ellipse')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 180 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('ellipse')
  })

  it('should create an arrow on mouse drag with arrow tool', () => {
    renderCanvas(createEmptyDrawing(), 'arrow')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('arrow')
  })

  it('should create a line on mouse drag with line tool', () => {
    renderCanvas(createEmptyDrawing(), 'line')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 300 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('line')
  })

  it('should create a diamond on mouse drag with diamond tool', () => {
    renderCanvas(createEmptyDrawing(), 'diamond')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 120 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('diamond')
  })

  it('should create text shape on click with text tool', () => {
    renderCanvas(createEmptyDrawing(), 'text')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).toHaveBeenCalled()
    const newData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(newData.shapes).toHaveLength(1)
    expect(newData.shapes[0].kind).toBe('text')
    expect(newData.shapes[0].label).toBe('文字')
  })

  it('should not create shape for tiny movements (< 5px)', () => {
    renderCanvas(createEmptyDrawing(), 'rect')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 52, clientY: 52 })
    fireEvent.mouseUp(svg)

    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should reset tool after creating a shape', () => {
    renderCanvas(createEmptyDrawing(), 'rect')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 100 })
    fireEvent.mouseUp(svg)

    expect(mockOnToolReset).toHaveBeenCalled()
  })

  it('should ignore right-click', () => {
    renderCanvas(createEmptyDrawing(), 'rect')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!
    fireEvent.mouseDown(svg, { button: 2, clientX: 50, clientY: 50 })
    fireEvent.mouseUp(svg)
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should render labels for shapes', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'labeled-rect', kind: 'rect',
      x: 10, y: 10, width: 100, height: 50,
      label: 'My Label', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    expect(container.textContent).toContain('My Label')
  })

  it('should render multiline labels for rect', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'ml-rect', kind: 'rect',
      x: 10, y: 10, width: 150, height: 80,
      label: 'Line1\nLine2\nLine3', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const tspans = container.querySelectorAll('[data-shape-id="ml-rect"] tspan')
    expect(tspans.length).toBe(3)
  })

  it('should show double-click edit input', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'edit-rect', kind: 'rect',
      x: 50, y: 50, width: 100, height: 60,
      label: 'OldLabel', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const shapeEl = container.querySelector('[data-shape-id="edit-rect"]')!
    fireEvent.doubleClick(shapeEl)
    const input = screen.getByTestId('label-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('OldLabel')
  })

  it('should update label on enter', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'edit-rect', kind: 'rect',
      x: 50, y: 50, width: 100, height: 60,
      label: 'OldLabel', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const shapeEl = container.querySelector('[data-shape-id="edit-rect"]')!
    fireEvent.doubleClick(shapeEl)
    const input = screen.getByTestId('label-input')
    fireEvent.change(input, { target: { value: 'NewLabel' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockOnChange).toHaveBeenCalled()
    const updatedData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(updatedData.shapes[0].label).toBe('NewLabel')
  })

  it('should drag shapes in select mode', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'drag-rect', kind: 'rect',
      x: 50, y: 50, width: 100, height: 60,
      label: '', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data, 'select')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!
    const shapeEl = container.querySelector('[data-shape-id="drag-rect"]')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(shapeEl, { button: 0, clientX: 80, clientY: 70 })
    fireEvent.mouseMove(svg, { clientX: 130, clientY: 120 })

    expect(mockOnChange).toHaveBeenCalled()
    const updatedData = mockOnChange.mock.calls[0][0] as DrawingData
    expect(updatedData.shapes[0].x).toBe(100) // 50 + (130-80)
    expect(updatedData.shapes[0].y).toBe(100) // 50 + (120-70)
  })

  it('should delete selected shape on Delete key', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'del-rect', kind: 'rect',
      x: 50, y: 50, width: 100, height: 60,
      label: '', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data, 'select')
    const container = screen.getByTestId('drawing-canvas')
    const shapeEl = container.querySelector('[data-shape-id="del-rect"]')!

    const svg = container.querySelector('svg')!
    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    // Select the shape
    fireEvent.mouseDown(shapeEl, { button: 0, clientX: 80, clientY: 70 })
    fireEvent.mouseUp(shapeEl)

    // Press Delete
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(mockOnChange).toHaveBeenCalled()
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0] as DrawingData
    expect(lastCall.shapes).toHaveLength(0)
  })

  it('should cancel label editing on Escape', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'esc-rect', kind: 'rect',
      x: 50, y: 50, width: 100, height: 60,
      label: 'Original', strokeColor: '#333', fillColor: '#fff'
    }]
    renderCanvas(data)
    const container = screen.getByTestId('drawing-canvas')
    const shapeEl = container.querySelector('[data-shape-id="esc-rect"]')!
    fireEvent.doubleClick(shapeEl)
    const input = screen.getByTestId('label-input')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    // Input should disappear without updating
    expect(screen.queryByTestId('label-input')).not.toBeInTheDocument()
  })

  it('should drag arrows and update x2/y2', () => {
    const data = createEmptyDrawing()
    data.shapes = [{
      id: 'drag-arrow', kind: 'arrow',
      x: 50, y: 50, x2: 200, y2: 200,
      label: '', strokeColor: '#333', fillColor: 'transparent'
    }]
    renderCanvas(data, 'select')
    const container = screen.getByTestId('drawing-canvas')
    const svg = container.querySelector('svg')!
    const shapeEl = container.querySelector('[data-shape-id="drag-arrow"]')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    fireEvent.mouseDown(shapeEl, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(svg, { clientX: 150, clientY: 150 })

    expect(mockOnChange).toHaveBeenCalled()
    const updatedData = mockOnChange.mock.calls[0][0] as DrawingData
    const arrow = updatedData.shapes[0] as any
    expect(arrow.x).toBe(100) // 50 + 50
    expect(arrow.y).toBe(100) // 50 + 50
    expect(arrow.x2).toBe(250) // 200 + 50
    expect(arrow.y2).toBe(250) // 200 + 50
  })
})
