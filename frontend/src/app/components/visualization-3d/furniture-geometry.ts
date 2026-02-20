/**
 * Compound Three.js geometry builders for realistic furniture rendering.
 *
 * Coordinate convention (local group space):
 *   X  : −W/2 (left)  ↔ +W/2 (right)
 *   Z  : −D/2 (back)  ↔ +D/2 (front)
 *   Y  :  0   (floor) ↔  H   (top)
 *
 * Each builder adds THREE.Mesh + THREE.LineSegments (edges) children to the group.
 * The group origin sits at the CENTER of the floor footprint (y = 0 = floor level).
 * This lets us always set group.position.y = 0 to snap to the floor.
 */

import * as THREE from 'three';

// ── Colour helpers ────────────────────────────────────────────────────────────

function hexN(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function tint(base: number, factor: number): number {
  const r = Math.min(255, Math.round(((base >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((base >>  8) & 0xff) * factor));
  const b = Math.min(255, Math.round(( base        & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// ── Low-level primitives ──────────────────────────────────────────────────────

/**
 * Add a box to the group.
 * @param x  centre X in local space
 * @param y  BOTTOM Y in local space (mesh centre = y + h/2)
 * @param z  centre Z in local space
 */
function addBox(
  g: THREE.Group,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: number,
  roughness = 0.85,
): void {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 }),
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.18 }),
  );
  edges.position.copy(mesh.position);

  g.add(mesh, edges);
}

/**
 * Add a cylinder to the group.
 * @param rt  top radius,  rb  bottom radius
 * @param yBottom  bottom Y in local space
 */
function addCyl(
  g: THREE.Group,
  rt: number, rb: number, h: number,
  x: number, yBottom: number, z: number,
  color: number,
  segments = 12,
): void {
  const geo  = new THREE.CylinderGeometry(rt, rb, h, segments);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 }),
  );
  mesh.position.set(x, yBottom + h / 2, z);
  mesh.castShadow = true;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.12 }),
  );
  edges.position.copy(mesh.position);

  g.add(mesh, edges);
}

/** Add a sphere (no edges — looks bad on spheres). */
function addSphere(
  g: THREE.Group,
  r: number, x: number, y: number, z: number,
  color: number, segments = 12,
): void {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, segments, segments),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
}

// ── Furniture builders ────────────────────────────────────────────────────────

function buildSofa(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const legH   = H * 0.10;
  const armW   = Math.max(W * 0.10, 0.35);
  const backD  = D * 0.22;
  const seatD  = D - backD;
  const seatH  = H * 0.42;
  const armH   = H * 0.72;
  const cushH  = seatH * 0.32;
  const dark   = tint(C, 0.72);
  const light  = tint(C, 1.18);

  const lR = 0.055;
  const lx = W / 2 - armW * 0.5, lzF = D / 2 - 0.14, lzB = -D / 2 + backD * 0.7;
  addCyl(g, lR, lR, legH, -lx, 0, lzF, dark);
  addCyl(g, lR, lR, legH,  lx, 0, lzF, dark);
  addCyl(g, lR, lR, legH, -lx, 0, lzB, dark);
  addCyl(g, lR, lR, legH,  lx, 0, lzB, dark);

  // Back panel
  const backCz = -D / 2 + backD / 2;
  addBox(g, W, H - legH, backD, 0, legH, backCz, dark);

  // Left & right arms
  const armCz = backD / 2 + (seatD - backD) / 2 - backD / 2;  // center over seat depth
  const armCzActual = ((-D / 2 + backD) + D / 2) / 2;   // span entire seat depth
  addBox(g, armW, armH - legH, seatD, -(W / 2 - armW / 2), legH, -D / 2 + backD + seatD / 2, dark);
  addBox(g, armW, armH - legH, seatD,   W / 2 - armW / 2,  legH, -D / 2 + backD + seatD / 2, dark);

  // Seat base (between arms)
  const innerW = W - armW * 2;
  const seatCz = -D / 2 + backD + seatD / 2;
  addBox(g, innerW, seatH, seatD, 0, legH, seatCz, C);

  // Seat cushions (3 across)
  const cW = innerW / 3;
  for (let i = 0; i < 3; i++) {
    const cx = -innerW / 2 + cW * (i + 0.5);
    addBox(g, cW * 0.95, cushH, seatD * 0.94, cx, legH + seatH, seatCz, light);
  }

  // Back cushions (2 across)
  const bcH = (H - legH - seatH) * 0.75;
  const bcD = backD * 0.5;
  const bc2W = innerW / 2;
  const backCushCz = -D / 2 + bcD * 0.6;
  for (let i = 0; i < 2; i++) {
    const cx = -innerW / 2 + bc2W * (i + 0.5);
    addBox(g, bc2W * 0.93, bcH, bcD, cx, legH + seatH * 0.08, backCushCz, light);
  }
}

