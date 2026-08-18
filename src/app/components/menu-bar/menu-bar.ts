import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommandEvent } from '../../types';
import { I18nService } from '../../services/i18n.service';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
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
  private readonly i18n = inject(I18nService);

  @Input() undoEnabled = false;
  @Input() redoEnabled = false;
  @Input() layersEnabled = false;
  @Input() viewRulesChecked = false;
  @Input() viewGridChecked = false;
  @Input() viewNavigatorChecked = false;
  @Input() currentLang = 'en';
  @Output() command = new EventEmitter<CommandEvent>();

  protected readonly openIndex = signal<number | null>(null);
  protected readonly dropdownStyle = signal<{ top: string; left: string } | null>(null);

  protected get menus(): Menu[] {
    const t = (key: string) => this.i18n.t(key);
    return [
      {
        label: t('menu.file'),
        items: [
          { id: 'new', label: t('menu.new'), shortcut: t('shortcut.new') },
          { id: 'open', label: t('menu.open'), shortcut: t('shortcut.open') },
          { id: 'sep-1', label: '-' },
          { id: 'save', label: t('menu.save'), shortcut: t('shortcut.save') },
          { id: 'saveAs', label: t('menu.saveAs'), shortcut: t('shortcut.saveAs') },
          { id: 'sep-2', label: '-' },
          { id: 'quit', label: t('menu.quit') },
        ],
      },
      {
        label: t('menu.edit'),
        items: [
          { id: 'undo', label: t('menu.undo'), shortcut: t('shortcut.undo') },
          { id: 'redo', label: t('menu.redo'), shortcut: t('shortcut.redo') },
          { id: 'sep-1', label: '-' },
          { id: 'selectAll', label: t('menu.selectAll'), shortcut: t('shortcut.selectAll') },
          { id: 'deselect', label: t('menu.deselect'), shortcut: t('shortcut.deselect') },
          { id: 'invertSelection', label: t('menu.invertSelection'), shortcut: t('shortcut.invertSelection') },
          { id: 'sep-2', label: '-' },
          { id: 'cut', label: t('menu.cut'), shortcut: t('shortcut.cut') },
          { id: 'copy', label: t('menu.copy'), shortcut: t('shortcut.copy') },
          { id: 'paste', label: t('menu.paste'), shortcut: t('shortcut.paste') },
        ],
      },
      {
        label: t('menu.view'),
        items: [
          { id: 'zoomIn', label: t('menu.zoomIn'), shortcut: t('shortcut.zoomIn') },
          { id: 'zoomOut', label: t('menu.zoomOut'), shortcut: t('shortcut.zoomOut') },
          { id: 'zoom100', label: t('menu.zoom100') },
          { id: 'zoomFit', label: t('menu.zoomFit'), shortcut: t('shortcut.zoomFit') },
          { id: 'viewSep-1', label: '-' },
          { id: 'viewRules', label: t('menu.rules') },
          { id: 'viewGrid', label: t('menu.grid') },
          { id: 'viewSep-2', label: '-' },
          { id: 'viewNavigator', label: t('menu.navigator') },
        ],
      },
      {
        label: t('menu.image'),
        items: [
          { id: 'imgResize', label: t('menu.resizeImage') },
          { id: 'imgCanvas', label: t('menu.resizeCanvas') },
          { id: 'imgSep-1', label: '-' },
          { id: 'imgRotateCW', label: t('menu.rotateCW') },
          { id: 'imgRotateCCW', label: t('menu.rotateCCW') },
          { id: 'imgRotate180', label: t('menu.rotate180') },
          { id: 'imgSep-2', label: '-' },
          { id: 'imgFlipH', label: t('menu.flipH') },
          { id: 'imgFlipV', label: t('menu.flipV') },
          { id: 'imgSep-3', label: '-' },
          { id: 'imgCrop', label: t('menu.crop') },
        ],
      },
      {
        label: t('menu.layers'),
        items: [
          { id: 'addLayer', label: t('menu.newLayer'), shortcut: t('shortcut.newLayer') },
          { id: 'duplicateLayer', label: t('menu.duplicateLayer') },
          { id: 'deleteLayer', label: t('menu.deleteLayer') },
          { id: 'sep-cl-1', label: '-' },
          { id: 'mergeDown', label: t('menu.mergeDown'), shortcut: t('shortcut.mergeDown') },
          { id: 'flattenImage', label: t('menu.flattenImage'), shortcut: t('shortcut.flattenImage') },
          { id: 'sep-cl-2', label: '-' },
          { id: 'moveLayerUp', label: t('menu.moveLayerUp') },
          { id: 'moveLayerDown', label: t('menu.moveLayerDown') },
          { id: 'sep-cl-3', label: '-' },
          { id: 'importAsLayer', label: t('menu.importLayer') },
        ],
      },
      {
        label: t('menu.adjustments'),
        items: [
          { id: 'adjBrightness', label: t('menu.brightnessContrast') },
          { id: 'adjHSL', label: t('menu.hueSatLight') },
          { id: 'adjSep-1', label: '-' },
          { id: 'adjInvert', label: t('menu.invertColors') },
          { id: 'adjDesaturate', label: t('menu.blackWhite') },
          { id: 'adjSepia', label: t('menu.sepia') },
          { id: 'adjSep-2', label: '-' },
          { id: 'adjPosterize', label: t('menu.posterize') },
          { id: 'adjThreshold', label: t('menu.threshold') },
        ],
      },
      {
        label: t('menu.effects'),
        items: [
          { id: 'fxBlur', label: t('menu.gaussianBlur') },
          { id: 'fxMotion', label: t('menu.motionBlur') },
          { id: 'fxSep-1', label: '-' },
          { id: 'fxPixelate', label: t('menu.pixelate') },
          { id: 'fxSharpen', label: t('menu.sharpen') },
          { id: 'fxEmboss', label: t('menu.emboss') },
          { id: 'fxEdge', label: t('menu.edgeDetect') },
          { id: 'fxSep-2', label: '-' },
          { id: 'fxNoise', label: t('menu.noise') },
          { id: 'fxVignette', label: t('menu.vignette') },
        ],
      },
      {
        label: t('menu.window'),
        items: [
          { id: 'langLabel', label: t('menu.language') },
          { id: 'langSep', label: '-' },
          { id: 'langFr', label: 'Français' },
          { id: 'langEn', label: 'English' },
        ],
      },
      {
        label: t('menu.help'),
        items: [{ id: 'about', label: t('menu.about') }],
      },
    ];
  }

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
    if (item.id.startsWith('sep-') || item.id.startsWith('adjSep-') || item.id.startsWith('fxSep-') || item.id.startsWith('viewSep-') || item.id.startsWith('langSep')) {
      return false;
    }
    if (!this.layersEnabled) {
      const layerIds = [
        'addLayer', 'duplicateLayer', 'deleteLayer',
        'mergeDown', 'flattenImage',
        'moveLayerUp', 'moveLayerDown',
        'importAsLayer',
      ];
      const adjIds = [
        'adjBrightness', 'adjHSL',
        'adjInvert', 'adjDesaturate', 'adjSepia',
        'adjPosterize', 'adjThreshold',
      ];
      const fxIds = [
        'fxBlur', 'fxMotion', 'fxPixelate',
        'fxSharpen', 'fxEmboss', 'fxEdge',
        'fxNoise', 'fxVignette',
      ];
      const imgIds = [
        'imgResize', 'imgCanvas',
        'imgRotateCW', 'imgRotateCCW', 'imgRotate180',
        'imgFlipH', 'imgFlipV',
        'imgCrop',
      ];
      if (layerIds.includes(item.id) || adjIds.includes(item.id) || fxIds.includes(item.id) || imgIds.includes(item.id)) {
        return true;
      }
    }
    return !!item.disabled || item.id === 'langLabel';
  }

  protected isChecked(item: MenuItem): boolean {
    if (item.id === 'viewRules') return this.viewRulesChecked;
    if (item.id === 'viewGrid') return this.viewGridChecked;
    if (item.id === 'viewNavigator') return this.viewNavigatorChecked;
    if (item.id === 'langFr') return this.currentLang === 'fr';
    if (item.id === 'langEn') return this.currentLang === 'en';
    return !!item.checked;
  }

  protected close(): void {
    this.openIndex.set(null);
    this.dropdownStyle.set(null);
  }
}
