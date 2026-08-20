import { inject, Injectable, signal } from '@angular/core';
import { BlendMode, BLEND_MODES, LayerSnapshot, ProjectData, ProjectLayerData } from '../types';
import { I18nService } from './i18n.service';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  rotation: number;
  scale: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  _basePixels: ImageData | null;
}

let layerIdCounter = 0;

function makeId(): string {
  return `layer-${++layerIdCounter}-${Date.now()}`;
}

function createBuffer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

@Injectable({ providedIn: 'root' })
export class LayerService {
  private readonly i18n = inject(I18nService);
  private _layers = signal<Layer[]>([]);
  private _activeLayerId = signal('');
  private _width = 0;
  private _height = 0;

  readonly layers = this._layers.asReadonly();
  readonly activeLayerId = this._activeLayerId.asReadonly();

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get hasDocument(): boolean {
    return this._width > 0 && this._height > 0;
  }

  reset(w: number, h: number): void {
    this._width = w;
    this._height = h;
    this._layers.set([]);
    this._activeLayerId.set('');
  }

  addLayer(name?: string): Layer | null {
    if (!this.hasDocument) {
      return null;
    }
    const id = makeId();
    const { canvas, ctx } = createBuffer(this._width, this._height);
    const layer: Layer = {
      id,
      name: name ?? this.nextLayerName(),
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      rotation: 0,
      scale: 100,
      canvas,
      ctx,
      _basePixels: null,
    };
    const list = this._layers();
    const activeIdx = list.findIndex((l) => l.id === this._activeLayerId());
    const insertAt = activeIdx >= 0 ? activeIdx + 1 : list.length;
    const next = [...list];
    next.splice(insertAt, 0, layer);
    this._layers.set(next);
    this._activeLayerId.set(id);
    return layer;
  }

  removeLayer(id: string): void {
    const list = this._layers();
    if (list.length <= 1) {
      return;
    }
    const idx = list.findIndex((l) => l.id === id);
    if (idx < 0) {
      return;
    }
    const next = [...list];
    next.splice(idx, 1);
    this._layers.set(next);
    if (this._activeLayerId() === id) {
      const newIdx = Math.min(idx, next.length - 1);
      this._activeLayerId.set(next[newIdx].id);
    }
  }

  duplicateLayer(id: string): Layer | null {
    const list = this._layers();
    const idx = list.findIndex((l) => l.id === id);
    if (idx < 0) {
      return null;
    }
    const src = list[idx];
    const newId = makeId();
    const { canvas, ctx } = createBuffer(this._width, this._height);
    ctx.drawImage(src.canvas, 0, 0);
    const dup: Layer = {
      id: newId,
      name: src.name + this.i18n.t('layers.copy'),
      visible: src.visible,
      locked: false,
      opacity: src.opacity,
      blendMode: src.blendMode,
      rotation: src.rotation,
      scale: src.scale,
      canvas,
      ctx,
      _basePixels: src._basePixels ? new ImageData(
        new Uint8ClampedArray(src._basePixels.data),
        src._basePixels.width,
        src._basePixels.height,
      ) : null,
    };
    const next = [...list];
    next.splice(idx + 1, 0, dup);
    this._layers.set(next);
    this._activeLayerId.set(newId);
    return dup;
  }

