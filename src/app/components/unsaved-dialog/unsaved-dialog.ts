import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { I18nService } from '../../services/i18n.service';

export type UnsavedAction = 'save' | 'discard' | 'cancel';

@Component({
  selector: 'app-unsaved-dialog',
  imports: [],
  templateUrl: './unsaved-dialog.html',
  styleUrl: './unsaved-dialog.css',
})
export class UnsavedDialogComponent {
  protected readonly i18n = inject(I18nService);

  @Input() fileName: string | null = null;
  @Output() action = new EventEmitter<UnsavedAction>();

  protected onAction(action: UnsavedAction): void {
    this.action.emit(action);
  }

  protected onBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onAction('cancel');
    }
  }
}