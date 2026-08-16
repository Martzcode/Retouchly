import { Injectable, signal } from '@angular/core';
import { Tool } from '../types';

export const TOOL_LABELS: Record<Tool, string> = {
  pencil: 'Crayon',
  brush: 'Pinceau',
  eraser: 'Gomme',
  pipette: 'Pipette',
  selectRect: 'Sélection rectangle',
};

@Injectable({ providedIn: 'root' })
export class ToolService {
  private readonly _activeTool = signal<Tool>('brush');
  private readonly _brushSize = signal(4);
  private readonly _brushHardness = signal(100);

  readonly activeTool = this._activeTool.asReadonly();
  readonly brushSize = this._brushSize.asReadonly();
  readonly brushHardness = this._brushHardness.asReadonly();

  setTool(tool: Tool): void {
    this._activeTool.set(tool);
  }

  setBrushSize(size: number): void {
    this._brushSize.set(Math.max(1, Math.min(100, Math.round(size))));
  }

  setBrushHardness(hardness: number): void {
    this._brushHardness.set(Math.max(0, Math.min(100, Math.round(hardness))));
  }
}
