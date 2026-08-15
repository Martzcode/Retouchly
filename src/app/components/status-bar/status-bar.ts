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
}
