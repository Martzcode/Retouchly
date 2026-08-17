import { Injectable, inject } from '@angular/core';
import { LayerService } from './layer.service';

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

@Injectable({ providedIn: 'root' })
export class AdjustmentsService {
  private readonly layers = inject(LayerService);

  private getActiveImageData(): ImageData | null {
    const layer = this.layers.getActiveLayer();
    if (!layer) {
      return null;
    }
    const w = this.layers.width;
    const h = this.layers.height;
    if (w === 0 || h === 0) {
      return null;
    }
    return layer.ctx.getImageData(0, 0, w, h);
  }

  private putImageData(data: ImageData): void {
    const layer = this.layers.getActiveLayer();
    if (!layer) {
      return;
    }
    layer.ctx.putImageData(data, 0, 0);
  }

  invert(): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    this.putImageData(img);
  }

  desaturate(): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
    this.putImageData(img);
  }

  sepia(): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      d[i] = clamp(Math.round(r * 0.393 + g * 0.769 + b * 0.189));
      d[i + 1] = clamp(Math.round(r * 0.349 + g * 0.686 + b * 0.168));
      d[i + 2] = clamp(Math.round(r * 0.272 + g * 0.534 + b * 0.131));
    }
    this.putImageData(img);
  }

  brightnessContrast(brightness: number, contrast: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = d[i + c] + brightness;
        v = factor * (v - 128) + 128;
        d[i + c] = clamp(Math.round(v));
      }
    }
    this.putImageData(img);
  }

  hueSaturationLightness(
    hueShift: number,
    satMul: number,
    lightMul: number,
  ): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      h = (h + hueShift + 360) % 360;
      s = Math.max(0, Math.min(1, s * satMul));
      l = Math.max(0, Math.min(1, l * lightMul));
      const [r, g, b] = hslToRgb(h, s, l);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    this.putImageData(img);
  }

  posterize(levels: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    const n = Math.max(2, Math.min(256, levels));
    const step = 255 / (n - 1);
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        d[i + c] = clamp(Math.round(Math.round(d[i + c] / step) * step));
      }
    }
    this.putImageData(img);
  }

  threshold(cutoff: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = gray >= cutoff ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    }
    this.putImageData(img);
  }
}
