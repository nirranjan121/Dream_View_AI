import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Types (local to widget — avoids import path issues) ──────────────

interface RoomShape {
  id: string;
  name: string;
  polygon: { x: number; y: number }[];
  wallHeightM: number;
}

interface RoomMaterials {
  wallColor: string;
  wallColorId?: string;
  wallTexture: string;
  floorMaterial: string;
  floorColor?: string;
}

const WALL_THICKNESS_M = 0.15;

export interface SceneHandle {
  setWallColor: (hex: string, roomId?: string) => void;
  setWallTexture: (roomId: string, textureType: string, colorHex: string) => void;
  setFloorMaterial: (roomId: string, materialId: string, colorHex: string) => void;
  updateAllRoomMaterials: (roomMaterials: Record<string, RoomMaterials>) => void;
  dispose: () => void;
}

/**
 * Generates a procedural canvas texture for different material types.
 * This avoids needing external image files — everything is generated at runtime.
 */
function generateProceduralTexture(
  textureType: string,
  baseColor: string,
  size: number = 256
): THREE.CanvasTexture | null {
  if (textureType === 'flat') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Fill with base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  switch (textureType) {
    case 'brick': {
      const brickH = size / 8;
      const brickW = size / 4;
      ctx.strokeStyle = 'rgba(80, 60, 40, 0.4)';
      ctx.lineWidth = 2;
      for (let row = 0; row < 8; row++) {
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = -1; col < 5; col++) {
          ctx.strokeRect(offset + col * brickW, row * brickH, brickW, brickH);
          ctx.fillStyle = `rgba(${Math.random() * 30}, ${Math.random() * 20}, 0, 0.08)`;
          ctx.fillRect(offset + col * brickW + 2, row * brickH + 2, brickW - 4, brickH - 4);
        }
      }
      break;
    }
    case 'stone': {
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 30 + Math.random() * 60;
        const h = 20 + Math.random() * 40;
        ctx.strokeStyle = `rgba(60, 60, 60, ${0.2 + Math.random() * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = `rgba(${Math.random() * 40}, ${Math.random() * 40}, ${Math.random() * 40}, 0.1)`;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
      break;
    }
    case 'wood_panel': {
      for (let x = 0; x < size; x += 2) {
        const alpha = 0.03 + Math.random() * 0.08;
        ctx.strokeStyle = `rgba(60, 30, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.random() - 0.5) * 3, size);
        ctx.stroke();
      }
      for (let x = 0; x < size; x += size / 4) {
        ctx.strokeStyle = 'rgba(40, 20, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
      break;
    }
    case 'concrete': {
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const gray = Math.random() * 60;
        ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.15)`;
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      break;
    }
    case 'plaster': {
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(200, 190, 175, ${Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'marble': {
      ctx.strokeStyle = 'rgba(180, 170, 160, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        let x = Math.random() * size;
        let y = 0;
        ctx.moveTo(x, y);
        while (y < size) {
          x += (Math.random() - 0.5) * 30;
          y += 5 + Math.random() * 15;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'granite': {
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const colors = ['rgba(40,40,40,0.2)', 'rgba(100,100,100,0.15)', 'rgba(160,160,160,0.1)', 'rgba(200,200,200,0.1)'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
      }
      break;
    }
    case 'ceramic': {
      const tileSize = size / 4;
      ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= size; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
      for (let y = 0; y <= size; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
      break;
    }
    case 'hardwood': {
      for (let y = 0; y < size; y += 1) {
        const alpha = 0.02 + Math.random() * 0.06;
        ctx.strokeStyle = `rgba(80, 40, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
        ctx.stroke();
      }
      for (let y = 0; y < size; y += size / 5) {
        ctx.strokeStyle = 'rgba(50, 25, 0, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
      break;
    }
    case 'carpet': {
      for (let i = 0; i < 8000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(${Math.random() * 50}, ${Math.random() * 50}, ${Math.random() * 50}, 0.06)`;
        ctx.fillRect(x, y, 1, 1);
      }
      break;
    }
    case 'vinyl': {
      for (let y = 0; y < size; y += 3) {
        const alpha = 0.02 + Math.random() * 0.04;
        ctx.strokeStyle = `rgba(100, 70, 40, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Configure roughness & metalness based on material ID
 */
function configureMaterialProperties(material: THREE.MeshStandardMaterial, materialId: string) {
  material.roughness = 0.85;
  material.metalness = 0.0;

  const matLower = materialId.toLowerCase();
  if (matLower.includes('marble')) {
    material.roughness = 0.15;
    material.metalness = 0.05;
  } else if (matLower.includes('granite')) {
    material.roughness = 0.25;
    material.metalness = 0.08;
  } else if (matLower.includes('ceramic') || matLower.includes('tile') || matLower.includes('porcelain')) {
    material.roughness = 0.2;
    material.metalness = 0.0;
  } else if (matLower.includes('hardwood') || matLower.includes('oak') || matLower.includes('wood') || matLower.includes('walnut')) {
    material.roughness = 0.4;
    material.metalness = 0.0;
  } else if (matLower.includes('carpet')) {
    material.roughness = 0.98;
  } else if (matLower.includes('vinyl')) {
    material.roughness = 0.55;
  } else if (matLower.includes('concrete') || matLower.includes('cement')) {
    material.roughness = 0.75;
  }
}

/**
 * Generates stylized, premium low-poly furniture to render inside rooms based on their names.
 */
function addRoomFurniture(roomGroup: THREE.Group, roomName: string, center: { x: number; z: number }) {
  const nameLower = roomName.toLowerCase();
  const fGroup = new THREE.Group();
  fGroup.position.set(center.x, 0.01, center.z); // Slightly above floor

  // Material palettes
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 }); // Warm walnut
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 }); // Cozy white fabric
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xcca43b, roughness: 0.2, metalness: 0.8 }); // Brushed gold/brass
  const darkConsoleMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 }); // Charcoal slate
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0xe3dac9, roughness: 0.95 }); // Linen sheet
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, roughness: 0.1, metalness: 0.1 }); // Blue tub water

  if (nameLower.includes('living')) {
    // ── Sofa ──
    const sofa = new THREE.Group();
    // Base seat cushion
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.8), cushionMat);
    seat.position.set(0, 0.15, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    sofa.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.2), cushionMat);
    back.position.set(0, 0.45, -0.35);
    back.castShadow = true;
    back.receiveShadow = true;
    sofa.add(back);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.8), cushionMat);
    armL.position.set(-1.0, 0.25, 0);
    armL.castShadow = true;
    sofa.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.8), cushionMat);
    armR.position.set(1.0, 0.25, 0);
    armR.castShadow = true;
    sofa.add(armR);

    sofa.position.set(0, 0, -0.4);
    fGroup.add(sofa);

    // ── Coffee Table ──
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.6), woodMat);
    top.position.set(0, 0.35, 0);
    top.castShadow = true;
    table.add(top);

    // 4 metal legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
    const legCoords = [
      [-0.45, -0.3], [0.45, -0.3],
      [-0.45, 0.3], [0.45, 0.3]
    ];
    for (const [lx, lz] of legCoords) {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 0.175, lz);
      leg.castShadow = true;
      table.add(leg);
    }
    table.position.set(0, 0, 0.5);
    fGroup.add(table);

  } else if (nameLower.includes('bedroom')) {
    // ── Queen Size Bed ──
    const bed = new THREE.Group();

    // Wood Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 0.1), woodMat);
    headboard.position.set(0, 0.5, -0.95);
    headboard.castShadow = true;
    bed.add(headboard);

    // Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.9), sheetMat);
    mattress.position.set(0, 0.225, 0.05);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bed.add(mattress);

    // Two pillows
    const pillowGeo = new THREE.BoxGeometry(0.6, 0.1, 0.4);
    const pillowL = new THREE.Mesh(pillowGeo, cushionMat);
    pillowL.position.set(-0.4, 0.475, -0.65);
    pillowL.rotation.x = -0.15;
    bed.add(pillowL);

    const pillowR = new THREE.Mesh(pillowGeo, cushionMat);
    pillowR.position.set(0.4, 0.475, -0.65);
    pillowR.rotation.x = -0.15;
    bed.add(pillowR);

    // Side tables
    const sideTableL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), woodMat);
    sideTableL.position.set(-1.1, 0.225, -0.8);
    sideTableL.castShadow = true;
    bed.add(sideTableL);

    const sideTableR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), woodMat);
    sideTableR.position.set(1.1, 0.225, -0.8);
    sideTableR.castShadow = true;
    bed.add(sideTableR);

    fGroup.add(bed);

  } else if (nameLower.includes('kitchen')) {
    // ── Kitchen Island Counter ──
    const island = new THREE.Group();

    // Slate base counter
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.8), darkConsoleMat);
    base.position.set(0, 0.425, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    island.add(base);

    // Marble top
    const marbleTopMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfb, roughness: 0.1 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.9), marbleTopMat);
    top.position.set(0, 0.875, 0);
    top.castShadow = true;
    island.add(top);

    // High stools (2x)
    const stoolGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03);
    const stoolLegGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6);
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });

    for (let i = 0; i < 2; i++) {
      const stool = new THREE.Group();
      const seat = new THREE.Mesh(stoolGeo, stoolMat);
      seat.position.set(0, 0.6, 0);
      seat.castShadow = true;
      stool.add(seat);

      const leg = new THREE.Mesh(stoolLegGeo, metalMat);
      leg.position.set(0, 0.3, 0);
      leg.castShadow = true;
      stool.add(leg);

      stool.position.set(-0.4 + i * 0.8, 0, 0.75);
      island.add(stool);
    }

    fGroup.add(island);

  } else if (nameLower.includes('bathroom') || nameLower.includes('restroom') || nameLower.includes('toilet')) {
    // ── Luxury Bathtub ──
    const tub = new THREE.Group();
    // Outer structure
    const outer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.75), sheetMat);
    outer.position.set(0, 0.275, 0);
    outer.castShadow = true;
    outer.receiveShadow = true;
    tub.add(outer);

    // Inner water surface
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.6), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.48, 0);
    tub.add(water);

    // Brass faucet
    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15), metalMat);
    faucet.position.set(-0.68, 0.6, 0);
    faucet.castShadow = true;
    tub.add(faucet);

    fGroup.add(tub);

  } else if (nameLower.includes('dining')) {
    // ── Dining Table ──
    const dining = new THREE.Group();

    // Table top
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.0), woodMat);
    tableTop.position.set(0, 0.72, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    dining.add(tableTop);

    // Table legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.69);
    const legCoords = [
      [-0.8, -0.4], [0.8, -0.4],
      [-0.8, 0.4], [0.8, 0.4]
    ];
    for (const [lx, lz] of legCoords) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, 0.345, lz);
      leg.castShadow = true;
      dining.add(leg);
    }

    // Chairs (4x)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
    const chairCoords = [
      [-0.5, -0.7, 0], [0.5, -0.7, 0], // Bottom row
      [-0.5, 0.7, Math.PI], [0.5, 0.7, Math.PI] // Top row
    ];
    for (const [cx, cz, crot] of chairCoords) {
      const chair = new THREE.Group();
      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), chairMat);
      seat.position.set(0, 0.42, 0);
      seat.castShadow = true;
      chair.add(seat);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.04), chairMat);
      back.position.set(0, 0.62, 0.17);
      back.castShadow = true;
      chair.add(back);

      // Simple leg
      const cleg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), metalMat);
      cleg.position.set(0, 0.2, 0);
      chair.add(cleg);

      chair.position.set(cx, 0, cz);
      chair.rotation.y = crot;
      dining.add(chair);
    }

    fGroup.add(dining);
  }

  roomGroup.add(fGroup);
}

