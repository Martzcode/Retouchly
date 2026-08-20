export interface OpenImageResult {
  path: string;
  width: number;
  height: number;
  dataUrl: string;
}

export interface OpenDocumentResult {
  kind: 'project' | 'image';
  path: string;
  width: number;
  height: number;
  dataUrl: string | null;
  content: string | null;
}

export interface ProjectLayerData {
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  rotation: number;
  scale: number;
  dataUrl: string;
}

export interface ProjectData {
  app: string;
  version: number;
  width: number;
  height: number;
  layers: ProjectLayerData[];
}

export interface DocumentInfo {
  width: number;
  height: number;
  path: string | null;
  fileName: string | null;
  dirty: boolean;
}

export interface CommandEvent {
  id: string;
}

export type Tool =
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'pipette'
  | 'selectRect'
  | 'selectEllipse'
  | 'lasso'
  | 'wand'
  | 'moveSelection'
  | 'moveObject'
  | 'drawShape'
  | 'text';

export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'polygon';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type TextAlign = 'left' | 'center' | 'right';

export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect' | 'xor';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODES: BlendMode[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export const BLEND_MODE_I18N_KEYS: Record<BlendMode, string> = {
  'source-over': 'blendMode.normal',
  'multiply': 'blendMode.multiply',
  'screen': 'blendMode.screen',
  'overlay': 'blendMode.overlay',
  'darken': 'blendMode.darken',
  'lighten': 'blendMode.lighten',
  'color-dodge': 'blendMode.colorDodge',
  'color-burn': 'blendMode.colorBurn',
  'hard-light': 'blendMode.hardLight',
  'soft-light': 'blendMode.softLight',
  'difference': 'blendMode.difference',
  'exclusion': 'blendMode.exclusion',
  'hue': 'blendMode.hue',
  'saturation': 'blendMode.saturation',
  'color': 'blendMode.color',
  'luminosity': 'blendMode.luminosity',
};

export function getBlendModeLabel(mode: BlendMode, i18n: { t(key: string): string }): string {
  const key = BLEND_MODE_I18N_KEYS[mode];
  return key ? i18n.t(key) : mode;
}

export interface LayerSnapshot {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  rotation: number;
  scale: number;
  width: number;
  height: number;
  pixels: ImageData;
}
