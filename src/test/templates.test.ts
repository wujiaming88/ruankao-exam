import { describe, it, expect } from 'vitest'
import {
  createEmptyDrawing,
  createTemplateDrawing,
  serializeDrawing,
  deserializeDrawing,
  generateShapeId,
  TEMPLATES,
} from '../drawing/templates'
import type { DiagramTemplate, DrawingData } from '../drawing/types'

describe('Drawing Templates', () => {
  describe('TEMPLATES constant', () => {
    it('should have 6 templates', () => {
      expect(TEMPLATES).toHaveLength(6)
    })

    it('should include all required diagram types', () => {
      const ids = TEMPLATES.map(t => t.id)
      expect(ids).toContain('blank')
      expect(ids).toContain('aon')
      expect(ids).toContain('aoa')
      expect(ids).toContain('class')
      expect(ids).toContain('sequence')
      expect(ids).toContain('er')
    })

    it('should have name and description for each template', () => {
      for (const t of TEMPLATES) {
        expect(t.name).toBeTruthy()
        expect(t.description).toBeTruthy()
      }
    })
  })

  describe('generateShapeId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateShapeId())
      }
      expect(ids.size).toBe(100)
    })

    it('should return a string starting with s_', () => {
      const id = generateShapeId()
      expect(id).toMatch(/^s_/)
    })
  })

  describe('createEmptyDrawing', () => {
    it('should return an empty drawing with correct structure', () => {
      const d = createEmptyDrawing()
      expect(d.shapes).toEqual([])
      expect(d.width).toBe(800)
      expect(d.height).toBe(500)
      expect(d.version).toBe(1)
    })
  })

  describe('createTemplateDrawing', () => {
    const templateIds: DiagramTemplate[] = ['blank', 'aon', 'aoa', 'class', 'sequence', 'er']

    it.each(templateIds)('should create valid drawing for template: %s', (id) => {
      const drawing = createTemplateDrawing(id)
      expect(drawing.version).toBe(1)
      expect(drawing.width).toBe(800)
      expect(drawing.height).toBe(500)
      expect(Array.isArray(drawing.shapes)).toBe(true)
    })

    it('blank template should have no shapes', () => {
      const d = createTemplateDrawing('blank')
      expect(d.shapes).toHaveLength(0)
    })

    it('aon template should have nodes and arrows', () => {
      const d = createTemplateDrawing('aon')
      const rects = d.shapes.filter(s => s.kind === 'rect')
      const arrows = d.shapes.filter(s => s.kind === 'arrow')
      expect(rects.length).toBeGreaterThanOrEqual(4)
      expect(arrows.length).toBeGreaterThanOrEqual(4)
    })

    it('aoa template should have circles and arrows', () => {
      const d = createTemplateDrawing('aoa')
      const ellipses = d.shapes.filter(s => s.kind === 'ellipse')
      const arrows = d.shapes.filter(s => s.kind === 'arrow')
      expect(ellipses.length).toBeGreaterThanOrEqual(4)
      expect(arrows.length).toBeGreaterThanOrEqual(4)
    })

    it('class template should have class boxes', () => {
      const d = createTemplateDrawing('class')
      const rects = d.shapes.filter(s => s.kind === 'rect')
      expect(rects.length).toBeGreaterThanOrEqual(3)
    })

    it('sequence template should have lifelines and messages', () => {
      const d = createTemplateDrawing('sequence')
      const rects = d.shapes.filter(s => s.kind === 'rect')
      const lines = d.shapes.filter(s => s.kind === 'line')
      const arrows = d.shapes.filter(s => s.kind === 'arrow')
      expect(rects.length).toBeGreaterThanOrEqual(3)
      expect(lines.length).toBeGreaterThanOrEqual(3)
      expect(arrows.length).toBeGreaterThanOrEqual(3)
    })

    it('er template should have entities, relationships, and attributes', () => {
      const d = createTemplateDrawing('er')
      const rects = d.shapes.filter(s => s.kind === 'rect')
      const diamonds = d.shapes.filter(s => s.kind === 'diamond')
      const ellipses = d.shapes.filter(s => s.kind === 'ellipse')
      expect(rects.length).toBeGreaterThanOrEqual(2)
      expect(diamonds.length).toBeGreaterThanOrEqual(1)
      expect(ellipses.length).toBeGreaterThanOrEqual(4)
    })

    it('all shapes in templates should have valid IDs', () => {
      for (const id of templateIds) {
        const d = createTemplateDrawing(id)
        for (const shape of d.shapes) {
          expect(shape.id).toBeTruthy()
          expect(typeof shape.id).toBe('string')
        }
      }
    })

    it('all shapes should have valid kind', () => {
      const validKinds = ['rect', 'ellipse', 'diamond', 'arrow', 'line', 'text']
      for (const id of templateIds) {
        const d = createTemplateDrawing(id)
        for (const shape of d.shapes) {
          expect(validKinds).toContain(shape.kind)
        }
      }
    })
  })

  describe('serializeDrawing', () => {
    it('should serialize to valid JSON', () => {
      const d = createEmptyDrawing()
      const json = serializeDrawing(d)
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should preserve all data', () => {
      const d = createTemplateDrawing('aon')
      const json = serializeDrawing(d)
      const parsed = JSON.parse(json)
      expect(parsed.shapes).toHaveLength(d.shapes.length)
      expect(parsed.version).toBe(d.version)
      expect(parsed.width).toBe(d.width)
      expect(parsed.height).toBe(d.height)
    })
  })

  describe('deserializeDrawing', () => {
    it('should deserialize valid JSON', () => {
      const original = createTemplateDrawing('class')
      const json = serializeDrawing(original)
      const result = deserializeDrawing(json)
      expect(result).not.toBeNull()
      expect(result!.shapes).toHaveLength(original.shapes.length)
      expect(result!.version).toBe(original.version)
    })

    it('should return null for invalid JSON', () => {
      expect(deserializeDrawing('not json')).toBeNull()
    })

    it('should return null for JSON without shapes array', () => {
      expect(deserializeDrawing('{"version": 1}')).toBeNull()
    })

    it('should return null for JSON without version', () => {
      expect(deserializeDrawing('{"shapes": []}')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(deserializeDrawing('')).toBeNull()
    })

    it('round-trip serialization should be lossless', () => {
      const templates: DiagramTemplate[] = ['aon', 'aoa', 'class', 'sequence', 'er']
      for (const t of templates) {
        const original = createTemplateDrawing(t)
        const json = serializeDrawing(original)
        const restored = deserializeDrawing(json) as DrawingData
        expect(restored.shapes).toEqual(original.shapes)
        expect(restored.width).toBe(original.width)
        expect(restored.height).toBe(original.height)
        expect(restored.version).toBe(original.version)
      }
    })
  })
})
