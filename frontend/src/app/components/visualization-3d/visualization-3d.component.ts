import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewInit, HostListener, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { FurnitureStoreService } from '../../services/furniture-store.service';
import { Scene3DData } from '../../models';

// ── Furniture preset catalog ───────────────────────────────────────────────────

export interface FurniturePreset {
  type: string;
  name: string;
  icon: string;
  w: number; d: number; h: number; // feet
  color: string;
  category: string;
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // Living Room
  { type: 'sofa',          name: 'Sofa',          icon: '🛋️', w: 7,   d: 3.5, h: 3,    color: '#8b7355', category: 'Living Room' },
  { type: 'sectional',     name: 'Sectional',     icon: '🛋️', w: 9,   d: 4.5, h: 3,    color: '#7a6b55', category: 'Living Room' },
  { type: 'armchair',      name: 'Armchair',      icon: '🪑', w: 3,   d: 3,   h: 3.5,  color: '#9c8b7d', category: 'Living Room' },
  { type: 'coffee-table',  name: 'Coffee Table',  icon: '☕', w: 4,   d: 2,   h: 1.5,  color: '#5c3d1e', category: 'Living Room' },
  { type: 'floor-lamp',    name: 'Floor Lamp',    icon: '💡', w: 1,   d: 1,   h: 5.5,  color: '#c8a96e', category: 'Living Room' },
  { type: 'tv-stand',      name: 'TV Stand',      icon: '📺', w: 6,   d: 1.5, h: 2,    color: '#3d2b1a', category: 'Living Room' },
  { type: 'side-table',    name: 'Side Table',    icon: '📦', w: 1.5, d: 1.5, h: 2.5,  color: '#8b7355', category: 'Living Room' },
  // Dining
  { type: 'dining-table',  name: 'Dining Table',  icon: '🪵', w: 6,   d: 3.5, h: 2.5,  color: '#6b4c2a', category: 'Dining' },
  { type: 'dining-chair',  name: 'Dining Chair',  icon: '🪑', w: 1.5, d: 1.8, h: 3.5,  color: '#8b7355', category: 'Dining' },
  // Bedroom
  { type: 'bed-king',      name: 'King Bed',      icon: '🛏️', w: 6.5, d: 7,   h: 2,    color: '#ddd0c8', category: 'Bedroom' },
  { type: 'bed-queen',     name: 'Queen Bed',     icon: '🛏️', w: 5.5, d: 6.5, h: 2,    color: '#ddd0c8', category: 'Bedroom' },
  { type: 'bed-single',    name: 'Single Bed',    icon: '🛏️', w: 3.5, d: 6.5, h: 2,    color: '#ddd0c8', category: 'Bedroom' },
  { type: 'dresser',       name: 'Dresser',       icon: '🗄️', w: 4,   d: 1.5, h: 3.5,  color: '#7a6040', category: 'Bedroom' },
  { type: 'wardrobe',      name: 'Wardrobe',      icon: '🚪', w: 5,   d: 2,   h: 7.5,  color: '#5c4a3a', category: 'Bedroom' },
  { type: 'nightstand',    name: 'Nightstand',    icon: '📦', w: 1.5, d: 1.5, h: 2,    color: '#8b7355', category: 'Bedroom' },
  // Office
  { type: 'desk',          name: 'Desk',          icon: '🖥️', w: 5,   d: 2.5, h: 2.5,  color: '#8b7355', category: 'Office' },
  { type: 'bookshelf',     name: 'Bookshelf',     icon: '📚', w: 3,   d: 1,   h: 7,    color: '#6b4c2a', category: 'Office' },
  { type: 'office-chair',  name: 'Office Chair',  icon: '🪑', w: 2,   d: 2,   h: 4,    color: '#444444', category: 'Office' },
  // Decor
  { type: 'rug',           name: 'Rug',           icon: '🟫', w: 8,   d: 5,   h: 0.15, color: '#b8860b', category: 'Decor' },
  { type: 'plant',         name: 'Plant',         icon: '🪴', w: 1.5, d: 1.5, h: 3.5,  color: '#4a7c59', category: 'Decor' },
];

// ── Internal state types ───────────────────────────────────────────────────────

interface PlacedItem {
  id: string;
  name: string;
  preset: FurniturePreset;
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  color: string;
}

interface SelectedProps {
  name: string;
  x: number; z: number;
  rotationY: number;   // degrees
  width: number; depth: number; height: number; // feet (actual, after scale)
  color: string;
}

