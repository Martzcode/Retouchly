import { Component, inject } from '@angular/core';
import { ToolService } from '../../services/tool.service';
import { Tool } from '../../types';

@Component({
  selector: 'app-tools-palette',
  imports: [],
  templateUrl: './tools-palette.html',
  styleUrl: './tools-palette.css',
})
export class ToolsPaletteComponent {
  private readonly tools = inject(ToolService);

  readonly activeTool = this.tools.activeTool;

  protected select(tool: Tool): void {
    this.tools.setTool(tool);
  }
}
