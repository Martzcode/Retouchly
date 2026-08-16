import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommandEvent } from '../../types';

@Component({
  selector: 'app-tool-bar',
  imports: [],
  templateUrl: './tool-bar.html',
  styleUrl: './tool-bar.css',
})
export class ToolBarComponent {
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Output() command = new EventEmitter<CommandEvent>();
}
