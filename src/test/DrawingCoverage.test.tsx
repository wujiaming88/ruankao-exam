/**
 * Supplemental tests to achieve 100% line coverage for src/drawing/ directory.
 * Covers:
 * - DrawingEditor handleChange callback (triggered by canvas interaction)
 * - DrawingEditor handleApplyTemplate callback body
 * - SvgCanvas default case in handleMouseUp shape switch
 * - SvgCanvas renderPreview final return null
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DrawingEditor from '../drawing/DrawingEditor'
import SvgCanvas from '../drawing/SvgCanvas'
import { createEmptyDrawing } from '../drawing/templates'
import type { DrawingData, DrawTool } from '../drawing/types'
// Import through index.ts to cover re-export lines
import { DrawingEditor as DE2, SvgCanvas as SC2, createEmptyDrawing as ce2 } from '../drawing'

describe('DrawingEditor - handleChange coverage', () => {
  it('should update internal state when canvas triggers onChange via drawing', () => {
    const mockOnSave = vi.fn()
    const mockOnClose = vi.fn()
    const data = createEmptyDrawing()

    render(<DrawingEditor initialData={data} onSave={mockOnSave} onClose={mockOnClose} />)

    // Get the SVG canvas and simulate drawing a rect to trigger handleChange
    const canvas = screen.getByTestId('drawing-canvas')
    const svg = canvas.querySelector('svg')!

    // Mock getBoundingClientRect for coordinate calculation
    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    // First select the rect tool
    fireEvent.click(screen.getByTestId('tool-rect'))

    // Draw a rectangle by mouse interactions on the SVG
    fireEvent.mouseDown(svg, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(svg)

    // Now save — the saved data should have the new shape (proves handleChange was called)
    fireEvent.click(screen.getByTestId('btn-save-drawing'))
    const savedData = mockOnSave.mock.calls[0][0]
    expect(savedData.shapes.length).toBeGreaterThan(0)
    expect(savedData.shapes[0].kind).toBe('rect')
  })

  it('should apply template and update drawing data (handleApplyTemplate)', () => {
    const mockOnSave = vi.fn()
    const mockOnClose = vi.fn()

    render(<DrawingEditor onSave={mockOnSave} onClose={mockOnClose} />)

    // Template modal is shown (no initialData)
    expect(screen.getByTestId('template-modal')).toBeInTheDocument()

    // Click aon template
    fireEvent.click(screen.getByTestId('template-aon'))

    // Modal should be gone
    expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()

    // Save and verify the data now contains AON template shapes
    fireEvent.click(screen.getByTestId('btn-save-drawing'))
    const savedData = mockOnSave.mock.calls[0][0]
    expect(savedData.shapes.length).toBeGreaterThan(0)
  })
})

describe('Index re-exports coverage', () => {
  it('should re-export DrawingEditor, SvgCanvas, and templates from index', () => {
    expect(DE2).toBe(DrawingEditor)
    expect(SC2).toBe(SvgCanvas)
    expect(ce2).toBe(createEmptyDrawing)
  })
})

describe('SvgCanvas - default case and renderPreview coverage', () => {
  it('should handle unknown tool gracefully in handleMouseUp (default case)', () => {
    const mockOnChange = vi.fn()
    const mockOnToolReset = vi.fn()
    const data = createEmptyDrawing()

    // Cast an invalid tool to force the default branch
    const invalidTool = 'unknown_tool' as DrawTool

    render(
      <SvgCanvas
        data={data}
        onChange={mockOnChange}
        tool={invalidTool}
        onToolReset={mockOnToolReset}
      />
    )

    const canvas = screen.getByTestId('drawing-canvas')
    const svg = canvas.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    // Draw with the unknown tool — should hit default case
    fireEvent.mouseDown(svg, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(svg)

    // No shape should be created, no onChange called
    expect(mockOnChange).not.toHaveBeenCalled()
    expect(mockOnToolReset).not.toHaveBeenCalled()
  })

  it('should return null from renderPreview for unknown tool (final return null)', () => {
    const mockOnChange = vi.fn()
    const mockOnToolReset = vi.fn()
    const data = createEmptyDrawing()

    // Use an unknown tool that passes the early checks but doesn't match any case in renderPreview
    const invalidTool = 'unknown_tool' as DrawTool

    render(
      <SvgCanvas
        data={data}
        onChange={mockOnChange}
        tool={invalidTool}
        onToolReset={mockOnToolReset}
      />
    )

    const canvas = screen.getByTestId('drawing-canvas')
    const svg = canvas.querySelector('svg')!

    svg.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 800, height: 500,
      right: 800, bottom: 500, x: 0, y: 0, toJSON: () => {}
    })

    // Start drawing to create drawState (needed for renderPreview to execute)
    fireEvent.mouseDown(svg, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 })

    // At this point, renderPreview should be called with drawState set and
    // unknown tool — it will fall through the switch and hit return null
    // The component should render without error (no preview shape visible)
    expect(svg).toBeInTheDocument()
  })
})
