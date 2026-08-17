import { Component, inject } from '@angular/core';
import { ToolService, TOOL_LABELS, SELECTION_MODE_LABELS, SHAPE_TYPE_LABELS, STROKE_STYLE_LABELS } from '../../services/tool.service';
import { SelectionMode, ShapeType, StrokeStyle } from '../../types';

@Component({
  selector: 'app-tool-options',
  imports: [],
  templateUrl: './tool-options.html',
  styleUrl: './tool-options.css',
})
export class ToolOptionsComponent {
  private readonly tools = inject(ToolService);

  readonly activeTool = this.tools.activeTool;
  readonly brushSize = this.tools.brushSize;
  readonly brushHardness = this.tools.brushHardness;
  readonly selectionMode = this.tools.selectionMode;
  readonly wandTolerance = this.tools.wandTolerance;
  readonly wandGlobal = this.tools.wandGlobal;
  readonly shapeType = this.tools.shapeType;
  readonly shapeStrokeWidth = this.tools.shapeStrokeWidth;
  readonly shapeStrokeStyle = this.tools.shapeStrokeStyle;
  readonly shapeFilled = this.tools.shapeFilled;

  protected labels = TOOL_LABELS;
  protected modeLabels = SELECTION_MODE_LABELS;
  protected shapeLabels = SHAPE_TYPE_LABELS;
  protected strokeStyleLabels = STROKE_STYLE_LABELS;
  protected readonly modes: SelectionMode[] = ['replace', 'add', 'subtract', 'intersect', 'xor'];
  protected readonly shapeTypes: ShapeType[] = ['rectangle', 'ellipse', 'line', 'polygon'];
  protected readonly strokeStyles: StrokeStyle[] = ['solid', 'dashed', 'dotted'];

  protected isSelectionTool(): boolean {
    const t = this.activeTool();
    return t === 'selectRect' || t === 'selectEllipse' || t === 'lasso' || t === 'wand';
  }

  protected isShapeTool(): boolean {
    return this.activeTool() === 'drawShape';
  }

  protected setSize(value: string): void {
    this.tools.setBrushSize(Number(value));
  }

  protected setHardness(value: string): void {
    this.tools.setBrushHardness(Number(value));
  }

  protected setMode(mode: SelectionMode): void {
    this.tools.setSelectionMode(mode);
  }

  protected setWandTolerance(value: string): void {
    this.tools.setWandTolerance(Number(value));
  }

  protected toggleWandGlobal(): void {
    this.tools.setWandGlobal(!this.wandGlobal());
  }

  protected setShapeType(type: string): void {
    this.tools.setShapeType(type as ShapeType);
  }

  protected setShapeStrokeWidth(value: string): void {
    this.tools.setShapeStrokeWidth(Number(value));
  }

  protected setShapeStrokeStyle(style: string): void {
    this.tools.setShapeStrokeStyle(style as StrokeStyle);
  }

  protected toggleShapeFilled(): void {
    this.tools.setShapeFilled(!this.shapeFilled());
  }

  protected getStrokeDashArray(style: StrokeStyle): string {
    if (style === 'dashed') {
      return '8 5';
    }
    if (style === 'dotted') {
      return '1 6';
    }
    return 'none';
  }
}
