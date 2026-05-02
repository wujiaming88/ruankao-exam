/**
 * Drawing module types for the case analysis diagram editor.
 * Supports: AON network, AOA network, UML class, UML sequence, ER diagrams.
 */

export type ShapeKind = 'rect' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text'

export interface Point {
  x: number
  y: number
}

export interface BaseShape {
  id: string
  kind: ShapeKind
  x: number
  y: number
  label: string
  strokeColor: string
  fillColor: string
}

export interface RectShape extends BaseShape {
  kind: 'rect'
  width: number
  height: number
}

export interface EllipseShape extends BaseShape {
  kind: 'ellipse'
  rx: number
  ry: number
}

export interface DiamondShape extends BaseShape {
  kind: 'diamond'
  width: number
  height: number
}

export interface ArrowShape extends BaseShape {
  kind: 'arrow'
  x2: number
  y2: number
}

export interface LineShape extends BaseShape {
  kind: 'line'
  x2: number
  y2: number
}

export interface TextShape extends BaseShape {
  kind: 'text'
  fontSize: number
}

export type DrawShape = RectShape | EllipseShape | DiamondShape | ArrowShape | LineShape | TextShape

export interface DrawingData {
  shapes: DrawShape[]
  width: number
  height: number
  version: number
}

export type DiagramTemplate = 'blank' | 'aon' | 'aoa' | 'class' | 'sequence' | 'er'

export interface TemplateInfo {
  id: DiagramTemplate
  name: string
  description: string
}

export type DrawTool = 'select' | 'rect' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text'
