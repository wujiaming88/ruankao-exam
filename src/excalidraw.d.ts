declare module '@excalidraw/excalidraw' {
  import type { ComponentType } from 'react'

  export interface ExcalidrawElement {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    [key: string]: unknown
  }

  export interface ExcalidrawProps {
    initialData?: {
      elements?: readonly ExcalidrawElement[]
      appState?: Record<string, unknown>
    }
    onChange?: (elements: readonly ExcalidrawElement[]) => void
    langCode?: string
    [key: string]: unknown
  }

  export const Excalidraw: ComponentType<ExcalidrawProps>
}
