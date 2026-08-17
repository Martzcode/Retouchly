import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ColorsService {
  private readonly _primary = signal('#000000');
  private readonly _secondary = signal('#ffffff');
  private readonly _primaryAlpha = signal(255);
  private readonly _secondaryAlpha = signal(255);
  private readonly _recent = signal<string[]>([]);
  private _dragging = false;

  readonly primary = this._primary.asReadonly();
  readonly secondary = this._secondary.asReadonly();
  readonly primaryAlpha = this._primaryAlpha.asReadonly();
  readonly secondaryAlpha = this._secondaryAlpha.asReadonly();
  readonly recent = this._recent.asReadonly();

  setPrimary(hex: string): void {
    this._primary.set(normalizeHex(hex));
    if (!this._dragging) {
      this.pushRecent(hex);
    }
  }

  setSecondary(hex: string): void {
    this._secondary.set(normalizeHex(hex));
    if (!this._dragging) {
      this.pushRecent(hex);
    }
  }

  setPrimaryFromRgb(r: number, g: number, b: number): void {
    this.setPrimary(rgbToHex(r, g, b));
  }

  setSecondaryFromRgb(r: number, g: number, b: number): void {
    this.setSecondary(rgbToHex(r, g, b));
  }

  setPrimaryFromRgba(r: number, g: number, b: number, a: number): void {
    this.setPrimaryFromRgb(r, g, b);
    this._primaryAlpha.set(clampChannel(a));
  }

  setSecondaryFromRgba(r: number, g: number, b: number, a: number): void {
    this.setSecondaryFromRgb(r, g, b);
    this._secondaryAlpha.set(clampChannel(a));
  }

  setPrimaryFromHsv(h: number, s: number, v: number): void {
    const { r, g, b } = hsvToRgb(h, s, v);
    this.setPrimaryFromRgb(r, g, b);
  }

  setSecondaryFromHsv(h: number, s: number, v: number): void {
    const { r, g, b } = hsvToRgb(h, s, v);
    this.setSecondaryFromRgb(r, g, b);
  }

  setPrimaryAlpha(alpha: number): void {
    this._primaryAlpha.set(clampChannel(alpha));
  }

  setSecondaryAlpha(alpha: number): void {
    this._secondaryAlpha.set(clampChannel(alpha));
  }

  swap(): void {
    const p = this._primary();
    const s = this._secondary();
    const pa = this._primaryAlpha();
    const sa = this._secondaryAlpha();
    this._primary.set(s);
    this._secondary.set(p);
    this._primaryAlpha.set(sa);
    this._secondaryAlpha.set(pa);
  }

  primaryRgba(alpha?: number): string {
    return hexToRgba(this._primary(), alpha ?? this._primaryAlpha() / 255);
  }

  secondaryRgba(alpha?: number): string {
    return hexToRgba(this._secondary(), alpha ?? this._secondaryAlpha() / 255);
  }

  private pushRecent(hex: string): void {
    const normalized = normalizeHex(hex);
    const list = this._recent().filter((c) => c !== normalized);
    list.unshift(normalized);
    this._recent.set(list.slice(0, 10));
  }

  startDrag(): void {
    this._dragging = true;
  }

  endDrag(): void {
    this._dragging = false;
    this.pushRecent(this._primary());
  }
}

export function normalizeHex(hex: string): string {
  let h = (hex ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-f]{0,6}$/i.test(h)) {
    h = h.replace(/[^0-9a-f]/gi, '');
  }
  h = h.padEnd(6, '0').slice(0, 6);
  return `#${h}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clampChannel(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h: Math.round(h * 100) / 100, s: Math.round(s * 100) / 100, v: Math.round(v * 100) / 100 };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;
  const hh = ((h % 360) + 360) % 360;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vn - c;
  let rgb: [number, number, number];
  if (hh < 60) rgb = [c, x, 0];
  else if (hh < 120) rgb = [x, c, 0];
  else if (hh < 180) rgb = [0, c, x];
  else if (hh < 240) rgb = [0, x, c];
  else if (hh < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
