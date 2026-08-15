import { Component, HostListener, inject, ViewChild } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CanvasComponent } from './components/canvas/canvas';
import { StatusBarComponent } from './components/status-bar/status-bar';
import { TitleBarComponent } from './components/title-bar/title-bar';
import { ToolBarComponent } from './components/tool-bar/tool-bar';
import { DocumentService } from './services/document.service';
import { CommandEvent } from './types';

@Component({
  selector: 'app-root',
  imports: [TitleBarComponent, ToolBarComponent, CanvasComponent, StatusBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly doc = inject(DocumentService);

  @ViewChild(CanvasComponent) private canvas!: CanvasComponent;

  protected cursorPos = { x: 0, y: 0 };

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
    }
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
      case 'quit':
        void getCurrentWindow().close();
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

  protected onCanvasDirty(): void {
    this.doc.markDirty();
  }
}
