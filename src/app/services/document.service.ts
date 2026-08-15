import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, OpenImageResult } from '../types';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly _document = signal<DocumentInfo>({
    width: 0,
    height: 0,
    path: null,
    fileName: null,
    dirty: false,
  });

  private readonly _error = signal<string | null>(null);

  readonly document = this._document.asReadonly();
  readonly error = this._error.asReadonly();

  async openImage(): Promise<OpenImageResult | null> {
    const res = await invoke<OpenImageResult | null>('open_image');
    if (!res) {
      return null;
    }
    this._document.set({
      width: res.width,
      height: res.height,
      path: res.path,
      fileName: this.fileNameFrom(res.path),
      dirty: false,
    });
    return res;
  }

  async save(dataUrl: string, forceDialog: boolean): Promise<void> {
    const current = this._document();
    const savedPath = await invoke<string | null>('save_image', {
      dataUrl,
      defaultName: current.fileName ?? 'image.png',
      path: forceDialog ? null : current.path,
    });
    if (savedPath) {
      this._document.update((d) => ({
        ...d,
        path: savedPath,
        fileName: this.fileNameFrom(savedPath),
        dirty: false,
      }));
    }
  }

  newDocument(width: number, height: number): void {
    this._document.set({
      width,
      height,
      path: null,
      fileName: null,
      dirty: false,
    });
  }

  markDirty(): void {
    this._document.update((d) => (d.dirty ? d : { ...d, dirty: true }));
  }

  setError(message: string | null): void {
    this._error.set(message);
  }

  private fileNameFrom(path: string): string {
    return path.split(/[\\/]/).pop() ?? 'image.png';
  }
}
