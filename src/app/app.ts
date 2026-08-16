import { Component, HostListener, inject, signal, ViewChild } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CanvasComponent } from './components/canvas/canvas';
import { ColorsPanelComponent } from './components/colors-panel/colors-panel';
import { StatusBarComponent } from './components/status-bar/status-bar';
import { TitleBarComponent } from './components/title-bar/title-bar';
import { ToolBarComponent } from './components/tool-bar/tool-bar';
import { ToolOptionsComponent } from './components/tool-options/tool-options';
import { ToolsPaletteComponent } from './components/tools-palette/tools-palette';
import { ColorsService } from './services/colors.service';
import { DocumentService } from './services/document.service';
import { ToolService, TOOL_LABELS } from './services/tool.service';
import { CommandEvent } from './types';

@Component({
  selector: 'app-root',
  imports: [
    TitleBarComponent,
    ToolBarComponent,
    ToolOptionsComponent,
    ToolsPaletteComponent,
    CanvasComponent,
    ColorsPanelComponent,
    StatusBarComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly doc = inject(DocumentService);
  private readonly tools = inject(ToolService);
  private readonly colors = inject(ColorsService);

  @ViewChild(CanvasComponent, { static: true }) canvas!: CanvasComponent;

  protected cursorPos = { x: 0, y: 0 };
  protected zoom = signal(1);

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'n') {
      event.preventDefault();
      this.onNew();
    } else if (mod && key === 'o') {
      event.preventDefault();
      this.onOpen();
    } else if (mod && key === 's') {
      event.preventDefault();
      if (event.shiftKey) {
        this.onSaveAs();
      } else {
        this.onSave();
      }
    } else if (mod && key === 'q') {
      event.preventDefault();
      void getCurrentWindow().close();
    } else if (event.key === 'Escape') {
      this.canvas.clearSelection();
    } else if (!this.isTypingTarget(event)) {
      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          this.canvas.redo();
        } else {
          this.canvas.undo();
        }
      } else if (mod && key === 'y') {
        event.preventDefault();
        this.canvas.redo();
      } else if (mod && key === 'a') {
        event.preventDefault();
        if (event.shiftKey) {
          this.canvas.clearSelection();
        } else {
          this.canvas.selectAll();
        }
      } else if (mod && key === 'i') {
        event.preventDefault();
        this.canvas.invertSelection();
      } else if (mod && key === 'c') {
        event.preventDefault();
        this.canvas.copySelection();
      } else if (mod && key === 'x') {
        event.preventDefault();
        this.canvas.cutSelection();
      } else if (mod && key === 'v') {
        event.preventDefault();
        this.canvas.pasteClipboard();
      } else if (key === 'x') {
        this.colors.swap();
      } else if (key === 'b') {
        this.tools.setTool('brush');
      } else if (key === 'p') {
        this.tools.setTool('pencil');
      } else if (key === 'e') {
        this.tools.setTool('eraser');
      } else if (key === 'i') {
        this.tools.setTool('pipette');
      } else if (key === 'r') {
        this.tools.setTool('selectRect');
      } else if (key === 'o') {
        this.tools.setTool('selectEllipse');
      } else if (key === 'l') {
        this.tools.setTool('lasso');
      } else if (key === 'w') {
        this.tools.setTool('wand');
      } else if (key === 'v') {
        this.tools.setTool('moveSelection');
      } else if (key === 'm') {
        this.tools.setTool('moveObject');
      }
    }
  }

  private isTypingTarget(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return (
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    );
  }

  protected toolLabel(): string {
    return TOOL_LABELS[this.tools.activeTool()];
  }

  protected onCommand(event: CommandEvent): void {
    switch (event.id) {
      case 'new':
        this.onNew();
        break;
      case 'open':
        this.onOpen();
        break;
      case 'save':
        this.onSave();
        break;
      case 'saveAs':
        this.onSaveAs();
        break;
      case 'zoomIn':
        this.canvas.zoomIn();
        break;
      case 'zoomOut':
        this.canvas.zoomOut();
        break;
      case 'zoom100':
        this.canvas.zoomTo(1);
        break;
      case 'quit':
        void getCurrentWindow().close();
        break;
      case 'undo':
        this.canvas.undo();
        break;
      case 'redo':
        this.canvas.redo();
        break;
      case 'selectAll':
        this.canvas.selectAll();
        break;
      case 'deselect':
        this.canvas.clearSelection();
        break;
      case 'invertSelection':
        this.canvas.invertSelection();
        break;
      case 'cut':
        this.canvas.cutSelection();
        break;
      case 'copy':
        this.canvas.copySelection();
        break;
      case 'paste':
        this.canvas.pasteClipboard();
        break;
    }
  }

  protected onNew(): void {
    this.doc.setError(null);
    this.doc.newDocument(800, 600);
    this.canvas.newDocument(800, 600);
  }

  protected async onOpen(): Promise<void> {
    this.doc.setError(null);
    try {
      const res = await this.doc.openImage();
      if (res) {
        this.canvas.loadImage(res.dataUrl, res.width, res.height);
      }
    } catch (err) {
      this.doc.setError(String(err));
    }
  }

  protected async onSave(): Promise<void> {
    if (!this.canvas.hasDocument) {
      return;
    }
    this.doc.setError(null);
    try {
      await this.doc.save(this.canvas.exportPngDataUrl(), false);
    } catch (err) {
      this.doc.setError(String(err));
    }
  }

  protected async onSaveAs(): Promise<void> {
    if (!this.canvas.hasDocument) {
      return;
    }
    this.doc.setError(null);
    try {
      await this.doc.save(this.canvas.exportPngDataUrl(), true);
    } catch (err) {
      this.doc.setError(String(err));
    }
  }

  protected onCanvasPosition(pos: { x: number; y: number }): void {
    this.cursorPos = pos;
  }

  protected onCanvasZoom(zoom: number): void {
    this.zoom.set(zoom);
  }

  protected onCanvasDirty(): void {
    this.doc.markDirty();
  }
}
