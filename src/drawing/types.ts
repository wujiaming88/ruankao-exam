/**
 * Drawing module types for the Excalidraw-based diagram editor.
 * Supports: AON network, AOA network, UML class, UML sequence, ER diagrams.
 */

export type DiagramTemplate = 'blank' | 'aon' | 'aoa' | 'class' | 'sequence' | 'er'

export interface TemplateInfo {
  id: DiagramTemplate
  name: string
  description: string
}

/**
 * Serialized drawing data stored in localStorage.
 * Contains the Excalidraw scene elements and app state.
 */
export interface DrawingData {
  elements: ExcalidrawElement[]
  appState?: Record<string, unknown>
  version: number
}

/**
 * Minimal Excalidraw element type for our template definitions.
 * The full type comes from @excalidraw/excalidraw at runtime.
 */
export interface ExcalidrawElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  [key: string]: unknown
}