/**
 * Builds the extruded shell: one flat floor mesh per room, dynamic shadow mapping,
 * smooth orbit controls, GridHelper, gradient Sky Dome, and stylized room furniture.
 */
export function buildHouseScene(
  container: HTMLElement,
  rooms: RoomShape[],
  initial: {
    wallColorHex?: string;
    roomMaterials?: Record<string, RoomMaterials>;
  },
): SceneHandle {
  const width = container.clientWidth || 640;
  const height = container.clientHeight || 480;

  const scene = new THREE.Scene();

  // 1. Create a beautiful gradient Sky Dome (World Box)
  const skyGeo = new THREE.SphereGeometry(100, 32, 15);
  const positions = skyGeo.attributes.position;
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    // Normalize height to [0, 1] relative to diameter
    const factor = (y + 100) / 200;
    // Interpolate horizon off-white (0.92, 0.91, 0.88) to soft architectural sky-blue (0.84, 0.90, 0.98)
    const r = 0.92 - factor * 0.08;
    const g = 0.91 - factor * 0.01;
    const b = 0.88 + factor * 0.10;
    colors.push(r, g, b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const skyMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const center = polygonsCenter(rooms);
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 250);
  camera.position.set(center.x + 12, 12, center.z + 12);

  // 2. Initialize WebGLRenderer with Soft Shadow Maps enabled
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(center.x, 0, center.z);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.05; // Lock camera below ground plane
  controls.update();

  // 3. Set up professional architectural lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.35);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(center.x + 15, 20, center.z + 10);
  sun.castShadow = true;
  // Shadow map configurations
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  const d = 16;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // 4. Ground system (grid + base plate)
  const gridHelper = new THREE.GridHelper(40, 40, 0xcccccc, 0xeeeeee);
  gridHelper.position.set(center.x, -0.005, center.z);
  scene.add(gridHelper);

  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.1, 22),
    new THREE.MeshStandardMaterial({ color: 0xe5e4df, roughness: 0.8 })
  );
  basePlate.position.set(center.x, -0.06, center.z);
  basePlate.receiveShadow = true;
  scene.add(basePlate);

  const roomGroup = new THREE.Group();
  scene.add(roomGroup);

  // ── Per-room tracking ───────────────────────────────────────────
  const wallMeshesByRoom = new Map<string, THREE.Mesh[]>();
  const floorMeshByRoom = new Map<string, THREE.Mesh>();
  const roomMaterialsCopy: Record<string, RoomMaterials> = {};

  const defaultWallColor = initial.wallColorHex ?? '#f2f0ea';

  for (const room of rooms) {
    const rm = initial.roomMaterials?.[room.id] ?? {
      wallColor: defaultWallColor,
      wallTexture: 'flat',
      floorMaterial: 'raw_concrete_floor',
      floorColor: '#9B9B93',
    };
    roomMaterialsCopy[room.id] = { ...rm };

    // ── Floor mesh ─────────────────────────────────────────────
    const pts = room.polygon;
    const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
    const floorColor = rm.floorColor ?? '#9B9B93';
    const floorTextureType = getTextureTypeForMaterial(rm.floorMaterial);
    const floorTexture = generateProceduralTexture(floorTextureType, floorColor);

    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      side: THREE.DoubleSide,
      ...(floorTexture ? { map: floorTexture } : {}),
    });
    configureMaterialProperties(floorMat, rm.floorMaterial);

    const floorMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);
    floorMeshByRoom.set(room.id, floorMesh);

    // ── Wall meshes ────────────────────────────────────────────
    const wallTexture = generateProceduralTexture(rm.wallTexture || 'flat', rm.wallColor);
    const wallMat = new THREE.MeshStandardMaterial({
      color: rm.wallColor,
      ...(wallTexture ? { map: wallTexture } : {}),
    });
    configureMaterialProperties(wallMat, 'flat');

    const wallMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) continue;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(length, room.wallHeightM, WALL_THICKNESS_M),
        wallMat.clone(),
      );
      wall.position.set((p1.x + p2.x) / 2, room.wallHeightM / 2, (p1.y + p2.y) / 2);
      wall.rotation.y = -Math.atan2(dy, dx);
      wall.castShadow = true;
      wall.receiveShadow = true;
      roomGroup.add(wall);
      wallMeshes.push(wall);
    }
    wallMeshesByRoom.set(room.id, wallMeshes);

    // ── Room Centroid for Furniture ──
    const rCenter = singleRoomCentroid(pts);
    addRoomFurniture(roomGroup, room.name, rCenter);
  }

  // ── Animation loop ──────────────────────────────────────────────
  let raf = 0;
  const animate = () => {
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  const onResize = () => {
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 480;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // ── Scene handle (public API for live updates) ──────────────────
  return {
    setWallColor(hex: string, roomId?: string) {
      const targetRooms = roomId ? [roomId] : rooms.map(r => r.id);
      for (const rId of targetRooms) {
        const meshes = wallMeshesByRoom.get(rId);
        if (meshes) {
          for (const mesh of meshes) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.set(hex);
            mat.map = null;
            mat.needsUpdate = true;
          }
        }
      }
    },

    setWallTexture(roomId: string, textureType: string, colorHex: string) {
      const meshes = wallMeshesByRoom.get(roomId);
      if (!meshes) return;
      const texture = generateProceduralTexture(textureType, colorHex);
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(colorHex);
        mat.map = texture;
        mat.needsUpdate = true;
      }
    },

    setFloorMaterial(roomId: string, materialId: string, colorHex: string) {
      const mesh = floorMeshByRoom.get(roomId);
      if (!mesh) return;
      const textureType = getTextureTypeForMaterial(materialId);
      const texture = generateProceduralTexture(textureType, colorHex);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(colorHex);
      mat.map = texture;
      configureMaterialProperties(mat, materialId);
      mat.needsUpdate = true;
    },

    updateAllRoomMaterials(roomMaterials: Record<string, RoomMaterials>) {
      for (const [roomId, rm] of Object.entries(roomMaterials)) {
        // Update walls
        const wallMeshes = wallMeshesByRoom.get(roomId);
        if (wallMeshes) {
          const wallTextureType = rm.wallTexture || 'flat';
          const wallTexture = generateProceduralTexture(wallTextureType, rm.wallColor);
          for (const mesh of wallMeshes) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.set(rm.wallColor);
            mat.map = wallTexture;
            mat.needsUpdate = true;
          }
        }
        // Update floor
        const floorMesh = floorMeshByRoom.get(roomId);
        if (floorMesh) {
          const floorColor = rm.floorColor ?? '#9B9B93';
          const floorTextureType = getTextureTypeForMaterial(rm.floorMaterial);
          const floorTexture = generateProceduralTexture(floorTextureType, floorColor);
          const mat = floorMesh.material as THREE.MeshStandardMaterial;
          mat.color.set(floorColor);
          mat.map = floorTexture;
          configureMaterialProperties(mat, rm.floorMaterial);
          mat.needsUpdate = true;
        }
      }
    },

    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function polygonsCenter(rooms: RoomShape[]): { x: number; z: number } {
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (const room of rooms) {
    for (const p of room.polygon) {
      sx += p.x;
      sz += p.y;
      n++;
    }
  }
  return n === 0 ? { x: 0, z: 0 } : { x: sx / n, z: sz / n };
}

