import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ColorsService } from '../../services/colors.service';
import { ToolService } from '../../services/tool.service';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

  @Output() positionChange = new EventEmitter<{ x: number; y: number }>();
  @Output() dirty = new EventEmitter<void>();
  @Output() newRequested = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();
  @Output() zoomChange = new EventEmitter<number>();

  private readonly tools = inject(ToolService);
  private readonly colors = inject(ColorsService);

  hasDocument = false;
  readonly zoom = signal(1);

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private strokeSecondary = false;
  private nativeWidth = 320;
  private nativeHeight = 240;

  private last: { x: number; y: number } | null = null;
  private selection: Rect | null = null;
  private dragSelection: Rect | null = null;
  readonly toolPreview = signal<{ x: number; y: number; size: number; square: boolean } | null>(
    null,
  );

  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private pinching = false;
  private pinchDistance = 0;

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
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
  }

  newDocument(width: number, height: number): void {
    this.setupCanvas(width, height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    this.hasDocument = true;
  }

  loadImage(dataUrl: string, width: number, height: number): void {
    const img = new Image();
    img.onload = () => {
      this.setupCanvas(width, height);
      this.ctx.drawImage(img, 0, 0, width, height);
      this.hasDocument = true;
    };
    img.src = dataUrl;
  }

  exportPngDataUrl(): string {
    return this.canvasRef.nativeElement.toDataURL('image/png');
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
    this.selection = null;
    this.dragSelection = null;
  }

  protected tool(): string {
    return this.tools.activeTool();
  }

  protected selPx(): Rect | null {
    const r = this.dragSelection ?? this.selection;
    if (!r || r.w < 1 || r.h < 1) {
      return null;
    }
    const z = this.zoom();
    return { x: r.x * z, y: r.y * z, w: r.w * z, h: r.h * z };
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
    if (tool === 'selectRect') {
      if (event.button !== 0) {
        return;
      }
      this.selection = null;
      this.dragSelection = { x: pos.x, y: pos.y, w: 0, h: 0 };
      return;
    }
    this.strokeSecondary = event.button === 2;
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
    this.updateToolPreview(pos);
    if (this.dragSelection) {
      const a = this.dragSelection;
      this.dragSelection = {
        x: Math.min(a.x, pos.x),
        y: Math.min(a.y, pos.y),
        w: Math.abs(pos.x - a.x),
        h: Math.abs(pos.y - a.y),
      };
      return;
    }
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
    this.drawing = false;
    this.last = null;
    if (this.dragSelection) {
      const r = this.dragSelection;
      this.dragSelection = null;
      this.selection = r.w < 2 && r.h < 2 ? null : r;
    }
  }

  protected onPointerLeave(): void {
    this.drawing = false;
    this.last = null;
    this.toolPreview.set(null);
  }

  private updateToolPreview(pos: { x: number; y: number }): void {
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

  private pickColor(pos: { x: number; y: number }, secondary: boolean): void {
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
    if (this.tool() === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.stampCircle(x, y);
      this.ctx.globalCompositeOperation = 'source-over';
    } else if (this.tool() === 'brush') {
      this.stampCircle(x, y);
    } else {
      this.stampSquare(x, y);
    }
  }

  private stampSquare(x: number, y: number): void {
    const s = Math.max(1, Math.round(this.tools.brushSize()));
    this.ctx.fillStyle = this.strokeColor();
    this.ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  }

  private stampCircle(x: number, y: number): void {
    const size = Math.max(1, this.tools.brushSize());
    const radius = size / 2;
    const hardness = this.tools.brushHardness();
    const isEraser = this.tool() === 'eraser';
    const inner = (radius * hardness) / 100;
    if (hardness >= 100) {
      this.ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : this.strokeColor();
    } else {
      const gradient = this.ctx.createRadialGradient(x, y, inner, x, y, radius);
      gradient.addColorStop(0, isEraser ? 'rgba(0,0,0,1)' : this.strokeColor());
      gradient.addColorStop(1, isEraser ? 'rgba(0,0,0,0)' : this.strokeColorFaded());
      this.ctx.fillStyle = gradient;
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
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
    wrap.style.width = `${this.nativeWidth * this.zoom()}px`;
    wrap.style.height = `${this.nativeHeight * this.zoom()}px`;
  }

  private setupCanvas(width: number, height: number): void {
    this.nativeWidth = width;
    this.nativeHeight = height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.selection = null;
    this.dragSelection = null;
    this.toolPreview.set(null);
    this.zoom.set(1);
    this.applyZoom();
    this.zoomChange.emit(1);
  }

  private setupTransparentCanvas(width: number, height: number): void {
    this.nativeWidth = width;
    this.nativeHeight = height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
  }

  private toCanvasPos(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / this.zoom(),
      y: (event.clientY - rect.top) / this.zoom(),
    };
  }
}
