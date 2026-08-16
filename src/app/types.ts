export interface OpenImageResult {
  path: string;
  width: number;
  height: number;
  dataUrl: string;
}

export interface DocumentInfo {
  width: number;
  height: number;
  path: string | null;
  fileName: string | null;
  dirty: boolean;
}

export interface CommandEvent {
  id: string;
}

export type Tool = 'pencil' | 'brush' | 'eraser' | 'pipette' | 'selectRect';
