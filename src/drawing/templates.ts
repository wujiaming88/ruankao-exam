import type { DiagramTemplate, DrawingData, DrawShape, TemplateInfo } from './types'

export const TEMPLATES: TemplateInfo[] = [
  { id: 'blank', name: '空白画布', description: '从零开始绘图' },
  { id: 'aon', name: '单代号网络图 (AON)', description: '前导图，节点表示活动' },
  { id: 'aoa', name: '双代号网络图 (AOA)', description: '箭线图，箭线表示活动' },
  { id: 'class', name: 'UML 类图', description: '类、接口及关系' },
  { id: 'sequence', name: 'UML 时序图', description: '对象间消息交互' },
  { id: 'er', name: 'ER 图', description: '实体-关系模型' },
]

let _counter = 0
export function generateShapeId(): string {
  return `s_${Date.now().toString(36)}_${(++_counter).toString(36)}`
}

export function createEmptyDrawing(): DrawingData {
  return { shapes: [], width: 800, height: 500, version: 1 }
}

function makeRect(id: string, x: number, y: number, w: number, h: number, label: string): DrawShape {
  return { id, kind: 'rect', x, y, width: w, height: h, label, strokeColor: '#333', fillColor: '#fff' }
}

function makeEllipse(id: string, x: number, y: number, rx: number, ry: number, label: string): DrawShape {
  return { id, kind: 'ellipse', x, y, rx, ry, label, strokeColor: '#333', fillColor: '#fff' }
}

function makeDiamond(id: string, x: number, y: number, w: number, h: number, label: string): DrawShape {
  return { id, kind: 'diamond', x, y, width: w, height: h, label, strokeColor: '#333', fillColor: '#fff' }
}

function makeArrow(id: string, x: number, y: number, x2: number, y2: number, label: string): DrawShape {
  return { id, kind: 'arrow', x, y, x2, y2, label, strokeColor: '#333', fillColor: 'transparent' }
}

function makeText(id: string, x: number, y: number, label: string): DrawShape {
  return { id, kind: 'text', x, y, label, strokeColor: '#333', fillColor: 'transparent', fontSize: 14 }
}

