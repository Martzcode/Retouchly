import { Component, inject } from '@angular/core';
import { ToolService, TOOL_LABELS, SELECTION_MODE_LABELS } from '../../services/tool.service';
import { SelectionMode } from '../../types';

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

  protected labels = TOOL_LABELS;
  protected modeLabels = SELECTION_MODE_LABELS;
  protected readonly modes: SelectionMode[] = ['replace', 'add', 'subtract', 'intersect', 'xor'];

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
}
