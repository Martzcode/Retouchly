import { Component, inject, OnInit, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { I18nService } from '../../services/i18n.service';
import { ToolService } from '../../services/tool.service';
import { SelectionMode, ShapeType, StrokeStyle, TextAlign } from '../../types';

const FALLBACK_FONTS = [
  'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS',
  'Georgia', 'Times New Roman', 'Courier New', 'Lucida Console',
  'Comic Sans MS', 'Impact', 'Palatino',
];

@Component({
  selector: 'app-tool-options',
  imports: [],
  templateUrl: './tool-options.html',
  styleUrl: './tool-options.css',
})
export class ToolOptionsComponent implements OnInit {
  private readonly tools = inject(ToolService);
  protected readonly i18n = inject(I18nService);

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
  readonly textFont = this.tools.textFont;
  readonly textSize = this.tools.textSize;
  readonly textBold = this.tools.textBold;
  readonly textItalic = this.tools.textItalic;
  readonly textUnderline = this.tools.textUnderline;
  readonly textAlign = this.tools.textAlign;
  readonly textOutlineWidth = this.tools.textOutlineWidth;
  readonly textFill = this.tools.textFill;
  readonly textOutline = this.tools.textOutline;

  protected get labels() { return this.tools.toolLabels; }
  protected get modeLabels() { return this.tools.selectionModeLabels; }
  protected get shapeLabels() { return this.tools.shapeTypeLabels; }
  protected get strokeStyleLabels() { return this.tools.strokeStyleLabels; }
  protected get alignLabels() { return this.tools.textAlignLabels; }
  protected readonly modes: SelectionMode[] = ['replace', 'add', 'subtract', 'intersect', 'xor'];
  protected readonly shapeTypes: ShapeType[] = ['rectangle', 'ellipse', 'line', 'polygon'];
  protected readonly strokeStyles: StrokeStyle[] = ['solid', 'dashed', 'dotted'];
  protected readonly textAligns: TextAlign[] = ['left', 'center', 'right'];
  protected readonly webFonts = signal<string[]>(FALLBACK_FONTS);

  ngOnInit(): void {
    invoke<string[]>('list_system_fonts').then((fonts) => {
      if (fonts.length > 0) {
        this.webFonts.set(fonts);
      }
    }).catch(() => {});
  }

  protected isSelectionTool(): boolean {
    const t = this.activeTool();
    return t === 'selectRect' || t === 'selectEllipse' || t === 'lasso' || t === 'wand';
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

  protected setTextFont(font: string): void {
    this.tools.setTextFont(font);
  }

  protected setTextSize(value: string): void {
    this.tools.setTextSize(Number(value));
  }

  protected toggleTextBold(): void {
    this.tools.setTextBold(!this.textBold());
  }

  protected toggleTextItalic(): void {
    this.tools.setTextItalic(!this.textItalic());
  }

  protected toggleTextUnderline(): void {
    this.tools.setTextUnderline(!this.textUnderline());
  }

  protected setTextAlign(align: TextAlign): void {
    this.tools.setTextAlign(align);
  }

  protected setTextOutlineWidth(value: string): void {
    this.tools.setTextOutlineWidth(Number(value));
  }

  protected toggleTextFill(): void {
    this.tools.setTextFill(!this.textFill());
  }

  protected toggleTextOutline(): void {
    this.tools.setTextOutline(!this.textOutline());
  }
}
