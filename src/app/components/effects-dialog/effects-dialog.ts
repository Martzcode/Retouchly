import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { EffectsService } from '../../services/effects.service';
import { I18nService } from '../../services/i18n.service';
import { LayerService } from '../../services/layer.service';

export type EffectType =
  | 'boxBlur'
  | 'motionBlur'
  | 'pixelate'
  | 'sharpen'
  | 'emboss'
  | 'edgeDetect'
  | 'noise'
  | 'vignette';

export interface EffectParams {
  blurRadius: number;
  motionLength: number;
  motionAngle: number;
  pixelSize: number;
  noiseAmount: number;
  vignetteStrength: number;
}

const DEFAULTS: EffectParams = {
  blurRadius: 3,
  motionLength: 5,
  motionAngle: 0,
  pixelSize: 4,
  noiseAmount: 25,
  vignetteStrength: 0.5,
};

@Component({
  selector: 'app-effects-dialog',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './effects-dialog.html',
  styleUrl: './effects-dialog.css',
})
export class EffectsDialogComponent implements OnChanges {
  @Input() type: EffectType = 'boxBlur';
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() previewChange = new EventEmitter<void>();

  private readonly fx = inject(EffectsService);
  private readonly layers = inject(LayerService);
  protected readonly i18n = inject(I18nService);

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
      case 'boxBlur':
        this.fx.boxBlur(this.params.blurRadius);
        break;
      case 'motionBlur':
        this.fx.motionBlur(this.params.motionLength, this.params.motionAngle);
        break;
      case 'pixelate':
        this.fx.pixelate(this.params.pixelSize);
        break;
      case 'sharpen':
        this.fx.sharpen();
        break;
      case 'emboss':
        this.fx.emboss();
        break;
      case 'edgeDetect':
        this.fx.edgeDetect();
        break;
      case 'noise':
        this.fx.noise(this.params.noiseAmount);
        break;
      case 'vignette':
        this.fx.vignette(this.params.vignetteStrength);
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
