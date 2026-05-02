import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrawingData, DrawShape, DrawTool, Point } from './types'
import { generateShapeId } from './templates'

interface Props {
  data: DrawingData
  onChange: (data: DrawingData) => void
  tool: DrawTool
  onToolReset: () => void
}

export default function SvgCanvas({ data, onChange, tool, onToolReset }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    shapeId: string
    startMouse: Point
    startPos: Point
  } | null>(null)
  const [drawState, setDrawState] = useState<{
    start: Point
    current: Point
  } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const getSvgPoint = useCallback((e: React.MouseEvent): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const pt = getSvgPoint(e)

    if (tool === 'select') {
      // Check if clicking a shape
      const target = (e.target as Element).closest('[data-shape-id]')
      if (target) {
        const id = target.getAttribute('data-shape-id')!
        setSelectedId(id)
        const shape = data.shapes.find(s => s.id === id)
        if (shape) {
          setDragState({ shapeId: id, startMouse: pt, startPos: { x: shape.x, y: shape.y } })
        }
      } else {
        setSelectedId(null)
      }
    } else {
      setDrawState({ start: pt, current: pt })
    }
  }, [tool, data.shapes, getSvgPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e)

    if (dragState) {
      const dx = pt.x - dragState.startMouse.x
      const dy = pt.y - dragState.startMouse.y
      const newShapes = data.shapes.map(s => {
        if (s.id !== dragState.shapeId) return s
        const updated = { ...s, x: dragState.startPos.x + dx, y: dragState.startPos.y + dy }
        // Also move endpoint for arrow/line
        if ((s.kind === 'arrow' || s.kind === 'line') && 'x2' in s) {
          const origShape = data.shapes.find(os => os.id === s.id) as (typeof s)
          ;(updated as typeof s).x2 = origShape.x2 + dx
          ;(updated as typeof s).y2 = origShape.y2 + dy
        }
        return updated
      })
      onChange({ ...data, shapes: newShapes })
    } else if (drawState) {
      setDrawState({ ...drawState, current: pt })
    }
  }, [dragState, drawState, data, onChange, getSvgPoint])

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      setDragState(null)
      return
    }

    if (drawState && tool !== 'select') {
      const { start, current } = drawState
      const dx = current.x - start.x
      const dy = current.y - start.y

      // Only create shape if there's meaningful movement (or it's text)
      if (tool === 'text' || Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const id = generateShapeId()
        let newShape: DrawShape

        switch (tool) {
          case 'rect':
            newShape = {
              id, kind: 'rect',
              x: Math.min(start.x, current.x), y: Math.min(start.y, current.y),
              width: Math.abs(dx), height: Math.abs(dy),
              label: '', strokeColor: '#333', fillColor: '#fff',
            }
            break
          case 'ellipse':
            newShape = {
              id, kind: 'ellipse',
              x: (start.x + current.x) / 2, y: (start.y + current.y) / 2,
              rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2,
              label: '', strokeColor: '#333', fillColor: '#fff',
            }
            break
          case 'diamond':
            newShape = {
              id, kind: 'diamond',
              x: Math.min(start.x, current.x), y: Math.min(start.y, current.y),
              width: Math.abs(dx), height: Math.abs(dy),
              label: '', strokeColor: '#333', fillColor: '#fff',
            }
            break
          case 'arrow':
            newShape = {
              id, kind: 'arrow',
              x: start.x, y: start.y, x2: current.x, y2: current.y,
              label: '', strokeColor: '#333', fillColor: 'transparent',
            }
            break
          case 'line':
            newShape = {
              id, kind: 'line',
              x: start.x, y: start.y, x2: current.x, y2: current.y,
              label: '', strokeColor: '#333', fillColor: 'transparent',
            }
            break
          case 'text':
            newShape = {
              id, kind: 'text',
              x: start.x, y: start.y,
              label: '文字', strokeColor: '#333', fillColor: 'transparent', fontSize: 14,
            }
            break
          default:
            setDrawState(null)
            return
        }

        onChange({ ...data, shapes: [...data.shapes, newShape] })
        onToolReset()
      }
      setDrawState(null)
    }
  }, [dragState, drawState, tool, data, onChange, onToolReset])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = (e.target as Element).closest('[data-shape-id]')
    if (target) {
      const id = target.getAttribute('data-shape-id')!
      const shape = data.shapes.find(s => s.id === id)
      if (shape) {
        setEditingId(id)
        setEditText(shape.label)
      }
    }
  }, [data.shapes])

  const handleLabelSubmit = useCallback(() => {
    if (editingId) {
      const newShapes = data.shapes.map(s =>
        s.id === editingId ? { ...s, label: editText } : s
      )
      onChange({ ...data, shapes: newShapes })
      setEditingId(null)
      setEditText('')
    }
  }, [editingId, editText, data, onChange])

  // Delete selected shape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
        onChange({ ...data, shapes: data.shapes.filter(s => s.id !== selectedId) })
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, editingId, data, onChange])

  const renderShape = (shape: DrawShape) => {
    const isSelected = shape.id === selectedId
    const selectionStroke = isSelected ? '#2196F3' : undefined
    const selectionWidth = isSelected ? 2 : undefined

    switch (shape.kind) {
      case 'rect':
        return (
          <g key={shape.id} data-shape-id={shape.id}>
            <rect
              x={shape.x} y={shape.y} width={shape.width} height={shape.height}
              stroke={selectionStroke || shape.strokeColor}
              strokeWidth={selectionWidth || 1.5}
              fill={shape.fillColor}
            />
            {shape.label && (
              <text
                x={shape.x + shape.width / 2} y={shape.y + shape.height / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={12} fill="#333" style={{ pointerEvents: 'none' }}
              >
                {shape.label.split('\n').map((line, i) => (
                  <tspan key={i} x={shape.x + shape.width / 2} dy={i === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        )

      case 'ellipse':
        return (
          <g key={shape.id} data-shape-id={shape.id}>
            <ellipse
              cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry}
              stroke={selectionStroke || shape.strokeColor}
              strokeWidth={selectionWidth || 1.5}
              fill={shape.fillColor}
            />
            {shape.label && (
              <text
                x={shape.x} y={shape.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={12} fill="#333" style={{ pointerEvents: 'none' }}
              >
                {shape.label}
              </text>
            )}
          </g>
        )

      case 'diamond':
        const cx = shape.x + shape.width / 2
        const cy = shape.y + shape.height / 2
        const points = `${cx},${shape.y} ${shape.x + shape.width},${cy} ${cx},${shape.y + shape.height} ${shape.x},${cy}`
        return (
          <g key={shape.id} data-shape-id={shape.id}>
            <polygon
              points={points}
              stroke={selectionStroke || shape.strokeColor}
              strokeWidth={selectionWidth || 1.5}
              fill={shape.fillColor}
            />
            {shape.label && (
              <text
                x={cx} y={cy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={12} fill="#333" style={{ pointerEvents: 'none' }}
              >
                {shape.label}
              </text>
            )}
          </g>
        )

      case 'arrow':
      case 'line': {
        const markerId = shape.kind === 'arrow' ? 'arrowhead' : undefined
        // Compute midpoint for label
        const mx = (shape.x + shape.x2) / 2
        const my = (shape.y + shape.y2) / 2
        return (
          <g key={shape.id} data-shape-id={shape.id}>
            <line
              x1={shape.x} y1={shape.y} x2={shape.x2} y2={shape.y2}
              stroke={selectionStroke || shape.strokeColor}
              strokeWidth={selectionWidth || 1.5}
              markerEnd={markerId ? `url(#${markerId})` : undefined}
            />
            {/* Invisible wider line for easier selection */}
            <line
              x1={shape.x} y1={shape.y} x2={shape.x2} y2={shape.y2}
              stroke="transparent" strokeWidth={10}
            />
            {shape.label && (
              <text
                x={mx} y={my - 6}
                textAnchor="middle" fontSize={11} fill="#333"
                style={{ pointerEvents: 'none' }}
              >
                {shape.label}
              </text>
            )}
          </g>
        )
      }

      case 'text':
        return (
          <g key={shape.id} data-shape-id={shape.id}>
            <text
              x={shape.x} y={shape.y}
              fontSize={shape.fontSize}
              fill={selectionStroke || shape.strokeColor}
              style={{ cursor: 'move' }}
            >
              {shape.label.split('\n').map((line, i) => (
                <tspan key={i} x={shape.x} dy={i === 0 ? 0 : shape.fontSize + 2}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
    }
  }

  // Preview shape while drawing
  const renderPreview = () => {
    if (!drawState || tool === 'select' || tool === 'text') return null
    const { start, current } = drawState
    const dx = current.x - start.x
    const dy = current.y - start.y

    switch (tool) {
      case 'rect':
        return (
          <rect
            x={Math.min(start.x, current.x)} y={Math.min(start.y, current.y)}
            width={Math.abs(dx)} height={Math.abs(dy)}
            stroke="#2196F3" strokeWidth={1} fill="rgba(33,150,243,0.1)" strokeDasharray="4"
          />
        )
      case 'ellipse':
        return (
          <ellipse
            cx={(start.x + current.x) / 2} cy={(start.y + current.y) / 2}
            rx={Math.abs(dx) / 2} ry={Math.abs(dy) / 2}
            stroke="#2196F3" strokeWidth={1} fill="rgba(33,150,243,0.1)" strokeDasharray="4"
          />
        )
      case 'diamond': {
        const pcx = (start.x + current.x) / 2
        const pcy = (start.y + current.y) / 2
        const mnx = Math.min(start.x, current.x)
        const mny = Math.min(start.y, current.y)
        const mxx = Math.max(start.x, current.x)
        const mxy = Math.max(start.y, current.y)
        return (
          <polygon
            points={`${pcx},${mny} ${mxx},${pcy} ${pcx},${mxy} ${mnx},${pcy}`}
            stroke="#2196F3" strokeWidth={1} fill="rgba(33,150,243,0.1)" strokeDasharray="4"
          />
        )
      }
      case 'arrow':
      case 'line':
        return (
          <line
            x1={start.x} y1={start.y} x2={current.x} y2={current.y}
            stroke="#2196F3" strokeWidth={1.5} strokeDasharray="4"
            markerEnd={tool === 'arrow' ? 'url(#arrowhead-preview)' : undefined}
          />
        )
    }
    return null
  }

  return (
    <div className="drawing-canvas-container" data-testid="drawing-canvas">
      <svg
        ref={svgRef}
        width={data.width}
        height={data.height}
        className="drawing-svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ border: '1px solid #ddd', background: '#fefefe', cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
          </marker>
          <marker id="arrowhead-preview" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2196F3" />
          </marker>
        </defs>

        {/* Grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {data.shapes.map(renderShape)}
        {renderPreview()}
      </svg>

      {/* Inline label editor */}
      {editingId && (() => {
        const shape = data.shapes.find(s => s.id === editingId)
        if (!shape) return null
        const inputX = shape.x
        const inputY = shape.y
        return (
          <div
            className="label-editor"
            style={{
              position: 'absolute',
              left: inputX,
              top: inputY,
              zIndex: 100,
            }}
          >
            <input
              data-testid="label-input"
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleLabelSubmit()
                if (e.key === 'Escape') { setEditingId(null); setEditText('') }
              }}
              onBlur={handleLabelSubmit}
              style={{ padding: '2px 4px', fontSize: 12, minWidth: 80 }}
            />
          </div>
        )
      })()}
    </div>
  )
}
