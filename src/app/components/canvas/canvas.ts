import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-canvas',
  imports: [],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class CanvasComponent implements OnDestroy {
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() positionChange = new EventEmitter<{ x: number; y: number }>();
  @Output() dirty = new EventEmitter<void>();
  @Output() newRequested = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();
  @Output() zoomChange = new EventEmitter<number>();

  hasDocument = false;
  readonly zoom = signal(1);

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private nativeWidth = 320;
  private nativeHeight = 240;

  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private pinching = false;
  private pinchDistance = 0;

  private readonly brushSize = 2;

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
    this.drawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.brushSize;
    this.ctx.strokeStyle = '#111111';
    this.ctx.lineTo(pos.x + 0.01, pos.y + 0.01);
    this.ctx.stroke();
    this.positionChange.emit({ x: Math.floor(pos.x), y: Math.floor(pos.y) });
    this.dirty.emit();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.hasDocument) {
      return;
    }
    const pos = this.toCanvasPos(event);
    this.positionChange.emit({ x: Math.floor(pos.x), y: Math.floor(pos.y) });
    if (this.pinching) {
      if (this.activePointers.has(event.pointerId)) {
        this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.updatePinchZoom();
      }
      return;
    }
    if (!this.drawing) {
      return;
    }
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  protected onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.pinching = false;
      this.pinchDistance = 0;
    }
    this.drawing = false;
  }

  protected onPointerLeave(): void {
    this.drawing = false;
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
    const canvas = this.canvasRef.nativeElement;
    canvas.style.width = `${this.nativeWidth * this.zoom()}px`;
    canvas.style.height = `${this.nativeHeight * this.zoom()}px`;
  }

  private setupCanvas(width: number, height: number): void {
    this.nativeWidth = width;
    this.nativeHeight = height;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
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
