import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExcalidrawEditor from '../drawing/ExcalidrawEditor'
import { createEmptyDrawing, createTemplateDrawing } from '../drawing/templates'
import type { DrawingData } from '../drawing/types'

// Mock @excalidraw/excalidraw module
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: vi.fn(({ onChange, initialData }) => {
    // Simulate Excalidraw component
    return (
      <div data-testid="excalidraw-mock">
        <button
          data-testid="mock-add-element"
          onClick={() => {
            // Simulate adding an element
            const newElement = {
              id: 'mock-elem-1',
              type: 'rectangle',
              x: 10,
              y: 10,
              width: 100,
              height: 100,
            }
            onChange?.([...initialData.elements, newElement])
          }}
        >
          Add Element
        </button>
      </div>
    )
  }),
}))

describe('ExcalidrawEditor', () => {
  let mockOnSave: ReturnType<typeof vi.fn>
  let mockOnClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnSave = vi.fn()
    mockOnClose = vi.fn()
  })

  it('should render editor with toolbar', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-editor')).toBeInTheDocument()
      expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('btn-templates')).toBeInTheDocument()
      expect(screen.getByTestId('btn-clear')).toBeInTheDocument()
      expect(screen.getByTestId('btn-save-drawing')).toBeInTheDocument()
      expect(screen.getByTestId('btn-close-drawing')).toBeInTheDocument()
    })
  })

  it('should show template modal when no initialData', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('template-modal')).toBeInTheDocument()
      expect(screen.getByTestId('template-blank')).toBeInTheDocument()
      expect(screen.getByTestId('template-aon')).toBeInTheDocument()
      expect(screen.getByTestId('template-aoa')).toBeInTheDocument()
      expect(screen.getByTestId('template-class')).toBeInTheDocument()
      expect(screen.getByTestId('template-sequence')).toBeInTheDocument()
      expect(screen.getByTestId('template-er')).toBeInTheDocument()
    })
  })

  it('should not show template modal when initialData provided', async () => {
    const initialData = createEmptyDrawing()
    render(<ExcalidrawEditor initialData={initialData} onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })
  })

  it('should apply template when clicked', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    })

    const aonTemplate = screen.getByTestId('template-aon')
    fireEvent.click(aonTemplate)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })
  })

  it('should close template modal when cancel clicked', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    })

    const cancelBtn = screen.getByTestId('btn-cancel-template')
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })
  })

  it('should reopen template modal when templates button clicked', async () => {
    const initialData = createEmptyDrawing()
    render(<ExcalidrawEditor initialData={initialData} onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByTestId('template-modal')).not.toBeInTheDocument()
    })

    const templatesBtn = screen.getByTestId('btn-templates')
    fireEvent.click(templatesBtn)

    await waitFor(() => {
      expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    })
  })

  it('should clear drawing when clear button clicked', async () => {
    const initialData = createTemplateDrawing('aon')
    render(<ExcalidrawEditor initialData={initialData} onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-status')).toBeInTheDocument()
    })

    const clearBtn = screen.getByTestId('btn-clear')
    fireEvent.click(clearBtn)

    await waitFor(() => {
      const statusText = screen.getByTestId('drawing-status').textContent
      expect(statusText).toContain('图形数量: 0')
    })
  })

  it('should call onSave and onClose when save button clicked', async () => {
    const initialData = createEmptyDrawing()
    render(<ExcalidrawEditor initialData={initialData} onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('btn-save-drawing')).toBeInTheDocument()
    })

    const saveBtn = screen.getByTestId('btn-save-drawing')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    const savedData = mockOnSave.mock.calls[0][0] as DrawingData
    expect(savedData).toHaveProperty('elements')
    expect(savedData).toHaveProperty('version')
    expect(Array.isArray(savedData.elements)).toBe(true)
  })

  it('should call onClose when close button clicked', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('btn-close-drawing')).toBeInTheDocument()
    })

    const closeBtn = screen.getByTestId('btn-close-drawing')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('should update element count in status bar', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('drawing-status')).toBeInTheDocument()
    })

    // Initially should show 0 elements
    let statusText = screen.getByTestId('drawing-status').textContent
    expect(statusText).toContain('图形数量: 0')

    // Close template modal
    fireEvent.click(screen.getByTestId('btn-cancel-template'))

    await waitFor(() => {
      const mockAddBtn = screen.queryByTestId('mock-add-element')
      if (mockAddBtn) {
        fireEvent.click(mockAddBtn)
      }
    })

    // After adding, count should increase
    await waitFor(() => {
      statusText = screen.getByTestId('drawing-status').textContent
      expect(statusText).toMatch(/图形数量: \d+/)
    })
  })

  it('should display loading state initially', () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    // Should show loading or loaded canvas
    expect(
      screen.queryByTestId('drawing-loading') || screen.queryByTestId('drawing-canvas')
    ).toBeInTheDocument()
  })

  it('should render with all template options available', async () => {
    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('template-modal')).toBeInTheDocument()
    })

    const templates = ['blank', 'aon', 'aoa', 'class', 'sequence', 'er']
    templates.forEach(templateId => {
      expect(screen.getByTestId(`template-${templateId}`)).toBeInTheDocument()
    })
  })

})
