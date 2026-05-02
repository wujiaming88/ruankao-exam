import { useCallback, useEffect, useRef, useState } from 'react'
import type { DiagramTemplate, DrawingData } from './types'
import { createEmptyDrawing, createTemplateDrawing, TEMPLATES, serializeDrawing, deserializeDrawing } from './templates'

interface Props {
  /** Initial drawing data (for restoring saved state) */
  initialData?: DrawingData | null
  /** Called whenever drawing is saved */
  onSave: (data: DrawingData) => void
  /** Called to close the editor */
  onClose: () => void
}

/**
 * Lazy loader function for Excalidraw module
 * Exported for testing purposes
 */
export const loadExcalidrawModule = () => import('@excalidraw/excalidraw')

/**
 * ExcalidrawEditor — Modal-based diagram editor using @excalidraw/excalidraw.
 * Wraps Excalidraw with template selection and save/close controls.
 */
export default function ExcalidrawEditor({ initialData, onSave, onClose }: Props) {
  const [data, setData] = useState<DrawingData>(initialData ?? createEmptyDrawing())
  const [showTemplates, setShowTemplates] = useState(!initialData)
  const excalidrawRef = useRef<{ readyPromise?: Promise<unknown> }>(null)
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Lazy-load Excalidraw component
  useEffect(() => {
    loadExcalidrawModule()
      .then((mod) => {
        setExcalidrawComponent(() => mod.Excalidraw)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        setLoadError(err.message)
        setIsLoading(false)
      })
  }, [])

  const handleChange = useCallback((elements: readonly Record<string, unknown>[]) => {
    setData(prev => ({
      ...prev,
      elements: elements as unknown as DrawingData['elements'],
    }))
  }, [])

  const handleSave = useCallback(() => {
    onSave(data)
    onClose()
  }, [data, onSave, onClose])

  const handleClear = useCallback(() => {
    setData(createEmptyDrawing())
  }, [])

  const handleApplyTemplate = useCallback((template: DiagramTemplate) => {
    setData(createTemplateDrawing(template))
    setShowTemplates(false)
  }, [])

  return (
    <div className="drawing-editor" data-testid="drawing-editor">
      {/* Toolbar */}
      <div className="drawing-toolbar" data-testid="drawing-toolbar">
        <div className="drawing-actions">
          <button
            className="btn btn-sm"
            onClick={() => setShowTemplates(true)}
            data-testid="btn-templates"
          >
            📋 模板
          </button>
          <button
            className="btn btn-sm"
            onClick={handleClear}
            data-testid="btn-clear"
          >
            🗑️ 清空
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            data-testid="btn-save-drawing"
          >
            💾 保存
          </button>
          <button
            className="btn btn-sm"
            onClick={onClose}
            data-testid="btn-close-drawing"
          >
            ✕ 关闭
          </button>
        </div>
      </div>

      {/* Template selector modal */}
      {showTemplates && (
        <div className="drawing-templates-overlay" data-testid="template-modal">
          <div className="drawing-templates-panel">
            <h3>选择图表模板</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              选择一个模板快速开始，或从空白画布创建
            </p>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className="template-card"
                  onClick={() => handleApplyTemplate(t.id)}
                  data-testid={`template-${t.id}`}
                >
                  <div className="template-name">{t.name}</div>
                  <div className="template-desc">{t.description}</div>
                </button>
              ))}
            </div>
            <button
              className="btn btn-sm"
              onClick={() => setShowTemplates(false)}
              style={{ marginTop: 12 }}
              data-testid="btn-cancel-template"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Excalidraw Canvas */}
      <div className="drawing-canvas" data-testid="drawing-canvas" style={{ height: 450 }}>
        {isLoading && (
          <div className="drawing-loading" data-testid="drawing-loading">
            加载绘图编辑器...
          </div>
        )}
        {loadError && (
          <div className="drawing-error" data-testid="drawing-error">
            加载失败: {loadError}
          </div>
        )}
        {ExcalidrawComponent && !loadError && (
          <ExcalidrawComponent
            ref={excalidrawRef}
            initialData={{ elements: data.elements, appState: { viewBackgroundColor: '#ffffff' } }}
            onChange={handleChange}
            langCode="zh-CN"
          />
        )}
      </div>

      {/* Status bar */}
      <div className="drawing-status" data-testid="drawing-status">
        <span>图形数量: {data.elements.length}</span>
        <span style={{ fontSize: 11, color: '#999' }}>使用工具栏绘图 | Ctrl+Z 撤销 | 拖拽移动</span>
      </div>
    </div>
  )
}

// Re-export serialization utilities for use by CaseExam
export { serializeDrawing, deserializeDrawing }
