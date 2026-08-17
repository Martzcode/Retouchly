import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AdjustmentsService } from '../../services/adjustments.service';
import { LayerService } from '../../services/layer.service';

export type AdjustmentType =
  | 'brightnessContrast'
  | 'hueSaturationLightness'
  | 'posterize'
  | 'threshold';

export interface AdjustmentParams {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  lightness: number;
  posterizeLevels: number;
  thresholdCutoff: number;
}

const DEFAULTS: AdjustmentParams = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturation: 1,
  lightness: 1,
  posterizeLevels: 4,
  thresholdCutoff: 128,
};

@Component({
  selector: 'app-adjustment-dialog',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './adjustment-dialog.html',
  styleUrl: './adjustment-dialog.css',
})
export class AdjustmentDialogComponent implements OnChanges {
  @Input() type: AdjustmentType = 'brightnessContrast';
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() previewChange = new EventEmitter<void>();

  private readonly adj = inject(AdjustmentsService);
  private readonly layers = inject(LayerService);

  params = { ...DEFAULTS };

  private backupData: ImageData | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.params = { ...DEFAULTS };
      this.backup();
      this.preview();
      this.previewChange.emit();
    }
  }

  private backup(): void {
    const layer = this.layers.getActiveLayer();
    if (!layer) {
      return;
    }
    const w = this.layers.width;
    const h = this.layers.height;
    if (w === 0 || h === 0) {
      return;
    }
    this.backupData = layer.ctx.getImageData(0, 0, w, h);
  }

  private restore(): void {
    if (!this.backupData) {
      return;
    }
    const layer = this.layers.getActiveLayer();
    if (!layer) {
      return;
    }
    layer.ctx.putImageData(this.backupData, 0, 0);
  }

  private preview(): void {
    this.restore();
    switch (this.type) {
      case 'brightnessContrast':
        this.adj.brightnessContrast(this.params.brightness, this.params.contrast);
        break;
      case 'hueSaturationLightness':
        this.adj.hueSaturationLightness(
          this.params.hue,
          this.params.saturation,
          this.params.lightness,
        );
        break;
      case 'posterize':
        this.adj.posterize(this.params.posterizeLevels);
        break;
      case 'threshold':
        this.adj.threshold(this.params.thresholdCutoff);
        break;
    }
  }

  onInput(): void {
    this.preview();
    this.previewChange.emit();
  }

  reset(): void {
    this.params = { ...DEFAULTS };
    this.preview();
    this.previewChange.emit();
  }

  confirm(): void {
    this.backupData = null;
    this.closed.emit();
  }

  cancel(): void {
    this.restore();
    this.backupData = null;
    this.closed.emit();
  }
}
