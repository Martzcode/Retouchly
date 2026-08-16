import { Component, inject } from '@angular/core';
import { ToolService, TOOL_LABELS } from '../../services/tool.service';

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

  protected labels = TOOL_LABELS;

  protected setSize(value: string): void {
    this.tools.setBrushSize(Number(value));
  }

  protected setHardness(value: string): void {
    this.tools.setBrushHardness(Number(value));
  }
}
