import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock @excalidraw/excalidraw to REJECT (simulates load failure)
vi.mock('@excalidraw/excalidraw', () => {
  throw new Error('Failed to load Excalidraw module')
})

describe('ExcalidrawEditor - load failure', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should display error when Excalidraw module fails to load', async () => {
    // Dynamic import so the component picks up the failing mock
    const { default: ExcalidrawEditor } = await import('../drawing/ExcalidrawEditor')
    const mockOnSave = vi.fn()
    const mockOnClose = vi.fn()

    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    // Wait for error state
    await waitFor(
      () => {
        expect(screen.getByTestId('drawing-error')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const errorElement = screen.getByTestId('drawing-error')
    expect(errorElement.textContent).toContain('加载失败')
  })
})