function buildArmchair(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const legH  = H * 0.12;
  const armW  = Math.max(W * 0.15, 0.25);
  const backD = D * 0.20;
  const seatD = D - backD;
  const seatH = H * 0.44;
  const armH  = H * 0.74;
  const cushH = seatH * 0.28;
  const dark  = tint(C, 0.72);
  const light = tint(C, 1.18);

  const lR = 0.045;
  const lx = W / 2 - armW * 0.55;
  addCyl(g, lR, lR, legH, -lx, 0,  D / 2 - 0.1, dark);
  addCyl(g, lR, lR, legH,  lx, 0,  D / 2 - 0.1, dark);
  addCyl(g, lR, lR, legH, -lx, 0, -D / 2 + backD * 0.7, dark);
  addCyl(g, lR, lR, legH,  lx, 0, -D / 2 + backD * 0.7, dark);

  addBox(g, W, H - legH, backD, 0, legH, -D / 2 + backD / 2, dark);

  const seatCz = -D / 2 + backD + seatD / 2;
  addBox(g, armW, armH - legH, seatD, -(W / 2 - armW / 2), legH, seatCz, dark);
  addBox(g, armW, armH - legH, seatD,   W / 2 - armW / 2,  legH, seatCz, dark);

  const innerW = W - armW * 2;
  addBox(g, innerW, seatH, seatD, 0, legH, seatCz, C);
  addBox(g, innerW * 0.93, cushH, seatD * 0.92, 0, legH + seatH, seatCz, light);

  const bcH = (H - legH - seatH) * 0.70;
  addBox(g, innerW * 0.86, bcH, backD * 0.45, 0, legH + seatH * 0.08, -D / 2 + backD * 0.58, light);
}

function buildBed(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const frameH = H * 0.22;
  const mattH  = H * 0.38;
  const legH   = 0.12;
  const wood   = tint(C, 0.55);
  const linen  = 0xf0ebe3;
  const pillow = 0xfaf7f2;

  // Legs
  const lR = 0.06;
  addCyl(g, lR, lR, legH, -W / 2 + 0.18, 0,  D / 2 - 0.18, wood);
  addCyl(g, lR, lR, legH,  W / 2 - 0.18, 0,  D / 2 - 0.18, wood);
  addCyl(g, lR, lR, legH, -W / 2 + 0.18, 0, -D / 2 + 0.18, wood);
  addCyl(g, lR, lR, legH,  W / 2 - 0.18, 0, -D / 2 + 0.18, wood);

  // Frame / box spring
  addBox(g, W, frameH, D, 0, legH, 0, wood);

  // Headboard
  addBox(g, W * 1.02, H,      0.22, 0, legH, -D / 2 - 0.11, wood);
  // Headboard detail panel
  addBox(g, W * 0.88, H * 0.7, 0.06, 0, legH + H * 0.15, -D / 2 - 0.18, tint(wood, 1.15));

  // Footboard (shorter)
  addBox(g, W * 1.02, H * 0.42, 0.18, 0, legH, D / 2 + 0.09, wood);

  // Mattress
  const mY = legH + frameH;
  addBox(g, W * 0.97, mattH, D * 0.95, 0, mY, 0, linen);

  // Comforter / bedding (covers 72% of length from foot end)
  addBox(g, W * 0.93, mattH * 0.45, D * 0.72, 0, mY + mattH, D * 0.12, 0xdcd4ca);

  // Pillows (2)
  const pW = W * 0.38, pH = mattH * 0.5, pD = D * 0.14;
  const pY = mY + mattH;
  addBox(g, pW, pH, pD, -W * 0.22, pY, -D * 0.39, pillow);
  addBox(g, pW, pH, pD,  W * 0.22, pY, -D * 0.39, pillow);
}

