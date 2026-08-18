import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { DocumentInfo } from '../../types';

@Component({
  selector: 'app-status-bar',
  imports: [],
  templateUrl: './status-bar.html',
  styleUrl: './status-bar.css',
})
export class StatusBarComponent {
  protected readonly i18n = inject(I18nService);
  position = input.required<{ x: number; y: number }>();
  document = input.required<DocumentInfo>();
  error = input<string | null>(null);
  zoom = input(1);
  tool = input('');

  protected zoomLabel(): string {
    const percent = this.zoom() * 100;
    return percent >= 100 ? percent.toFixed(0) : percent.toFixed(1);
  }
}
