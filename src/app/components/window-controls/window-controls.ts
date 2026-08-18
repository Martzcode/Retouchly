import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-window-controls',
  imports: [],
  templateUrl: './window-controls.html',
  styleUrl: './window-controls.css',
})
export class WindowControlsComponent implements OnInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  protected readonly isMaximized = signal(false);

  private readonly win = getCurrentWindow();
  private unlisten?: Promise<() => void>;

  ngOnInit(): void {
    void this.refresh();
    this.unlisten = this.win.onResized(() => {
      void this.refresh();
    });
  }

  ngOnDestroy(): void {
    void this.unlisten?.then((fn) => fn());
  }

  protected minimize(): void {
    void this.win.minimize();
  }

  protected toggleMaximize(): void {
    void this.win.toggleMaximize();
  }

  protected close(): void {
    void this.win.close();
  }

  private async refresh(): Promise<void> {
    this.isMaximized.set(await this.win.isMaximized());
  }
}
