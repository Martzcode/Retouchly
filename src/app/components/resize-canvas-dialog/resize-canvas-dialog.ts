import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayerService } from '../../services/layer.service';

@Component({
  selector: 'app-resize-canvas-dialog',
  imports: [FormsModule],
  templateUrl: './resize-canvas-dialog.html',
  styleUrl: './resize-canvas-dialog.css',
})
export class ResizeCanvasDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() confirmed = new EventEmitter<{ width: number; height: number; anchorX: number; anchorY: number }>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly layers = inject(LayerService);

  width = 0;
  height = 0;
  anchorX = 0.5;
  anchorY = 0.5;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.width = this.layers.width;
      this.height = this.layers.height;
      this.anchorX = 0.5;
      this.anchorY = 0.5;
    }
  }

  setAnchor(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
  }

  confirm(): void {
    if (this.width >= 1 && this.height >= 1) {
      this.confirmed.emit({
        width: this.width,
        height: this.height,
        anchorX: this.anchorX,
        anchorY: this.anchorY,
      });
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
