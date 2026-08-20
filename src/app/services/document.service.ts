import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { DocumentInfo, OpenDocumentResult } from '../types';

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

  async openDocument(): Promise<OpenDocumentResult | null> {
    const res = await invoke<OpenDocumentResult | null>('open_document');
    if (!res) {
      return null;
    }
    this._document.set({
      width: res.kind === 'image' ? res.width : 0,
      height: res.kind === 'image' ? res.height : 0,
      path: res.path,
      fileName: this.fileNameFrom(res.path),
      dirty: false,
    });
    return res;
  }

  async saveProject(data: string, forceDialog: boolean): Promise<boolean> {
    const current = this._document();
    const isProjectPath = current.path?.toLowerCase().endsWith('.rtly') ?? false;
    const savedPath = await invoke<string | null>('save_project', {
      data,
      defaultName: this.projectDefaultName(current.fileName),
      path: forceDialog || !isProjectPath ? null : current.path,
    });
    if (savedPath) {
      this._document.update((d) => ({
        ...d,
        path: savedPath,
        fileName: this.fileNameFrom(savedPath),
        dirty: false,
      }));
      return true;
    }
    return false;
  }

  async save(dataUrl: string, forceDialog: boolean, updateDocument = true, format: 'png' | 'jpg' = 'png'): Promise<void> {
    const current = this._document();
    const savedPath = await invoke<string | null>('save_image', {
      dataUrl,
      defaultName: this.imageDefaultName(current.fileName, format),
      path: forceDialog ? null : current.path,
      format,
    });
    if (savedPath && updateDocument) {
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

  reset(): void {
    this._document.set({
      width: 0,
      height: 0,
      path: null,
      fileName: null,
      dirty: false,
    });
  }

  markDirty(): void {
    this._document.update((d) => (d.dirty ? d : { ...d, dirty: true }));
  }

  setSize(width: number, height: number): void {
    this._document.update((d) => ({ ...d, width, height }));
  }

  setError(message: string | null): void {
    this._error.set(message);
  }

  private fileNameFrom(path: string): string {
    return path.split(/[\\/]/).pop() ?? 'image.png';
  }

  private projectDefaultName(fileName: string | null): string {
    if (!fileName) {
      return 'projet.rtly';
    }
    return fileName.replace(/\.[^.]+$/, '') + '.rtly';
  }

  private imageDefaultName(fileName: string | null, format: 'png' | 'jpg'): string {
    const base = fileName ? fileName.replace(/\.[^.]+$/, '') : 'image';
    return `${base}.${format}`;
  }
}