function buildDiningChair(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const seatY = H * 0.44;
  const seatH = H * 0.1;
  const dark  = tint(C, 0.70);
  const legR  = 0.035;

  // 4 tapered legs
  const lx = W / 2 - 0.1, lz = D / 2 - 0.1;
  [[- lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
    addCyl(g, legR * 0.65, legR, seatY, x, 0, z, dark);
  });

  // Seat
  addBox(g, W, seatH, D, 0, seatY, 0, C);

  // Back — 2 vertical slats + top rail + mid rail
  const slW  = Math.max(W * 0.07, 0.06);
  const slH  = H - seatY - seatH;
  const slZ  = -D / 2 + 0.04;
  addCyl(g, legR * 0.7, legR * 0.7, slH, -W * 0.3, seatY + seatH, slZ, dark);
  addCyl(g, legR * 0.7, legR * 0.7, slH,  W * 0.3, seatY + seatH, slZ, dark);
  addBox(g, W * 0.84, slW * 1.6, 0.05, 0, H - slW * 0.8, slZ, dark);
  addBox(g, W * 0.72, slW,       0.04, 0, seatY + seatH + slH * 0.45, slZ, dark);
}

function buildDiningTable(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const topH = H * 0.07;
  const legH = H - topH;
  const legR = Math.max(W * 0.025, 0.1);
  const dark = tint(C, 0.72);

  addBox(g, W, topH, D, 0, legH, 0, C);

  const lx = W / 2 - 0.22, lz = D / 2 - 0.22;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
    addCyl(g, legR, legR, legH, x, 0, z, dark);
  });

  // Apron (side rails)
  addBox(g, W - 0.5, topH * 1.5, 0.06, 0, legH - topH * 1.5, 0, dark);
  addBox(g, 0.06, topH * 1.5, D - 0.5, 0, legH - topH * 1.5, 0, dark);
}

function buildCoffeeTable(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const topH  = H * 0.12;
  const legH  = H - topH;
  const legSz = Math.max(W * 0.04, 0.08);
  const dark  = tint(C, 0.68);

  // Lower shelf
  addBox(g, W * 0.88, topH * 0.8, D * 0.88, 0, H * 0.2, 0, dark);

  const lx = W / 2 - 0.14, lz = D / 2 - 0.12;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
    addBox(g, legSz, legH, legSz, x, 0, z, dark);
  });

  addBox(g, W, topH, D, 0, legH, 0, C, 0.75);
}

function buildDesk(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const topH = H * 0.06;
  const pedH = H - topH;
  const pedW = Math.max(W * 0.14, 0.35);
  const dark = tint(C, 0.72);

  // Tabletop
  addBox(g, W, topH, D, 0, pedH, 0, C, 0.75);

  // Two side pedestals with drawers
  addBox(g, pedW, pedH, D, -(W / 2 - pedW / 2), 0, 0, dark);
  addBox(g, pedW, pedH, D,   W / 2 - pedW / 2,  0, 0, dark);

  // Three drawer fronts per pedestal
  const drawH = pedH / 3, drawW = pedW * 0.88;
  for (let i = 0; i < 3; i++) {
    const dy = drawH * i + drawH * 0.1;
    // Left pedestal drawers
    addBox(g, drawW, drawH * 0.82, 0.04, -(W / 2 - pedW / 2), dy, D / 2, tint(C, 1.1));
    // Right pedestal drawers
    addBox(g, drawW, drawH * 0.82, 0.04,   W / 2 - pedW / 2,  dy, D / 2, tint(C, 1.1));
  }

  // Centre modesty panel
  addBox(g, W - pedW * 2, pedH, 0.04, 0, 0, -D / 2 + 0.02, dark);
}

