import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-canvas',
  imports: [],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class CanvasComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() positionChange = new EventEmitter<{ x: number; y: number }>();
  @Output() dirty = new EventEmitter<void>();
  @Output() newRequested = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();

  hasDocument = false;
  zoom = 1;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  private readonly brushSize = 2;

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupTransparentCanvas(320, 240);
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

  protected onPointerDown(event: PointerEvent): void {
    if (!this.hasDocument) {
      return;
    }
    event.preventDefault();
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
    if (!this.drawing) {
      return;
    }
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  protected onPointerUp(): void {
    this.drawing = false;
  }

  protected onPointerLeave(): void {
    this.drawing = false;
  }

  private setupCanvas(width: number, height: number): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  private setupTransparentCanvas(width: number, height: number): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = width;
    canvas.height = height;
  }

  private toCanvasPos(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}
