import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayerService } from '../../services/layer.service';

@Component({
  selector: 'app-resize-image-dialog',
  imports: [FormsModule],
  templateUrl: './resize-image-dialog.html',
  styleUrl: './resize-image-dialog.css',
})
export class ResizeImageDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() confirmed = new EventEmitter<{ width: number; height: number }>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly layers = inject(LayerService);

  width = 0;
  height = 0;
  lockRatio = true;
  private aspectRatio = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.width = this.layers.width;
      this.height = this.layers.height;
      this.aspectRatio = this.width / this.height;
      this.lockRatio = true;
    }
  }

  onWidthChange(): void {
    if (this.lockRatio && this.aspectRatio > 0) {
      this.height = Math.max(1, Math.round(this.width / this.aspectRatio));
    }
  }

  onHeightChange(): void {
    if (this.lockRatio && this.aspectRatio > 0) {
      this.width = Math.max(1, Math.round(this.height * this.aspectRatio));
    }
  }

  confirm(): void {
    if (this.width >= 1 && this.height >= 1) {
      this.confirmed.emit({ width: this.width, height: this.height });
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