function buildBookshelf(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const t    = Math.min(D * 0.12, 0.12);  // panel thickness
  const dark = tint(C, 0.68);

  // Back panel
  addBox(g, W,       H, t,      0,           0, -D / 2 + t / 2, dark, 0.95);
  // Left side
  addBox(g, t,       H, D, -(W / 2 - t / 2), 0, 0,               dark, 0.95);
  // Right side
  addBox(g, t,       H, D,   W / 2 - t / 2,  0, 0,               dark, 0.95);
  // Top
  addBox(g, W, t, D, 0, H - t, 0, dark, 0.95);
  // Bottom
  addBox(g, W, t, D, 0, 0,     0, dark, 0.95);

  // 4 shelves, evenly spaced
  const innerH = H - t * 2;
  const gap = innerH / 5;
  for (let i = 1; i <= 4; i++) {
    addBox(g, W - t * 2, t, D - t, 0, t + gap * i, t / 2, C, 0.80);
  }
}

function buildWardrobe(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const dark  = tint(C, 0.68);
  const light = tint(C, 1.12);

  // Main carcass
  addBox(g, W, H, D, 0, 0, 0, C);

  // Two door panels (slightly proud of the front face)
  const dW = W / 2 - 0.06;
  addBox(g, dW * 0.90, H * 0.84, 0.04, -W / 4, H * 0.08, D / 2, light);
  addBox(g, dW * 0.90, H * 0.84, 0.04,  W / 4, H * 0.08, D / 2, light);

  // Centre gap line
  addBox(g, 0.02, H, 0.05, 0, 0, D / 2 + 0.01, dark);

  // Handles
  addBox(g, 0.04, H * 0.08, 0.05, -W / 4 + dW * 0.36, H * 0.46, D / 2 + 0.025, dark);
  addBox(g, 0.04, H * 0.08, 0.05,  W / 4 - dW * 0.36, H * 0.46, D / 2 + 0.025, dark);

  // Cornice (top trim)
  addBox(g, W * 1.01, H * 0.03, D * 1.02 + 0.04, 0, H, 0, dark);
}

function buildDresser(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const dark  = tint(C, 0.68);
  const light = tint(C, 1.12);
  const nD    = 4;

  // Main body
  addBox(g, W, H, D, 0, 0, 0, C);

  // Top (slightly lighter)
  addBox(g, W, H * 0.025, D, 0, H, 0, light, 0.65);

  // Drawer fronts
  const dH = (H * 0.88) / nD;
  for (let i = 0; i < nD; i++) {
    const dy = H * 0.06 + dH * i + dH * 0.06;
    addBox(g, W * 0.90, dH * 0.85, 0.04, 0, dy, D / 2, light);
    // Drawer handle
    addBox(g, W * 0.12, 0.04, 0.04, 0, dy + dH * 0.42, D / 2 + 0.025, dark);
  }
}

function buildTvStand(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const dark  = tint(C, 0.68);
  const light = tint(C, 1.12);

  addBox(g, W, H, D, 0, 0, 0, C);
  // Top surface
  addBox(g, W, H * 0.025, D, 0, H, 0, light, 0.65);

  // Two cabinet doors
  const dW = W / 2 - 0.06;
  addBox(g, dW * 0.88, H * 0.78, 0.04, -W / 4, H * 0.11, D / 2, light);
  addBox(g, dW * 0.88, H * 0.78, 0.04,  W / 4, H * 0.11, D / 2, light);

  // Handles
  addBox(g, 0.04, H * 0.12, 0.04, -W / 4 + dW * 0.32, H * 0.47, D / 2 + 0.022, dark);
  addBox(g, 0.04, H * 0.12, 0.04,  W / 4 - dW * 0.32, H * 0.47, D / 2 + 0.022, dark);

  // Short feet
  const fH = H * 0.06, fW = 0.1;
  addBox(g, fW, fH, fW, -W / 2 + 0.14, 0, D / 2 - 0.12, dark);
  addBox(g, fW, fH, fW,  W / 2 - 0.14, 0, D / 2 - 0.12, dark);
  addBox(g, fW, fH, fW, -W / 2 + 0.14, 0, -D / 2 + 0.12, dark);
  addBox(g, fW, fH, fW,  W / 2 - 0.14, 0, -D / 2 + 0.12, dark);
}

function buildSideTable(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const topH = H * 0.10;
  const legH = H - topH;
  const legR = Math.max(W * 0.07, 0.04);
  const dark = tint(C, 0.68);

  const lx = W / 2 - 0.1, lz = D / 2 - 0.1;
  [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
    addCyl(g, legR, legR, legH, x, 0, z, dark);
  });
  addBox(g, W, topH, D, 0, legH, 0, C, 0.72);
}

