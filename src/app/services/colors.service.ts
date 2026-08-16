import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ColorsService {
  private readonly _primary = signal('#000000');
  private readonly _secondary = signal('#ffffff');

  readonly primary = this._primary.asReadonly();
  readonly secondary = this._secondary.asReadonly();

  setPrimary(hex: string): void {
    this._primary.set(hex);
  }

  setSecondary(hex: string): void {
    this._secondary.set(hex);
  }

  setPrimaryFromRgb(r: number, g: number, b: number): void {
    this._primary.set(rgbToHex(r, g, b));
  }

  primaryRgba(alpha: number): string {
    return hexToRgba(this._primary(), alpha);
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
