import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatPanelComponent } from './components/chat-panel/chat-panel.component';
import { CanvasPanelComponent } from './components/canvas-panel/canvas-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ChatPanelComponent, CanvasPanelComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