function buildNightstand(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const dark  = tint(C, 0.68);
  const light = tint(C, 1.12);

  addBox(g, W, H, D, 0, 0, 0, C);
  addBox(g, W, H * 0.025, D, 0, H, 0, light, 0.65);

  // One top drawer
  addBox(g, W * 0.88, H * 0.34, 0.04, 0, H * 0.5, D / 2, light);
  addBox(g, W * 0.18, 0.04, 0.04, 0, H * 0.67, D / 2 + 0.022, dark);

  // Lower open shelf (shadow)
  addBox(g, W * 0.88, H * 0.34, 0.04, 0, H * 0.12, D / 2, tint(C, 0.82));
}

function buildFloorLamp(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const baseR  = W / 2 * 0.8;
  const baseH  = H * 0.03;
  const poleR  = 0.04;
  const poleH  = H * 0.84;
  const shadeH = H * 0.14;
  const shadeR = W / 2 * 0.75;
  const gold   = 0xb8963e;

  // Weighted base
  addCyl(g, baseR, baseR * 1.15, baseH, 0, 0, 0, tint(C, 0.7));

  // Pole
  addCyl(g, poleR, poleR, poleH, 0, baseH, 0, gold);

  // Shade (truncated cone: wide at bottom, narrow at top)
  const shadeGeo  = new THREE.CylinderGeometry(shadeR * 0.45, shadeR, shadeH, 20);
  const shadeMesh = new THREE.Mesh(
    shadeGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff5d6, roughness: 0.5, emissive: 0xfff4c2, emissiveIntensity: 0.15, side: THREE.DoubleSide }),
  );
  shadeMesh.position.set(0, baseH + poleH + shadeH / 2, 0);
  shadeMesh.castShadow = false;
  g.add(shadeMesh);

  // Finial (top knob)
  addCyl(g, 0.05, 0.05, 0.08, 0, baseH + poleH + shadeH, 0, gold);
}

function buildPlant(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const potR   = W / 2 * 0.8;
  const potH   = H * 0.28;
  const trunk  = H * 0.12;
  const fR     = W / 2 * 1.1;
  const green  = 0x4a7c59;

  // Terracotta-ish pot
  addCyl(g, potR, potR * 0.72, potH, 0, 0, 0, 0x9c6040, 14);
  // Soil
  addCyl(g, potR * 0.85, potR * 0.85, potH * 0.06, 0, potH, 0, 0x3a2e24);

  // Trunk / stem
  addCyl(g, 0.05, 0.06, trunk, 0, potH, 0, 0x6b4f2a, 8);

  // Foliage — main sphere
  addSphere(g, fR, 0, potH + trunk + fR * 0.7, 0, tint(green, 1.1));
  // Two accent lobes
  addSphere(g, fR * 0.65, W * 0.3, potH + trunk + fR * 0.9, 0, tint(green, 0.88));
  addSphere(g, fR * 0.55, -W * 0.25, potH + trunk + fR * 0.75, W * 0.15, tint(green, 0.95));
}

function buildRug(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const dark   = tint(C, 0.70);
  const border = Math.min(0.25, W * 0.04);

  // Field
  addBox(g, W, H, D, 0, 0, 0, C, 0.95);
  // Border strips (slightly proud to avoid z-fighting)
  addBox(g, W, H * 1.015, border, 0,  0, -(D / 2 - border / 2), dark, 0.95);
  addBox(g, W, H * 1.015, border, 0,  0,   D / 2 - border / 2,  dark, 0.95);
  addBox(g, border, H * 1.015, D, -(W / 2 - border / 2), 0, 0, dark, 0.95);
  addBox(g, border, H * 1.015, D,   W / 2 - border / 2,  0, 0, dark, 0.95);
}

