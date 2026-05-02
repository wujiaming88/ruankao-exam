import { useCallback, useState } from 'react'
import type { DiagramTemplate, DrawingData, DrawTool } from './types'
import { createEmptyDrawing, createTemplateDrawing, TEMPLATES } from './templates'
import SvgCanvas from './SvgCanvas'

interface Props {
  /** Initial drawing data (for restoring saved state) */
  initialData?: DrawingData | null
  /** Called whenever drawing changes */
  onSave: (data: DrawingData) => void
  /** Called to close the editor */
  onClose: () => void
}

const TOOLS: { id: DrawTool; label: string; icon: string }[] = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'rect', label: '矩形', icon: '▭' },
  { id: 'ellipse', label: '椭圆', icon: '○' },
  { id: 'diamond', label: '菱形', icon: '◇' },
  { id: 'arrow', label: '箭头', icon: '→' },
  { id: 'line', label: '线段', icon: '/' },
  { id: 'text', label: '文字', icon: 'T' },
]

export default function DrawingEditor({ initialData, onSave, onClose }: Props) {
  const [data, setData] = useState<DrawingData>(initialData || createEmptyDrawing())
  const [activeTool, setActiveTool] = useState<DrawTool>('select')
  const [showTemplates, setShowTemplates] = useState(!initialData)

  const handleChange = useCallback((newData: DrawingData) => {
    setData(newData)
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

  const handleToolReset = useCallback(() => {
    setActiveTool('select')
  }, [])

  return (
    <div className="drawing-editor" data-testid="drawing-editor">
      {/* Toolbar */}
      <div className="drawing-toolbar" data-testid="drawing-toolbar">
        <div className="drawing-tools">
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`drawing-tool-btn ${activeTool === t.id ? 'active' : ''}`}
              onClick={() => setActiveTool(t.id)}
              title={t.label}
              data-testid={`tool-${t.id}`}
            >
              <span className="tool-icon">{t.icon}</span>
              <span className="tool-label">{t.label}</span>
            </button>
          ))}
        </div>

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
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <SvgCanvas
        data={data}
        onChange={handleChange}
        tool={activeTool}
        onToolReset={handleToolReset}
      />

      {/* Status bar */}
      <div className="drawing-status">
        <span>图形数量: {data.shapes.length}</span>
        <span>工具: {TOOLS.find(t => t.id === activeTool)?.label}</span>
        <span style={{ fontSize: 11, color: '#999' }}>双击编辑标签 | Delete 删除 | 拖拽移动</span>
      </div>
    </div>
  )
}
