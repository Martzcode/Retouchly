import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ColorsService } from '../../services/colors.service';
import { LayerService } from '../../services/layer.service';
import { ToolService } from '../../services/tool.service';
import { LayerSnapshot, SelectionMode, ShapeType, StrokeStyle } from '../../types';

interface TextEdit {
  id: number;
  x: number;
  y: number;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: string;
  fill: boolean;
  fillColor: string;
  outline: boolean;
  outlineWidth: number;
  outlineColor: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-canvas',
  imports: [],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class CanvasComponent implements OnDestroy {
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('seloverlay', { static: true }) selOverlayRef!: ElementRef<HTMLCanvasElement>;

  @Output() positionChange = new EventEmitter<{ x: number; y: number }>();
  @Output() dirty = new EventEmitter<void>();
  @Output() newRequested = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();
  @Output() zoomChange = new EventEmitter<number>();

  private readonly tools = inject(ToolService);
  private readonly colors = inject(ColorsService);
  readonly layers = inject(LayerService);

  hasDocument = false;
  readonly zoom = signal(1);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  private static readonly MAX_UNDO = 50;
  private undoStack: LayerSnapshot[][] = [];
  private redoStack: LayerSnapshot[][] = [];

  private ctx!: CanvasRenderingContext2D;
  private selCtx!: CanvasRenderingContext2D;
  private drawing = false;
  private strokeSecondary = false;
  private nativeWidth = 320;
  private nativeHeight = 240;

  private last: Point | null = null;

  private selection: Uint8Array | null = null;
  private selectionPath: Path2D | null = null;
  private previewToolPath: Path2D | null = null;
  private previewResultPath: Path2D | null = null;
  private selCreate: { type: 'rect' | 'ellipse' | 'lasso'; start: Point; pts: Point[] } | null =
    null;
  private movingSelection: { start: Point; base: Uint8Array } | null = null;
  private moveObjectState: {
    start: Point;
    base: ImageData;
    sel: Uint8Array;
    moved: boolean;
  } | null = null;
  private clipboard: {
    img: ImageData;
    x: number;
    y: number;
    mask: Uint8Array | null;
  } | null = null;
  private antFrame: number | null = null;
  private antPhase = 0;

  private shapeDrag: { start: Point } | null = null;
  private polygonPoints: Point[] = [];
  private shapePreview: {
    tool: ShapeType;
    start: Point;
    end: Point;
    points: Point[];
  } | null = null;

  readonly toolPreview = signal<{ x: number; y: number; size: number; square: boolean } | null>(
    null,
  );

  readonly textEdit = signal<TextEdit | null>(null);
  readonly textEditArray = computed(() => {
    const te = this.textEdit();
    return te ? [te] : [];
  });
  private textEditId = 0;

  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private pinching = false;
  private pinchDistance = 0;

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.selCtx = this.selOverlayRef.nativeElement.getContext('2d')!;
    const stage = this.stageRef.nativeElement;
    stage.addEventListener('wheel', this.onStageWheel, { passive: false });
    window.addEventListener('wheel', this.onWindowWheel, { passive: false });
    window.addEventListener('gesturestart', this.preventGesture, { passive: false });
    window.addEventListener('gesturechange', this.preventGesture, { passive: false });
    this.setupTransparentCanvas(320, 240);
  }

  ngOnDestroy(): void {
    const stage = this.stageRef.nativeElement;
    stage.removeEventListener('wheel', this.onStageWheel);
    window.removeEventListener('wheel', this.onWindowWheel);
    window.removeEventListener('gesturestart', this.preventGesture);
    window.removeEventListener('gesturechange', this.preventGesture);
    this.stopAnts();
  }

  newDocument(width: number, height: number): void {
    this.setupCanvas(width, height);
    const bg = this.layers.getActiveLayer()!;
    bg.ctx.fillStyle = '#ffffff';
    bg.ctx.fillRect(0, 0, width, height);
    this.hasDocument = true;
    this.compositeToDisplay();
  }

  loadImage(dataUrl: string, width: number, height: number): void {
    const img = new Image();
    img.onload = () => {
      this.setupCanvas(width, height);
      const bg = this.layers.getActiveLayer()!;
      bg.ctx.drawImage(img, 0, 0, width, height);
      this.hasDocument = true;
      this.compositeToDisplay();
    };
    img.src = dataUrl;
  }

