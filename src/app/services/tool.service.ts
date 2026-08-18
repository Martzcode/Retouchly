import { inject, Injectable, signal } from '@angular/core';
import { SelectionMode, ShapeType, StrokeStyle, TextAlign, Tool } from '../types';
import { I18nService } from './i18n.service';

const TOOL_KEYS: Record<Tool, string> = {
  pencil: 'tool.pencil',
  brush: 'tool.brush',
  eraser: 'tool.eraser',
  pipette: 'tool.pipette',
  selectRect: 'tool.selectRect',
  selectEllipse: 'tool.selectEllipse',
  lasso: 'tool.lasso',
  wand: 'tool.wand',
  moveSelection: 'tool.moveSelection',
  moveObject: 'tool.moveObject',
  drawShape: 'tool.drawShape',
  text: 'tool.text',
};

const TEXT_ALIGN_KEYS: Record<TextAlign, string> = {
  left: 'textAlign.left',
  center: 'textAlign.center',
  right: 'textAlign.right',
};

const SHAPE_TYPE_KEYS: Record<ShapeType, string> = {
  rectangle: 'shapeType.rect',
  ellipse: 'shapeType.ellipse',
  line: 'shapeType.line',
  polygon: 'shapeType.polygon',
};

const STROKE_STYLE_KEYS: Record<StrokeStyle, string> = {
  solid: 'strokeStyle.solid',
  dashed: 'strokeStyle.dashed',
  dotted: 'strokeStyle.dotted',
};

const SELECTION_MODE_KEYS: Record<SelectionMode, string> = {
  replace: 'selectionMode.replace',
  add: 'selectionMode.add',
  subtract: 'selectionMode.subtract',
  intersect: 'selectionMode.intersect',
  xor: 'selectionMode.xor',
};

@Injectable({ providedIn: 'root' })
export class ToolService {
  private readonly i18n = inject(I18nService);

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
  private readonly _textFont = signal('sans-serif');
  private readonly _textSize = signal(32);
  private readonly _textBold = signal(false);
  private readonly _textItalic = signal(false);
  private readonly _textUnderline = signal(false);
  private readonly _textAlign = signal<TextAlign>('left');
  private readonly _textOutlineWidth = signal(0);
  private readonly _textFill = signal(true);
  private readonly _textOutline = signal(false);

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
  readonly textFont = this._textFont.asReadonly();
  readonly textSize = this._textSize.asReadonly();
  readonly textBold = this._textBold.asReadonly();
  readonly textItalic = this._textItalic.asReadonly();
  readonly textUnderline = this._textUnderline.asReadonly();
  readonly textAlign = this._textAlign.asReadonly();
  readonly textOutlineWidth = this._textOutlineWidth.asReadonly();
  readonly textFill = this._textFill.asReadonly();
  readonly textOutline = this._textOutline.asReadonly();

  get toolLabels(): Record<Tool, string> {
    return Object.fromEntries(
      Object.entries(TOOL_KEYS).map(([k, v]) => [k, this.i18n.t(v)])
    ) as Record<Tool, string>;
  }

  get textAlignLabels(): Record<TextAlign, string> {
    return Object.fromEntries(
      Object.entries(TEXT_ALIGN_KEYS).map(([k, v]) => [k, this.i18n.t(v)])
    ) as Record<TextAlign, string>;
  }

  get shapeTypeLabels(): Record<ShapeType, string> {
    return Object.fromEntries(
      Object.entries(SHAPE_TYPE_KEYS).map(([k, v]) => [k, this.i18n.t(v)])
    ) as Record<ShapeType, string>;
  }

  get strokeStyleLabels(): Record<StrokeStyle, string> {
    return Object.fromEntries(
      Object.entries(STROKE_STYLE_KEYS).map(([k, v]) => [k, this.i18n.t(v)])
    ) as Record<StrokeStyle, string>;
  }

  get selectionModeLabels(): Record<SelectionMode, string> {
    return Object.fromEntries(
      Object.entries(SELECTION_MODE_KEYS).map(([k, v]) => [k, this.i18n.t(v)])
    ) as Record<SelectionMode, string>;
  }

  toolLabel(tool: Tool): string {
    return this.i18n.t(TOOL_KEYS[tool]);
  }

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

  setTextFont(font: string): void {
    this._textFont.set(font);
  }

  setTextSize(size: number): void {
    this._textSize.set(Math.max(6, Math.min(400, Math.round(size))));
  }

  setTextBold(bold: boolean): void {
    this._textBold.set(bold);
  }

  setTextItalic(italic: boolean): void {
    this._textItalic.set(italic);
  }

  setTextUnderline(underline: boolean): void {
    this._textUnderline.set(underline);
  }

  setTextAlign(align: TextAlign): void {
    this._textAlign.set(align);
  }

  setTextOutlineWidth(width: number): void {
    this._textOutlineWidth.set(Math.max(0, Math.min(50, Math.round(width))));
  }

  setTextFill(fill: boolean): void {
    this._textFill.set(fill);
  }

  setTextOutline(outline: boolean): void {
    this._textOutline.set(outline);
  }
}
