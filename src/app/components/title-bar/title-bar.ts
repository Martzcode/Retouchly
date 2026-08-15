import { Component, inject } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DocumentService } from '../../services/document.service';
import { MenuBarComponent } from '../menu-bar/menu-bar';
import { WindowControlsComponent } from '../window-controls/window-controls';

@Component({
  selector: 'app-title-bar',
  imports: [MenuBarComponent, WindowControlsComponent],
  templateUrl: './title-bar.html',
  styleUrl: './title-bar.css',
})
export class TitleBarComponent {
  protected readonly doc = inject(DocumentService);

  private readonly win = getCurrentWindow();

  protected toggleMaximize(): void {
    void this.win.toggleMaximize();
  }
}
