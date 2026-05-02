import type { DiagramTemplate, DrawingData, ExcalidrawElement, TemplateInfo } from './types'

export const TEMPLATES: TemplateInfo[] = [
  { id: 'blank', name: '空白画布', description: '从零开始绘图' },
  { id: 'aon', name: '单代号网络图 (AON)', description: '前导图，节点表示活动' },
  { id: 'aoa', name: '双代号网络图 (AOA)', description: '箭线图，箭线表示活动' },
  { id: 'class', name: 'UML 类图', description: '类、接口及关系' },
  { id: 'sequence', name: 'UML 时序图', description: '对象间消息交互' },
  { id: 'er', name: 'ER 图', description: '实体-关系模型' },
]

let _counter = 0

export function generateId(): string {
  return `elem_${Date.now().toString(36)}_${(++_counter).toString(36)}`
}

/** Reset counter for testing determinism */
export function resetIdCounter(): void {
  _counter = 0
}

export function createEmptyDrawing(): DrawingData {
  return { elements: [], version: 1 }
}

function makeRect(id: string, x: number, y: number, w: number, h: number, text?: string): ExcalidrawElement[] {
  const rect: ExcalidrawElement = {
    id,
    type: 'rectangle',
    x,
    y,
    width: w,
    height: h,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    roundness: { type: 3 },
    isDeleted: false,
    boundElements: text ? [{ id: `${id}_text`, type: 'text' }] : [],
  }
  if (!text) return [rect]
  const textEl: ExcalidrawElement = {
    id: `${id}_text`,
    type: 'text',
    x: x + 10,
    y: y + h / 2 - 10,
    width: w - 20,
    height: 20,
    text,
    fontSize: 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    containerId: id,
    boundElements: [],
  }
  return [rect, textEl]
}

function makeEllipse(id: string, x: number, y: number, w: number, h: number, text?: string): ExcalidrawElement[] {
  const ellipse: ExcalidrawElement = {
    id,
    type: 'ellipse',
    x,
    y,
    width: w,
    height: h,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    roundness: { type: 2 },
    isDeleted: false,
    boundElements: text ? [{ id: `${id}_text`, type: 'text' }] : [],
  }
  if (!text) return [ellipse]
  const textEl: ExcalidrawElement = {
    id: `${id}_text`,
    type: 'text',
    x: x + 10,
    y: y + h / 2 - 10,
    width: w - 20,
    height: 20,
    text,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    containerId: id,
    boundElements: [],
  }
  return [ellipse, textEl]
}

function makeDiamond(id: string, x: number, y: number, w: number, h: number, text?: string): ExcalidrawElement[] {
  const diamond: ExcalidrawElement = {
    id,
    type: 'diamond',
    x,
    y,
    width: w,
    height: h,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    roundness: { type: 2 },
    isDeleted: false,
    boundElements: text ? [{ id: `${id}_text`, type: 'text' }] : [],
  }
  if (!text) return [diamond]
  const textEl: ExcalidrawElement = {
    id: `${id}_text`,
    type: 'text',
    x: x + 10,
    y: y + h / 2 - 10,
    width: w - 20,
    height: 20,
    text,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    containerId: id,
    boundElements: [],
  }
  return [diamond, textEl]
}

function makeArrow(id: string, x1: number, y1: number, x2: number, y2: number, label?: string): ExcalidrawElement[] {
  const arrow: ExcalidrawElement = {
    id,
    type: 'arrow',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    boundElements: label ? [{ id: `${id}_text`, type: 'text' }] : [],
    endArrowhead: 'arrow',
    startArrowhead: null,
  }
  if (!label) return [arrow]
  const midX = x1 + (x2 - x1) / 2
  const midY = y1 + (y2 - y1) / 2
  const textEl: ExcalidrawElement = {
    id: `${id}_text`,
    type: 'text',
    x: midX - 20,
    y: midY - 10,
    width: 40,
    height: 20,
    text: label,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    containerId: id,
    boundElements: [],
  }
  return [arrow, textEl]
}

function makeText(id: string, x: number, y: number, text: string, fontSize: number = 20): ExcalidrawElement[] {
  return [{
    id,
    type: 'text',
    x,
    y,
    width: text.length * fontSize * 0.6,
    height: fontSize + 4,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    boundElements: [],
  }]
}

function makeLine(id: string, x1: number, y1: number, x2: number, y2: number): ExcalidrawElement[] {
  return [{
    id,
    type: 'line',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    strokeColor: '#999999',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    angle: 0,
    groupIds: [],
    isDeleted: false,
    boundElements: [],
  }]
}

