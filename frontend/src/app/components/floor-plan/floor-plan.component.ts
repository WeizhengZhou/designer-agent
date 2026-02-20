import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { FloorPlanData } from '../../models';

@Component({
  selector: 'app-floor-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floor-plan.component.html',
  styleUrls: ['./floor-plan.component.scss'],
})
export class FloorPlanComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  floorPlan: FloorPlanData | null = null;
  private sub = new Subscription();
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver!: ResizeObserver;

  constructor(private store: FurnitureStoreService) {}

  ngOnInit() {
    this.sub.add(this.store.floorPlan$.subscribe(data => {
      this.floorPlan = data;
      if (this.ctx) this.draw();
    }));
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.resizeObserver = new ResizeObserver(() => this.resizeAndDraw());
    this.resizeObserver.observe(canvas.parentElement!);
    this.resizeAndDraw();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  private resizeAndDraw() {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;
    this.draw();
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!this.floorPlan) {
      this.drawEmptyState(ctx, W, H);
      return;
    }

    const pad = 48;
    const roomW = W - pad * 2;
    const roomH = H - pad * 2;

    // Background grid
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridStep = 30;
    for (let x = 0; x <= W; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // Room outline
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(pad, pad, roomW, roomH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, roomW, roomH);

    // Dimension labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.floorPlan.room_width} ft`, pad + roomW / 2, pad - 10);
    ctx.save();
    ctx.translate(pad - 12, pad + roomH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${this.floorPlan.room_length} ft`, 0, 0);
    ctx.restore();
    ctx.restore();

    // Furniture
    const placements = this.floorPlan.furniture_placements;
    placements.forEach(item => {
      const fx = pad + (item.x_percent / 100) * roomW;
      const fy = pad + (item.y_percent / 100) * roomH;
      const fw = (item.width_percent / 100) * roomW;
      const fd = (item.depth_percent / 100) * roomH;

      ctx.save();
      ctx.translate(fx + fw / 2, fy + fd / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,.18)';
      ctx.shadowBlur  = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Fill
      ctx.fillStyle = item.color || '#94a3b8';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.roundRect(-fw / 2, -fd / 2, fw, fd, 4);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.shadowColor = 'transparent';

      // Border
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-fw / 2, -fd / 2, fw, fd, 4);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name;
      ctx.fillText(label, 0, 0);

      ctx.restore();
    });

    // Compass
    this.drawCompass(ctx, W - 36, H - 36, 22);
  }

  private drawEmptyState(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Floor plan will appear here', W / 2, H / 2 - 14);
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.fillText('Ask the AI to create a room layout', W / 2, H / 2 + 14);
  }

  private drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r + 10);
    ctx.fillStyle = '#64748b';
    ctx.fillText('S', cx, cy + r - 10);
    ctx.restore();
  }
}
