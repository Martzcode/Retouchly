import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';

interface Preset {
  name: string;
  width: number;
  height: number;
  unit: Unit;
}

type Unit = 'px' | 'in' | 'cm' | 'mm';

const PX_PER: Record<Unit, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

const PRESETS: Preset[] = [
  { name: 'HD (1280×720)', width: 1280, height: 720, unit: 'px' },
  { name: 'Full HD (1920×1080)', width: 1920, height: 1080, unit: 'px' },
  { name: '4K UHD (3840×2160)', width: 3840, height: 2160, unit: 'px' },
  { name: 'Photo 4×6', width: 4, height: 6, unit: 'in' },
  { name: 'Photo 5×7', width: 5, height: 7, unit: 'in' },
  { name: 'Photo 8×10', width: 8, height: 10, unit: 'in' },
  { name: 'A4', width: 21, height: 29.7, unit: 'cm' },
  { name: 'Carré (1080×1080)', width: 1080, height: 1080, unit: 'px' },
  { name: 'Instagram Story (1080×1920)', width: 1080, height: 1920, unit: 'px' },
];

@Component({
  selector: 'app-new-image-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-image-dialog.html',
  styleUrl: './new-image-dialog.css',
})
export class NewImageDialogComponent {
  protected readonly i18n = inject(I18nService);

  @Output() confirm = new EventEmitter<{ width: number; height: number }>();
  @Output() cancel = new EventEmitter<void>();

  readonly presets = PRESETS;
  readonly units: Unit[] = ['px', 'in', 'cm', 'mm'];

  presetLabel(p: Preset): string {
    if (p.name === 'Carré (1080×1080)') {
      return this.i18n.t('newImage.presetSquare');
    }
    return p.name;
  }

  readonly selectedPreset = signal<string>(PRESETS[1].name);
  readonly unit = signal<Unit>('px');
  readonly customWidth = signal<number>(1920);
  readonly customHeight = signal<number>(1080);
  readonly isCustom = signal(false);

  constructor() {
    this.applyPreset(PRESETS[1]);
  }

  get displayWidth(): number {
    return this.unit() === 'px'
      ? this.customWidth()
      : Math.round((this.customWidth() / PX_PER[this.unit()]) * 100) / 100;
  }

  get displayHeight(): number {
    return this.unit() === 'px'
      ? this.customHeight()
      : Math.round((this.customHeight() / PX_PER[this.unit()]) * 100) / 100;
  }

  pxWidth(): string {
    return Math.round(this.customWidth() * PX_PER[this.unit()]).toLocaleString();
  }

  pxHeight(): string {
    return Math.round(this.customHeight() * PX_PER[this.unit()]).toLocaleString();
  }

  selectPreset(name: string): void {
    const p = PRESETS.find((pr) => pr.name === name);
    if (p) {
      this.applyPreset(p);
    }
  }

  private applyPreset(p: Preset): void {
    this.isCustom.set(false);
    this.selectedPreset.set(p.name);
    this.unit.set(p.unit);
    this.customWidth.set(p.width);
    this.customHeight.set(p.height);
  }

  selectCustom(): void {
    this.isCustom.set(true);
    this.selectedPreset.set('');
  }

  onWidthInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (this.unit() === 'px') {
      this.customWidth.set(Math.max(1, Math.round(val)));
    } else {
      this.customWidth.set(Math.max(0.1, val));
    }
  }

  onHeightInput(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (this.unit() === 'px') {
      this.customHeight.set(Math.max(1, Math.round(val)));
    } else {
      this.customHeight.set(Math.max(0.1, val));
    }
  }

  onUnitChange(event: Event): void {
    const newUnit = (event.target as HTMLSelectElement).value as Unit;
    const oldUnit = this.unit();
    if (newUnit === oldUnit) {
      return;
    }
    const pxW = this.customWidth() * PX_PER[oldUnit];
    const pxH = this.customHeight() * PX_PER[oldUnit];
    this.customWidth.set(Math.round((pxW / PX_PER[newUnit]) * 100) / 100);
    this.customHeight.set(Math.round((pxH / PX_PER[newUnit]) * 100) / 100);
    this.unit.set(newUnit);
  }

  onConfirm(): void {
    const pxW = this.customWidth() * PX_PER[this.unit()];
    const pxH = this.customHeight() * PX_PER[this.unit()];
    this.confirm.emit({ width: Math.round(pxW), height: Math.round(pxH) });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onCancel();
    }
  }
}
