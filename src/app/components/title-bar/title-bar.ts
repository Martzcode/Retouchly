import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DocumentService } from '../../services/document.service';
import { I18nService } from '../../services/i18n.service';
import { CommandEvent } from '../../types';
import { MenuBarComponent } from '../menu-bar/menu-bar';
import { WindowControlsComponent } from '../window-controls/window-controls';

@Component({
  selector: 'app-title-bar',
  imports: [MenuBarComponent, WindowControlsComponent],
  templateUrl: './title-bar.html',
  styleUrl: './title-bar.css',
})
export class TitleBarComponent {
  protected readonly i18n = inject(I18nService);
  @Input() undoEnabled = false;
  @Input() redoEnabled = false;
  @Input() layersEnabled = false;
  @Input() viewRulesChecked = false;
  @Input() viewGridChecked = false;
  @Input() viewNavigatorChecked = false;
  @Input() currentLang = 'en';
  @Output() command = new EventEmitter<CommandEvent>();

  protected readonly doc = inject(DocumentService);

  private readonly win = getCurrentWindow();

  protected toggleMaximize(): void {
    void this.win.toggleMaximize();
  }
}
