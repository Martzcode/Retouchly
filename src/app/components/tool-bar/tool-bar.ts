import { Component, EventEmitter, Output } from '@angular/core';
import { CommandEvent } from '../../types';

@Component({
  selector: 'app-tool-bar',
  imports: [],
  templateUrl: './tool-bar.html',
  styleUrl: './tool-bar.css',
})
export class ToolBarComponent {
  @Output() command = new EventEmitter<CommandEvent>();
}