function buildOfficeChair(g: THREE.Group, W: number, D: number, H: number, C: number) {
  const seatY  = H * 0.42;
  const seatH  = H * 0.10;
  const backH  = H - seatY - seatH;
  const backD  = D * 0.12;
  const armY   = backH * 0.30;
  const grey   = 0x888888;
  const dark   = tint(C, 0.65);

  // 5-spoke base (simulated as a flat disc)
  addCyl(g, W * 0.52, W * 0.52, H * 0.03, 0, 0, 0, grey, 5);

  // 5 spokes
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const sx = Math.cos(angle) * W * 0.4;
    const sz = Math.sin(angle) * W * 0.4;
    addBox(g, 0.06, H * 0.025, W * 0.4, sx / 2, 0, sz / 2, grey);
  }

  // Pneumatic cylinder
  addCyl(g, 0.07, 0.07, seatY - H * 0.03, 0, H * 0.03, 0, grey);

  // Seat pan
  addBox(g, W, seatH, D, 0, seatY, 0, dark);
  // Seat cushion
  addBox(g, W * 0.92, seatH * 0.6, D * 0.90, 0, seatY + seatH, 0, tint(C, 1.12));

  // Back support
  addBox(g, W * 0.78, backH, backD, 0, seatY + seatH, -D / 2 + backD / 2, dark);
  // Lumbar pad
  addBox(g, W * 0.68, backH * 0.38, backD * 0.55, 0, seatY + seatH + backH * 0.12, -D / 2 + backD * 0.8, tint(C, 1.08));

  // Armrests
  const aL = D * 0.50;
  const aW = 0.08;
  addBox(g, aW, H * 0.03, aL, -W * 0.40, seatY + seatH + armY, D / 2 - aL / 2, grey);
  addBox(g, aW, H * 0.03, aL,  W * 0.40, seatY + seatH + armY, D / 2 - aL / 2, grey);
  addCyl(g, 0.035, 0.035, armY, -W * 0.40, seatY + seatH, 0, grey, 8);
  addCyl(g, 0.035, 0.035, armY,  W * 0.40, seatY + seatH, 0, grey, 8);
}

function buildDefaultBox(g: THREE.Group, W: number, D: number, H: number, C: number) {
  addBox(g, W, H, D, 0, 0, 0, C);
}

// ── Main exported builder ──────────────────────────────────────────────────────

/**
 * Build a realistic compound Three.js group for a given furniture type.
 * The returned group's local origin is at (0, 0, 0) = floor centre of the piece.
 *
 * @param type     Furniture preset type (e.g. 'sofa', 'bed-king')
 * @param W        Width in feet
 * @param D        Depth in feet
 * @param H        Height in feet
 * @param colorHex CSS hex color of the primary material (e.g. '#8b7355')
 */
export function buildFurnitureGroup(
  type: string,
  W: number, D: number, H: number,
  colorHex: string,
): THREE.Group {
  const C = hexN(colorHex);
  const g = new THREE.Group();

  switch (type) {
    case 'sofa':
    case 'sectional':
      buildSofa(g, W, D, H, C);
      break;
    case 'armchair':
      buildArmchair(g, W, D, H, C);
      break;
    case 'bed-king':
    case 'bed-queen':
    case 'bed-single':
      buildBed(g, W, D, H, C);
      break;
    case 'dining-chair':
      buildDiningChair(g, W, D, H, C);
      break;
    case 'dining-table':
      buildDiningTable(g, W, D, H, C);
      break;
    case 'coffee-table':
      buildCoffeeTable(g, W, D, H, C);
      break;
    case 'desk':
      buildDesk(g, W, D, H, C);
      break;
    case 'bookshelf':
      buildBookshelf(g, W, D, H, C);
      break;
    case 'wardrobe':
      buildWardrobe(g, W, D, H, C);
      break;
    case 'dresser':
      buildDresser(g, W, D, H, C);
      break;
    case 'tv-stand':
      buildTvStand(g, W, D, H, C);
      break;
    case 'side-table':
      buildSideTable(g, W, D, H, C);
      break;
    case 'nightstand':
      buildNightstand(g, W, D, H, C);
      break;
    case 'floor-lamp':
      buildFloorLamp(g, W, D, H, C);
      break;
    case 'plant':
      buildPlant(g, W, D, H, C);
      break;
    case 'rug':
      buildRug(g, W, D, H, C);
      break;
    case 'office-chair':
      buildOfficeChair(g, W, D, H, C);
      break;
    default:
      buildDefaultBox(g, W, D, H, C);
  }

  return g;
}
