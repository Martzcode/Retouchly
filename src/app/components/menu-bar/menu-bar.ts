import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommandEvent } from '../../types';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

const DROPDOWN_MIN_WIDTH = 230;

@Component({
  selector: 'app-menu-bar',
  imports: [],
  templateUrl: './menu-bar.html',
  styleUrl: './menu-bar.css',
})
export class MenuBarComponent {
  @Output() command = new EventEmitter<CommandEvent>();

  protected readonly openIndex = signal<number | null>(null);
  protected readonly dropdownStyle = signal<{ top: string; left: string } | null>(null);

  protected readonly menus: Menu[] = [
    {
      label: 'Fichier',
      items: [
        { id: 'new', label: 'Nouveau', shortcut: 'Ctrl+N' },
        { id: 'open', label: 'Ouvrir…', shortcut: 'Ctrl+O' },
        { id: 'sep-1', label: '-' },
        { id: 'save', label: 'Enregistrer', shortcut: 'Ctrl+S' },
        { id: 'saveAs', label: 'Enregistrer sous…', shortcut: 'Ctrl+Maj+S' },
        { id: 'sep-2', label: '-' },
        { id: 'quit', label: 'Quitter', shortcut: 'Ctrl+Q' },
      ],
    },
    {
      label: 'Édition',
      items: [
        { id: 'undo', label: 'Annuler', shortcut: 'Ctrl+Z', disabled: true },
        { id: 'redo', label: 'Rétablir', shortcut: 'Ctrl+Y', disabled: true },
        { id: 'sep-1', label: '-' },
        { id: 'cut', label: 'Couper', shortcut: 'Ctrl+X', disabled: true },
        { id: 'copy', label: 'Copier', shortcut: 'Ctrl+C', disabled: true },
        { id: 'paste', label: 'Coller', shortcut: 'Ctrl+V', disabled: true },
      ],
    },
    {
      label: 'Affichage',
      items: [
        { id: 'zoomIn', label: 'Zoom avant', shortcut: 'Ctrl+Molette', disabled: true },
        { id: 'zoomOut', label: 'Zoom arrière', shortcut: 'Ctrl+Molette', disabled: true },
        { id: 'zoom100', label: 'Zoom 100%', disabled: true },
      ],
    },
    {
      label: 'Image',
      items: [{ id: 'resize', label: 'Redimensionner…', disabled: true }],
    },
    {
      label: 'Calques',
      items: [{ id: 'addLayer', label: 'Nouveau calque', shortcut: 'Ctrl+Maj+N', disabled: true }],
    },
    {
      label: 'Ajustements',
      items: [{ id: 'brightness', label: 'Luminosité / Contraste…', disabled: true }],
    },
    {
      label: 'Effets',
      items: [{ id: 'blur', label: 'Flou gaussien…', disabled: true }],
    },
    {
      label: 'Fenêtre',
      items: [{ id: 'toolbar', label: 'Barre d’outils', disabled: true }],
    },
    {
      label: 'Aide',
      items: [{ id: 'about', label: 'À propos de Retouchly' }],
    },
  ];

  protected toggleMenu(index: number, event: MouseEvent): void {
    if (this.openIndex() === index) {
      this.close();
      return;
    }
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - DROPDOWN_MIN_WIDTH - 8);
    this.openIndex.set(index);
    this.dropdownStyle.set({
      top: `${rect.bottom}px`,
      left: `${Math.max(left, 8)}px`,
    });
  }

  protected select(item: MenuItem): void {
    if (item.disabled || item.label === '-') {
      return;
    }
    this.command.emit({ id: item.id });
    this.close();
  }

  protected close(): void {
    this.openIndex.set(null);
    this.dropdownStyle.set(null);
  }
}