  moveLayerUp(id: string): void {
    const list = this._layers();
    const idx = list.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= list.length - 1) {
      return;
    }
    const next = [...list];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    this._layers.set(next);
  }

  moveLayerDown(id: string): void {
    const list = this._layers();
    const idx = list.findIndex((l) => l.id === id);
    if (idx <= 0) {
      return;
    }
    const next = [...list];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    this._layers.set(next);
  }

  reorderLayer(fromIndex: number, toIndex: number): void {
    const list = this._layers();
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
      return;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    this._layers.set(next);
  }

  mergeDown(id: string): void {
    const list = this._layers();
    const idx = list.findIndex((l) => l.id === id);
    if (idx <= 0) {
      return;
    }
    const top = list[idx];
    const bottom = list[idx - 1];
    bottom.ctx.save();
    bottom.ctx.globalAlpha = top.opacity / 100;
    bottom.ctx.globalCompositeOperation = top.blendMode;
    bottom.ctx.drawImage(top.canvas, 0, 0);
    bottom.ctx.restore();
    const next = [...list];
    next.splice(idx, 1);
    this._layers.set(next);
    this._activeLayerId.set(bottom.id);
  }

  flatten(): void {
    const list = this._layers();
    if (list.length <= 1) {
      return;
    }
    const { canvas, ctx } = createBuffer(this._width, this._height);
    for (const layer of list) {
      if (!layer.visible) {
        continue;
      }
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    const flat: Layer = {
      id: makeId(),
      name: this.i18n.t('layers.background'),
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      rotation: 0,
      scale: 100,
      canvas,
      ctx,
      _basePixels: null,
    };
    this._layers.set([flat]);
    this._activeLayerId.set(flat.id);
  }

  setActive(id: string): void {
    this._activeLayerId.set(id);
  }

  setVisibility(id: string, visible: boolean): void {
    this._layers.update((list) =>
      list.map((l) => (l.id === id ? { ...l, visible } : l)),
    );
  }

  setLocked(id: string, locked: boolean): void {
    this._layers.update((list) =>
      list.map((l) => (l.id === id ? { ...l, locked } : l)),
    );
  }

  setOpacity(id: string, opacity: number): void {
    this._layers.update((list) =>
      list.map((l) => (l.id === id ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) } : l)),
    );
  }

  setBlendMode(id: string, mode: BlendMode): void {
    this._layers.update((list) =>
      list.map((l) => (l.id === id ? { ...l, blendMode: mode } : l)),
    );
  }

  renameLayer(id: string, name: string): void {
    this._layers.update((list) =>
      list.map((l) => (l.id === id ? { ...l, name } : l)),
    );
  }

  getActiveLayer(): Layer | null {
    const list = this._layers();
    return list.find((l) => l.id === this._activeLayerId()) ?? null;
  }

  getLayerById(id: string): Layer | null {
    return this._layers().find((l) => l.id === id) ?? null;
  }

  composite(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this._width, this._height);
    for (const layer of this._layers()) {
      if (!layer.visible) {
        continue;
      }
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  }

  getThumbnail(id: string, size: number): ImageData | null {
    const layer = this.getLayerById(id);
    if (!layer) {
      return null;
    }
    const tmp = document.createElement('canvas');
    tmp.width = size;
    tmp.height = size;
    const ctx = tmp.getContext('2d')!;
    const scale = Math.min(size / this._width, size / this._height);
    const dw = this._width * scale;
    const dh = this._height * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(layer.canvas, dx, dy, dw, dh);
    return ctx.getImageData(0, 0, size, size);
  }

  snapshotAll(): LayerSnapshot[] {
    return this._layers().map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      opacity: l.opacity,
      blendMode: l.blendMode,
      rotation: l.rotation,
      scale: l.scale,
      width: this._width,
      height: this._height,
      pixels: l.ctx.getImageData(0, 0, this._width, this._height),
    }));
  }

  restoreFromSnapshots(snapshots: LayerSnapshot[]): void {
    if (snapshots.length === 0) {
      return;
    }
    const snapW = snapshots[0].width;
    const snapH = snapshots[0].height;
    const layers: Layer[] = snapshots.map((snap) => {
      const existing = this.getLayerById(snap.id);
      if (existing && existing.canvas.width === snap.width && existing.canvas.height === snap.height) {
        existing.ctx.putImageData(snap.pixels, 0, 0);
        return {
          ...existing,
          name: snap.name,
          visible: snap.visible,
          locked: snap.locked,
          opacity: snap.opacity,
          blendMode: snap.blendMode,
          rotation: snap.rotation,
          scale: snap.scale,
        };
      }
      const { canvas, ctx } = createBuffer(snap.width, snap.height);
      ctx.putImageData(snap.pixels, 0, 0);
      return {
        id: snap.id,
        name: snap.name,
        visible: snap.visible,
        locked: snap.locked,
        opacity: snap.opacity,
        blendMode: snap.blendMode,
        rotation: snap.rotation,
        scale: snap.scale,
        canvas,
        ctx,
        _basePixels: null,
      };
    });
    this._width = snapW;
    this._height = snapH;
    this._layers.set(layers);
    if (layers.length > 0 && !layers.find((l) => l.id === this._activeLayerId())) {
      this._activeLayerId.set(layers[layers.length - 1].id);
    }
  }

  async importImageAsLayer(dataUrl: string, name?: string): Promise<void> {
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = dataUrl;
    });
    const layer = this.addLayer(name);
    if (!layer) {
      return;
    }
    layer.ctx.drawImage(img, 0, 0, this._width, this._height);
    this._layers.update((list) => [...list]);
  }

  transformLayer(id: string, matrix: DOMMatrix): void {
    const layer = this.getLayerById(id);
    if (!layer) {
      return;
    }
    const { canvas: tmp, ctx: tmpCtx } = createBuffer(this._width, this._height);
    tmpCtx.setTransform(matrix);
    tmpCtx.drawImage(layer.canvas, 0, 0);
    layer.ctx.clearRect(0, 0, this._width, this._height);
    layer.ctx.drawImage(tmp, 0, 0);
    this._layers.update((list) => [...list]);
  }

  setRotation(id: string, degrees: number): void {
    const layer = this.getLayerById(id);
    if (!layer) {
      return;
    }
    if (layer._basePixels === null && layer.rotation === 0 && layer.scale === 100) {
      layer._basePixels = layer.ctx.getImageData(0, 0, this._width, this._height);
    }
    layer.rotation = degrees;
    this.applyStoredTransform(layer);
    this._layers.update((list) => [...list]);
  }

  setScale(id: string, percent: number): void {
    const layer = this.getLayerById(id);
    if (!layer) {
      return;
    }
    if (layer._basePixels === null && layer.rotation === 0 && layer.scale === 100) {
      layer._basePixels = layer.ctx.getImageData(0, 0, this._width, this._height);
    }
    layer.scale = percent;
    this.applyStoredTransform(layer);
    this._layers.update((list) => [...list]);
  }

  resetTransform(id: string): void {
    const layer = this.getLayerById(id);
    if (!layer) {
      return;
    }
    if (layer._basePixels) {
      layer.ctx.putImageData(layer._basePixels, 0, 0);
      layer._basePixels = null;
    }
    layer.rotation = 0;
    layer.scale = 100;
    this._layers.update((list) => [...list]);
  }

  private applyStoredTransform(layer: Layer): void {
    if (!layer._basePixels) {
      return;
    }
    const { canvas: tmp, ctx: tmpCtx } = createBuffer(this._width, this._height);
    tmpCtx.putImageData(layer._basePixels, 0, 0);

    const cx = this._width / 2;
    const cy = this._height / 2;
    const rad = (layer.rotation * Math.PI) / 180;
    const s = layer.scale / 100;

    const { canvas: out, ctx: outCtx } = createBuffer(this._width, this._height);
    outCtx.translate(cx, cy);
    outCtx.rotate(rad);
    outCtx.scale(s, s);
    outCtx.drawImage(tmp, -cx, -cy);

    layer.ctx.clearRect(0, 0, this._width, this._height);
    layer.ctx.drawImage(out, 0, 0);
  }

  /** Tourne toutes les calques de 90/180/270° (change les dimensions du document). */
  rotateAll(degrees: 90 | 180 | 270): void {
    const w = this._width;
    const h = this._height;
    const newW = degrees === 180 ? w : h;
    const newH = degrees === 180 ? h : w;

    const list = this._layers();
    for (const layer of list) {
      const { canvas: tmp, ctx: tmpCtx } = createBuffer(newW, newH);

      if (degrees === 90) {
        // 90° CW: (x,y) → (h-y, x)
        tmpCtx.translate(newW, 0);
        tmpCtx.rotate(Math.PI / 2);
        tmpCtx.drawImage(layer.canvas, 0, 0);
      } else if (degrees === 270) {
        // 270° CW: (x,y) → (y, w-x)
        tmpCtx.translate(0, newH);
        tmpCtx.rotate(-Math.PI / 2);
        tmpCtx.drawImage(layer.canvas, 0, 0);
      } else {
        // 180°: (x,y) → (w-x, h-y)
        tmpCtx.translate(newW, newH);
        tmpCtx.rotate(Math.PI);
        tmpCtx.drawImage(layer.canvas, 0, 0);
      }

      layer.canvas.width = newW;
      layer.canvas.height = newH;
      layer.ctx.imageSmoothingEnabled = false;
      layer.ctx.drawImage(tmp, 0, 0);
      if (layer._basePixels) {
        layer._basePixels = layer.ctx.getImageData(0, 0, newW, newH);
      }
    }
    this._width = newW;
    this._height = newH;
    this._layers.update((list) => [...list]);
  }

  /** Retourne tous les calques horizontalement ou verticalement. */
  flipAll(direction: 'horizontal' | 'vertical'): void {
    const w = this._width;
    const h = this._height;
    const list = this._layers();
    for (const layer of list) {
      const { canvas: tmp, ctx: tmpCtx } = createBuffer(w, h);
      if (direction === 'horizontal') {
        tmpCtx.translate(w, 0);
        tmpCtx.scale(-1, 1);
      } else {
        tmpCtx.translate(0, h);
        tmpCtx.scale(1, -1);
      }
      tmpCtx.drawImage(layer.canvas, 0, 0);
      layer.ctx.clearRect(0, 0, w, h);
      layer.ctx.drawImage(tmp, 0, 0);
      if (layer._basePixels) {
        layer._basePixels = layer.ctx.getImageData(0, 0, w, h);
      }
    }
    this._layers.update((list) => [...list]);
  }

  /** Redimensionne l'image (tous les calques). */
  resizeImage(newW: number, newH: number): void {
    if (newW < 1 || newH < 1) {
      return;
    }
    const oldW = this._width;
    const oldH = this._height;
    const list = this._layers();
    for (const layer of list) {
      const { canvas: tmp, ctx: tmpCtx } = createBuffer(newW, newH);
      tmpCtx.imageSmoothingEnabled = false;
      tmpCtx.drawImage(layer.canvas, 0, 0, oldW, oldH, 0, 0, newW, newH);
      layer.canvas.width = newW;
      layer.canvas.height = newH;
      layer.ctx.imageSmoothingEnabled = false;
      layer.ctx.drawImage(tmp, 0, 0);
      if (layer._basePixels) {
        layer._basePixels = layer.ctx.getImageData(0, 0, newW, newH);
      }
    }
    this._width = newW;
    this._height = newH;
    this._layers.update((list) => [...list]);
  }

  /**
   * Redimensionne le canevas (tous les calques) sans étirer le contenu.
   * anchorX/anchorY ∈ {0, 0.5, 1} (gauche/centre/droite, haut/milieu/bas).
   */
  resizeCanvas(newW: number, newH: number, anchorX: number, anchorY: number): void {
    if (newW < 1 || newH < 1) {
      return;
    }
    const oldW = this._width;
    const oldH = this._height;
    const dx = Math.round((newW - oldW) * anchorX);
    const dy = Math.round((newH - oldH) * anchorY);
    const list = this._layers();
    for (const layer of list) {
      const { canvas: tmp, ctx: tmpCtx } = createBuffer(oldW, oldH);
      tmpCtx.drawImage(layer.canvas, 0, 0);
      layer.canvas.width = newW;
      layer.canvas.height = newH;
      layer.ctx.imageSmoothingEnabled = false;
      layer.ctx.clearRect(0, 0, newW, newH);
      layer.ctx.drawImage(tmp, dx, dy);
      if (layer._basePixels) {
        layer._basePixels = layer.ctx.getImageData(0, 0, newW, newH);
      }
    }
    this._width = newW;
    this._height = newH;
    this._layers.update((list) => [...list]);
  }

  /** Recadre tous les calques selon un rectangle englobant. */
  cropAll(x: number, y: number, w: number, h: number): void {
    if (w < 1 || h < 1) {
      return;
    }
    const list = this._layers();
    for (const layer of list) {
      const img = layer.ctx.getImageData(x, y, w, h);
      layer.canvas.width = w;
      layer.canvas.height = h;
      layer.ctx.imageSmoothingEnabled = false;
      layer.ctx.putImageData(img, 0, 0);
      if (layer._basePixels) {
        layer._basePixels = layer.ctx.getImageData(0, 0, w, h);
      }
    }
    this._width = w;
    this._height = h;
    this._layers.update((list) => [...list]);
  }

  /** Sérialise le document complet (calques + métadonnées) au format projet Retouchly. */
  exportProject(): string {
    const layers: ProjectLayerData[] = this._layers().map((l) => ({
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      opacity: l.opacity,
      blendMode: l.blendMode,
      rotation: l.rotation,
      scale: l.scale,
      dataUrl: l.canvas.toDataURL('image/png'),
    }));
    const data: ProjectData = {
      app: 'Retouchly',
      version: 1,
      width: this._width,
      height: this._height,
      layers,
    };
    return JSON.stringify(data);
  }

  /** Reconstruit le document à partir d'un JSON de projet Retouchly. */
  async loadProject(json: string): Promise<boolean> {
    let data: ProjectData;
    try {
      data = JSON.parse(json) as ProjectData;
    } catch {
      return false;
    }
    if (
      !data ||
      data.app !== 'Retouchly' ||
      !Number.isFinite(data.width) ||
      !Number.isFinite(data.height) ||
      !Array.isArray(data.layers) ||
      data.layers.length === 0
    ) {
      return false;
    }
    const w = Math.max(1, Math.round(data.width));
    const h = Math.max(1, Math.round(data.height));
    const loaded: Layer[] = [];
    for (const src of data.layers) {
      if (!src || typeof src.dataUrl !== 'string') {
        return false;
      }
      const img = await this.loadImage(src.dataUrl);
      if (!img) {
        return false;
      }
      const { canvas, ctx } = createBuffer(w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      loaded.push({
        id: makeId(),
        name: src.name || this.i18n.t('layers.layer'),
        visible: src.visible !== false,
        locked: src.locked === true,
        opacity: Math.max(0, Math.min(100, src.opacity ?? 100)),
        blendMode: BLEND_MODES.includes(src.blendMode) ? src.blendMode : 'source-over',
        rotation: src.rotation ?? 0,
        scale: src.scale ?? 100,
        canvas,
        ctx,
        _basePixels: null,
      });
    }
    this._width = w;
    this._height = h;
    this._layers.set(loaded);
    this._activeLayerId.set(loaded[loaded.length - 1].id);
    return true;
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  private nextLayerName(): string {
    const list = this._layers();
    const base = this.i18n.t('layers.layer');
    let n = 1;
    while (list.some((l) => l.name === `${base} ${n}`)) {
      n++;
    }
    return `${base} ${n}`;
  }
}
