import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { ApiService } from '../../services/api.service';
import { ChatMessage, Product } from '../../models';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild('textInput') textInput!: ElementRef<HTMLTextAreaElement>;

  messages: ChatMessage[] = [];
  thinkingText: string | null = null;
  inputText = '';
  pendingImages: { dataUrl: string; name: string }[] = [];
  isDragging = false;

  private subs = new Subscription();
  private shouldScroll = false;

  constructor(
    public store: FurnitureStoreService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.subs.add(this.store.messages$.subscribe(msgs => {
      this.messages = msgs;
      this.shouldScroll = true;
    }));
    this.subs.add(this.store.isThinking$.subscribe(t => (this.thinkingText = t)));
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  private scrollToBottom() {
    this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  send() {
    const text = this.inputText.trim();
    if (!text && this.pendingImages.length === 0) return;

    const imageDataUrls = this.pendingImages.map(i => i.dataUrl);

    this.store.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      images: imageDataUrls,
    });

    this.api.sendMessage(text, imageDataUrls);

    this.inputText = '';
    this.pendingImages = [];
    this.textInput?.nativeElement.focus();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave() { this.isDragging = false; }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files.filter(f => f.type.startsWith('image/')));
  }

  private addFiles(files: File[]) {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        this.pendingImages.push({
          dataUrl: e.target!.result as string,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    this.pendingImages.splice(index, 1);
  }

  onProductSelect(product: Product) {
    this.store.selectProduct(product);
  }

  resetChat() {
    this.api.resetConversation();
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
