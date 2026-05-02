import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateId,
  resetIdCounter,
  createEmptyDrawing,
  createTemplateDrawing,
  serializeDrawing,
  deserializeDrawing,
  TEMPLATES,
} from '../drawing/templates'
import type { DiagramTemplate, DrawingData } from '../drawing/types'

describe('Drawing Templates', () => {
  describe('generateId', () => {
    beforeEach(() => {
      resetIdCounter()
    })

    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      const id3 = generateId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should return a string starting with elem_', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
      expect(id.startsWith('elem_')).toBe(true)
    })
  })

  describe('createEmptyDrawing', () => {
    it('should return an empty drawing with correct structure', () => {
      const drawing = createEmptyDrawing()

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBe(0)
      expect(drawing.version).toBe(1)
    })
  })

  describe('TEMPLATES', () => {
    it('should contain all expected templates', () => {
      const expectedIds: DiagramTemplate[] = ['blank', 'aon', 'aoa', 'class', 'sequence', 'er']
      const actualIds = TEMPLATES.map(t => t.id)

      expect(actualIds).toEqual(expectedIds)
    })

    it('should have valid structure for each template', () => {
      TEMPLATES.forEach(template => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(typeof template.id).toBe('string')
        expect(typeof template.name).toBe('string')
        expect(typeof template.description).toBe('string')
      })
    })
  })

  describe('createTemplateDrawing', () => {
    it('should create valid drawing for template: blank', () => {
      const drawing = createTemplateDrawing('blank')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.version).toBe(1)
    })

    it('should create valid drawing for template: aon', () => {
      const drawing = createTemplateDrawing('aon')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBeGreaterThan(0)
    })

    it('should create valid drawing for template: aoa', () => {
      const drawing = createTemplateDrawing('aoa')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBeGreaterThan(0)
    })

    it('should create valid drawing for template: class', () => {
      const drawing = createTemplateDrawing('class')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBeGreaterThan(0)
    })

    it('should create valid drawing for template: sequence', () => {
      const drawing = createTemplateDrawing('sequence')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBeGreaterThan(0)
    })

    it('should create valid drawing for template: er', () => {
      const drawing = createTemplateDrawing('er')

      expect(drawing).toHaveProperty('elements')
      expect(drawing).toHaveProperty('version')
      expect(Array.isArray(drawing.elements)).toBe(true)
      expect(drawing.elements.length).toBeGreaterThan(0)
    })

    describe('template content validation', () => {
      it('blank template should have no shapes', () => {
        const drawing = createTemplateDrawing('blank')
        expect(drawing.elements.length).toBe(0)
      })

      it('aon template should have rectangles and arrows', () => {
        const drawing = createTemplateDrawing('aon')
        const rectangles = drawing.elements.filter(el => el.type === 'rectangle')
        const arrows = drawing.elements.filter(el => el.type === 'arrow')

        expect(rectangles.length).toBeGreaterThanOrEqual(4)
        expect(arrows.length).toBeGreaterThanOrEqual(4)
      })

      it('aoa template should have ellipses and arrows', () => {
        const drawing = createTemplateDrawing('aoa')
        const ellipses = drawing.elements.filter(el => el.type === 'ellipse')
        const arrows = drawing.elements.filter(el => el.type === 'arrow')

        expect(ellipses.length).toBeGreaterThanOrEqual(4)
        expect(arrows.length).toBeGreaterThanOrEqual(4)
      })

      it('class template should have rectangles', () => {
        const drawing = createTemplateDrawing('class')
        const rectangles = drawing.elements.filter(el => el.type === 'rectangle')

        expect(rectangles.length).toBeGreaterThanOrEqual(3)
      })

      it('sequence template should have rectangles and lines', () => {
        const drawing = createTemplateDrawing('sequence')
        const rectangles = drawing.elements.filter(el => el.type === 'rectangle')
        const lines = drawing.elements.filter(el => el.type === 'line')
        const arrows = drawing.elements.filter(el => el.type === 'arrow')

        expect(rectangles.length).toBeGreaterThanOrEqual(3)
        expect(lines.length).toBeGreaterThanOrEqual(3)
        expect(arrows.length).toBeGreaterThanOrEqual(4)
      })

      it('er template should have rectangles, diamonds, and ellipses', () => {
        const drawing = createTemplateDrawing('er')
        const rectangles = drawing.elements.filter(el => el.type === 'rectangle')
        const diamonds = drawing.elements.filter(el => el.type === 'diamond')
        const ellipses = drawing.elements.filter(el => el.type === 'ellipse')

        expect(rectangles.length).toBeGreaterThanOrEqual(2)
        expect(diamonds.length).toBeGreaterThanOrEqual(1)
        expect(ellipses.length).toBeGreaterThanOrEqual(4)
      })
    })

    it('all elements in templates should have valid IDs', () => {
      const templateIds: DiagramTemplate[] = ['blank', 'aon', 'aoa', 'class', 'sequence', 'er']

      for (const templateId of templateIds) {
        const drawing = createTemplateDrawing(templateId)
        for (const element of drawing.elements) {
          expect(element.id).toBeTruthy()
          expect(typeof element.id).toBe('string')
          expect(element.id.length).toBeGreaterThan(0)
        }
      }
    })

    it('all elements should have valid type', () => {
      const templateIds: DiagramTemplate[] = ['aon', 'aoa', 'class', 'sequence', 'er']
      const validTypes = ['rectangle', 'ellipse', 'diamond', 'arrow', 'line', 'text']

      for (const templateId of templateIds) {
        const drawing = createTemplateDrawing(templateId)
        for (const element of drawing.elements) {
          expect(validTypes).toContain(element.type)
        }
      }
    })

    it('all elements should have valid coordinates', () => {
      const templateIds: DiagramTemplate[] = ['aon', 'aoa', 'class', 'sequence', 'er']

      for (const templateId of templateIds) {
        const drawing = createTemplateDrawing(templateId)
        for (const element of drawing.elements) {
          expect(typeof element.x).toBe('number')
          expect(typeof element.y).toBe('number')
          expect(typeof element.width).toBe('number')
          expect(typeof element.height).toBe('number')
          expect(element.x).toBeGreaterThanOrEqual(0)
          expect(element.y).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  describe('serializeDrawing', () => {
    it('should preserve all data', () => {
      const drawing = createTemplateDrawing('aon')
      const json = serializeDrawing(drawing)
      const parsed = JSON.parse(json)

      expect(parsed.elements).toHaveLength(drawing.elements.length)
      expect(parsed.version).toBe(drawing.version)
    })

    it('should return valid JSON string', () => {
      const drawing = createEmptyDrawing()
      const json = serializeDrawing(drawing)

      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should handle empty drawing', () => {
      const drawing = createEmptyDrawing()
      const json = serializeDrawing(drawing)
      const parsed = JSON.parse(json)

      expect(parsed.elements).toEqual([])
      expect(parsed.version).toBe(1)
    })

    it('should preserve element properties', () => {
      const drawing = createTemplateDrawing('class')
      const json = serializeDrawing(drawing)
      const parsed = JSON.parse(json) as DrawingData

      for (let i = 0; i < drawing.elements.length; i++) {
        const original = drawing.elements[i]
        const deserialized = parsed.elements[i]

        expect(deserialized.id).toBe(original.id)
        expect(deserialized.type).toBe(original.type)
        expect(deserialized.x).toBe(original.x)
        expect(deserialized.y).toBe(original.y)
        expect(deserialized.width).toBe(original.width)
        expect(deserialized.height).toBe(original.height)
      }
    })
  })

  describe('deserializeDrawing', () => {
    it('should deserialize valid JSON', () => {
      const original = createTemplateDrawing('aon')
      const json = serializeDrawing(original)
      const result = deserializeDrawing(json)

      expect(result).not.toBeNull()
      expect(result!.elements).toHaveLength(original.elements.length)
      expect(result!.version).toBe(original.version)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeDrawing('invalid json')
      expect(result).toBeNull()
    })

    it('should return null for JSON without elements array', () => {
      const json = JSON.stringify({ version: 1 })
      const result = deserializeDrawing(json)
      expect(result).toBeNull()
    })

    it('should return null for JSON without version number', () => {
      const json = JSON.stringify({ elements: [] })
      const result = deserializeDrawing(json)
      expect(result).toBeNull()
    })

    it('should handle empty drawing', () => {
      const original = createEmptyDrawing()
      const json = serializeDrawing(original)
      const result = deserializeDrawing(json)

      expect(result).not.toBeNull()
      expect(result!.elements).toEqual([])
      expect(result!.version).toBe(1)
    })

    it('should round-trip correctly', () => {
      const templateIds: DiagramTemplate[] = ['blank', 'aon', 'aoa', 'class', 'sequence', 'er']

      for (const templateId of templateIds) {
        const original = createTemplateDrawing(templateId)
        const json = serializeDrawing(original)
        const restored = deserializeDrawing(json)

        expect(restored).not.toBeNull()
        expect(restored!.elements.length).toBe(original.elements.length)
        expect(restored!.version).toBe(original.version)

        for (let i = 0; i < original.elements.length; i++) {
          expect(restored!.elements[i].id).toBe(original.elements[i].id)
          expect(restored!.elements[i].type).toBe(original.elements[i].type)
        }
      }
    })
  })
})