  exportPngDataUrl(): string {
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  compositeToDisplay(): void {
    this.layers.composite(this.ctx);
    if (this.shapePreview) {
      this.drawShapePreview();
    }
  }

  zoomIn(): void {
    this.adjustZoom(1.25);
  }

  zoomOut(): void {
    this.adjustZoom(1 / 1.25);
  }

  zoomTo(level: number): void {
    this.adjustZoom(level / this.zoom());
  }

  clearSelection(): void {
    this.showSelection(null);
    this.cancelPolygon();
  }

  cancelPolygon(): void {
    if (this.polygonPoints.length > 0) {
      this.polygonPoints = [];
      this.shapePreview = null;
      this.dirty.emit();
    }
  }

  copySelection(): void {
    if (!this.hasDocument) {
      return;
    }
    let x = 0;
    let y = 0;
    let w = this.nativeWidth;
    let h = this.nativeHeight;
    let mask: Uint8Array | null = null;
    if (this.selection) {
      const b = this.selectionBounds(this.selection);
      if (!b) {
        return;
      }
      x = b.x;
      y = b.y;
      w = b.w;
      h = b.h;
      mask = new Uint8Array(w * h);
      for (let ly = 0; ly < h; ly++) {
        for (let lx = 0; lx < w; lx++) {
          mask[ly * w + lx] = this.selection[(y + ly) * this.nativeWidth + (x + lx)];
        }
      }
    }
    const img = this.layers.getActiveLayer()!.ctx.getImageData(x, y, w, h);
    if (mask) {
      const d = img.data;
      for (let i = 0; i < w * h; i++) {
        if (!mask[i]) {
          d[i * 4 + 3] = 0;
        }
      }
    }
    this.clipboard = { img, x, y, mask };
  }

  cutSelection(): void {
    if (!this.hasDocument) {
      return;
    }
    this.copySelection();
    this.pushUndoSnapshot();
    const layer = this.layers.getActiveLayer()!;
    const img = layer.ctx.getImageData(0, 0, this.nativeWidth, this.nativeHeight);
    const d = img.data;
    if (this.selection) {
      const sel = this.selection;
      for (let i = 0; i < sel.length; i++) {
        if (sel[i]) {
          d[i * 4] = 0;
          d[i * 4 + 1] = 0;
          d[i * 4 + 2] = 0;
          d[i * 4 + 3] = 0;
        }
      }
    } else {
      d.fill(0);
    }
    layer.ctx.putImageData(img, 0, 0);
    this.compositeToDisplay();
    this.dirty.emit();
  }

  pasteClipboard(): void {
    const cb = this.clipboard;
    if (!cb || !this.hasDocument) {
      return;
    }
    this.pushUndoSnapshot();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const layer = this.layers.getActiveLayer()!;
    const img = layer.ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const cw = cb.img.width;
    const ch = cb.img.height;
    for (let ly = 0; ly < ch; ly++) {
      const gy = cb.y + ly;
      if (gy < 0 || gy >= h) {
        continue;
      }
      for (let lx = 0; lx < cw; lx++) {
        const gx = cb.x + lx;
        if (gx < 0 || gx >= w) {
          continue;
        }
        if (cb.mask && !cb.mask[ly * cw + lx]) {
          continue;
        }
        const si = (ly * cw + lx) * 4;
        const di = (gy * w + gx) * 4;
        d[di] = cb.img.data[si];
        d[di + 1] = cb.img.data[si + 1];
        d[di + 2] = cb.img.data[si + 2];
        d[di + 3] = cb.img.data[si + 3];
      }
    }
    layer.ctx.putImageData(img, 0, 0);
    const sel = this.emptyMask();
    for (let ly = 0; ly < ch; ly++) {
      const gy = cb.y + ly;
      if (gy < 0 || gy >= h) {
        continue;
      }
      for (let lx = 0; lx < cw; lx++) {
        const gx = cb.x + lx;
        if (gx < 0 || gx >= w) {
          continue;
        }
        if (cb.mask && !cb.mask[ly * cw + lx]) {
          continue;
        }
        sel[gy * w + gx] = 1;
      }
    }
    this.showSelection(sel);
    this.compositeToDisplay();
    this.dirty.emit();
  }

  private selectionBounds(mask: Uint8Array): { x: number; y: number; w: number; h: number } | null {
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      return null;
    }
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  selectAll(): void {
    if (!this.hasDocument) {
      return;
    }
    const mask = new Uint8Array(this.nativeWidth * this.nativeHeight);
    mask.fill(1);
    this.showSelection(mask);
  }

  invertSelection(): void {
    if (!this.hasDocument) {
      return;
    }
    const base = this.selection ?? new Uint8Array(this.nativeWidth * this.nativeHeight);
    const out = new Uint8Array(base.length);
    for (let i = 0; i < base.length; i++) {
      out[i] = base[i] ? 0 : 1;
    }
    this.showSelection(this.hasAnySelected(out) ? out : null);
  }

  undo(): void {
    if (this.undoStack.length === 0) {
      return;
    }
    this.redoStack.push(this.layers.snapshotAll());
    const snapshots = this.undoStack.pop()!;
    this.layers.restoreFromSnapshots(snapshots);
    this.compositeToDisplay();
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(true);
    this.dirty.emit();
  }

  redo(): void {
    if (this.redoStack.length === 0) {
      return;
    }
    this.undoStack.push(this.layers.snapshotAll());
    const snapshots = this.redoStack.pop()!;
    this.layers.restoreFromSnapshots(snapshots);
    this.compositeToDisplay();
    this.canUndo.set(true);
    this.canRedo.set(this.redoStack.length > 0);
    this.dirty.emit();
  }

  protected tool(): string {
    return this.tools.activeTool();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.hasDocument) {
      return;
    }
    event.preventDefault();
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size >= 2) {
      this.drawing = false;
      this.pinching = true;
      return;
    }
    const pos = this.toCanvasPos(event);
    this.positionChange.emit({ x: Math.floor(pos.x), y: Math.floor(pos.y) });