export function createTemplateDrawing(template: DiagramTemplate): DrawingData {
  const drawing = createEmptyDrawing()

  switch (template) {
    case 'blank':
      break

    case 'aon': {
      // AON: nodes are activities (rectangles), arrows show dependencies
      drawing.shapes = [
        makeRect('aon_1', 50, 200, 100, 60, '活动A\nES=0 EF=3'),
        makeRect('aon_2', 250, 100, 100, 60, '活动B\nES=3 EF=6'),
        makeRect('aon_3', 250, 300, 100, 60, '活动C\nES=3 EF=8'),
        makeRect('aon_4', 500, 200, 100, 60, '活动D\nES=8 EF=11'),
        makeArrow('aon_a1', 150, 230, 250, 130, ''),
        makeArrow('aon_a2', 150, 230, 250, 330, ''),
        makeArrow('aon_a3', 350, 130, 500, 230, ''),
        makeArrow('aon_a4', 350, 330, 500, 230, ''),
        makeText('aon_t', 250, 30, '单代号网络图 (AON)'),
      ]
      break
    }

    case 'aoa': {
      // AOA: nodes are events (circles), arrows are activities
      drawing.shapes = [
        makeEllipse('aoa_1', 80, 220, 30, 30, '①'),
        makeEllipse('aoa_2', 280, 100, 30, 30, '②'),
        makeEllipse('aoa_3', 280, 340, 30, 30, '③'),
        makeEllipse('aoa_4', 520, 220, 30, 30, '④'),
        makeArrow('aoa_a1', 110, 220, 250, 100, 'A(3)'),
        makeArrow('aoa_a2', 110, 220, 250, 340, 'B(5)'),
        makeArrow('aoa_a3', 310, 100, 490, 220, 'C(4)'),
        makeArrow('aoa_a4', 310, 340, 490, 220, 'D(2)'),
        makeText('aoa_t', 250, 30, '双代号网络图 (AOA)'),
      ]
      break
    }

    case 'class': {
      // UML Class diagram
      drawing.shapes = [
        makeRect('cls_1', 100, 50, 160, 100, '<<interface>>\nAnimal\n+eat(): void\n+sleep(): void'),
        makeRect('cls_2', 50, 250, 140, 80, 'Dog\n-name: string\n+bark(): void'),
        makeRect('cls_3', 250, 250, 140, 80, 'Cat\n-name: string\n+meow(): void'),
        makeArrow('cls_a1', 120, 250, 180, 150, '实现'),
        makeArrow('cls_a2', 320, 250, 200, 150, '实现'),
        makeText('cls_t', 150, 10, 'UML 类图'),
      ]
      break
    }

    case 'sequence': {
      // UML Sequence diagram
      drawing.shapes = [
        makeRect('seq_1', 50, 30, 80, 40, '客户端'),
        makeRect('seq_2', 250, 30, 80, 40, '服务器'),
        makeRect('seq_3', 450, 30, 80, 40, '数据库'),
        // Lifelines (vertical lines)
        { id: 'seq_l1', kind: 'line', x: 90, y: 70, x2: 90, y2: 400, label: '', strokeColor: '#999', fillColor: 'transparent' },
        { id: 'seq_l2', kind: 'line', x: 290, y: 70, x2: 290, y2: 400, label: '', strokeColor: '#999', fillColor: 'transparent' },
        { id: 'seq_l3', kind: 'line', x: 490, y: 70, x2: 490, y2: 400, label: '', strokeColor: '#999', fillColor: 'transparent' },
        // Messages
        makeArrow('seq_m1', 90, 120, 290, 120, '1. 请求'),
        makeArrow('seq_m2', 290, 180, 490, 180, '2. 查询'),
        makeArrow('seq_m3', 490, 240, 290, 240, '3. 返回数据'),
        makeArrow('seq_m4', 290, 300, 90, 300, '4. 响应'),
        makeText('seq_t', 200, 10, 'UML 时序图'),
      ]
      break
    }

    case 'er': {
      // ER diagram: entities (rects), relationships (diamonds), attributes (ellipses)
      drawing.shapes = [
        makeRect('er_1', 50, 180, 120, 60, '学生'),
        makeRect('er_2', 500, 180, 120, 60, '课程'),
        makeDiamond('er_d1', 300, 185, 80, 50, '选课'),
        makeEllipse('er_a1', 80, 80, 40, 25, '学号'),
        makeEllipse('er_a2', 170, 80, 40, 25, '姓名'),
        makeEllipse('er_a3', 530, 80, 40, 25, '课程号'),
        makeEllipse('er_a4', 620, 80, 40, 25, '课程名'),
        makeArrow('er_l1', 170, 180, 300, 210, '1'),
        makeArrow('er_l2', 380, 210, 500, 210, 'N'),
        { id: 'er_la1', kind: 'line', x: 80, y: 105, x2: 80, y2: 180, label: '', strokeColor: '#333', fillColor: 'transparent' },
        { id: 'er_la2', kind: 'line', x: 170, y: 105, x2: 140, y2: 180, label: '', strokeColor: '#333', fillColor: 'transparent' },
        { id: 'er_la3', kind: 'line', x: 530, y: 105, x2: 530, y2: 180, label: '', strokeColor: '#333', fillColor: 'transparent' },
        { id: 'er_la4', kind: 'line', x: 620, y: 105, x2: 590, y2: 180, label: '', strokeColor: '#333', fillColor: 'transparent' },
        makeText('er_t', 260, 20, 'ER 图'),
      ]
      break
    }
  }

  return drawing
}

export function serializeDrawing(data: DrawingData): string {
  return JSON.stringify(data)
}

export function deserializeDrawing(json: string): DrawingData | null {
  try {
    const parsed = JSON.parse(json)
    if (parsed && Array.isArray(parsed.shapes) && typeof parsed.version === 'number') {
      return parsed as DrawingData
    }
    return null
  } catch {
    return null
  }
}