function singleRoomCentroid(polygon: { x: number; y: number }[]): { x: number; z: number } {
  let sx = 0;
  let sy = 0;
  for (const p of polygon) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / polygon.length, z: sy / polygon.length };
}

/**
 * Maps a material catalog ID to its procedural texture type.
 */
function getTextureTypeForMaterial(materialId: string): string {
  if (!materialId) return 'flat';
  const matLower = materialId.toLowerCase();
  if (matLower.includes('marble')) return 'marble';
  if (matLower.includes('granite')) return 'granite';
  if (matLower.includes('ceramic') || matLower.includes('porcelain') || matLower.includes('tile')) return 'ceramic';
  if (matLower.includes('hardwood') || matLower.includes('oak') ||
      matLower.includes('walnut') || matLower.includes('teak') ||
      matLower.includes('maple') || matLower.includes('cherry') ||
      matLower.includes('bamboo') || matLower.includes('wood')) return 'hardwood';
  if (matLower.includes('carpet')) return 'carpet';
  if (matLower.includes('vinyl')) return 'vinyl';
  if (matLower.includes('concrete') || matLower.includes('cement')) return 'concrete';
  if (matLower.includes('brick')) return 'brick';
  if (matLower.includes('stone') || matLower.includes('slate') ||
      matLower.includes('limestone')) return 'stone';
  if (matLower.includes('wood_panel')) return 'wood_panel';
  if (matLower.includes('plaster')) return 'plaster';
  return 'flat';
}
