import { Component, input } from '@angular/core';
import { DocumentInfo } from '../../types';

@Component({
  selector: 'app-status-bar',
  imports: [],
  templateUrl: './status-bar.html',
  styleUrl: './status-bar.css',
})
export class StatusBarComponent {
  position = input.required<{ x: number; y: number }>();
  document = input.required<DocumentInfo>();
  error = input<string | null>(null);
  zoom = input(1);

  protected zoomLabel(): string {
    const percent = this.zoom() * 100;
    return percent >= 100 ? percent.toFixed(0) : percent.toFixed(1);
  }
}
