import { Injectable, inject } from '@angular/core';
import { LayerService } from './layer.service';

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

@Injectable({ providedIn: 'root' })
export class EffectsService {
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

  private getPixels(img: ImageData): Uint8ClampedArray {
    return new Uint8ClampedArray(img.data);
  }

  /** Box blur (approximation gaussian rapide) */
  boxBlur(radius: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const w = img.width;
    const h = img.height;
    const src = this.getPixels(img);
    const dst = img.data;
    const r = Math.max(1, Math.round(radius));

    // Horizontal pass
    const tmp = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
        let count = 0;
        for (let kx = -r; kx <= r; kx++) {
          const sx = Math.min(w - 1, Math.max(0, x + kx));
          const idx = (y * w + sx) * 4;
          r0 += src[idx];
          g0 += src[idx + 1];
          b0 += src[idx + 2];
          a0 += src[idx + 3];
          count++;
        }
        const idx = (y * w + x) * 4;
        tmp[idx] = r0 / count;
        tmp[idx + 1] = g0 / count;
        tmp[idx + 2] = b0 / count;
        tmp[idx + 3] = a0 / count;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
        let count = 0;
        for (let ky = -r; ky <= r; ky++) {
          const sy = Math.min(h - 1, Math.max(0, y + ky));
          const idx = (sy * w + x) * 4;
          r0 += tmp[idx];
          g0 += tmp[idx + 1];
          b0 += tmp[idx + 2];
          a0 += tmp[idx + 3];
          count++;
        }
        const idx = (y * w + x) * 4;
        dst[idx] = r0 / count;
        dst[idx + 1] = g0 / count;
        dst[idx + 2] = b0 / count;
        dst[idx + 3] = a0 / count;
      }
    }
    this.putImageData(img);
  }

  /** Flou de mouvement directionnel */
  motionBlur(length: number, angleDeg: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const w = img.width;
    const h = img.height;
    const src = this.getPixels(img);
    const dst = img.data;
    const len = Math.max(1, Math.round(length));
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
        let count = 0;
        for (let k = -len; k <= len; k++) {
          const sx = Math.round(x + dx * k);
          const sy = Math.round(y + dy * k);
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const idx = (sy * w + sx) * 4;
            r0 += src[idx];
            g0 += src[idx + 1];
            b0 += src[idx + 2];
            a0 += src[idx + 3];
            count++;
          }
        }
        if (count > 0) {
          const idx = (y * w + x) * 4;
          dst[idx] = r0 / count;
          dst[idx + 1] = g0 / count;
          dst[idx + 2] = b0 / count;
          dst[idx + 3] = a0 / count;
        }
      }
    }
    this.putImageData(img);
  }

  /** Pixelate / mosaïque */
  pixelate(blockSize: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const w = img.width;
    const h = img.height;
    const d = img.data;
    const bs = Math.max(2, Math.round(blockSize));

    for (let by = 0; by < h; by += bs) {
      for (let bx = 0; bx < w; bx += bs) {
        let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
        let count = 0;
        for (let dy = 0; dy < bs && by + dy < h; dy++) {
          for (let dx = 0; dx < bs && bx + dx < w; dx++) {
            const idx = ((by + dy) * w + (bx + dx)) * 4;
            r0 += d[idx];
            g0 += d[idx + 1];
            b0 += d[idx + 2];
            a0 += d[idx + 3];
            count++;
          }
        }
        const r = r0 / count;
        const g = g0 / count;
        const b = b0 / count;
        const a = a0 / count;
        for (let dy = 0; dy < bs && by + dy < h; dy++) {
          for (let dx = 0; dx < bs && bx + dx < w; dx++) {
            const idx = ((by + dy) * w + (bx + dx)) * 4;
            d[idx] = r;
            d[idx + 1] = g;
            d[idx + 2] = b;
            d[idx + 3] = a;
          }
        }
      }
    }
    this.putImageData(img);
  }

  /** Convolution générique (matrice carrée) */
  private convolve(kernel: number[], divisor: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const w = img.width;
    const h = img.height;
    const src = this.getPixels(img);
    const dst = img.data;
    const kSize = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(kSize / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r0 = 0, g0 = 0, b0 = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const sx = Math.min(w - 1, Math.max(0, x + kx - half));
            const sy = Math.min(h - 1, Math.max(0, y + ky - half));
            const idx = (sy * w + sx) * 4;
            const kv = kernel[ky * kSize + kx];
            r0 += src[idx] * kv;
            g0 += src[idx + 1] * kv;
            b0 += src[idx + 2] * kv;
          }
        }
        const idx = (y * w + x) * 4;
        dst[idx] = clamp(r0 / divisor);
        dst[idx + 1] = clamp(g0 / divisor);
        dst[idx + 2] = clamp(b0 / divisor);
      }
    }
    this.putImageData(img);
  }

  /** Netteté (Sharpen) */
  sharpen(): void {
    this.convolve(
      [0, -1, 0, -1, 5, -1, 0, -1, 0],
      1,
    );
  }

  /** Relief (Emboss) */
  emboss(): void {
    this.convolve(
      [-2, -1, 0, -1, 1, 1, 0, 1, 2],
      1,
    );
  }

  /** Détection de contours */
  edgeDetect(): void {
    this.convolve(
      [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      1,
    );
  }

  /** Bruit (ajout de grain) */
  noise(amount: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const d = img.data;
    const a = Math.max(0, Math.round(amount));
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 2 * a;
      d[i] = clamp(d[i] + n);
      d[i + 1] = clamp(d[i + 1] + n);
      d[i + 2] = clamp(d[i + 2] + n);
    }
    this.putImageData(img);
  }

  /** Vignette */
  vignette(strength: number): void {
    const img = this.getActiveImageData();
    if (!img) {
      return;
    }
    const w = img.width;
    const h = img.height;
    const d = img.data;
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const s = Math.max(0, Math.min(1, strength));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - dist * dist * s;
        const idx = (y * w + x) * 4;
        d[idx] = clamp(d[idx] * factor);
        d[idx + 1] = clamp(d[idx + 1] * factor);
        d[idx + 2] = clamp(d[idx + 2] * factor);
      }
    }
    this.putImageData(img);
  }
}
