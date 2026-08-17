import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayerService } from '../../services/layer.service';
import { BlendMode, BLEND_MODES, BLEND_MODE_LABELS, CommandEvent } from '../../types';

@Component({
  selector: 'app-layers-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './layers-panel.html',
  styleUrl: './layers-panel.css',
})
export class LayersPanelComponent {
  protected readonly layers = inject(LayerService);
  private readonly thumbs = new Map<string, HTMLCanvasElement>();
  private thumbTimer: ReturnType<typeof setTimeout> | null = null;

  @Output() command = new EventEmitter<CommandEvent>();
  @Output() opacityChange = new EventEmitter<{ id: string; opacity: number }>();
  @Output() compositeNeeded = new EventEmitter<void>();

  protected editingId = signal('');
  protected editName = signal('');
  private _dragIndex = -1;
  private _dropIndex = -1;

  get dragIndex(): number {
    return this._dragIndex;
  }

  get dropIndex(): number {
    return this._dropIndex;
  }

  readonly blendModes = BLEND_MODES;
  readonly blendLabels = BLEND_MODE_LABELS;

  get reversedLayers() {
    return [...this.layers.layers()].reverse();
  }

  isActive(id: string): boolean {
    return id === this.layers.activeLayerId();
  }

  thumbUrl(id: string): string {
    if (!this.thumbs.has(id)) {
      this.refreshThumb(id);
    }
    return this.thumbs.get(id)!.toDataURL();
  }

  refreshAllThumbs(): void {
    for (const l of this.layers.layers()) {
      this.refreshThumb(l.id);
    }
  }

  private refreshThumb(id: string): void {
    const raw = this.layers.getThumbnail(id, 48);
    if (!raw) {
      return;
    }
    let canvas = this.thumbs.get(id);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      this.thumbs.set(id, canvas);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(raw, 0, 0);
  }

  scheduleThumbRefresh(): void {
    if (this.thumbTimer) {
      return;
    }
    this.thumbTimer = setTimeout(() => {
      this.thumbTimer = null;
      this.refreshAllThumbs();
    }, 100);
  }

  onCommand(id: string): void {
    this.command.emit({ id });
    setTimeout(() => this.scheduleThumbRefresh(), 50);
  }

  setActive(id: string): void {
    this.layers.setActive(id);
  }

  toggleVisibility(id: string, visible: boolean): void {
    this.layers.setVisibility(id, !visible);
    this.scheduleThumbRefresh();
    this.compositeNeeded.emit();
  }

  toggleLock(id: string, locked: boolean): void {
    this.layers.setLocked(id, !locked);
  }

  onOpacityChange(id: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.layers.setOpacity(id, val);
    this.opacityChange.emit({ id, opacity: val });
    this.compositeNeeded.emit();
  }

  onBlendModeChange(id: string, event: Event): void {
    const val = (event.target as HTMLSelectElement).value as BlendMode;
    this.layers.setBlendMode(id, val);
    this.compositeNeeded.emit();
  }

  onRotationChange(id: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.onCommand('transformLayer');
    this.layers.setRotation(id, val);
    setTimeout(() => this.scheduleThumbRefresh(), 50);
  }

  onScaleChange(id: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.onCommand('transformLayer');
    this.layers.setScale(id, val);
    setTimeout(() => this.scheduleThumbRefresh(), 50);
  }

  onResetTransform(id: string): void {
    this.onCommand('transformLayer');
    this.layers.resetTransform(id);
    setTimeout(() => this.scheduleThumbRefresh(), 50);
  }

  startRename(id: string, currentName: string): void {
    this.editingId.set(id);
    this.editName.set(currentName);
  }

  commitRename(id: string): void {
    const name = this.editName().trim();
    if (name) {
      this.layers.renameLayer(id, name);
    }
    this.editingId.set('');
  }

  cancelRename(): void {
    this.editingId.set('');
  }

  onDragStart(index: number, event: DragEvent): void {
    this._dragIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(index));
  }

  onDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this._dropIndex = index;
  }

  onDragLeave(): void {
    this._dropIndex = -1;
  }

  onDrop(targetIndex: number, event: DragEvent): void {
    event.preventDefault();
    const from = this._dragIndex;
    this._dragIndex = -1;
    this._dropIndex = -1;
    if (from < 0 || from === targetIndex) {
      return;
    }
    const list = this.layers.layers();
    const fromReal = list.length - 1 - from;
    const toReal = list.length - 1 - targetIndex;
    this.onCommand('reorderLayer');
    this.layers.reorderLayer(fromReal, toReal);
    setTimeout(() => this.scheduleThumbRefresh(), 50);
  }

  onDragEnd(): void {
    this._dragIndex = -1;
    this._dropIndex = -1;
  }

  onNameInput(event: Event, id: string): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onNameKeydown(event: KeyboardEvent, id: string): void {
    if (event.key === 'Enter') {
      this.commitRename(id);
    } else if (event.key === 'Escape') {
      this.cancelRename();
    }
  }

  protected activeLayer() {
    return this.layers.getActiveLayer();
  }

  onOpacityInput(event: Event): void {
    const layer = this.activeLayer();
    if (!layer) {
      return;
    }
    const val = Number((event.target as HTMLInputElement).value);
    this.layers.setOpacity(layer.id, val);
    this.opacityChange.emit({ id: layer.id, opacity: val });
    this.compositeNeeded.emit();
  }
}