export function createTemplateDrawing(template: DiagramTemplate): DrawingData {
  const drawing = createEmptyDrawing()

  switch (template) {
    case 'blank':
      break

    case 'aon': {
      drawing.elements = [
        ...makeText('aon_title', 220, 10, '单代号网络图 (AON)'),
        ...makeRect('aon_1', 50, 180, 120, 60, '活动A\nES=0 EF=3'),
        ...makeRect('aon_2', 250, 80, 120, 60, '活动B\nES=3 EF=6'),
        ...makeRect('aon_3', 250, 280, 120, 60, '活动C\nES=3 EF=8'),
        ...makeRect('aon_4', 480, 180, 120, 60, '活动D\nES=8 EF=11'),
        ...makeArrow('aon_a1', 170, 210, 250, 110),
        ...makeArrow('aon_a2', 170, 210, 250, 310),
        ...makeArrow('aon_a3', 370, 110, 480, 210),
        ...makeArrow('aon_a4', 370, 310, 480, 210),
      ]
      break
    }

    case 'aoa': {
      drawing.elements = [
        ...makeText('aoa_title', 220, 10, '双代号网络图 (AOA)'),
        ...makeEllipse('aoa_1', 60, 190, 60, 60, '①'),
        ...makeEllipse('aoa_2', 250, 70, 60, 60, '②'),
        ...makeEllipse('aoa_3', 250, 310, 60, 60, '③'),
        ...makeEllipse('aoa_4', 480, 190, 60, 60, '④'),
        ...makeArrow('aoa_a1', 120, 220, 250, 100, 'A(3)'),
        ...makeArrow('aoa_a2', 120, 220, 250, 340, 'B(5)'),
        ...makeArrow('aoa_a3', 310, 100, 480, 220, 'C(4)'),
        ...makeArrow('aoa_a4', 310, 340, 480, 220, 'D(2)'),
      ]
      break
    }

    case 'class': {
      drawing.elements = [
        ...makeText('cls_title', 150, 10, 'UML 类图'),
        ...makeRect('cls_1', 120, 50, 180, 100, '<<interface>>\nAnimal\n+eat(): void\n+sleep(): void'),
        ...makeRect('cls_2', 50, 250, 150, 80, 'Dog\n-name: string\n+bark(): void'),
        ...makeRect('cls_3', 270, 250, 150, 80, 'Cat\n-name: string\n+meow(): void'),
        ...makeArrow('cls_a1', 125, 250, 210, 150, '实现'),
        ...makeArrow('cls_a2', 345, 250, 210, 150, '实现'),
      ]
      break
    }

    case 'sequence': {
      drawing.elements = [
        ...makeText('seq_title', 200, 10, 'UML 时序图'),
        ...makeRect('seq_1', 60, 40, 80, 40, '客户端'),
        ...makeRect('seq_2', 260, 40, 80, 40, '服务器'),
        ...makeRect('seq_3', 460, 40, 80, 40, '数据库'),
        ...makeLine('seq_l1', 100, 80, 100, 400),
        ...makeLine('seq_l2', 300, 80, 300, 400),
        ...makeLine('seq_l3', 500, 80, 500, 400),
        ...makeArrow('seq_m1', 100, 130, 300, 130, '1. 请求'),
        ...makeArrow('seq_m2', 300, 200, 500, 200, '2. 查询'),
        ...makeArrow('seq_m3', 500, 270, 300, 270, '3. 返回数据'),
        ...makeArrow('seq_m4', 300, 340, 100, 340, '4. 响应'),
      ]
      break
    }

    case 'er': {
      drawing.elements = [
        ...makeText('er_title', 250, 10, 'ER 图'),
        ...makeRect('er_1', 50, 180, 130, 60, '学生'),
        ...makeRect('er_2', 480, 180, 130, 60, '课程'),
        ...makeDiamond('er_d1', 280, 180, 100, 60, '选课'),
        ...makeEllipse('er_a1', 50, 70, 80, 50, '学号'),
        ...makeEllipse('er_a2', 160, 70, 80, 50, '姓名'),
        ...makeEllipse('er_a3', 480, 70, 80, 50, '课程号'),
        ...makeEllipse('er_a4', 590, 70, 80, 50, '课程名'),
        ...makeArrow('er_l1', 180, 180, 280, 210, '1'),
        ...makeArrow('er_l2', 380, 210, 480, 210, 'N'),
        ...makeLine('er_la1', 90, 120, 90, 180),
        ...makeLine('er_la2', 200, 120, 130, 180),
        ...makeLine('er_la3', 520, 120, 520, 180),
        ...makeLine('er_la4', 630, 120, 580, 180),
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
    if (parsed && Array.isArray(parsed.elements) && typeof parsed.version === 'number') {
      return parsed as DrawingData
    }
    return null
  } catch {
    return null
  }
}