interface ContextMenu { x: number; y: number; }

@Component({
  selector: 'app-visualization-3d',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visualization-3d.component.html',
  styleUrls: ['./visualization-3d.component.scss'],
})
export class Visualization3dComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas3d') canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Public state (template-visible) ─────────────────────────────────────────
  sceneData: Scene3DData | null = null;
  placedItems: PlacedItem[] = [];
  selectedItem: PlacedItem | null = null;
  selectedProps: SelectedProps | null = null;
  activeMode: 'translate' | 'rotate' | 'scale' = 'translate';
  contextMenu: ContextMenu | null = null;
  roomDims = { width: 15, length: 20, height: 9 };

  readonly groupedPresets = this.buildGroupedPresets();

  // ── Three.js ─────────────────────────────────────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private orbitControls!: OrbitControls;
  private transformControls!: TransformControls;
  private furnitureGroup!: THREE.Group;
  private roomGroup!: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private animId = 0;
  private resizeObserver!: ResizeObserver;
  private labelContainer!: HTMLDivElement;
  private itemMap = new Map<string, PlacedItem>();

  private sub = new Subscription();

  constructor(
    private store: FurnitureStoreService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.sub.add(this.store.scene3d$.subscribe(data => {
      this.sceneData = data;
      if (this.renderer) this.loadFromSceneData(data);
    }));
  }

  ngAfterViewInit() {
    this.initThree();
    if (this.sceneData) this.loadFromSceneData(this.sceneData);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    cancelAnimationFrame(this.animId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.labelContainer?.remove();
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    switch (e.key) {
      case 'Escape':   this.selectItem(null); break;
      case 'Delete':
      case 'Backspace': if (this.selectedItem) { e.preventDefault(); this.removeSelected(); } break;
      case 'g': case 'G': if (this.selectedItem) this.setMode('translate'); break;
      case 'r': case 'R': if (this.selectedItem) this.setMode('rotate'); break;
      case 's': case 'S': if (this.selectedItem && !e.ctrlKey && !e.metaKey) this.setMode('scale'); break;
      case 'd': case 'D': if (e.shiftKey && this.selectedItem) this.duplicateSelected(); break;
    }
  }

  @HostListener('document:click')
  dismissContextMenu() { this.contextMenu = null; }

  // ── Three.js init ─────────────────────────────────────────────────────────────
  private initThree() {
    const canvas    = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    container.style.position = 'relative';

    // HTML label overlay
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    container.appendChild(this.labelContainer);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);
    this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 300);
    this.camera.position.set(18, 14, 18);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffbf0, 1.1);
    sun.position.set(12, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -25; sc.right = sc.top = 25;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xdbeafe, 0.4);
    fill.position.set(-10, 8, -8);
    this.scene.add(fill);

    // Groups
    this.roomGroup     = new THREE.Group();
    this.furnitureGroup = new THREE.Group();
    this.scene.add(this.roomGroup, this.furnitureGroup);

    // Build room geometry
    this.buildRoom();

    // Orbit controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.07;
    this.orbitControls.minDistance   = 3;
    this.orbitControls.maxDistance   = 60;
    this.orbitControls.maxPolarAngle = Math.PI / 2.05;
    this.orbitControls.target.set(this.roomDims.width / 2, 0, this.roomDims.length / 2);
    this.orbitControls.update();

    // Transform controls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', e => {
      this.orbitControls.enabled = !(e as any).value;
    });
    this.transformControls.addEventListener('objectChange', () => {
      this.snapToFloor();
      this.syncPropsFromSelected();
      this.cdr.detectChanges();
    });
    this.scene.add(this.transformControls);
    this.setMode('translate');

    // Canvas events
    canvas.addEventListener('click',       e => this.onCanvasClick(e));
    canvas.addEventListener('contextmenu', e => this.onCanvasRightClick(e));

    // Resize
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  private buildRoom() {
    this.roomGroup.clear();
    const { width: W, length: L, height: H } = this.roomDims;

    // Wood floor
    const floorGeo = new THREE.PlaneGeometry(W, L);
    const floorMat = new THREE.MeshStandardMaterial({ map: this.makeFloorTexture(W, L), roughness: 0.9 });
    const floor    = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, L / 2);
    floor.receiveShadow = true;
    floor.name = '__floor';
    this.roomGroup.add(floor);

    // Grid overlay (faint, on floor)
    const grid = new THREE.GridHelper(Math.max(W, L) * 2, Math.max(W, L) * 2, 0xb0bec5, 0xcfd8dc);
    grid.position.set(W / 2, 0.003, L / 2);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    this.roomGroup.add(grid);

    // Walls (inside-visible box)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.95, side: THREE.BackSide });
    const wallGeo = new THREE.BoxGeometry(W, H, L);
    const walls   = new THREE.Mesh(wallGeo, wallMat);
    walls.position.set(W / 2, H / 2, L / 2);
    walls.name = '__walls';
    this.roomGroup.add(walls);

    // Wall border lines
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, L));
    const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35 }));
    lines.position.set(W / 2, H / 2, L / 2);
    this.roomGroup.add(lines);

    // Update camera/controls target
    if (this.orbitControls) {
      this.orbitControls.target.set(W / 2, 0, L / 2);
      this.orbitControls.update();
      this.camera.position.set(W * 1.15, H * 1.2, L * 1.2);
    }
  }

  private makeFloorTexture(roomW: number, roomL: number): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#c8a87a';
    ctx.fillRect(0, 0, 512, 512);

    // Plank rows
    ctx.strokeStyle = '#a8885a';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
    // Grain lines
    ctx.strokeStyle = '#b89862';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 40; i++) {
      const y0 = Math.random() * 512;
      ctx.beginPath(); ctx.moveTo(0, y0);
      ctx.bezierCurveTo(170, y0 + 3, 340, y0 - 3, 512, y0 + 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(roomW / 5, roomL / 5);
    return tex;
  }

  private animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }

  private onResize() {
    const c = this.canvasRef.nativeElement.parentElement!;
    this.camera.aspect = c.clientWidth / c.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(c.clientWidth, c.clientHeight);
  }

  // ── Furniture management ───────────────────────────────────────────────────────

  addFromPreset(preset: FurniturePreset) {
    const id    = crypto.randomUUID();
    const color = preset.color;
    const { group, mesh, edges } = this.buildMesh(preset, color);

    // Place near center with small random offset so stacked items are visible
    const cx = this.roomDims.width  / 2 + (Math.random() - 0.5) * 2;
    const cz = this.roomDims.length / 2 + (Math.random() - 0.5) * 2;
    group.position.set(cx, preset.h / 2, cz);
    group.userData['itemId'] = id;
    this.furnitureGroup.add(group);

    const item: PlacedItem = { id, name: preset.name, preset, group, mesh, edges, color };
    this.itemMap.set(id, item);
    this.placedItems = [...this.itemMap.values()];
    this.selectItem(item);
    this.cdr.detectChanges();
  }

  removeSelected() {
    if (!this.selectedItem) return;
    this.transformControls.detach();
    this.furnitureGroup.remove(this.selectedItem.group);
    this.itemMap.delete(this.selectedItem.id);
    this.placedItems = [...this.itemMap.values()];
    this.removeLabelsFor(this.selectedItem.id);
    this.selectedItem  = null;
    this.selectedProps = null;
    this.cdr.detectChanges();
  }

  duplicateSelected() {
    if (!this.selectedItem) return;
    const src = this.selectedItem;
    const newId = crypto.randomUUID();
    const { group, mesh, edges } = this.buildMesh(src.preset, src.color);
    group.position.copy(src.group.position).add(new THREE.Vector3(1.5, 0, 1.5));
    group.rotation.copy(src.group.rotation);
    group.scale.copy(src.group.scale);
    group.position.y = src.preset.h * src.group.scale.y / 2;
    group.userData['itemId'] = newId;
    this.furnitureGroup.add(group);

    const item: PlacedItem = { id: newId, name: src.name + ' (copy)', preset: src.preset, group, mesh, edges, color: src.color };
    this.itemMap.set(newId, item);
    this.placedItems = [...this.itemMap.values()];
    this.selectItem(item);
    this.cdr.detectChanges();
  }

  clearAll() {
    this.transformControls.detach();
    this.itemMap.forEach(item => this.furnitureGroup.remove(item.group));
    this.itemMap.clear();
    this.placedItems = [];
    this.labelContainer.innerHTML = '';
    this.selectedItem  = null;
    this.selectedProps = null;
    this.cdr.detectChanges();
  }

  selectItemById(id: string) {
    const item = this.itemMap.get(id);
    if (item) this.selectItem(item);
  }

  selectItem(item: PlacedItem | null) {
    if (this.selectedItem) {
      this.setEdgeHighlight(this.selectedItem, false);
      this.transformControls.detach();
    }
    this.selectedItem = item;
    if (item) {
      this.setEdgeHighlight(item, true);
      this.transformControls.attach(item.group);
      this.syncPropsFromSelected();
    } else {
      this.selectedProps = null;
    }
    this.cdr.detectChanges();
  }

  setMode(mode: 'translate' | 'rotate' | 'scale') {
    this.activeMode = mode;
    this.transformControls.setMode(mode);
    if (mode === 'translate') {
      this.transformControls.showX = true;
      this.transformControls.showY = false;  // no vertical movement
      this.transformControls.showZ = true;
    } else if (mode === 'rotate') {
      this.transformControls.showX = false;
      this.transformControls.showY = true;   // Y-axis spin only
      this.transformControls.showZ = false;
    } else {
      this.transformControls.showX = true;
      this.transformControls.showY = true;
      this.transformControls.showZ = true;
    }
    this.contextMenu = null;
  }

  applyProps() {
    if (!this.selectedItem || !this.selectedProps) return;
    const g = this.selectedItem.group;
    const p = this.selectedItem.preset;

    this.selectedItem.name = this.selectedProps.name;
    g.position.x = this.selectedProps.x;
    g.position.z = this.selectedProps.z;
    g.rotation.y = THREE.MathUtils.degToRad(this.selectedProps.rotationY);
    g.scale.set(
      this.selectedProps.width  / p.w,
      this.selectedProps.height / p.h,
      this.selectedProps.depth  / p.d,
    );
    g.position.y = this.selectedProps.height / 2;

    if (this.selectedProps.color !== this.selectedItem.color) {
      this.selectedItem.color = this.selectedProps.color;
      (this.selectedItem.mesh.material as THREE.MeshStandardMaterial)
        .color.setHex(parseInt(this.selectedProps.color.slice(1), 16));
    }
  }

  rebuildRoom() {
    this.buildRoom();
  }

  resetCamera() {
    const { width: W, length: L, height: H } = this.roomDims;
    this.orbitControls.target.set(W / 2, 0, L / 2);
    this.camera.position.set(W * 1.15, H * 1.2, L * 1.2);
    this.orbitControls.update();
  }

  // ── Mesh builder ───────────────────────────────────────────────────────────────
  private buildMesh(preset: FurniturePreset, colorHex: string): {
    group: THREE.Group; mesh: THREE.Mesh; edges: THREE.LineSegments;
  } {
    const geo  = new THREE.BoxGeometry(preset.w, preset.h, preset.d);
    const mat  = new THREE.MeshStandardMaterial({
      color:     parseInt(colorHex.slice(1), 16),
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgeGeo  = new THREE.EdgesGeometry(geo);
    const edgeMat  = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.22 });
    const edges    = new THREE.LineSegments(edgeGeo, edgeMat);

    const group = new THREE.Group();
    group.add(mesh, edges);
    return { group, mesh, edges };
  }

  private setEdgeHighlight(item: PlacedItem, on: boolean) {
    const mat = item.edges.material as THREE.LineBasicMaterial;
    if (on) { mat.color.setHex(0x6366f1); mat.opacity = 1; mat.linewidth = 2; }
    else     { mat.color.setHex(0x1e293b); mat.opacity = 0.22; mat.linewidth = 1; }
  }

  // ── Click handling ──────────────────────────────────────────────────────────────
  private onCanvasClick(e: MouseEvent) {
    if (e.button !== 0) return;
    this.contextMenu = null;

    const { x, y } = this.getNDC(e);
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Check if TransformControls handled the click
    if (this.transformControls.dragging) return;

    // Collect all item meshes
    const meshes = [...this.itemMap.values()].map(i => i.mesh);
    const hits   = this.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hitMesh  = hits[0].object as THREE.Mesh;
      const hitGroup = hitMesh.parent!;
      const id = hitGroup.userData['itemId'] as string;
      const item = this.itemMap.get(id);
      if (item) { this.selectItem(item); return; }
    }

    // Clicked empty space — deselect
    this.selectItem(null);
  }

  private onCanvasRightClick(e: MouseEvent) {
    e.preventDefault();
    if (!this.selectedItem) return;
    this.contextMenu = { x: e.offsetX, y: e.offsetY };
    this.cdr.detectChanges();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────────
  private getNDC(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x:  ((e.clientX - rect.left)  / rect.width)  * 2 - 1,
      y: -((e.clientY - rect.top)   / rect.height) * 2 + 1,
    };
  }

  private snapToFloor() {
    if (!this.selectedItem) return;
    const item = this.selectedItem;
    item.group.position.y = item.preset.h * item.group.scale.y / 2;
  }

  private syncPropsFromSelected() {
    if (!this.selectedItem) return;
    const g = this.selectedItem.group;
    const p = this.selectedItem.preset;
    this.selectedProps = {
      name:      this.selectedItem.name,
      x:         +g.position.x.toFixed(1),
      z:         +g.position.z.toFixed(1),
      rotationY: +THREE.MathUtils.radToDeg(g.rotation.y).toFixed(0),
      width:     +(p.w * g.scale.x).toFixed(1),
      depth:     +(p.d * g.scale.z).toFixed(1),
      height:    +(p.h * g.scale.y).toFixed(1),
      color:     this.selectedItem.color,
    };
  }

  private buildGroupedPresets(): { category: string; items: FurniturePreset[] }[] {
    const map = new Map<string, FurniturePreset[]>();
    for (const p of FURNITURE_PRESETS) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  }

  // ── Load AI scene data ──────────────────────────────────────────────────────────
  private loadFromSceneData(data: Scene3DData | null) {
    this.clearAll();
    if (!data) return;

    this.roomDims = {
      width:  data.room_width  || 15,
      length: data.room_length || 20,
      height: data.room_height || 9,
    };
    this.buildRoom();

    data.furniture_items.forEach((fi, i) => {
      // Find closest preset by type name
      const preset = FURNITURE_PRESETS.find(p =>
        p.type.includes(fi.type?.toLowerCase() ?? '') ||
        fi.type?.toLowerCase().includes(p.type)
      ) ?? FURNITURE_PRESETS[0];

      const color = fi.color || preset.color;
      const { group, mesh, edges } = this.buildMesh(
        { ...preset, w: fi.width || preset.w, d: fi.depth || preset.d, h: fi.height || preset.h },
        color,
      );
      const id = fi.id || crypto.randomUUID();
      group.position.set(fi.x + (fi.width || preset.w) / 2, (fi.height || preset.h) / 2, fi.z + (fi.depth || preset.d) / 2);
      group.rotation.y = THREE.MathUtils.degToRad(fi.rotation || 0);
      group.userData['itemId'] = id;
      this.furnitureGroup.add(group);

      const item: PlacedItem = { id, name: fi.name || preset.name, preset, group, mesh, edges, color };
      this.itemMap.set(id, item);
    });
    this.placedItems = [...this.itemMap.values()];
    this.cdr.detectChanges();
  }

  // ── HTML label overlay ─────────────────────────────────────────────────────────
  private labelDivs = new Map<string, HTMLDivElement>();

  private updateLabels() {
    if (!this.renderer) return;
    const W = this.renderer.domElement.clientWidth;
    const H = this.renderer.domElement.clientHeight;

    this.itemMap.forEach((item, id) => {
      let div = this.labelDivs.get(id);
      if (!div) {
        div = document.createElement('div');
        div.style.cssText = `
          position:absolute; pointer-events:none; white-space:nowrap;
          background:rgba(255,255,255,.82); color:#1e293b;
          font:600 10px/1 Inter,system-ui,sans-serif;
          padding:3px 8px; border-radius:99px;
          box-shadow:0 1px 4px rgba(0,0,0,.12);
          transition:opacity .15s;
        `;
        this.labelContainer.appendChild(div);
        this.labelDivs.set(id, div);
      }
      div.textContent = item.name;

      const pos = new THREE.Vector3();
      item.group.getWorldPosition(pos);
      pos.y += item.preset.h * item.group.scale.y / 2 + 0.5;
      pos.project(this.camera);

      if (pos.z >= 1) { div.style.opacity = '0'; return; }
      div.style.opacity = item === this.selectedItem ? '1' : '0.7';
      div.style.left = `${((pos.x + 1) / 2) * W - div.offsetWidth / 2}px`;
      div.style.top  = `${((-pos.y + 1) / 2) * H - 18}px`;
    });

    // Remove labels for deleted items
    this.labelDivs.forEach((div, id) => {
      if (!this.itemMap.has(id)) { div.remove(); this.labelDivs.delete(id); }
    });
  }

  private removeLabelsFor(id: string) {
    this.labelDivs.get(id)?.remove();
    this.labelDivs.delete(id);
  }
}
