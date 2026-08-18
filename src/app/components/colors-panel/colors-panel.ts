import { Component, inject, signal } from '@angular/core';
import { ColorsService, hexToRgb, hexToRgba, rgbToHex, rgbToHsv, normalizeHex } from '../../services/colors.service';
import { I18nService } from '../../services/i18n.service';

type Target = 'primary' | 'secondary';

@Component({
  selector: 'app-colors-panel',
  standalone: true,
  templateUrl: './colors-panel.html',
  styleUrl: './colors-panel.css',
})
export class ColorsPanelComponent {
  protected readonly i18n = inject(I18nService);
  private readonly colors = inject(ColorsService);

  readonly recent = this.colors.recent;
  readonly primary = this.colors.primary;
  readonly secondary = this.colors.secondary;
  readonly primaryCss = () => hexToRgba(this.colors.primary(), this.colors.primaryAlpha() / 255);
  readonly secondaryCss = () => hexToRgba(this.colors.secondary(), this.colors.secondaryAlpha() / 255);

  private readonly _target = signal<Target>('primary');
  readonly target = this._target.asReadonly();

  private pickDrag: 'sv' | 'hue' | null = null;

  targetHex(): string {
    return this._target() === 'primary' ? this.colors.primary() : this.colors.secondary();
  }

  targetAlpha(): number {
    return this._target() === 'primary' ? this.colors.primaryAlpha() : this.colors.secondaryAlpha();
  }

  targetHsv(): { h: number; s: number; v: number } {
    return rgbToHsv(
      hexToRgb(this.targetHex()).r,
      hexToRgb(this.targetHex()).g,
      hexToRgb(this.targetHex()).b,
    );
  }

  rgb(): { r: number; g: number; b: number } {
    return hexToRgb(this.targetHex());
  }

  hsv(): { h: number; s: number; v: number } {
    return this.targetHsv();
  }

  alphaPct(): number {
    return Math.round(this.targetAlpha() / 2.55);
  }

  svBackground(): string {
    return `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${this.targetHsv().h}, 100%, 50%)`;
  }

  svS(): number {
    return this.targetHsv().s;
  }

  svV(): number {
    return 100 - this.targetHsv().v;
  }

  huePos(): number {
    return (this.targetHsv().h / 360) * 100;
  }

  setTarget(t: Target): void {
    this._target.set(t);
  }

  swap(): void {
    this.colors.swap();
  }

  useRecent(hex: string): void {
    this._target.set('primary');
    this.colors.setPrimary(hex);
  }

  prevent(event: Event): void {
    event.preventDefault();
  }

  startSv(event: PointerEvent): void {
    event.preventDefault();
    this.pickDrag = 'sv';
    this.colors.startDrag();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.applySv(event);
  }

  moveSv(event: PointerEvent): void {
    if (this.pickDrag === 'sv') this.applySv(event);
  }

  startHue(event: PointerEvent): void {
    event.preventDefault();
    this.pickDrag = 'hue';
    this.colors.startDrag();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.applyHue(event);
  }

  moveHue(event: PointerEvent): void {
    if (this.pickDrag === 'hue') this.applyHue(event);
  }

  endPick(): void {
    this.pickDrag = null;
    this.colors.endDrag();
  }

  onAlpha(event: Event): void {
    const pct = Number((event.target as HTMLInputElement).value);
    const alpha = Math.round(pct * 2.55);
    if (this._target() === 'primary') this.colors.setPrimaryAlpha(alpha);
    else this.colors.setSecondaryAlpha(alpha);
  }

  onHex(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const h = normalizeHex(value);
    if (/^[0-9a-f]{3}$/i.test(value.trim().replace(/^#/, '')) || /^[0-9a-f]{6}$/i.test(value.trim().replace(/^#/, ''))) {
      this.setTargetHex(h);
    }
  }

  onRgb(event: Event, channel: number): void {
    const [r, g, b] = [this.rgb().r, this.rgb().g, this.rgb().b];
    const value = Number((event.target as HTMLInputElement).value);
    const arr = [r, g, b];
    arr[channel] = clamp(value, 0, 255);
    this.setTargetHex(rgbToHex(arr[0], arr[1], arr[2]));
  }

  onHsv(event: Event, channel: number): void {
    const { h, s, v } = this.targetHsv();
    const value = Number((event.target as HTMLInputElement).value);
    const arr = [h, s, v];
    arr[channel] = clamp(value, channel === 0 ? 0 : 0, channel === 0 ? 360 : 100);
    this.setTargetHsv(arr[0], arr[1], arr[2]);
  }

  private setTargetHex(hex: string): void {
    if (this._target() === 'primary') this.colors.setPrimary(hex);
    else this.colors.setSecondary(hex);
  }

  private setTargetHsv(h: number, s: number, v: number): void {
    if (this._target() === 'primary') this.colors.setPrimaryFromHsv(h, s, v);
    else this.colors.setSecondaryFromHsv(h, s, v);
  }

  private applySv(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const s = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = 100 - clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    const { h } = this.targetHsv();
    this.setTargetHsv(h, s, v);
  }

  private applyHue(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const h = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 360);
    const { s, v } = this.targetHsv();
    this.setTargetHsv(h, s, v);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