    const tool = this.tool();
    if (tool === 'pipette') {
      this.pickColor(pos, event.button === 2);
      return;
    }
    if (tool === 'wand') {
      this.commitMask(this.wandMask(Math.floor(pos.x), Math.floor(pos.y)));
      return;
    }
    if (tool === 'text') {
      this.confirmText();
      const z = this.zoom();
      this.textEditId++;
      this.textEdit.set({
        id: this.textEditId,
        x: pos.x * z,
        y: pos.y * z,
        font: this.tools.textFont(),
        size: this.tools.textSize(),
        bold: this.tools.textBold(),
        italic: this.tools.textItalic(),
        underline: this.tools.textUnderline(),
        align: this.tools.textAlign(),
        fill: this.tools.textFill(),
        fillColor: this.colors.primary(),
        outline: this.tools.textOutline(),
        outlineWidth: this.tools.textOutlineWidth(),
        outlineColor: this.colors.secondary(),
      });
      setTimeout(() => {
        this.stageRef.nativeElement.querySelector<HTMLTextAreaElement>('.text-input-overlay')?.focus();
      }, 0);
      return;
    }
    if (tool === 'selectRect' || tool === 'selectEllipse' || tool === 'lasso') {
      this.startSelectionTool(tool, pos, event);
      return;
    }
    if (tool === 'moveSelection' || tool === 'moveObject') {
      this.startMoveTool(tool, pos, event);
      return;
    }
    if (tool === 'drawShape') {
      if (event.button !== 0) {
        return;
      }
      const st = this.tools.shapeType();
      if (st === 'polygon') {
        if (this.polygonPoints.length >= 3) {
          const first = this.polygonPoints[0];
          const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
          if (dist < 6) {
            this.stampPolygon();
            return;
          }
        }
        this.polygonPoints.push(pos);
        this.shapePreview = {
          tool: 'polygon',
          start: this.polygonPoints[0],
          end: pos,
          points: [...this.polygonPoints],
        };
        this.dirty.emit();
        return;
      }
      this.shapeDrag = { start: pos };
      this.pushUndoSnapshot();
      this.stageRef.nativeElement.setPointerCapture(event.pointerId);
      return;
    }
    this.strokeSecondary = event.button === 2;
    this.pushUndoSnapshot();
    this.drawing = true;
    this.stageRef.nativeElement.setPointerCapture(event.pointerId);
    this.last = pos;
    this.stampAt(pos.x, pos.y);
    this.dirty.emit();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.hasDocument) {
      return;
    }
    const pos = this.toCanvasPos(event);
    this.positionChange.emit({ x: Math.floor(pos.x), y: Math.floor(pos.y) });
    if (this.pinching) {
      this.toolPreview.set(null);
      if (this.activePointers.has(event.pointerId)) {
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.updatePinchZoom();
      }
      return;
    }
    if (this.selCreate) {
      this.updateSelCreate(pos);
      return;
    }
    if (this.movingSelection) {
      this.updateSelectionMove(pos);
      return;
    }
    if (this.moveObjectState) {
      this.updateMoveObject(pos);
      return;
    }
    if (this.shapeDrag) {
      const st = this.tools.shapeType();
      if (st === 'rectangle' || st === 'ellipse' || st === 'line') {
        this.shapePreview = {
          tool: st,
          start: this.shapeDrag.start,
          end: pos,
          points: [],
        };
        this.dirty.emit();
      }
      return;
    }
    if (this.tool() === 'drawShape' && this.tools.shapeType() === 'polygon' && this.polygonPoints.length > 0) {
      this.shapePreview = {
        tool: 'polygon',
        start: this.polygonPoints[0],
        end: pos,
        points: [...this.polygonPoints],
      };
      this.dirty.emit();
      return;
    }
    this.updateToolPreview(pos);
    if (!this.drawing || !this.last) {
      return;
    }
    this.stampSegment(this.last.x, this.last.y, pos.x, pos.y);
    this.last = pos;
    this.dirty.emit();
  }

  protected onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.pinching = false;
      this.pinchDistance = 0;
    }
    if (this.selCreate) {
      const c = this.selCreate;
      this.selCreate = null;
      const pos = this.toCanvasPos(event);
      if (c.type === 'lasso') {
        if (c.pts.length >= 3) {
          this.commitMask(this.polygonMask(c.pts));
        } else {
          this.commitMask(this.emptyMask());
        }
      } else {
        const r = this.normalizedRect(c.start, pos);
        if (r.w < 1 || r.h < 1) {
          this.commitMask(this.emptyMask());
        } else {
          this.commitMask(c.type === 'rect' ? this.rectMask(r) : this.ellipseMask(r));
        }
      }
      return;
    }
    if (this.movingSelection) {
      const m = this.movingSelection;
      this.movingSelection = null;
      const pos = this.toCanvasPos(event);
      const dx = Math.round(pos.x - m.start.x);
      const dy = Math.round(pos.y - m.start.y);
      this.showSelection(this.translateMask(m.base, dx, dy));
      return;
    }
    if (this.moveObjectState) {
      const m = this.moveObjectState;
      this.moveObjectState = null;
      const pos = this.toCanvasPos(event);
      const dx = Math.round(pos.x - m.start.x);
      const dy = Math.round(pos.y - m.start.y);
      if (m.moved) {
        this.showSelection(this.translateMask(m.sel, dx, dy));
        this.dirty.emit();
      } else {
        this.showSelection(this.selection);
      }
      return;
    }
    if (this.shapeDrag) {
      const pos = this.toCanvasPos(event);
      const st = this.tools.shapeType();
      if (st === 'rectangle' || st === 'ellipse' || st === 'line') {
        this.stampShape(st, this.shapeDrag.start, pos);
      }
      this.shapeDrag = null;
      this.shapePreview = null;
      this.dirty.emit();
      return;
    }
    this.drawing = false;
    this.last = null;
  }

  protected onPointerLeave(): void {
    this.drawing = false;
    this.last = null;
    this.toolPreview.set(null);
  }

  protected onTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.confirmText();
    } else if (event.key === 'Escape') {
      this.textEdit.set(null);
    }
  }

  confirmText(): void {
    const te = this.textEdit();
    if (!te) {
      return;
    }
    const textarea = this.stageRef.nativeElement.querySelector<HTMLTextAreaElement>('.text-input-overlay');
    const text = textarea?.value?.trim() ?? '';
    if (!text || !this.hasDocument) {
      this.textEdit.set(null);
      return;
    }
    this.pushUndoSnapshot();
    const z = this.zoom();
    const layer = this.layers.getActiveLayer()!;
    const ctx = layer.ctx;
    const canvasX = te.x / z;
    const canvasY = te.y / z;

    ctx.save();
    const weight = te.bold ? 'bold' : 'normal';
    const style = te.italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${te.size}px ${te.font}`;
    ctx.textAlign = te.align as CanvasTextAlign;
    ctx.textBaseline = 'top';

    const lines = text.split('\n');
    const lineHeight = te.size * 1.2;
    let maxWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxWidth) {
        maxWidth = m.width;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const lineY = canvasY + i * lineHeight;

      if (te.outline && te.outlineWidth > 0) {
        ctx.strokeStyle = te.outlineColor;
        ctx.lineWidth = te.outlineWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(lines[i], canvasX, lineY);
      }
      if (te.fill) {
        ctx.fillStyle = te.fillColor;
        ctx.fillText(lines[i], canvasX, lineY);
      }
      if (te.underline) {
        const lw = ctx.measureText(lines[i]).width;
        let ux = canvasX;
        if (te.align === 'center') {
          ux -= lw / 2;
        } else if (te.align === 'right') {
          ux -= lw;
        }
        const uy = lineY + te.size + 2;
        ctx.strokeStyle = te.fill ? te.fillColor : te.outlineColor;
        ctx.lineWidth = Math.max(1, te.size / 16);
        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(ux + lw, uy);
        ctx.stroke();
      }
    }

    ctx.restore();
    this.textEdit.set(null);
    this.compositeToDisplay();
    this.dirty.emit();
  }

  protected onDoubleClick(event: MouseEvent): void {
    if (this.tool() === 'drawShape' && this.tools.shapeType() === 'polygon' && this.polygonPoints.length >= 2) {
      const pos = this.toCanvasPos(event);
      this.polygonPoints.push(pos);
      this.stampPolygon();
    }
  }

  private startSelectionTool(
    tool: string,
    pos: Point,
    event: PointerEvent,
  ): void {
    if (event.button !== 0) {
      return;
    }
    if (
      this.selection &&
      this.tools.selectionMode() === 'replace' &&
      this.isInsideSelection(pos)
    ) {
      this.movingSelection = { start: pos, base: this.selection.slice() };
      this.stageRef.nativeElement.setPointerCapture(event.pointerId);
      return;
    }
    this.selCreate = {
      type: tool === 'selectRect' ? 'rect' : tool === 'selectEllipse' ? 'ellipse' : 'lasso',
      start: pos,
      pts: [pos],
    };
    this.stageRef.nativeElement.setPointerCapture(event.pointerId);
  }

  private startMoveTool(tool: string, pos: Point, event: PointerEvent): void {
    if (event.button !== 0 || !this.selection || !this.isInsideSelection(pos)) {
      return;
    }
    if (tool === 'moveObject') {
      const layer = this.layers.getActiveLayer()!;
      this.moveObjectState = {
        start: pos,
        base: layer.ctx.getImageData(0, 0, this.nativeWidth, this.nativeHeight),
        sel: this.selection.slice(),
        moved: false,
      };
    } else {
      this.movingSelection = { start: pos, base: this.selection.slice() };
    }
    this.stageRef.nativeElement.setPointerCapture(event.pointerId);
  }

  private updateMoveObject(pos: Point): void {
    const m = this.moveObjectState!;
    const dx = Math.round(pos.x - m.start.x);
    const dy = Math.round(pos.y - m.start.y);
    if (dx === 0 && dy === 0) {
      return;
    }
    if (!m.moved) {
      this.pushUndoSnapshot();
      m.moved = true;
    }
    this.stampSelected(m.base, m.sel, dx, dy);
    this.previewResultPath = this.buildSelectionPath(this.translateMask(m.sel, dx, dy));
    this.previewToolPath = null;
    this.renderSelection();
    this.dirty.emit();
  }

  private stampSelected(base: ImageData, mask: Uint8Array, dx: number, dy: number): void {
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const src = base.data;
    const layer = this.layers.getActiveLayer()!;
    const dst = layer.ctx.createImageData(w, h);
    const out = dst.data;
    out.set(src);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) {
          continue;
        }
        const si = (y * w + x) * 4;
        out[si] = 0;
        out[si + 1] = 0;
        out[si + 2] = 0;
        out[si + 3] = 0;
      }
    }
    for (let y = 0; y < h; y++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) {
        continue;
      }
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) {
          continue;
        }
        const nx = x + dx;
        if (nx < 0 || nx >= w) {
          continue;
        }
        const si = (y * w + x) * 4;
        const di = (ny * w + nx) * 4;
        out[di] = src[si];
        out[di + 1] = src[si + 1];
        out[di + 2] = src[si + 2];
        out[di + 3] = src[si + 3];
      }
    }
    layer.ctx.putImageData(dst, 0, 0);
    this.compositeToDisplay();
  }

  private isInsideSelection(pos: Point): boolean {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (!this.selection || x < 0 || y < 0 || x >= this.nativeWidth || y >= this.nativeHeight) {
      return false;
    }
    return this.selection[y * this.nativeWidth + x] === 1;
  }

  private updateSelCreate(pos: Point): void {
    const c = this.selCreate!;
    let mask: Uint8Array;
    if (c.type === 'lasso') {
      const lastP = c.pts[c.pts.length - 1];
      if (Math.hypot(pos.x - lastP.x, pos.y - lastP.y) >= 2) {
        c.pts.push(pos);
      }
      mask = this.polygonMask(c.pts);
    } else {
      const r = this.normalizedRect(c.start, pos);
      mask = c.type === 'rect' ? this.rectMask(r) : this.ellipseMask(r);
    }
    this.previewSelection(this.combinedPreview(mask), mask);
  }

  private updateSelectionMove(pos: Point): void {
    const m = this.movingSelection!;
    const dx = Math.round(pos.x - m.start.x);
    const dy = Math.round(pos.y - m.start.y);
    this.previewResultPath = this.buildSelectionPath(this.translateMask(m.base, dx, dy));
    this.previewToolPath = null;
    this.renderSelection();
  }

  private normalizedRect(a: Point, b: Point): Rect {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    };
  }

  private emptyMask(): Uint8Array {
    return new Uint8Array(this.nativeWidth * this.nativeHeight);
  }

  private hasAnySelected(mask: Uint8Array): boolean {
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        return true;
      }
    }
    return false;
  }

  private combineMasks(a: Uint8Array | null, b: Uint8Array, mode: SelectionMode): Uint8Array {
    if (mode === 'replace') {
      return b.slice();
    }
    const out = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) {
      const va = a ? a[i] : 0;
      const vb = b[i];
      if (mode === 'add') {
        out[i] = va || vb ? 1 : 0;
      } else if (mode === 'subtract') {
        out[i] = va && !vb ? 1 : 0;
      } else if (mode === 'intersect') {
        out[i] = va && vb ? 1 : 0;
      } else {
        out[i] = va !== vb ? 1 : 0;
      }
    }
    return out;
  }

  private combinedPreview(toolMask: Uint8Array): Uint8Array {
    if (!this.selection) {
      return toolMask.slice();
    }
    return this.combineMasks(this.selection, toolMask, this.tools.selectionMode());
  }

  private commitMask(toolMask: Uint8Array): void {
    const combined = this.combinedPreview(toolMask);
    this.showSelection(this.hasAnySelected(combined) ? combined : null);
  }

  private rectMask(r: Rect): Uint8Array {
    const out = this.emptyMask();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const x0 = Math.max(0, Math.round(r.x));
    const y0 = Math.max(0, Math.round(r.y));
    const x1 = Math.min(w - 1, Math.round(r.x + r.w));
    const y1 = Math.min(h - 1, Math.round(r.y + r.h));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        out[y * w + x] = 1;
      }
    }
    return out;
  }

  private ellipseMask(r: Rect): Uint8Array {
    const out = this.emptyMask();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rx = Math.max(0.001, r.w / 2);
    const ry = Math.max(0.001, r.h / 2);
    const x0 = Math.max(0, Math.floor(r.x));
    const x1 = Math.min(w - 1, Math.ceil(r.x + r.w));
    const y0 = Math.max(0, Math.floor(r.y));
    const y1 = Math.min(h - 1, Math.ceil(r.y + r.h));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          out[y * w + x] = 1;
        }
      }
    }
    return out;
  }

  private polygonMask(pts: Point[]): Uint8Array {
    const out = this.emptyMask();
    if (pts.length < 3) {
      return out;
    }
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const buckets: number[][] = [];
    for (let y = 0; y < h; y++) {
      buckets.push([]);
    }
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      if (p1.y === p2.y) {
        continue;
      }
      let y0 = p1.y;
      let y1 = p2.y;
      let x0 = p1.x;
      let x1 = p2.x;
      if (y0 > y1) {
        [y0, y1] = [y1, y0];
        [x0, x1] = [x1, x0];
      }
      const yStart = Math.max(0, Math.ceil(y0));
      const yEnd = Math.min(h - 1, Math.floor(y1));
      if (yStart > yEnd) {
        continue;
      }
      const slope = (x1 - x0) / (y1 - y0);
      for (let y = yStart; y <= yEnd; y++) {
        const x = x0 + slope * (y - y0);
        if (x >= 0 && x < w) {
          buckets[y].push(x);
        }
      }
    }
    for (let y = 0; y < h; y++) {
      const xs = buckets[y].sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k]));
        const xb = Math.min(w - 1, Math.round(xs[k + 1]));
        for (let x = xa; x <= xb; x++) {
          out[y * w + x] = 1;
        }
      }
    }
    return out;
  }

  private wandMask(px: number, py: number): Uint8Array {
    const out = this.emptyMask();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    if (px < 0 || py < 0 || px >= w || py >= h) {
      return out;
    }
    const data = this.layers.getActiveLayer()!.ctx.getImageData(0, 0, w, h).data;
    const t = this.tools.wandTolerance() * 2.55;
    const seed = (py * w + px) * 4;
    const sr = data[seed];
    const sg = data[seed + 1];
    const sb = data[seed + 2];
    const sa = data[seed + 3];
    const matches = (idx: number): boolean => {
      const o = idx * 4;
      return (
        Math.abs(data[o] - sr) <= t &&
        Math.abs(data[o + 1] - sg) <= t &&
        Math.abs(data[o + 2] - sb) <= t &&
        Math.abs(data[o + 3] - sa) <= t
      );
    };
    if (this.tools.wandGlobal()) {
      for (let i = 0; i < w * h; i++) {
        if (matches(i)) {
          out[i] = 1;
        }
      }
      return out;
    }
    const q = new Int32Array(w * h);
    let head = 0;
    let tail = 0;
    const s = py * w + px;
    out[s] = 1;
    q[tail++] = s;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % w;
      const cy = (cur / w) | 0;
      if (cx > 0 && !out[cur - 1] && matches(cur - 1)) {
        out[cur - 1] = 1;
        q[tail++] = cur - 1;
      }
      if (cx < w - 1 && !out[cur + 1] && matches(cur + 1)) {
        out[cur + 1] = 1;
        q[tail++] = cur + 1;
      }
      if (cy > 0 && !out[cur - w] && matches(cur - w)) {
        out[cur - w] = 1;
        q[tail++] = cur - w;
      }
      if (cy < h - 1 && !out[cur + w] && matches(cur + w)) {
        out[cur + w] = 1;
        q[tail++] = cur + w;
      }
    }
    return out;
  }

  private translateMask(mask: Uint8Array, dx: number, dy: number): Uint8Array {
    const out = this.emptyMask();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) {
          continue;
        }
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
          out[ny * w + nx] = 1;
        }
      }
    }
    return out;
  }

  private showSelection(mask: Uint8Array | null): void {
    this.selection = mask;
    this.selectionPath = mask ? this.buildSelectionPath(mask) : null;
    this.previewToolPath = null;
    this.previewResultPath = null;
    this.syncAnts();
    this.renderSelection();
  }

  private previewSelection(result: Uint8Array, tool: Uint8Array): void {
    this.previewToolPath = this.buildSelectionPath(tool);
    this.previewResultPath = this.buildSelectionPath(result);
    this.syncAnts();
    this.renderSelection();
  }

  private syncAnts(): void {
    if (this.selectionPath || this.previewToolPath || this.previewResultPath) {
      this.startAnts();
    } else {
      this.stopAnts();
    }
  }

  private buildSelectionPath(mask: Uint8Array): Path2D {
    const path = new Path2D();
    const w = this.nativeWidth;
    const h = this.nativeHeight;
    const isSel = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < w && y < h ? mask[y * w + x] === 1 : false;
    const edges = new Map<string, number[]>();
    const addEdge = (ax: number, ay: number, bx: number, by: number): void => {
      const key = ay === by ? `h${ax},${ay}` : `v${ax},${ay}`;
      edges.set(key, [ax, ay, bx, by]);
    };
    for (let y = 0; y <= h; y++) {
      for (let x = 0; x <= w; x++) {
        const above = y > 0 && isSel(x, y - 1);
        const below = y < h && isSel(x, y);
        if (above !== below) {
          addEdge(x, y, x + 1, y);
        }
        const left = x > 0 && isSel(x - 1, y);
        const right = x < w && isSel(x, y);
        if (left !== right) {
          addEdge(x, y, x, y + 1);
        }
      }
    }
    const incident = new Map<string, { key: string; dx: number; dy: number }[]>();
    for (const [key, [ax, ay, bx, by]] of edges) {
      const push = (vx: number, vy: number): void => {
        let list = incident.get(`${vx},${vy}`);
        if (!list) {
          list = [];
          incident.set(`${vx},${vy}`, list);
        }
        list.push({ key, dx: (ax === vx && ay === vy ? bx : ax) - vx, dy: (ax === vx && ay === vy ? by : ay) - vy });
      };
      push(ax, ay);
      push(bx, by);
    }
    const partner = new Map<string, string>();
    for (const [vkey, list] of incident) {
      list.sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));
      for (let k = 0; k + 1 < list.length; k += 2) {
        partner.set(`${vkey}|${list[k].key}`, list[k + 1].key);
        partner.set(`${vkey}|${list[k + 1].key}`, list[k].key);
      }
    }
    const used = new Set<string>();
    for (const [startKey] of edges) {
      if (used.has(startKey)) {
        continue;
      }
      const loop: Point[] = [];
      let curKey = startKey;
      let vx = edges.get(curKey)![0];
      let vy = edges.get(curKey)![1];
      loop.push({ x: vx, y: vy });
      let guard = 0;
      while (!used.has(curKey) && guard++ < 1000000) {
        used.add(curKey);
        const [ax, ay, bx, by] = edges.get(curKey)!;
        const otherX = ax === vx && ay === vy ? bx : ax;
        const otherY = ax === vx && ay === vy ? by : ay;
        loop.push({ x: otherX, y: otherY });
        const next = partner.get(`${otherX},${otherY}|${curKey}`);
        if (!next) {
          break;
        }
        vx = otherX;
        vy = otherY;
        curKey = next;
      }
      if (loop.length >= 3) {
        path.moveTo(loop[0].x, loop[0].y);
        for (let i = 1; i < loop.length; i++) {
          path.lineTo(loop[i].x, loop[i].y);
        }
        path.closePath();
      }
    }
    return path;
  }

  private stopAnts(): void {
    if (this.antFrame !== null) {
      cancelAnimationFrame(this.antFrame);
      this.antFrame = null;
    }
  }

  private renderSelection(): void {
    const ctx = this.selCtx;
    ctx.clearRect(0, 0, this.nativeWidth, this.nativeHeight);
    const dragging = this.previewToolPath !== null || this.previewResultPath !== null;
    if (dragging && this.selectionPath) {
      ctx.save();
      ctx.setLineDash([2, 4]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = 'rgba(160,160,160,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke(this.selectionPath);
      ctx.restore();
    }
    if (this.previewToolPath) {
      ctx.save();
      ctx.fillStyle = 'rgba(30,120,230,0.12)';
      ctx.fill(this.previewToolPath);
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = 'rgba(30,120,230,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke(this.previewToolPath);
      ctx.restore();
    }
    const main = this.previewResultPath ?? this.selectionPath;
    if (main) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineDashOffset = -this.antPhase;
      ctx.stroke(main);
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineDashOffset = -this.antPhase + 4;
      ctx.stroke(main);
      ctx.restore();
    }
  }

  private startAnts(): void {
    if (this.antFrame !== null) {
      return;
    }
    const tick = () => {
      this.renderSelection();
      this.antPhase += 0.2;
      this.antFrame = requestAnimationFrame(tick);
    };
    this.antFrame = requestAnimationFrame(tick);
  }

  private snapshot(): ImageData {
    const layer = this.layers.getActiveLayer()!;
    return layer.ctx.getImageData(0, 0, this.nativeWidth, this.nativeHeight);
  }

  pushUndoSnapshot(): void {
    this.undoStack.push(this.layers.snapshotAll());
    if (this.undoStack.length > CanvasComponent.MAX_UNDO) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.canUndo.set(true);
    this.canRedo.set(false);
  }

  private clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  private updateToolPreview(pos: Point): void {
    const tool = this.tool();
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      const z = this.zoom();
      const d = Math.max(1, this.tools.brushSize() * z);
      this.toolPreview.set({
        x: pos.x * z - d / 2,
        y: pos.y * z - d / 2,
        size: d,
        square: tool === 'pencil',
      });
    } else {
      this.toolPreview.set(null);
    }
  }

  private pickColor(pos: Point, secondary: boolean): void {
    const x = Math.floor(Math.max(0, Math.min(this.nativeWidth - 1, pos.x)));
    const y = Math.floor(Math.max(0, Math.min(this.nativeHeight - 1, pos.y)));
    const data = this.ctx.getImageData(x, y, 1, 1).data;
    if (secondary) {
      this.colors.setSecondaryFromRgba(data[0], data[1], data[2], data[3]);
    } else {
      this.colors.setPrimaryFromRgba(data[0], data[1], data[2], data[3]);
    }
  }

  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private stampAt(x: number, y: number): void {
    const layer = this.layers.getActiveLayer()!;
    if (layer.locked) {
      return;
    }
    const ctx = layer.ctx;
    if (this.tool() === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      this.stampCircle(ctx, x, y);
      ctx.globalCompositeOperation = 'source-over';
    } else if (this.tool() === 'brush') {
      this.stampCircle(ctx, x, y);
    } else {
      this.stampSquare(ctx, x, y);
    }
    this.compositeToDisplay();
    this.dirty.emit();
  }

  private stampSquare(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = Math.max(1, Math.round(this.tools.brushSize()));
    ctx.fillStyle = this.strokeColor();
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  }

  private stampCircle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const size = Math.max(1, this.tools.brushSize());
    const radius = size / 2;
    const hardness = this.tools.brushHardness();
    const isEraser = this.tool() === 'eraser';
    const inner = (radius * hardness) / 100;
    if (hardness >= 100) {
      ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : this.strokeColor();
    } else {
      const gradient = ctx.createRadialGradient(x, y, inner, x, y, radius);
      gradient.addColorStop(0, isEraser ? 'rgba(0,0,0,1)' : this.strokeColor());
      gradient.addColorStop(1, isEraser ? 'rgba(0,0,0,0)' : this.strokeColorFaded());
      ctx.fillStyle = gradient;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private strokeColor(): string {
    return this.strokeSecondary ? this.colors.secondaryRgba() : this.colors.primaryRgba();
  }

  private strokeColorFaded(): string {
    return this.strokeSecondary ? this.colors.secondaryRgba(0) : this.colors.primaryRgba(0);
  }

  private stampSegment(x0: number, y0: number, x1: number, y1: number): void {
    const step = Math.max(0.5, this.tools.brushSize() / 2);
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.stampAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }

  private updatePinchZoom(): void {
    const pts = [...this.activePointers.values()];
    if (pts.length < 2) {
      return;
    }
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (this.pinchDistance > 0 && dist > 0) {
      this.adjustZoom(dist / this.pinchDistance);
    }
    this.pinchDistance = dist;
  }

  private onStageWheel = (event: WheelEvent): void => {
    if ((event.ctrlKey || event.metaKey) && this.hasDocument) {
      event.preventDefault();
    }
  };

  private onWindowWheel = (event: WheelEvent): void => {
    if ((event.ctrlKey || event.metaKey) && this.hasDocument) {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.adjustZoom(factor);
    }
  };

  private preventGesture = (event: Event): void => {
    event.preventDefault();
  };

  private adjustZoom(factor: number): void {
    const next = Math.min(8, Math.max(0.05, this.zoom() * factor));
    if (next === this.zoom()) {
      return;
    }
    this.zoom.set(next);
    this.applyZoom();
    this.zoomChange.emit(next);
  }

  private applyZoom(): void {
    const wrap = this.wrapRef.nativeElement;
    const z = this.zoom();
    wrap.style.transform = `scale(${z})`;
    wrap.style.transformOrigin = 'top left';
    wrap.style.width = `${this.nativeWidth}px`;
    wrap.style.height = `${this.nativeHeight}px`;
  }

  private sizeOverlay(): void {
    const overlay = this.selOverlayRef.nativeElement;
    overlay.width = this.nativeWidth;
    overlay.height = this.nativeHeight;
  }

  private setupCanvas(width: number, height: number): void {
    this.nativeWidth = width;
    this.nativeHeight = height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.sizeOverlay();
    this.showSelection(null);
    this.selCreate = null;
    this.movingSelection = null;
    this.toolPreview.set(null);
    this.zoom.set(1);
    this.applyZoom();
    this.zoomChange.emit(1);
    this.clearHistory();
    this.layers.reset(width, height);
    this.layers.addLayer('Arrière-plan');
  }

  private setupTransparentCanvas(width: number, height: number): void {
    this.nativeWidth = width;
    this.nativeHeight = height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.sizeOverlay();
  }

  private toCanvasPos(event: { clientX: number; clientY: number }): Point {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / this.zoom(),
      y: (event.clientY - rect.top) / this.zoom(),
    };
  }

  private applyStrokeStyle(ctx: CanvasRenderingContext2D): void {
    const style = this.tools.shapeStrokeStyle();
    if (style === 'dashed') {
      ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
    } else if (style === 'dotted') {
      ctx.lineCap = 'round';
      ctx.setLineDash([0, ctx.lineWidth * 2.5]);
    } else {
      ctx.setLineDash([]);
    }
  }

  private stampShape(
    shapeType: ShapeType,
    start: Point,
    end: Point,
  ): void {
    if (!this.hasDocument) {
      return;
    }
    const layer = this.layers.getActiveLayer()!;
    const ctx = layer.ctx;
    const w = this.tools.shapeStrokeWidth();
    const filled = this.tools.shapeFilled();
    const primary = this.colors.primary();
    const secondary = this.colors.secondary();

    ctx.save();
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = primary;
    ctx.fillStyle = secondary;
    this.applyStrokeStyle(ctx);

    if (shapeType === 'line') {
      ctx.beginPath();
      ctx.moveTo(Math.round(start.x), Math.round(start.y));
      ctx.lineTo(Math.round(end.x), Math.round(end.y));
      ctx.stroke();
    } else {
      const r = this.normalizedRect(start, end);
      if (r.w < 1 && r.h < 1) {
        ctx.restore();
        return;
      }
      if (shapeType === 'rectangle') {
        if (filled) {
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      } else if (shapeType === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(
          r.x + r.w / 2,
          r.y + r.h / 2,
          Math.max(0.5, r.w / 2),
          Math.max(0.5, r.h / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.closePath();
        if (filled) {
          ctx.fill();
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    this.compositeToDisplay();
  }

  private stampPolygon(): void {
    if (!this.hasDocument || this.polygonPoints.length < 3) {
      this.polygonPoints = [];
      this.shapePreview = null;
      this.dirty.emit();
      return;
    }
    const layer = this.layers.getActiveLayer()!;
    const ctx = layer.ctx;
    const w = this.tools.shapeStrokeWidth();
    const filled = this.tools.shapeFilled();
    const primary = this.colors.primary();
    const secondary = this.colors.secondary();

    this.pushUndoSnapshot();

    ctx.save();
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = primary;
    ctx.fillStyle = secondary;
    this.applyStrokeStyle(ctx);

    ctx.beginPath();
    ctx.moveTo(Math.round(this.polygonPoints[0].x), Math.round(this.polygonPoints[0].y));
    for (let i = 1; i < this.polygonPoints.length; i++) {
      ctx.lineTo(Math.round(this.polygonPoints[i].x), Math.round(this.polygonPoints[i].y));
    }
    ctx.closePath();
    if (filled) {
      ctx.fill();
    }
    ctx.stroke();

    ctx.restore();
    this.polygonPoints = [];
    this.shapePreview = null;
    this.compositeToDisplay();
    this.dirty.emit();
  }

  private drawShapePreview(): void {
    const p = this.shapePreview;
    if (!p) {
      return;
    }
    const ctx = this.ctx;
    const w = this.tools.shapeStrokeWidth();
    const filled = this.tools.shapeFilled();
    const primary = this.colors.primary();
    const secondary = this.colors.secondary();

    ctx.save();
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = primary;
    ctx.fillStyle = secondary;
    this.applyStrokeStyle(ctx);

    if (p.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(Math.round(p.start.x), Math.round(p.start.y));
      ctx.lineTo(Math.round(p.end.x), Math.round(p.end.y));
      ctx.stroke();
    } else if (p.tool === 'rectangle') {
      const r = this.normalizedRect(p.start, p.end);
      if (filled) {
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    } else if (p.tool === 'ellipse') {
      const r = this.normalizedRect(p.start, p.end);
      ctx.beginPath();
      ctx.ellipse(
        r.x + r.w / 2,
        r.y + r.h / 2,
        Math.max(0.5, r.w / 2),
        Math.max(0.5, r.h / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
      if (filled) {
        ctx.fill();
      }
      ctx.stroke();
    } else if (p.tool === 'polygon' && p.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(Math.round(p.points[0].x), Math.round(p.points[0].y));
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(Math.round(p.points[i].x), Math.round(p.points[i].y));
      }
      ctx.lineTo(Math.round(p.end.x), Math.round(p.end.y));
      if (p.points.length >= 3) {
        ctx.closePath();
        if (filled) {
          ctx.fill();
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
