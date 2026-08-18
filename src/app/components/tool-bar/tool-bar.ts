import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { CommandEvent } from '../../types';

@Component({
  selector: 'app-tool-bar',
  imports: [],
  templateUrl: './tool-bar.html',
  styleUrl: './tool-bar.css',
})
export class ToolBarComponent {
  protected readonly i18n = inject(I18nService);
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Output() command = new EventEmitter<CommandEvent>();
}
