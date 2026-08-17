import { Component, HostListener, inject, signal, ViewChild } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AdjustmentDialogComponent, AdjustmentType } from './components/adjustment-dialog/adjustment-dialog';
import { CanvasComponent } from './components/canvas/canvas';
import { ColorsPanelComponent } from './components/colors-panel/colors-panel';
import { EffectsDialogComponent, EffectType } from './components/effects-dialog/effects-dialog';
import { LayersPanelComponent } from './components/layers-panel/layers-panel';
import { NewImageDialogComponent } from './components/new-image-dialog/new-image-dialog';
import { ResizeCanvasDialogComponent } from './components/resize-canvas-dialog/resize-canvas-dialog';
import { ResizeImageDialogComponent } from './components/resize-image-dialog/resize-image-dialog';
import { StatusBarComponent } from './components/status-bar/status-bar';
import { TitleBarComponent } from './components/title-bar/title-bar';
import { ToolBarComponent } from './components/tool-bar/tool-bar';
import { ToolOptionsComponent } from './components/tool-options/tool-options';
import { ToolsPaletteComponent } from './components/tools-palette/tools-palette';
import { AdjustmentsService } from './services/adjustments.service';
import { ColorsService } from './services/colors.service';
import { DocumentService } from './services/document.service';
import { EffectsService } from './services/effects.service';
import { LayerService } from './services/layer.service';
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
    LayersPanelComponent,
    NewImageDialogComponent,
    AdjustmentDialogComponent,
    EffectsDialogComponent,
    ResizeImageDialogComponent,
    ResizeCanvasDialogComponent,
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
  protected readonly layers = inject(LayerService);
  protected readonly adjustments = inject(AdjustmentsService);
  private readonly effects = inject(EffectsService);

  @ViewChild(CanvasComponent, { static: true }) canvas!: CanvasComponent;
  @ViewChild(LayersPanelComponent) layersPanel!: LayersPanelComponent;

  protected cursorPos = { x: 0, y: 0 };
  protected zoom = signal(1);
  protected showNewDialog = signal(false);
  protected showAdjDialog = signal(false);
  protected adjType = signal<AdjustmentType>('brightnessContrast');
  protected showFxDialog = signal(false);
  protected fxType = signal<EffectType>('boxBlur');
  protected showResizeImageDialog = signal(false);
  protected showResizeCanvasDialog = signal(false);

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 'n') {
      event.preventDefault();
      if (event.shiftKey) {
        this.canvas.pushUndoSnapshot();
        this.layers.addLayer();
        this.canvas.compositeToDisplay();
      } else {
        this.onNew();
      }
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
      this.canvas.textEdit.set(null);
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
      } else if (key === 'u') {
        this.tools.setTool('drawShape');
      } else if (key === 't') {
        this.tools.setTool('text');
      }
    } else if (mod && !event.shiftKey && key === 'e') {
      event.preventDefault();
      this.canvas.pushUndoSnapshot();
      this.layers.mergeDown(this.layers.activeLayerId());
      this.canvas.compositeToDisplay();
      this.canvas.dirty.emit();
    } else if (mod && event.shiftKey && key === 'f') {
      event.preventDefault();
      this.canvas.pushUndoSnapshot();
      this.layers.flatten();
      this.canvas.compositeToDisplay();
      this.canvas.dirty.emit();
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
      case 'addLayer':
        this.canvas.pushUndoSnapshot();
        this.layers.addLayer();
        this.canvas.compositeToDisplay();
        break;
      case 'duplicateLayer':
        this.canvas.pushUndoSnapshot();
        this.layers.duplicateLayer(this.layers.activeLayerId());
        this.canvas.compositeToDisplay();
        break;
      case 'deleteLayer':
        this.canvas.pushUndoSnapshot();
        this.layers.removeLayer(this.layers.activeLayerId());
        this.canvas.compositeToDisplay();
        break;
      case 'mergeDown':
        this.canvas.pushUndoSnapshot();
        this.layers.mergeDown(this.layers.activeLayerId());
        this.canvas.compositeToDisplay();
        break;
      case 'flattenImage':
        this.canvas.pushUndoSnapshot();
        this.layers.flatten();
        this.canvas.compositeToDisplay();
        break;
      case 'moveLayerUp':
        this.canvas.pushUndoSnapshot();
        this.layers.moveLayerUp(this.layers.activeLayerId());
        this.canvas.compositeToDisplay();
        break;
      case 'moveLayerDown':
        this.canvas.pushUndoSnapshot();
        this.layers.moveLayerDown(this.layers.activeLayerId());
        this.canvas.compositeToDisplay();
        break;
      case 'reorderLayer':
        this.canvas.pushUndoSnapshot();
        break;
      case 'transformLayer':
        this.canvas.pushUndoSnapshot();
        break;
      case 'importAsLayer':
        this.onImportAsLayer();
        break;
      case 'adjBrightness':
        this.openAdjustment('brightnessContrast');
        break;
      case 'adjHSL':
        this.openAdjustment('hueSaturationLightness');
        break;
      case 'adjInvert':
        this.canvas.pushUndoSnapshot();
        this.adjustments.invert();
        this.canvas.compositeToDisplay();
        break;
      case 'adjDesaturate':
        this.canvas.pushUndoSnapshot();
        this.adjustments.desaturate();
        this.canvas.compositeToDisplay();
        break;
      case 'adjSepia':
        this.canvas.pushUndoSnapshot();
        this.adjustments.sepia();
        this.canvas.compositeToDisplay();
        break;
      case 'adjPosterize':
        this.openAdjustment('posterize');
        break;
      case 'adjThreshold':
        this.openAdjustment('threshold');
        break;
      case 'fxBlur':
        this.openEffect('boxBlur');
        break;
      case 'fxMotion':
        this.openEffect('motionBlur');
        break;
      case 'fxPixelate':
        this.openEffect('pixelate');
        break;
      case 'fxSharpen':
        this.canvas.pushUndoSnapshot();
        this.effects.sharpen();
        this.canvas.compositeToDisplay();
        break;
      case 'fxEmboss':
        this.canvas.pushUndoSnapshot();
        this.effects.emboss();
        this.canvas.compositeToDisplay();
        break;
      case 'fxEdge':
        this.canvas.pushUndoSnapshot();
        this.effects.edgeDetect();
        this.canvas.compositeToDisplay();
        break;
      case 'fxNoise':
        this.openEffect('noise');
        break;
      case 'fxVignette':
        this.openEffect('vignette');
        break;
      case 'imgResize':
        this.showResizeImageDialog.set(true);
        break;
      case 'imgCanvas':
        this.showResizeCanvasDialog.set(true);
        break;
      case 'imgRotateCW':
        this.canvas.pushUndoSnapshot();
        this.layers.rotateAll(90);
        this.canvas.onDocumentResized();
        break;
      case 'imgRotateCCW':
        this.canvas.pushUndoSnapshot();
        this.layers.rotateAll(270);
        this.canvas.onDocumentResized();
        break;
      case 'imgRotate180':
        this.canvas.pushUndoSnapshot();
        this.layers.rotateAll(180);
        this.canvas.onDocumentResized();
        break;
      case 'imgFlipH':
        this.canvas.pushUndoSnapshot();
        this.layers.flipAll('horizontal');
        this.canvas.compositeToDisplay();
        break;
      case 'imgFlipV':
        this.canvas.pushUndoSnapshot();
        this.layers.flipAll('vertical');
        this.canvas.compositeToDisplay();
        break;
      case 'imgCrop':
        this.canvas.cropToSelection();
        break;
    }
  }

  protected onNew(): void {
    this.showNewDialog.set(true);
  }

  protected onNewConfirm(event: { width: number; height: number }): void {
    this.showNewDialog.set(false);
    this.doc.setError(null);
    this.doc.newDocument(event.width, event.height);
    this.canvas.newDocument(event.width, event.height);
  }

  protected onNewCancel(): void {
    this.showNewDialog.set(false);
  }

  protected openAdjustment(type: AdjustmentType): void {
    this.canvas.pushUndoSnapshot();
    this.adjType.set(type);
    this.showAdjDialog.set(true);
  }

  protected onAdjClose(): void {
    this.showAdjDialog.set(false);
    this.canvas.compositeToDisplay();
  }

  protected openEffect(type: EffectType): void {
    this.canvas.pushUndoSnapshot();
    this.fxType.set(type);
    this.showFxDialog.set(true);
  }

  protected onFxClose(): void {
    this.showFxDialog.set(false);
    this.canvas.compositeToDisplay();
  }

  protected onResizeImageConfirm(event: { width: number; height: number }): void {
    this.showResizeImageDialog.set(false);
    this.canvas.pushUndoSnapshot();
    this.layers.resizeImage(event.width, event.height);
    this.canvas.onDocumentResized();
  }

  protected onResizeImageCancel(): void {
    this.showResizeImageDialog.set(false);
  }

  protected onResizeCanvasConfirm(event: { width: number; height: number; anchorX: number; anchorY: number }): void {
    this.showResizeCanvasDialog.set(false);
    this.canvas.pushUndoSnapshot();
    this.layers.resizeCanvas(event.width, event.height, event.anchorX, event.anchorY);
    this.canvas.onDocumentResized();
  }

  protected onResizeCanvasCancel(): void {
    this.showResizeCanvasDialog.set(false);
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
    this.canvas.compositeToDisplay();
    this.doc.markDirty();
    this.layersPanel?.scheduleThumbRefresh();
  }

  protected onLayerOpacityChange(event: { id: string; opacity: number }): void {
    this.canvas.compositeToDisplay();
    this.doc.markDirty();
  }

  private importFileInput?: HTMLInputElement;

  protected onImportAsLayer(): void {
    if (!this.importFileInput) {
      this.importFileInput = document.createElement('input');
      this.importFileInput.type = 'file';
      this.importFileInput.accept = 'image/*';
      this.importFileInput.style.display = 'none';
      document.body.appendChild(this.importFileInput);
      this.importFileInput.addEventListener('change', () => {
        const file = this.importFileInput!.files?.[0];
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          this.canvas.pushUndoSnapshot();
          await this.layers.importImageAsLayer(dataUrl, file.name);
          this.canvas.compositeToDisplay();
          this.doc.markDirty();
        };
        reader.readAsDataURL(file);
        this.importFileInput!.value = '';
      });
    }
    this.importFileInput.click();
  }
}
