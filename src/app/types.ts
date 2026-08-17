export interface OpenImageResult {
  path: string;
  width: number;
  height: number;
  dataUrl: string;
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

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  'source-over': 'Normal',
  'multiply': 'Multiplier',
  'screen': 'Écran',
  'overlay': 'Incrustation',
  'darken': 'Lumière tamisée',
  'lighten': 'Lumière crue',
  'color-dodge': 'Dodge',
  'color-burn': 'Burn',
  'hard-light': 'Lumière dure',
  'soft-light': 'Lumière douce',
  'difference': 'Différence',
  'exclusion': 'Exclusion',
  'hue': 'Teinte',
  'saturation': 'Saturation',
  'color': 'Couleur',
  'luminosity': 'Luminosité',
};

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
