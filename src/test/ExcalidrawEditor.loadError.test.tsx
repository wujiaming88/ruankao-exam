/**
 * Separate test suite for testing ExcalidrawEditor's error handling
 * when the @excalidraw/excalidraw module fails to load.
 * This covers lines 34-35 in ExcalidrawEditor.tsx
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as ExcalidrawEditorModule from '../drawing/ExcalidrawEditor'

// Mock the loadExcalidrawModule function to simulate a load failure
vi.mock('../drawing/ExcalidrawEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof ExcalidrawEditorModule>()
  return {
    ...actual,
    loadExcalidrawModule: vi.fn().mockRejectedValue(new Error('Failed to load Excalidraw module')),
  }
})

describe('ExcalidrawEditor - Module Load Error', () => {
  it('should display error when Excalidraw module fails to load', async () => {
    const mockOnSave = vi.fn()
    const mockOnClose = vi.fn()

    // Import the component - it will use our mocked loadExcalidrawModule
    const { default: ExcalidrawEditor } = await import('../drawing/ExcalidrawEditor')

    render(<ExcalidrawEditor onSave={mockOnSave} onClose={mockOnClose} />)

    // Initially should show loading
    expect(screen.getByTestId('drawing-loading')).toBeInTheDocument()

    // Wait for error state to be displayed
    await waitFor(
      () => {
        const errorElement = screen.queryByTestId('drawing-error')
        expect(errorElement).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Verify error message is shown
    const errorElement = screen.getByTestId('drawing-error')
    expect(errorElement.textContent).toContain('加载失败')
    // The error message will contain details about what went wrong
    expect(errorElement.textContent).toMatch(/Cannot find module|Failed to load/)
  })
})
