import { Injectable, signal } from '@angular/core';
import { SelectionMode, ShapeType, StrokeStyle, Tool } from '../types';

export const TOOL_LABELS: Record<Tool, string> = {
  pencil: 'Crayon',
  brush: 'Pinceau',
  eraser: 'Gomme',
  pipette: 'Pipette',
  selectRect: 'Sélection rectangle',
  selectEllipse: 'Sélection ellipse',
  lasso: 'Lasso',
  wand: 'Baguette magique',
  moveSelection: 'Déplacer la sélection',
  moveObject: 'Déplacer l\u2019objet sélectionné',
  drawShape: 'Forme',
};

export const SHAPE_TYPE_LABELS: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Ligne',
  polygon: 'Polygone',
};

export const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
  solid: 'Plein',
  dashed: 'Tirets',
  dotted: 'Pointillé',
};

export const SELECTION_MODE_LABELS: Record<SelectionMode, string> = {
  replace: 'Remplacer',
  add: 'Ajouter',
  subtract: 'Soustraire',
  intersect: 'Intersection',
  xor: 'Xor',
};

@Injectable({ providedIn: 'root' })
export class ToolService {
  private readonly _activeTool = signal<Tool>('brush');
  private readonly _brushSize = signal(4);
  private readonly _brushHardness = signal(100);
  private readonly _selectionMode = signal<SelectionMode>('replace');
  private readonly _wandTolerance = signal(25);
  private readonly _wandGlobal = signal(false);
  private readonly _shapeType = signal<ShapeType>('rectangle');
  private readonly _shapeStrokeWidth = signal(3);
  private readonly _shapeStrokeStyle = signal<StrokeStyle>('solid');
  private readonly _shapeFilled = signal(false);

  readonly activeTool = this._activeTool.asReadonly();
  readonly brushSize = this._brushSize.asReadonly();
  readonly brushHardness = this._brushHardness.asReadonly();
  readonly selectionMode = this._selectionMode.asReadonly();
  readonly wandTolerance = this._wandTolerance.asReadonly();
  readonly wandGlobal = this._wandGlobal.asReadonly();
  readonly shapeType = this._shapeType.asReadonly();
  readonly shapeStrokeWidth = this._shapeStrokeWidth.asReadonly();
  readonly shapeStrokeStyle = this._shapeStrokeStyle.asReadonly();
  readonly shapeFilled = this._shapeFilled.asReadonly();

  setTool(tool: Tool): void {
    this._activeTool.set(tool);
  }

  setBrushSize(size: number): void {
    this._brushSize.set(Math.max(1, Math.min(100, Math.round(size))));
  }

  setBrushHardness(hardness: number): void {
    this._brushHardness.set(Math.max(0, Math.min(100, Math.round(hardness))));
  }

  setSelectionMode(mode: SelectionMode): void {
    this._selectionMode.set(mode);
  }

  setWandTolerance(tolerance: number): void {
    this._wandTolerance.set(Math.max(0, Math.min(100, Math.round(tolerance))));
  }

  setWandGlobal(global: boolean): void {
    this._wandGlobal.set(global);
  }

  setShapeType(type: ShapeType): void {
    this._shapeType.set(type);
  }

  setShapeStrokeWidth(width: number): void {
    this._shapeStrokeWidth.set(Math.max(1, Math.min(50, Math.round(width))));
  }

  setShapeStrokeStyle(style: StrokeStyle): void {
    this._shapeStrokeStyle.set(style);
  }

  setShapeFilled(filled: boolean): void {
    this._shapeFilled.set(filled);
  }
}
