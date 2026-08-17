import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
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
  @Input() undoEnabled = false;
  @Input() redoEnabled = false;
  @Input() layersEnabled = false;
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
        { id: 'undo', label: 'Annuler', shortcut: 'Ctrl+Z' },
        { id: 'redo', label: 'Rétablir', shortcut: 'Ctrl+Y' },
        { id: 'sep-1', label: '-' },
        { id: 'selectAll', label: 'Tout sélectionner', shortcut: 'Ctrl+A' },
        { id: 'deselect', label: 'Désélectionner', shortcut: 'Ctrl+Maj+A' },
        { id: 'invertSelection', label: 'Inverser la sélection', shortcut: 'Ctrl+I' },
        { id: 'sep-2', label: '-' },
        { id: 'cut', label: 'Couper', shortcut: 'Ctrl+X' },
        { id: 'copy', label: 'Copier', shortcut: 'Ctrl+C' },
        { id: 'paste', label: 'Coller', shortcut: 'Ctrl+V' },
      ],
    },
    {
      label: 'Affichage',
      items: [
        { id: 'zoomIn', label: 'Zoom avant', shortcut: 'Ctrl+Molette' },
        { id: 'zoomOut', label: 'Zoom arrière', shortcut: 'Ctrl+Molette' },
        { id: 'zoom100', label: 'Zoom 100%' },
      ],
    },
    {
      label: 'Image',
      items: [{ id: 'resize', label: 'Redimensionner…', disabled: true }],
    },
    {
      label: 'Calques',
      items: [
        { id: 'addLayer', label: 'Nouveau calque', shortcut: 'Ctrl+Maj+N' },
        { id: 'duplicateLayer', label: 'Dupliquer le calque' },
        { id: 'deleteLayer', label: 'Supprimer le calque' },
        { id: 'sep-cl-1', label: '-' },
        { id: 'mergeDown', label: 'Fusionner vers le bas', shortcut: 'Ctrl+E' },
        { id: 'flattenImage', label: "Aplatir l'image", shortcut: 'Ctrl+Maj+F' },
        { id: 'sep-cl-2', label: '-' },
        { id: 'moveLayerUp', label: 'Monter le calque' },
        { id: 'moveLayerDown', label: 'Descendre le calque' },
        { id: 'sep-cl-3', label: '-' },
        { id: 'importAsLayer', label: 'Importer une image comme calque…' },
      ],
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
    if (this.isDisabled(item) || item.label === '-') {
      return;
    }
    this.command.emit({ id: item.id });
    this.close();
  }

  protected isDisabled(item: MenuItem): boolean {
    if (item.id === 'undo') {
      return !this.undoEnabled;
    }
    if (item.id === 'redo') {
      return !this.redoEnabled;
    }
    if (item.id.startsWith('sep-cl')) {
      return false;
    }
    if (!this.layersEnabled) {
      const layerIds = [
        'addLayer', 'duplicateLayer', 'deleteLayer',
        'mergeDown', 'flattenImage',
        'moveLayerUp', 'moveLayerDown',
        'importAsLayer',
      ];
      if (layerIds.includes(item.id)) {
        return true;
      }
    }
    return !!item.disabled;
  }

  protected close(): void {
    this.openIndex.set(null);
    this.dropdownStyle.set(null);
  }
}
