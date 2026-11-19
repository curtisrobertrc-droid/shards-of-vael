// Shards of Vael — Greenhollow Vale vertical slice
import * as THREE from 'three';
import { GLTFLoader } from '../lib/addons/GLTFLoader.js';
import * as SkeletonUtils from '../lib/addons/SkeletonUtils.js';
import { RARITY, SLOTS, SLOT_NAMES, SLOT_ICONS, STAT_NAMES, makeItem, rollRarity, randomSlot, ENEMIES, xpToNext, LEVEL_CAP, SKILLS, NPCS, QUESTS, VENDOR_STOCK, newId, TALENTS, TALENT_TREES } from './data.js';

const SAVE_KEY = 'vael_save_v1';
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (IS_TOUCH) document.body.classList.add('touch');
const $ = (id) => document.getElementById(id);
const UP = new THREE.Vector3(0, 1, 0);
const WORLD_R = 52;

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc7d9);
scene.fog = new THREE.Fog(0x9cc7d9, 105, 150);

let viewH = IS_TOUCH ? 17 : 21;
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 300);
const CAM_OFF = new THREE.Vector3(1, 1.3, 1).normalize().multiplyScalar(80);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  const a = innerWidth / innerHeight;
  camera.left = -viewH * a / 2; camera.right = viewH * a / 2; camera.top = viewH / 2; camera.bottom = -viewH / 2;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x4a5a2a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);

// ---------- settings & performance safeguards ----------
const SETTINGS_KEY = 'vael_settings_v1';
let settings = { quality: 'auto', shadows: true, music: true, sfx: true, fps: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
let autoLevel = IS_TOUCH ? 'medium' : 'high';
const QUALITY_NAMES = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' };
function effQuality() { return settings.quality === 'auto' ? autoLevel : settings.quality; }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
function applyQuality() {
  const q = effQuality(); const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
  const sh = settings.shadows && q !== 'low';
  if (renderer.shadowMap.enabled !== sh) {
    renderer.shadowMap.enabled = sh; sun.castShadow = sh;
    scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
  }
  const size = q === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  resize();
}
applyQuality();
renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); const t = document.getElementById('toast'); if (t) t.innerHTML = 'Graphics paused<div class="s">Reload the page if the screen stays blank. Your progress is saved.</div>'; });
const perf = { frames: 0, t: 0, fps: 60, el: null };
function perfTick(dt) {
  perf.frames++; perf.t += dt;
  if (perf.t >= 4) {
    perf.fps = perf.frames / perf.t; perf.frames = 0; perf.t = 0;
    if (settings.fps) { if (!perf.el) { perf.el = document.createElement('div'); perf.el.id = 'fps'; document.body.appendChild(perf.el); } perf.el.textContent = `${Math.round(perf.fps)} fps · ${QUALITY_NAMES[effQuality()]}`; }
    if (settings.quality === 'auto' && perf.fps < 26 && autoLevel !== 'low' && !(window.VAEL && window.VAEL.speed > 1)) {
      autoLevel = autoLevel === 'high' ? 'medium' : 'low'; applyQuality();
      if (typeof toast === 'function') toast('', `Graphics set to ${QUALITY_NAMES[autoLevel]} for smoother play (change it in the menu)`);
    }
  }
}

// ---------- assets ----------
const ASSET_LIST = [
  'chars/character-knight', 'chars/character-zombie', 'chars/character-raider', 'chars/character-soldier', 'chars/character-male-c', 'chars/character-female-b', 'chars/weapon-sword', 'chars/shield-round',
  'grave/character-skeleton', 'grave/character-ghost', 'grave/gravestone-cross', 'grave/gravestone-round', 'grave/gravestone-broken', 'grave/gravestone-wide', 'grave/crypt', 'grave/crypt-large', 'grave/iron-fence', 'grave/iron-fence-damaged', 'grave/pine-crooked', 'grave/pumpkin-carved', 'grave/altar-stone', 'grave/pillar-obelisk', 'grave/candle-multiple', 'grave/lantern-candle', 'grave/fire-basket', 'grave/debris', 'grave/urn-round', 'grave/pillar-large', 'grave/lightpost-single',
  'town/windmill', 'town/stall-red', 'town/stall-green', 'town/stall-bench', 'town/fountain-round', 'town/lantern', 'town/cart', 'town/banner-red', 'town/banner-green', 'town/fence', 'town/wall-wood', 'town/wall-wood-door', 'town/wall-wood-window-shutters', 'town/roof-gable', 'town/tree', 'town/tree-high-round', 'town/rock-large', 'town/hedge', 'town/chimney',
  'surv/tent', 'surv/tent-canvas', 'surv/campfire-pit', 'surv/barrel', 'surv/box-large', 'surv/chest', 'surv/signpost', 'surv/workbench', 'surv/resource-wood', 'surv/bedroll',
  'dun/potion', 'dun/coin', 'dun/chest', 'dun/character-orc', 'dun/floor', 'dun/floor-detail', 'dun/wall', 'dun/column', 'dun/barrel', 'dun/rocks', 'dun/stones', 'dun/wood-structure', 'dun/wood-support',
  'nature/tree_default', 'nature/tree_oak', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineTallA', 'nature/tree_pineRoundC', 'nature/tree_pineDefaultA', 'nature/tree_default_dark', 'nature/tree_pineTallD', 'nature/plant_bushLarge', 'nature/plant_bush', 'nature/flower_redA', 'nature/flower_yellowB', 'nature/flower_purpleA', 'nature/grass_large', 'nature/rock_largeA', 'nature/rock_largeC', 'nature/rock_tallB', 'nature/stump_round', 'nature/log_large', 'nature/crop_pumpkin', 'nature/crops_cornStageD', 'nature/crops_wheatStageB', 'nature/mushroom_redGroup', 'nature/fence_simple', 'nature/statue_obelisk', 'nature/statue_columnDamaged',
];
const G = {};
const RECOLOR = { leafsGreen: 0x5a9e3a, leafsDark: 0x2f6e3a, grass: 0x66a843, dirt: 0x8a7a66, woodBark: 0x7a4f2e, woodBarkDark: 0x5a3a26, stone: 0x9a9690, stoneDark: 0x7a7670 };
async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(ASSET_LIST.map(async (p) => {
    const g = await loader.loadAsync(`assets/${p}.glb`);
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.metalness = 0; o.material.roughness = Math.max(0.75, o.material.roughness ?? 1); if (p.startsWith('nature/') && RECOLOR[o.material.name] !== undefined) o.material.color.setHex(RECOLOR[o.material.name]); } } });
    G[p] = g; done++; onProgress(done / ASSET_LIST.length);
  }));
}

// ---------- static instancing ----------
const colliders = [];
function addCollider(x, z, r) { colliders.push({ x, z, r }); }
const tmpM = new THREE.Matrix4(), tmpP = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpV = new THREE.Vector3();
function addStatic(path, items, shadow = true) {
  if (!items.length) return;
  const root = G[path].scene; root.updateMatrixWorld(true);
  const meshes = []; root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const m of meshes) {
    const im = new THREE.InstancedMesh(m.geometry, m.material, items.length);
    items.forEach((it, i) => {
      tmpQ.setFromAxisAngle(UP, it.r || 0); tmpS.set(it.s || 1, it.sy ?? (it.s || 1), it.s || 1); tmpV.set(it.x, it.y || 0, it.z);
      tmpP.compose(tmpV, tmpQ, tmpS); tmpM.multiplyMatrices(tmpP, m.matrixWorld); im.setMatrixAt(i, tmpM);
    });
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere();
    scene.add(im);
  }
}
function placeObj(path, x, z, s = 1, r = 0, y = 0) {
  const o = G[path].scene.clone(true); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = r; scene.add(o); return o;
}

// ---------- world layout ----------
const POIS = {
  village: { x: 0, z: 0, r: 14, name: 'Greenhollow' },
  farm: { x: 27, z: 4, r: 11, name: 'Millbrook Farms' },
  grave: { x: 2, z: -33, r: 10.5, name: 'Old Graveyard' },
  camp: { x: -31, z: 8, r: 9.5, name: 'Thornwood Camp' },
  shrine: { x: -8, z: 34, r: 9.5, name: 'Bramble Shrine' },
};
const PATHS = [
  [[2, 0], [12, 2], [20, 4]],
  [[0, -2], [1, -15], [2, -25]],
  [[-2, 1], [-14, 4], [-24, 7]],
  [[0, 2], [-3, 16], [-7, 27]],
];
function distToSeg(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}
function nearPath(x, z, d) { for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) if (distToSeg(x, z, p[i], p[i + 1]) < d) return true; return false; }
function inPOI(x, z, pad = 0) { for (const k in POIS) { const p = POIS[k]; if (Math.hypot(x - p.x, z - p.z) < p.r + pad) return true; } return false; }

function buildGround() {
  const S = 2048, W = 140; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const toPx = (v) => (v + W / 2) / W * S;
  g.fillStyle = '#5d8f3a'; g.fillRect(0, 0, S, S);
  const r = mulberry(7);
  for (let i = 0; i < 9000; i++) { const x = r() * S, y = r() * S, s = 4 + r() * 22; g.fillStyle = r() < 0.5 ? 'rgba(80,130,50,0.25)' : 'rgba(110,160,60,0.22)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  const blob = (x, z, rad, col) => { const gr = g.createRadialGradient(toPx(x), toPx(z), 0, toPx(x), toPx(z), rad / W * S); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(toPx(x), toPx(z), rad / W * S, 0, 7); g.fill(); };
  blob(0, 0, 16, 'rgba(160,140,90,0.55)');
  blob(2, -33, 14, 'rgba(60,70,50,0.6)');
  blob(-8, 34, 12, 'rgba(70,60,90,0.45)');
  blob(-31, 8, 11, 'rgba(110,90,60,0.5)');
  g.fillStyle = '#7a5a36';
  for (let i = 0; i < 4; i++) g.fillRect(toPx(21 + i * 3.4), toPx(-3), 2.2 / W * S, 13 / W * S);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, col] of [[4.2, '#8a7650'], [3.2, '#b39a68']]) {
    g.strokeStyle = col; g.lineWidth = w / W * S;
    for (const p of PATHS) { g.beginPath(); g.moveTo(toPx(p[0][0]), toPx(p[0][1])); for (let i = 1; i < p.length; i++) g.lineTo(toPx(p[i][0]), toPx(p[i][1])); g.stroke(); }
  }
  g.fillStyle = '#b8a172'; g.beginPath(); g.arc(toPx(0), toPx(0), 5.5 / W * S, 0, 7); g.fill();
  g.strokeStyle = '#9a855a'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(toPx(0), toPx(0), (2.6 + i * 1.1) / W * S, 0, 7); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x5a8a38, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true; scene.add(outer);
  return c;
}

let minimapBg;
const world = {};
function buildWorld() {
  const groundCanvas = buildGround();
  minimapBg = document.createElement('canvas'); minimapBg.width = minimapBg.height = 160;
  minimapBg.getContext('2d').drawImage(groundCanvas, 0, 0, 160, 160);

  const r = mulberry(1234);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  // houses
  const houses = [[-9, -6, 0.3], [8, -8, -0.4], [-10, 7, 2.6], [9, 8.5, 3.6], [-2, -10, 0]];
  const HS = 3.4;
  const walls = { 'town/wall-wood': [], 'town/wall-wood-door': [], 'town/wall-wood-window-shutters': [], 'town/roof-gable': [] };
  for (const [hx, hz, hr] of houses) {
    walls['town/wall-wood-door'].push({ x: hx, z: hz, r: hr, s: HS });
    walls['town/wall-wood-window-shutters'].push({ x: hx, z: hz, r: hr + Math.PI / 2, s: HS });
    walls['town/wall-wood'].push({ x: hx, z: hz, r: hr + Math.PI, s: HS });
    walls['town/wall-wood-window-shutters'].push({ x: hx, z: hz, r: hr - Math.PI / 2, s: HS });
    walls['town/roof-gable'].push({ x: hx, z: hz, y: HS, r: hr, s: HS });
    addCollider(hx, hz, HS * 0.72);
  }
  for (const k in walls) addStatic(k, walls[k]);
  // village props
  placeObj('town/fountain-round', 0, 0, 1.6); addCollider(0, 0, 1.8);
  addStatic('town/stall-red', [{ x: -6.5, z: 4.5, r: 0.9, s: 2.2 }]); addCollider(-6.5, 4.5, 1.4);
  addStatic('town/stall-green', [{ x: 5.5, z: 5.5, r: -2.4, s: 2.2 }]); addCollider(5.5, 5.5, 1.4);
  addStatic('town/cart', [{ x: 6.5, z: -3.5, r: 1.1, s: 2 }]); addCollider(6.5, -3.5, 1.2);
  addStatic('town/banner-red', [{ x: 5, z: -1, r: -0.6, s: 2.2 }, { x: -5, z: -1.5, r: 0.7, s: 2.2 }]);
  addStatic('town/lantern', [{ x: 3, z: 3, s: 2.2 }, { x: -3, z: -3, s: 2.2 }, { x: 3, z: -4, s: 2.2 }, { x: -3.5, z: 3.5, s: 2.2 }]);
  addStatic('surv/barrel', [{ x: -7.8, z: 2.8, s: 2.3 }, { x: -8.3, z: 3.8, s: 2.3 }, { x: 7, z: -5, s: 2.3 }]);
  addStatic('surv/box-large', [{ x: -7.2, z: 6, r: 0.4, s: 2.2 }, { x: 4.5, z: 7.2, r: 0.2, s: 2.2 }]);
  addStatic('town/windmill', [{ x: 19, z: -7, r: 0.8, s: 3.2 }]); addCollider(19, -7, 2.2);
  addStatic('surv/signpost', [{ x: 12, z: 0.4, r: 1.6, s: 2.5 }, { x: 0.8, z: -14, r: 0, s: 2.5 }, { x: -13, z: 2.2, r: -1.4, s: 2.5 }, { x: -2, z: 15, r: 3, s: 2.5 }]);
  const hedges = []; for (let a = 0; a < Math.PI * 2; a += 0.16) { const x = Math.cos(a) * 13.5, z = Math.sin(a) * 13.5; if (!nearPath(x, z, 2.6)) hedges.push({ x, z, r: -a + Math.PI / 2, s: 2.2 }); }
  addStatic('nature/plant_bushLarge', hedges.filter((_, i) => i % 2).map((h) => ({ ...h, s: 2.4 })));
  // farm
  const crops = { 'nature/crops_cornStageD': [], 'nature/crops_wheatStageB': [], 'nature/crop_pumpkin': [] };
  const cropKeys = Object.keys(crops);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) crops[cropKeys[i % 3]].push({ x: 22.1 + i * 3.4, z: -2.2 + j * 1.8, r: r() * 6, s: 2.2 });
  for (const k in crops) addStatic(k, crops[k]);
  const fence = []; for (let x = 19; x <= 35; x += 2) { fence.push({ x, z: -5.5, s: 2, r: 0 }); fence.push({ x, z: 13, s: 2, r: 0 }); }
  for (let z = -4; z <= 12; z += 2) { if (Math.abs(z - 4) > 2) fence.push({ x: 18.5, z, s: 2, r: Math.PI / 2 }); fence.push({ x: 35.5, z, s: 2, r: Math.PI / 2 }); }
  addStatic('nature/fence_simple', fence);
  addStatic('surv/resource-wood', [{ x: 33, z: 10, s: 2.5 }]);
  addStatic('town/cart', [{ x: 31.5, z: -3.5, r: 2.4, s: 2 }]); addCollider(31.5, -3.5, 1.2);
  addStatic('grave/pumpkin-carved', [{ x: 20, z: 11, s: 2 }, { x: 34, z: -3, s: 2 }]);
  // graveyard
  const gx = 2, gz = -33;
  const stones = { 'grave/gravestone-cross': [], 'grave/gravestone-round': [], 'grave/gravestone-broken': [], 'grave/gravestone-wide': [] };
  const sk = Object.keys(stones);
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { if (Math.abs(i) < 1 && j > -1) continue; if (r() < 0.25) continue; stones[pick(sk)].push({ x: gx + i * 2.6 + (r() - 0.5) * 0.6, z: gz + j * 2.8 + (r() - 0.5) * 0.6, r: (r() - 0.5) * 0.5, s: 2.2 }); }
  for (const k in stones) addStatic(k, stones[k]);
  addStatic('grave/crypt-large', [{ x: gx + 1, z: gz - 8, r: 0, s: 3.2 }]); addCollider(gx + 1, gz - 8, 2.4);
  addStatic('grave/crypt', [{ x: gx - 7, z: gz - 5, r: 0.6, s: 3 }, { x: gx + 8, z: gz + 3, r: -1.2, s: 3 }]); addCollider(gx - 7, gz - 5, 1.6); addCollider(gx + 8, gz + 3, 1.6);
  const ifence = []; for (let a = 0; a < Math.PI * 2; a += 0.13) { const x = gx + Math.cos(a) * 11, z = gz + Math.sin(a) * 11; if (Math.abs(x - 1.8) < 3 && z > gz) continue; ifence.push({ x, z, r: -a + Math.PI / 2, s: 2.2 }); }
  addStatic('grave/iron-fence', ifence.filter((_, i) => i % 3));
  addStatic('grave/iron-fence-damaged', ifence.filter((_, i) => !(i % 3)));
  addStatic('grave/pine-crooked', [{ x: gx - 9, z: gz + 6, s: 3 }, { x: gx + 9, z: gz - 7, s: 3 }, { x: gx - 5, z: gz - 9, s: 3 }]);
  addStatic('grave/lightpost-single', [{ x: gx - 2.5, z: gz + 11, s: 2.4 }, { x: gx + 5.5, z: gz + 11, s: 2.4 }]);
  addStatic('grave/urn-round', [{ x: gx - 3, z: gz - 6, s: 2 }, { x: gx + 4, z: gz - 6, s: 2 }]);
  // bandit camp
  const cx = -31, cz = 8;
  const tents = [{ x: cx - 5, z: cz - 3, r: 0.8, s: 5 }, { x: cx + 3, z: cz - 5.5, r: -0.3, s: 5 }, { x: cx - 3, z: cz + 5, r: 2.6, s: 5 }];
  addStatic('surv/tent', tents); addStatic('surv/tent-canvas', tents);
  addCollider(cx - 5, cz - 3, 1.6); addCollider(cx + 3, cz - 5.5, 1.6); addCollider(cx - 3, cz + 5, 1.6);
  addStatic('surv/campfire-pit', [{ x: cx, z: cz, s: 2.5 }]); addCollider(cx, cz, 0.9);
  addStatic('surv/barrel', [{ x: cx + 5, z: cz + 2, s: 2.3 }, { x: cx + 5.6, z: cz + 3, s: 2.3 }, { x: cx - 6.5, z: cz + 1.5, s: 2.3 }]);
  addStatic('surv/box-large', [{ x: cx + 4.5, z: cz + 4, s: 2.2, r: 0.5 }]);
  addStatic('surv/chest', [{ x: cx - 1, z: cz - 6.5, s: 2.2 }]);
  addStatic('surv/bedroll', [{ x: cx + 1.5, z: cz + 3, s: 2.5, r: 1 }, { x: cx - 2.8, z: cz - 0.5, s: 2.5, r: 2 }]);
  addStatic('nature/log_large', [{ x: cx + 2.2, z: cz - 1.4, s: 2.2, r: 0.4 }]);
  const fire = new THREE.PointLight(0xff8a3a, 14, 10, 1.6); fire.position.set(cx, 1.2, cz); scene.add(fire); world.fire = fire;
  // shrine
  const shx = -8, shz = 35;
  addStatic('grave/altar-stone', [{ x: shx, z: shz + 1.5, s: 2.6 }]); addCollider(shx, shz + 1.5, 1.2);
  const ring = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; ring.push({ x: shx + Math.cos(a) * 7, z: shz + Math.sin(a) * 7, s: 2.6, r: -a }); addCollider(shx + Math.cos(a) * 7, shz + Math.sin(a) * 7, 0.7); }
  addStatic('nature/statue_columnDamaged', ring.filter((_, i) => i % 2)); addStatic('nature/statue_obelisk', ring.filter((_, i) => !(i % 2)));
  addStatic('grave/candle-multiple', [{ x: shx - 1.8, z: shz + 1.8, s: 2 }, { x: shx + 1.8, z: shz + 1.8, s: 2 }]);
  addStatic('grave/fire-basket', [{ x: shx - 3, z: shz - 2, s: 2.2 }, { x: shx + 3, z: shz - 2, s: 2.2 }]);
  addStatic('nature/mushroom_redGroup', [{ x: shx + 5, z: shz - 4, s: 2.5 }, { x: shx - 6, z: shz + 3, s: 2.5 }]);
  const shrineLight = new THREE.PointLight(0x9a6bff, 30, 16, 1.6); shrineLight.position.set(shx, 3, shz + 1); scene.add(shrineLight);
  world.shrineLight = shrineLight;
  // trees and scatter
  const treeKinds = ['nature/tree_default', 'nature/tree_oak', 'nature/tree_fat', 'nature/tree_detailed', 'nature/tree_pineTallA', 'nature/tree_pineRoundC', 'nature/tree_pineDefaultA', 'nature/tree_default_dark', 'nature/tree_pineTallD', 'town/tree', 'town/tree-high-round'];
  const trees = {}; treeKinds.forEach((k) => trees[k] = []);
  const tryTree = (x, z, kinds) => {
    if (inPOI(x, z, 1) || nearPath(x, z, 3.2)) return;
    const k = kinds[Math.floor(r() * kinds.length)];
    const s = k.startsWith('town') ? 2.2 + r() * 0.8 : 2.8 + r() * 1.4;
    trees[k].push({ x, z, r: r() * 6.3, s });
    if (Math.hypot(x, z) < WORLD_R + 2) addCollider(x, z, 0.7);
  };
  for (let i = 0; i < 520; i++) { const a = r() * Math.PI * 2, d = 50 + r() * 22; tryTree(Math.cos(a) * d, Math.sin(a) * d, treeKinds); }
  for (let i = 0; i < 420; i++) {
    const x = (r() - 0.5) * 104, z = (r() - 0.5) * 104; if (Math.hypot(x, z) > 50) continue;
    const west = x < -14, south = z > 14;
    const kinds = west ? ['nature/tree_pineTallA', 'nature/tree_pineRoundC', 'nature/tree_pineDefaultA', 'nature/tree_pineTallD', 'nature/tree_default_dark'] : south ? ['nature/tree_default_dark', 'nature/tree_detailed', 'nature/tree_pineTallD', 'nature/tree_fat'] : ['nature/tree_default', 'nature/tree_oak', 'nature/tree_fat', 'town/tree', 'town/tree-high-round'];
    if (r() < (west || south ? 0.75 : 0.42)) tryTree(x, z, kinds);
  }
  for (const k in trees) addStatic(k, trees[k]);
  const deco = { 'nature/plant_bushLarge': [], 'nature/plant_bush': [], 'nature/flower_redA': [], 'nature/flower_yellowB': [], 'nature/flower_purpleA': [], 'nature/grass_large': [], 'nature/rock_largeA': [], 'nature/rock_largeC': [], 'nature/rock_tallB': [], 'nature/stump_round': [] };
  const dk = Object.keys(deco);
  for (let i = 0; i < 700; i++) {
    const x = (r() - 0.5) * 112, z = (r() - 0.5) * 112; if (Math.hypot(x, z) > 56) continue; if (nearPath(x, z, 2.2)) continue;
    if (Math.hypot(x, z) < 6) continue;
    const k = dk[Math.floor(r() * dk.length)];
    if (k.includes('rock') && inPOI(x, z, 0)) continue;
    if (k.includes('bush') && inPOI(x, z, -2)) continue;
    deco[k].push({ x, z, r: r() * 6.3, s: k.includes('rock') ? 1.6 + r() * 1.6 : 2 + r() });
    if (k.includes('rock_large') || k.includes('rock_tall')) addCollider(x, z, 0.8);
  }
  for (const k in deco) addStatic(k, deco[k], !k.includes('grass') && !k.includes('flower'));
  for (const c of colliders) gridAdd(c);
}
const colGrid = {};
function cellKey(x, z) { return Math.floor(x / 6) + ',' + Math.floor(z / 6); }
function gridAdd(c) { const cx = Math.floor(c.x / 6), cz = Math.floor(c.z / 6); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = (cx + dx) + ',' + (cz + dz); (colGrid[k] ||= []).push(c); } }
function resolveCollision(pos, rad) {
  const list = colGrid[cellKey(pos.x, pos.z)]; if (list) for (const c of list) {
    const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad;
    if (d < m && d > 1e-4) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; }
  }
  if (pos.x > 200) return; // the Mill of Ashes instance has walls instead of a world edge
  const d = Math.hypot(pos.x, pos.z); if (d > WORLD_R) { pos.x *= WORLD_R / d; pos.z *= WORLD_R / d; }
}

// ---------- the Mill of Ashes (a small instanced dungeon far from the overworld) ----------
const MILL = { ox: 300, oz: 0, T: 2.5 };
const MILL_ROOMS = [[0, 0, 4, 4], [5, 1, 8, 2], [9, -2, 15, 6], [16, 1, 19, 2], [20, -3, 26, 7], [27, 1, 30, 2], [31, -5, 41, 8]];
const millTile = (tx, tz) => new THREE.Vector3(MILL.ox + tx * MILL.T, 0, MILL.oz + tz * MILL.T);
const MILL_START = millTile(2, 2);
const PORTAL_WORLD = new THREE.Vector3(14.5, 0, -7.5);
const MILL_SPAWNS = [['ashhusk', 11, 0], ['ashhusk', 13.5, 4.5], ['ashhusk', 14, 0.5], ['millbones', 12, 2.5], ['millbones', 22, 0], ['millbones', 24, 5], ['brute', 25, 2], ['ashhusk', 21.5, 4.5], ['brute', 29, 1.5], ['greywarden', 37.5, 1.5]];
const MILL_PATH = [[2, 2], [6.5, 1.5], [12, 2], [17.5, 1.5], [23, 2], [28.5, 1.5], [33, 1.5], [36, 1.5]];
let millBg = null;
function buildMill() {
  const T = MILL.T; const floor = new Set(); const isF = (x, z) => floor.has(x + ',' + z);
  for (const [x1, z1, x2, z2] of MILL_ROOMS) for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) floor.add(x + ',' + z);
  const r = mulberry(7); const floors = [], details = [], wallsHi = [], wallsLo = [], seen = new Set();
  for (const k of floor) {
    const [x, z] = k.split(',').map(Number); const q = millTile(x, z);
    (r() < 0.2 ? details : floors).push({ x: q.x, z: q.z, s: T, r: Math.floor(r() * 4) * Math.PI / 2 });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const wx = x + dx, wz = z + dz, wk = wx + ',' + wz; if (isF(wx, wz) || seen.has(wk)) continue; seen.add(wk);
      const w = millTile(wx, wz); const front = isF(wx - 1, wz) || isF(wx, wz - 1) || isF(wx - 1, wz - 1);
      (front ? wallsLo : wallsHi).push({ x: w.x, z: w.z, s: T, sy: front ? 0.35 : 2.0 });
      gridAdd({ x: w.x, z: w.z, r: T * 0.62 });
    }
  }
  addStatic('dun/floor', floors, false); addStatic('dun/floor-detail', details, false); addStatic('dun/wall', wallsHi, true); addStatic('dun/wall', wallsLo, false);
  const voidM = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), new THREE.MeshBasicMaterial({ color: 0x080706 })); voidM.rotation.x = -Math.PI / 2; voidM.position.set(MILL.ox + 50, -0.05, MILL.oz + 4); scene.add(voidM);
  const deco = {}; const put = (path, tx, tz, s = 1, rot = 0, col = 0) => { const q = millTile(tx, tz); (deco[path] ||= []).push({ x: q.x, z: q.z, s, r: rot }); if (col) gridAdd({ x: q.x, z: q.z, r: col }); };
  for (const [tx, tz] of [[33, -3], [33, 6], [39, -3], [39, 6], [11, -1], [11, 5], [22, -2], [22, 6]]) put('dun/column', tx, tz, T * 1.1, 0, 0.7);
  put('surv/barrel', 0.2, 0.2, 1.1, 0, 0.5); put('surv/barrel', 0.8, -0.1, 1, 1, 0.5); put('surv/box-large', 3.8, 0, 1, 0.4, 0.8); put('surv/resource-wood', 0.2, 4, 1, 1.2, 0.8);
  put('dun/wood-structure', 9.2, -1.8, T, 0, 1.2); put('dun/wood-structure', 15, 5.8, T, 0, 1.2); put('dun/wood-support', 20.2, 6.8, T, 0, 0.6); put('dun/wood-structure', 26, -2.8, T, 0, 1.2);
  put('dun/rocks', 14.6, -1.6, T * 0.8, 0.5, 0); put('dun/stones', 20.4, -2.6, T * 0.8, 1, 0); put('dun/rocks', 25.8, 6.6, T * 0.8, 2, 0); put('dun/stones', 31.4, 7.4, T * 0.8, 0.3, 0); put('dun/rocks', 40.6, -4.6, T * 0.8, 0.7, 0);
  put('dun/barrel', 9.4, 5.6, T, 0, 0.5); put('dun/barrel', 26.4, 6.4, T, 0, 0.5); put('surv/box-large', 31.3, -4.6, 1, 0.3, 0.8);
  for (const [tx, tz] of [[0.3, 2], [12, -1.7], [12, 5.7], [23, -2.7], [23, 6.7], [31.4, 0], [31.4, 3], [40.5, -1], [40.5, 4]]) put('grave/fire-basket', tx, tz, 1.3, 0, 0.4);
  put('grave/debris', 7, 1.4, 1.2, 0.4, 0); put('grave/debris', 18, 2.2, 1.2, 1.4, 0); put('grave/candle-multiple', 39.8, 1.5, 1.4, 0, 0);
  for (const k in deco) addStatic(k, deco[k], true);
  // the great millstone in the boss room
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 0.7, 28), new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 0.95 }));
  const sp = millTile(40.3, 1.5); stone.position.set(sp.x, 0.35, sp.z); stone.castShadow = stone.receiveShadow = true; scene.add(stone); gridAdd({ x: sp.x, z: sp.z, r: 2.2 });
  // lights: a torch that follows you, and an ember glow over the boss arena (hidden in the overworld)
  world.torch = new THREE.PointLight(0xffb070, 24, 17, 1.4); world.torch.visible = false; scene.add(world.torch);
  world.bossLight = new THREE.PointLight(0xff5a2a, 40, 26, 1.5); const bl = millTile(36, 1.5); world.bossLight.position.set(bl.x, 5, bl.z); world.bossLight.visible = false; scene.add(world.bossLight);
  // minimap background
  millBg = document.createElement('canvas'); millBg.width = millBg.height = 160; const g = millBg.getContext('2d'); const sc = 160 / 120;
  g.fillStyle = '#0b0908'; g.fillRect(0, 0, 160, 160);
  for (const k of floor) { const [x, z] = k.split(',').map(Number); const q = millTile(x, z); g.fillStyle = x >= 31 ? '#6a4a3a' : '#5b5048'; g.fillRect((q.x - T / 2 - (MILL.ox - 10)) * sc, (q.z - T / 2 - (MILL.oz - 50)) * sc, T * sc + 0.6, T * sc + 0.6); }
  // portals: the cellar door by the windmill, the way out by the entrance, and one that opens after the boss
  makePortal('mill-in', PORTAL_WORLD, 0xb08aff, { name: 'The Mill of Ashes', title: 'Dungeon · level 6+', verb: 'Enter the Mill' }, true);
  makePortal('mill-out', millTile(0.4, 3.6), 0x9fd4ff, { name: 'Way out', title: 'Back to Greenhollow', verb: 'Leave the Mill' }, true);
  makePortal('mill-exit', millTile(36, 7.4), 0x9fd4ff, { name: 'Way out', title: 'Back to Greenhollow', verb: 'Leave the Mill' }, false);
  const rk = []; for (const [dx, dz, rr] of [[-1.6, -0.9, 0.3], [1.5, -1.3, 1.1], [-1.2, 1.5, 2]]) rk.push({ x: PORTAL_WORLD.x + dx, z: PORTAL_WORLD.z + dz, s: 0.8, r: rr });
  addStatic('nature/rock_largeA', rk, true);
}
function makePortal(id, pos, color, def, visible) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 10, 36), new THREE.MeshBasicMaterial({ color }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = disc.position.y = 1.25; g.add(ring); g.add(disc);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0x5a5560 })); base.position.y = 0.07; g.add(base);
  g.rotation.y = Math.PI / 4; g.position.copy(pos); g.visible = visible; scene.add(g);
  state.portals.push({ id, portal: true, pos: pos.clone(), g, def });
}
function openPortal(pt) {
  const back = () => `<button class="pbtn" data-do="close">Not yet</button>`;
  if (pt.id === 'mill-in') {
    const ok = qstate('q4')?.status === 'done';
    const txt = ok ? `Cold ash drifts up from the old mill's cellar. Down there: three rooms of enemies and the Grey Warden. Enemies you beat stay beaten until you leave. Recommended level 6 or higher (you are level ${save.level}). Bring Healing Draughts (you have ${save.potions}).` : 'The cellar door is barred with old iron, and something is scratching on the other side. Help Greenhollow first (finish "The Hollow Shrine").';
    openPanel('The Mill of Ashes', `<div class="dlg"><p>${esc(txt)}</p><div class="btnrow">${ok ? '<button class="pbtn go" data-do="enter">Enter the Mill</button>' : ''}${back()}</div></div>`);
  } else openPanel('Leave the Mill?', `<div class="dlg"><p>${esc(qstate('q5')?.status === 'ready' ? 'The Grey Warden is beaten. Head back up and tell Captain Edda.' : 'If you leave now, the Mill will fill with enemies again before you come back.')}</p><div class="btnrow"><button class="pbtn go" data-do="leave">Leave the Mill</button>${back()}</div></div>`);
  $('pbody').querySelectorAll('[data-do]').forEach((b) => b.onclick = () => { const a = b.dataset.do; closePanel(); if (a === 'enter') enterMill(); else if (a === 'leave') exitMill(); });
}
function clearCombat() { const p = state.player; p.target = null; p.engage = false; p.dash = null; p.walkTo = null; p.queued = null; for (const t of state.telegraphs) { scene.remove(t.base); scene.remove(t.fill); } state.telegraphs = []; }
function setAreaLook(area) {
  const mill = area === 'mill';
  scene.background.setHex(mill ? 0x0a0807 : 0x9cc7d9); scene.fog.color.setHex(mill ? 0x0a0807 : 0x9cc7d9); scene.fog.near = mill ? 88 : 105; scene.fog.far = mill ? 122 : 150;
  hemi.intensity = mill ? 0.42 : 1.25; hemi.color.setHex(mill ? 0xc8b8a8 : 0xdff2ff); sun.intensity = mill ? 0.55 : 2.4;
  if (world.fire) world.fire.visible = !mill; if (world.shrineLight) world.shrineLight.visible = !mill;
  world.torch.visible = mill; world.bossLight.visible = mill;
}
function transition(fn) { $('fade').style.opacity = 1; setTimeout(() => { fn(); $('fade').style.opacity = 0; }, 550); }
function enterMill() {
  transition(() => {
    clearCombat(); removeMillEnemies();
    state.area = 'mill'; state.player.pos.copy(MILL_START); state.player.facing = Math.PI / 2;
    for (const [type, tx, tz] of MILL_SPAWNS) { const q = millTile(tx, tz); spawnEnemy({ type, x: q.x, z: q.z, dungeon: true }); }
    state.portals.find((o) => o.id === 'mill-exit').g.visible = false;
    setAreaLook('mill'); setMusic('dungeon'); sfx.portal();
    toast('The Mill of Ashes', 'Fight through to the Grey Warden'); log('You enter <b>the Mill of Ashes</b>.'); writeSave();
  });
}
function removeMillEnemies() { for (const e of [...state.enemies]) if (e.sp.dungeon) removeEnemy(e); }
function exitMill() {
  transition(() => {
    clearCombat(); removeMillEnemies();
    state.area = 'world'; state.player.pos.set(PORTAL_WORLD.x + 1.8, 0, PORTAL_WORLD.z + 1.8);
    setAreaLook('world'); setMusic('overworld'); sfx.portal(); toast('Greenhollow Vale'); writeSave();
  });
}

// ---------- characters ----------
const baseScale = {};
function makeChar(path, height = 1.8, tint = null) {
  const src = G[path];
  const obj = SkeletonUtils.clone(src.scene);
  if (baseScale[path] === undefined) { const t = src.scene.clone(true); t.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(t); baseScale[path] = 1 / Math.max(0.01, b.max.y - b.min.y); }
  const holder = new THREE.Group(); holder.add(obj); obj.scale.setScalar(baseScale[path] * height);
  const mats = [], meshes = [];
  obj.traverse((o) => { if (o.isMesh) { meshes.push(o); o.material = o.material.clone(); if (tint !== null) { o.material.emissive = new THREE.Color(tint); o.material.emissiveIntensity = 0.45; } o.userData.baseEm = o.material.emissive.clone(); o.userData.baseEmI = o.material.emissiveIntensity; mats.push(o.material); o.castShadow = true; o.frustumCulled = false; } });
  const mixer = new THREE.AnimationMixer(obj);
  const actions = {}; for (const clip of src.animations) actions[clip.name] = mixer.clipAction(clip);
  scene.add(holder);
  return { holder, obj, mixer, actions, mats, meshes, cur: null, lockT: 0, flashT: 0 };
}
function play(c, name, once = false, speed = 1, fade = 0.15) {
  const a = c.actions[name]; if (!a) return;
  if (c.cur === name && !once) return;
  const prev = c.cur ? c.actions[c.cur] : null;
  a.reset(); a.enabled = true; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1);
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
  a.play(); if (prev && prev !== a) { prev.fadeOut(fade); a.fadeIn(fade); }
  c.cur = name;
  if (once) c.lockT = a.getClip().duration / speed * 0.9;
}
function flash(c, color = 0xffffff, t = 0.12) { for (const m of c.mats) { m.emissive.setHex(color); m.emissiveIntensity = 0.8; } c.flashT = t; }
function updateFlash(c, dt) {
  if (c.flashT > 0) { c.flashT -= dt; if (c.flashT <= 0) for (const o of c.meshes) { o.material.emissive.copy(o.userData.baseEm); o.material.emissiveIntensity = o.userData.baseEmI; } }
}
function attachGear(c) {
  let arm = null, armL = null; c.obj.traverse((o) => { if (o.name === 'arm-right') arm = o; if (o.name === 'arm-left') armL = o; });
  if (arm) {
    const sw = G['chars/weapon-sword'].scene.clone(true);
    sw.position.set(0, -0.2, 0.06); sw.rotation.set(0.9, 0, 0); sw.scale.setScalar(1.5);
    arm.add(sw); c.sword = sw;
  }
  if (armL) {
    const sh = G['chars/shield-round'].scene.clone(true);
    sh.position.set(0.07, -0.1, 0.02); sh.rotation.set(0, Math.PI / 2, 0); sh.scale.setScalar(0.8);
    armL.add(sh); c.shield = sh;
  }
}

// ---------- game state ----------
const state = { area: 'world', portals: [], started: false, paused: false, time: 0, player: null, enemies: [], npcs: {}, loot: [], questItems: [], effects: [], telegraphs: [], floats: [] };
function freshSave() {
  const rr = mulberry(42);
  const sword = makeItem('mainhand', 0, 1, rr, 'Worn Sword'); sword.stats = { dmg: 4 }; sword.value = 3;
  const shield = makeItem('offhand', 0, 1, rr, 'Wooden Buckler'); shield.stats = { armor: 4 }; shield.value = 3;
  const tunic = makeItem('chest', 0, 1, rr, 'Padded Tunic'); tunic.stats = { armor: 3 }; tunic.value = 2;
  return { v: 1, level: 1, xp: 0, gold: 10, potions: 2, hp: null, pos: [0.5, 4.5], equip: { mainhand: sword, offhand: shield, chest: tunic }, bag: [], quests: {}, stats: { kills: 0, deaths: 0 }, finished: false };
}
let save = null;
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return s; } catch (e) { /* ignore */ } return null; }
function writeSave() {
  if (!save || !state.player) return;
  save.hp = Math.round(state.player.hp); save.pos = state.area === 'mill' ? [PORTAL_WORLD.x + 1.8, PORTAL_WORLD.z + 1.8] : [+state.player.pos.x.toFixed(2), +state.player.pos.z.toFixed(2)];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}
function calcStats() {
  const s = { dmg: 0, armor: 0, might: 0, stamina: 0, crit: 0, haste: 0 };
  for (const k of SLOTS) { const it = save.equip[k]; if (it) for (const st in it.stats) s[st] += it.stats[st]; }
  const L = save.level;
  s.armor = Math.round(s.armor * (1 + 0.1 * tal('plate')));
  return { ...s, dmgMul: 1 + 0.05 * tal('heavy'), maxHp: Math.round((120 + 22 * (L - 1) + s.stamina * 6) * (1 + 0.08 * tal('vigor'))), ap: 10 + 3 * (L - 1) + s.dmg + s.might, critC: 5 + s.crit, atkInt: 1.3 / (1 + s.haste / 100), cdMul: 1 / (1 + s.haste / 100) };
}

// ---------- talents ----------
const tal = (id) => (save && save.talents && save.talents[id]) || 0;
const TIER_NEED = { 1: 0, 2: 2, 3: 3 };
function talentPoints() { if (!save) return 0; const spent = Object.values(save.talents || {}).reduce((a, b) => a + b, 0); return Math.max(0, save.level - 1 - spent); }
function treePoints(tree) { return TALENTS.filter((t) => t.tree === tree).reduce((a, t) => a + tal(t.id), 0); }
function canLearn(t) { return talentPoints() > 0 && tal(t.id) < t.max && treePoints(t.tree) >= TIER_NEED[t.tier]; }
function learnTalent(id) {
  const t = TALENTS.find((x) => x.id === id); if (!t || !canLearn(t)) return false;
  (save.talents ||= {})[id] = tal(id) + 1; refreshStats(); sfx.quest(); log(`Talent learned: <b>${esc(t.name)}</b> (${tal(id)}/${t.max})`); writeSave(); updateHUD(true); return true;
}
const talentResetCost = () => 10 * save.level;
function openTalents() {
  const pts = talentPoints(); let cols = '';
  for (const tr of TALENT_TREES) {
    let h = `<div class="ttree"><div class="h3">${tr.id} <small>${treePoints(tr.id)} pts · ${esc(tr.blurb)}</small></div>`;
    for (const t of TALENTS.filter((x) => x.tree === tr.id)) {
      const r = tal(t.id); const locked = treePoints(t.tree) < TIER_NEED[t.tier];
      h += `<button class="tal ${r ? 'has' : ''} ${locked ? 'lock' : ''} ${canLearn(t) ? 'can' : ''}" data-t="${t.id}"><span class="ti">${t.icon}</span><span class="tn">${esc(t.name)} <b>${r}/${t.max}</b><small>${esc(t.desc)}${locked ? ` <i>Needs ${TIER_NEED[t.tier]} points in ${t.tree}.</i>` : ''}</small></span></button>`;
    }
    cols += h + '</div>';
  }
  const head = save.level < 2 ? 'You get your first talent point at level 2, then one more every level.' : pts > 0 ? `<b style="color:#ffd23f">You have ${pts} talent point${pts > 1 ? 's' : ''} to spend.</b> Tap a glowing talent to learn it.` : 'No points left. You get one more each level.';
  openPanel('Warden Talents', `<div class="info" style="margin:0 0 8px">${head}</div><div class="tcols">${cols}</div><div class="btnrow"><button class="pbtn" data-tr="reset">Reset talents (${talentResetCost()}g)</button><button class="pbtn" data-tr="close">Close</button></div>`);
  $('pbody').querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { const t = TALENTS.find((x) => x.id === b.dataset.t); if (canLearn(t)) { learnTalent(t.id); openTalents(); } else if (pts <= 0) toast('', 'No talent points left'); else toast('', tal(t.id) >= t.max ? 'Already maxed' : `Needs ${TIER_NEED[t.tier]} points in ${t.tree}`); });
  $('pbody').querySelectorAll('[data-tr]').forEach((b) => b.onclick = () => {
    if (b.dataset.tr === 'close') { closePanel(); return; }
    const c = talentResetCost(); if (!Object.keys(save.talents || {}).length) { toast('', 'Nothing to reset'); return; }
    if (save.gold < c) { toast('', `You need ${c} gold to reset`); return; }
    save.gold -= c; save.talents = {}; refreshStats(); sfx.coin(); writeSave(); openTalents(); updateHUD(true);
  });
}
const skillCost = (sk) => sk.cost - (sk.id === 'cleave' && tal('whirl') ? 10 : 0);
const skillCd = (sk) => sk.cd - (sk.id === 'bash' ? tal('shieldwall') : sk.id === 'charge' ? 4 * tal('bloodrush') : sk.id === 'wind' ? 10 * tal('breath') : 0);
const skillRange = (sk) => sk.range + (sk.id === 'cleave' ? tal('whirl') : 0);

// ---------- player ----------
function spawnPlayer() {
  const c = makeChar('chars/character-knight', 1.85);
  attachGear(c);
  const p = { c, pos: new THREE.Vector3(save.pos[0], 0, save.pos[1]), facing: 0, stats: calcStats(), hp: 0, resolve: 0, target: null, engage: false, atkT: 0, cds: {}, potCd: 0, combatT: 99, dead: false, dash: null, braceT: 0 };
  p.hp = save.hp ? Math.min(save.hp, p.stats.maxHp) : p.stats.maxHp;
  c.holder.position.copy(p.pos);
  play(c, 'idle');
  const ringGeo = new THREE.RingGeometry(0.75, 0.95, 40); ringGeo.rotateX(-Math.PI / 2);
  p.selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.85, depthWrite: false }));
  p.selRing.visible = false; scene.add(p.selRing);
  state.player = p;
}
function refreshStats() { const p = state.player; if (!p) return; const old = p.stats.maxHp; p.stats = calcStats(); if (p.stats.maxHp > old) p.hp += p.stats.maxHp - old; p.hp = Math.min(p.hp, p.stats.maxHp); }

// ---------- npcs ----------
function spawnNPCs() {
  for (const id in NPCS) {
    const d = NPCS[id];
    const c = makeChar(d.model, 1.85 * (d.scale || 1));
    c.holder.position.set(d.pos[0], 0, d.pos[1]); c.holder.rotation.y = d.rot; play(c, 'idle'); c.mixer.update(Math.random() * 2);
    if (id === 'edda') attachGear(c);
    gridAdd({ x: d.pos[0], z: d.pos[1], r: 0.6 });
    state.npcs[id] = { id, def: d, c, pos: c.holder.position };
  }
}

// ---------- enemies ----------
const SPAWNS = [];
function defineSpawns() {
  const r = mulberry(99);
  const ring = (type, cx, cz, n, rad) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r(); const d = rad * (0.4 + r() * 0.6); SPAWNS.push({ type, x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d }); } };
  ring('husk', 27, 4, 8, 8);
  ring('skeleton', 2, -33, 5, 7);
  ring('bandit', -31, 8, 5, 6.5);
  SPAWNS.push({ type: 'grubb', x: -31.5, z: 10.5 });
  ring('ghost', -8, 33, 3, 5);
  SPAWNS.push({ type: 'wraith', x: -8, z: 37.5 });
}
function spawnEnemy(sp) {
  const def = ENEMIES[sp.type];
  const c = makeChar(def.model, 1.8 * def.scale, def.tint ?? null);
  const e = { sp, type: sp.type, def, c, pos: new THREE.Vector3(sp.x, 0, sp.z), home: new THREE.Vector3(sp.x, 0, sp.z), hp: def.hp, maxHp: def.hp, state: 'idle', atkT: rand(0.5, 1.5), stunT: 0, wanderT: rand(1, 4), wanderTo: null, deadT: 0, specT: (def.slam?.every || 99) * 0.6, rainT: (def.rain?.every || 99) * 0.6, summoned: [], summonDone: [], facing: rand(0, 6.28), rad: 0.45 * def.scale };
  if (def.model.includes('ghost')) c.obj.traverse((o) => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 0.85; } });
  if (def.gear) attachGear(c);
  c.holder.position.copy(e.pos); c.holder.rotation.y = e.facing; play(c, 'idle'); c.mixer.update(rand(0, 2));
  e.label = document.createElement('div'); e.label.className = 'hpl' + (def.elite || def.boss ? ' elite' : '');
  e.label.innerHTML = `<div class="nm"></div><div class="hb"><div></div></div>`; $('labels').appendChild(e.label);
  e.label.querySelector('.nm').textContent = `${def.name}${def.elite ? ' (Elite)' : ''}${def.boss ? ' (Boss)' : ''}`;
  state.enemies.push(e); return e;
}
function removeEnemy(e) { scene.remove(e.c.holder); e.label.remove(); const i = state.enemies.indexOf(e); if (i >= 0) state.enemies.splice(i, 1); }

// ---------- effects ----------
function addFloat(text, pos, cls, yoff = 2.2) {
  const el = document.createElement('div'); el.className = 'ft ' + cls; el.textContent = text; $('labels').appendChild(el);
  state.floats.push({ el, pos: pos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), yoff, rand(-0.4, 0.4))), t: 0, life: 1.1 });
}
function ringEffect(pos, radius, color, life = 0.45) {
  const geo = new THREE.RingGeometry(0.1, 0.35, 40); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(pos.x, 0.08, pos.z); scene.add(m);
  state.effects.push({ m, t: 0, life, update(f) { const s = 0.3 + f * radius / 0.35; m.scale.set(s, 1, s); m.material.opacity = 0.9 * (1 - f); } });
}
function pillarEffect(pos, color, life = 1.2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.position.set(pos.x, 3.5, pos.z); scene.add(m);
  state.effects.push({ m, t: 0, life, follow: true, update(f) { m.material.opacity = 0.55 * (1 - f); m.scale.set(1 - f * 0.5, 1, 1 - f * 0.5); } });
}
function addTelegraph(x, z, radius, windup, dmg, src) {
  const g1 = new THREE.CircleGeometry(radius, 40); g1.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(g1, new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.22, depthWrite: false }));
  const fill = new THREE.Mesh(g1, new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.45, depthWrite: false }));
  base.position.set(x, 0.06, z); fill.position.set(x, 0.07, z); fill.scale.set(0.01, 1, 0.01); scene.add(base); scene.add(fill);
  state.telegraphs.push({ x, z, radius, windup, t: 0, dmg, base, fill, src });
}

// ---------- audio ----------
let actx = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } return actx; }
function beep(freq, dur = 0.08, type = 'square', vol = 0.06, slide = 0) {
  const a = actx; if (!a || a.state !== 'running' || !settings.sfx) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = freq; if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
const SFX_FILES = ['hit1', 'hit2', 'hit3', 'crit', 'hurt', 'bash', 'cleave', 'coin', 'loot', 'quest', 'click', 'kill', 'heal', 'whoosh', 'level', 'portal'];
const sfxBuf = {};
async function loadSfx() {
  const a = audio(); if (!a) return;
  await Promise.all(SFX_FILES.map(async (n) => { try { const r = await fetch(`audio/${n}.mp3`); const ab = await r.arrayBuffer(); sfxBuf[n] = await new Promise((ok, no) => a.decodeAudioData(ab, ok, no)); } catch (e) { /* fall back to synth beeps */ } }));
}
function playSfx(name, vol = 0.5, rate = 1) {
  const a = actx; if (!a || a.state !== 'running' || !settings.sfx) return true;
  const b = sfxBuf[name]; if (!b) return false;
  const src = a.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
  const g = a.createGain(); g.gain.value = vol; src.connect(g); g.connect(a.destination); src.start(); return true;
}
const sfx = {
  hit: () => playSfx('hit' + randi(1, 3), 0.35, rand(0.92, 1.08)) || beep(180, 0.09, 'sawtooth', 0.05, -100),
  crit: () => playSfx('crit', 0.5) || beep(260, 0.12, 'sawtooth', 0.07, -160),
  hurt: () => playSfx('hurt', 0.45, rand(0.9, 1.1)) || beep(110, 0.12, 'square', 0.05, -40),
  loot: () => playSfx('loot', 0.6) || (beep(880, 0.06, 'triangle', 0.05), setTimeout(() => beep(1320, 0.08, 'triangle', 0.05), 60)),
  coin: () => playSfx('coin', 0.5) || beep(1500, 0.05, 'triangle', 0.04),
  quest: () => playSfx('quest', 0.5) || [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.06), i * 110)),
  level: () => playSfx('level', 0.55) || [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.07), i * 90)),
  skill: () => playSfx('whoosh', 0.35) || beep(320, 0.1, 'triangle', 0.05, 200),
  bash: () => playSfx('bash', 0.55) || sfx.skill(), cleave: () => playSfx('cleave', 0.5) || sfx.skill(), heal: () => playSfx('heal', 0.45) || sfx.skill(),
  kill: () => playSfx('kill', 0.4), click: () => playSfx('click', 0.3), portal: () => playSfx('portal', 0.5) || sfx.quest(),
};
// background music: looping tracks routed through a gain node so fades work on phones too
const MUSIC_VOL = { title: 0.32, overworld: 0.26, dungeon: 0.3 };
const music = { want: null, tracks: {} };
function musicTrack(name) {
  let t = music.tracks[name]; if (t) return t;
  const a = audio(); const el = new Audio(`audio/music_${name}.mp3`); el.loop = true; el.preload = 'auto';
  t = { el, gain: null, stopT: 0 };
  if (a) { try { const src = a.createMediaElementSource(el); t.gain = a.createGain(); t.gain.gain.value = 0; src.connect(t.gain); t.gain.connect(a.destination); } catch (e) { t.gain = null; } }
  if (!t.gain) el.volume = MUSIC_VOL[name] || 0.3;
  music.tracks[name] = t; return t;
}
function setMusic(name) { if (music.want === name) return; music.want = name; updateMusic(); }
function updateMusic() {
  const want = settings.music && !document.hidden ? music.want : null; const a = actx;
  for (const n in music.tracks) {
    if (n === want) continue; const t = music.tracks[n];
    if (t.gain && a) t.gain.gain.setTargetAtTime(0, a.currentTime, 0.35); else t.el.pause();
    clearTimeout(t.stopT); t.stopT = setTimeout(() => { if (music.want !== n || !settings.music || document.hidden) t.el.pause(); }, 1600);
  }
  if (!want) return;
  const t = musicTrack(want); clearTimeout(t.stopT);
  if (t.el.paused) { const pr = t.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
  if (t.gain && actx) t.gain.gain.setTargetAtTime(MUSIC_VOL[want] || 0.3, actx.currentTime, 0.7);
}
function unlockAudio() {
  const a = audio(); if (a && a.state === 'suspended') a.resume().catch(() => {});
  if (music.want && settings.music) { const t = music.tracks[music.want]; if (!t || t.el.paused) updateMusic(); }
}

// ---------- UI helpers ----------
function log(html) { const d = document.createElement('div'); d.innerHTML = html; $('log').appendChild(d); while ($('log').children.length > 7) $('log').firstChild.remove(); }
let toastT = 0;
function toast(main, sub = '') { $('toast').innerHTML = `${main}${sub ? `<div class="s">${sub}</div>` : ''}`; toastT = 2.8; }
const rc = (r) => RARITY[r].color;
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function itemHTML(it) { return `<span style="color:${rc(it.rarity)}">[${esc(it.name)}]</span>`; }

// ---------- quests ----------
function qstate(id) { return save.quests[id] || null; }
function questAvailable(q) { return !qstate(q.id) && (!q.req || qstate(q.req)?.status === 'done'); }
function acceptQuest(q) { save.quests[q.id] = { status: 'active', prog: q.objectives.map(() => 0) }; sfx.quest(); toast('Quest accepted', q.name); log(`Quest accepted: <b>${esc(q.name)}</b>`); spawnQuestItems(); renderTracker(); writeSave(); }
function checkQuestReady(q) { const s = qstate(q.id); if (s.status !== 'active') return; if (q.objectives.every((o, i) => s.prog[i] >= o.count)) { s.status = 'ready'; sfx.quest(); toast('Objectives complete', `Return to ${NPCS[q.giver].name}`); writeSave(); } }
function questEvent(type, key) {
  for (const q of QUESTS) { const s = qstate(q.id); if (!s || s.status !== 'active') continue; q.objectives.forEach((o, i) => { if (o.type === type && (o.enemy === key || o.item === key) && s.prog[i] < o.count) { s.prog[i]++; log(`${esc(o.label)}: ${s.prog[i]}/${o.count}`); } }); checkQuestReady(q); }
  renderTracker();
}
function completeQuest(q) {
  const s = qstate(q.id); if (!s || s.status !== 'ready') return; s.status = 'done';
  const rw = q.reward; save.gold += rw.gold; addFloat(`+${rw.gold}g`, state.player.pos, 'gold', 2.8);
  if (rw.potions) save.potions += rw.potions;
  if (rw.item) giveItem(makeItem(rw.item.slot, rw.item.rarity, rw.item.ilvl, mulberry(hashStr(rw.item.name)), rw.item.name));
  sfx.quest(); toast('Quest complete!', q.name); log(`Quest complete: <b>${esc(q.name)}</b>`);
  gainXP(rw.xp);
  renderTracker(); updateHUD(true); writeSave();
  if (q.id === 'q4') { save.finished = true; writeSave(); setTimeout(showEnding, 1600); }
  if (q.id === 'q5') setTimeout(showMillEnding, 1600);
}
function renderTracker() {
  let h = '';
  for (const q of QUESTS) {
    const s = qstate(q.id); if (!s || s.status === 'done') continue;
    h += `<div class="qt">${esc(q.name)}</div>`;
    if (s.status === 'ready') h += `<div class="qo done">✔ Return to ${esc(NPCS[q.giver].name)}</div>`;
    else q.objectives.forEach((o, i) => { h += `<div class="qo ${s.prog[i] >= o.count ? 'done' : ''}">• ${esc(o.label)}: ${s.prog[i]}/${o.count}</div>`; });
  }
  if (!h) {
    const next = QUESTS.find(questAvailable);
    if (next) h = `<div class="qt">Next</div><div class="qo">Talk to ${esc(NPCS[next.giver].name)} <span style="color:#ffd23f">!</span></div>`;
    else if (qstate('q5')?.status === 'done') h = `<div class="qt">All quests done!</div><div class="qo">Run the Mill of Ashes again for loot, or spend your talents.</div>`;
    else if (save.finished) h = `<div class="qt">Greenhollow is safe</div><div class="qo">Explore, hunt loot and level up.</div>`;
  }
  $('tracker').innerHTML = h;
}
const OIL_SPOTS = [[-4, -30], [7.5, -29.5], [5, -38], [-3, -38.5], [9.5, -35]];
function spawnQuestItems() {
  for (const qi of state.questItems) scene.remove(qi.m); state.questItems = [];
  const s = qstate('q2'); if (!s || s.status !== 'active') return;
  const left = 4 - s.prog[0];
  OIL_SPOTS.slice(0, left + 1).forEach(([x, z]) => {
    const m = new THREE.Group(); const pot = G['dun/potion'].scene.clone(true); pot.scale.setScalar(2.2); m.add(pot);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fffd0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    glow.position.y = 1.5; m.add(glow); m.position.set(x, 0, z); scene.add(m);
    state.questItems.push({ m, x, z, item: 'oil' });
  });
}

// ---------- loot ----------
function giveItem(it) {
  if (save.bag.length >= 20) { save.gold += it.value; log(`Bag full: sold ${itemHTML(it)} for ${it.value}g`); return; }
  save.bag.push(it); sfx.loot(); log(`You receive ${itemHTML(it)}`);
}
function dropLoot(e) {
  const def = e.def;
  spawnLootObj(e.pos.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6))), { gold: randi(def.gold[0], def.gold[1]) });
  if (Math.random() < def.drop) {
    let rar = rollRarity(def.level * 1.5); if (def.minRarity) rar = Math.max(rar, def.minRarity);
    const it = makeItem(randomSlot(), rar, def.level + randi(0, 1));
    if (def.boss) it.name = (def.lootPrefix || 'Wraithbound') + ' ' + it.name.split(' ').slice(1).join(' ');
    spawnLootObj(e.pos.clone().add(new THREE.Vector3(rand(-0.9, 0.9), 0, rand(-0.9, 0.9))), { item: it });
  }
  if (Math.random() < 0.12) spawnLootObj(e.pos.clone().add(new THREE.Vector3(rand(-0.9, 0.9), 0, rand(-0.9, 0.9))), { potion: 1 });
}
function spawnLootObj(pos, data) {
  const m = new THREE.Group();
  let color = 0xffd54a;
  if (data.gold) { const c = G['dun/coin'].scene.clone(true); c.scale.setScalar(2.4); m.add(c); }
  else if (data.potion) { const c = G['dun/potion'].scene.clone(true); c.scale.setScalar(2); m.add(c); color = 0xff5a7a; }
  else { const c = G['dun/chest'].scene.clone(true); c.scale.setScalar(1.3); m.add(c); color = RARITY[data.item.rarity].hex; }
  const beamH = data.item ? 2.5 + data.item.rarity * 0.8 : 1.2;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, beamH, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: data.item ? 0.55 : 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = beamH / 2; m.add(beam);
  resolveCollision(pos, 0.5); m.position.copy(pos); scene.add(m);
  state.loot.push({ m, data, t: 0 });
}
function pickupLoot(l) {
  const d = l.data;
  if (d.gold) { save.gold += d.gold; sfx.coin(); addFloat(`+${d.gold}g`, state.player.pos, 'gold', 2.6); }
  else if (d.potion) { save.potions += 1; sfx.loot(); log('You find a <span style="color:#ff8aa0">Healing Draught</span>'); }
  else giveItem(d.item);
  scene.remove(l.m); state.loot.splice(state.loot.indexOf(l), 1);
  updateHUD(true);
}

// ---------- xp ----------
function gainXP(n) {
  if (save.level >= LEVEL_CAP) return;
  save.xp += n; addFloat(`+${n} XP`, state.player.pos, 'xp', 3);
  while (save.level < LEVEL_CAP && save.xp >= xpToNext(save.level)) {
    save.xp -= xpToNext(save.level); save.level++;
    refreshStats(); state.player.hp = state.player.stats.maxHp;
    pillarEffect(state.player.pos, 0xffd54a, 1.6); sfx.level();
    const sk = SKILLS.find((s) => s.level === save.level);
    toast(`Level ${save.level}!`, (sk ? `New skill: ${sk.icon} ${sk.name}` : 'Health and attack power up') + ` · +1 talent point (${IS_TOUCH ? '🌟' : 'T'})`);
    log(`<b style="color:#ffd23f">You reached level ${save.level}!</b>`);
    buildHotbar();
  }
  if (save.level >= LEVEL_CAP) save.xp = 0;
  updateHUD(true);
}

// ---------- combat ----------
function dealToEnemy(e, mult, opts = {}) {
  if (e.state === 'dead') return;
  const p = state.player;
  let dmg = p.stats.ap * mult * (p.stats.dmgMul || 1) * rand(0.9, 1.1);
  const crit = Math.random() * 100 < p.stats.critC; if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; flash(e.c); addFloat(crit ? `${dmg}!` : `${dmg}`, e.pos, crit ? 'crit' : '', 2.2 * e.def.scale);
  crit ? sfx.crit() : sfx.hit();
  if (opts.stun) e.stunT = Math.max(e.stunT, opts.stun);
  if (e.state === 'idle' || e.state === 'return') aggro(e);
  p.combatT = 0;
  if (e.hp <= 0) killEnemy(e);
  return dmg;
}
function aggro(e) {
  if (e.state === 'dead') return;
  e.state = 'chase';
  for (const o of state.enemies) if (o !== e && o.state === 'idle' && o.pos.distanceTo(e.pos) < 4.5 && !o.def.boss) o.state = 'chase';
}
function killEnemy(e) {
  e.state = 'dead'; e.deadT = 0; e.hp = 0; play(e.c, 'die', true, 1);
  save.stats.kills++;
  gainXP(e.def.xp);
  if (!e.summon) dropLoot(e);
  questEvent('kill', e.type);
  if (state.player.target === e) { state.player.target = null; state.player.engage = false; }
  sfx.kill();
  if (e.def.boss || e.def.elite) toast(`${e.def.name} defeated!`);
  if (e.type === 'greywarden') { const ex = state.portals.find((o) => o.id === 'mill-exit'); if (ex) ex.g.visible = true; setTimeout(() => toast('The Grey Warden falls', 'Its mask crumbles to ash... and the body is gone.'), 1500); log('<i>The Grey Warden\'s mask crumbles to ash. A way out glows in the corner.</i>'); }
  for (const s of e.summoned) if (s.state !== 'dead') { s.state = 'dead'; s.deadT = 0; s.hp = 0; play(s.c, 'die', true); }
  e.summoned = [];
}
function hurtPlayer(raw) {
  const p = state.player; if (p.dead) return;
  let dmg = raw * (60 / (60 + p.stats.armor)) * rand(0.9, 1.1);
  if (p.braceT > 0) dmg *= 0.6;
  dmg = Math.max(1, Math.round(dmg));
  p.hp -= dmg; p.resolve = Math.min(100, p.resolve + 6); p.combatT = 0;
  flash(p.c, 0xff2020, 0.1); addFloat(`-${dmg}`, p.pos, 'pl', 2.4); sfx.hurt();
  if (p.hp <= 0 && tal('unbreak') && !p.unbreakUsed) { p.unbreakUsed = true; p.hp = Math.round(p.stats.maxHp * 0.25); pillarEffect(p.pos, 0x9fd4ff, 1.2); toast('Unbreakable!', 'You refuse to fall'); }
  if (p.hp <= 0) playerDie();
}
function playerDie() {
  const p = state.player; p.dead = true; p.hp = 0; p.target = null; p.engage = false; p.dash = null; play(p.c, 'die', true);
  save.stats.deaths++;
  const inMill = state.area === 'mill';
  toast('You have fallen', inMill ? 'Returning to the Mill entrance...' : 'Returning to the Greenhollow beacon...');
  setTimeout(() => {
    $('fade').style.opacity = 1;
    setTimeout(() => {
      if (inMill) p.pos.copy(MILL_START); else p.pos.set(0.5, 0, 4.5); p.hp = Math.round(p.stats.maxHp * 0.6); p.resolve = 0; p.dead = false; play(p.c, 'idle');
      for (const e of state.enemies) if (e.state !== 'dead') e.state = 'return';
      for (const t of state.telegraphs) { scene.remove(t.base); scene.remove(t.fill); } state.telegraphs = [];
      $('fade').style.opacity = 0; writeSave();
    }, 700);
  }, 1800);
}
function nearestEnemy(maxD = 12) {
  const p = state.player; let best = null, bd = maxD;
  for (const e of state.enemies) { if (e.state === 'dead') continue; const d = e.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = e; } }
  return best;
}
function setTarget(e, engage = false) { const p = state.player; p.target = e; if (engage) p.engage = true; updateHUD(true); }
function ensureTarget(range = 12) {
  const p = state.player;
  if (!p.target || p.target.state === 'dead' || p.target.pos.distanceTo(p.pos) > 25) p.target = nearestEnemy(range);
  return p.target;
}
function faceTo(p, pos) { p.facing = Math.atan2(pos.x - p.pos.x, pos.z - p.pos.z); }
function useSkill(i) {
  const p = state.player; if (!p || p.dead || state.paused) return;
  const sk = SKILLS[i]; if (!sk) return;
  unlockAudio();
  if (save.level < sk.level) { toast('', `${sk.name} unlocks at level ${sk.level}`); return; }
  if ((p.cds[sk.id] || 0) > 0 || p.dash) return;
  if (p.resolve < skillCost(sk)) { toast('', `Not enough Resolve (needs ${skillCost(sk)}). Hit things to build it.`); return; }
  if (sk.id === 'wind') {
    p.resolve -= skillCost(sk); const h = Math.round(p.stats.maxHp * (tal('breath') ? 0.5 : 0.35)); p.hp = Math.min(p.stats.maxHp, p.hp + h); p.braceT = 5;
    addFloat(`+${h}`, p.pos, 'heal', 2.6); pillarEffect(p.pos, 0x5aff7a, 1); play(p.c, 'emote-yes', true, 1.6);
  } else if (sk.id === 'cleave') {
    p.resolve -= skillCost(sk); play(p.c, 'attack-melee-right', true, 1.6); ringEffect(p.pos, skillRange(sk), 0xffc04a);
    for (const e of [...state.enemies]) if (e.state !== 'dead' && e.pos.distanceTo(p.pos) < skillRange(sk) + e.rad) dealToEnemy(e, 1.2);
  } else {
    const t = ensureTarget(sk.range + 2); if (!t) { toast('', 'No target nearby'); return; }
    const d = t.pos.distanceTo(p.pos);
    if (sk.id === 'bash') {
      if (d > sk.range + t.rad) { p.target = t; p.engage = true; p.queued = i; return; }
      faceTo(p, t.pos); play(p.c, 'attack-melee-left', true, 1.5); dealToEnemy(t, 1.5, { stun: 1.5 + tal('shieldwall') }); p.resolve = Math.min(100, p.resolve + 15); ringEffect(t.pos, 1.2, 0xaad4ff, 0.3);
    } else if (sk.id === 'charge') {
      if (d > sk.range) { toast('', 'Too far away'); return; }
      if (d < 2.5) { toast('', 'Too close to charge'); return; }
      p.dash = { target: t, t: 0 }; p.target = t; p.engage = true; play(p.c, 'sprint', false, 1.8);
    }
  }
  p.cds[sk.id] = skillCd(sk) * p.stats.cdMul; p.combatT = Math.min(p.combatT, 1); (sk.id === 'bash' ? sfx.bash : sk.id === 'cleave' ? sfx.cleave : sk.id === 'wind' ? sfx.heal : sfx.skill)(); updateHUD(true);
}
function usePotion() {
  const p = state.player; if (!p || p.dead || p.potCd > 0) return;
  if (save.potions <= 0) { toast('', 'No Healing Draughts left. Pip sells them.'); return; }
  save.potions--; p.potCd = 10; const h = Math.round(p.stats.maxHp * 0.45); p.hp = Math.min(p.stats.maxHp, p.hp + h); addFloat(`+${h}`, p.pos, 'heal', 2.6); sfx.loot(); updateHUD(true);
}
function attackCmd() { unlockAudio(); const t = ensureTarget(14); if (t) setTarget(t, true); else toast('', 'No enemies nearby'); }

// ---------- interaction ----------
function nearbyInteractable() {
  const p = state.player; if (!p) return null; let best = null, bd = 3.2;
  for (const id in state.npcs) { const n = state.npcs[id]; const d = n.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = n; } }
  for (const pt of state.portals) { if (!pt.g.visible) continue; const d = pt.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = pt; } }
  return best;
}
function interact() { const n = nearbyInteractable(); if (!n || state.paused) return; if (n.portal) openPortal(n); else openDialog(n.id); }
function npcQuestFor(id) {
  const ready = QUESTS.find((q) => q.giver === id && qstate(q.id)?.status === 'ready'); if (ready) return { q: ready, kind: 'ready' };
  const av = QUESTS.find((q) => q.giver === id && questAvailable(q)); if (av) return { q: av, kind: 'avail' };
  const act = QUESTS.find((q) => q.giver === id && qstate(q.id)?.status === 'active'); if (act) return { q: act, kind: 'active' };
  return null;
}
function rewardText(rw) {
  const parts = [`${rw.xp} XP`, `${rw.gold} gold`]; if (rw.potions) parts.push(`${rw.potions} Healing Draughts`);
  if (rw.item) parts.push(`<span style="color:${rc(rw.item.rarity)}">[${esc(rw.item.name)}]</span>`);
  return parts.join(' · ');
}
const IDLE_LINES = {
  edda: ['Keep your shield up and your eyes on the treeline, Warden.', 'The beacon holds the mist back. For now.'],
  pip: ['Lamps don\'t light themselves! Well, some do. Not mine.', 'Need anything? I have a bit of everything. Mostly bits.'],
  marla: ['Those husks were my farmhands. Tom, Jory, old Wendel... Put them to rest gently, please.', 'The crops will grow back. People don\'t.'],
};
function openDialog(id) {
  const n = state.npcs[id]; const d = n.def; const qq = npcQuestFor(id);
  let text = '', extra = '', btns = '';
  if (qq?.kind === 'ready') { text = qq.q.doneText; extra = `<div class="rw">Reward: ${rewardText(qq.q.reward)}</div>`; btns += `<button class="pbtn go" data-do="complete" data-q="${qq.q.id}">Complete quest</button>`; }
  else if (qq?.kind === 'avail') { text = qq.q.text; extra = `<div class="rw">Reward: ${rewardText(qq.q.reward)}</div>`; btns += `<button class="pbtn go" data-do="accept" data-q="${qq.q.id}">Accept: ${esc(qq.q.name)}</button>`; }
  else if (qq?.kind === 'active') text = qq.q.progressText;
  else text = IDLE_LINES[id][Math.floor(Math.random() * IDLE_LINES[id].length)];
  if (d.vendor) btns += `<button class="pbtn" data-do="shop">🪙 Browse wares</button>`;
  btns += `<button class="pbtn" data-do="close">Goodbye</button>`;
  openPanel(d.name, `<div class="dlg"><i style="color:#bbb">${esc(d.title)}</i><p>${esc(text)}</p>${extra}<div class="btnrow">${btns}</div></div>`);
  $('pbody').querySelectorAll('[data-do]').forEach((b) => b.onclick = () => {
    const act = b.dataset.do; const q = QUESTS.find((x) => x.id === b.dataset.q);
    if (act === 'accept') { acceptQuest(q); closePanel(); }
    else if (act === 'complete') { closePanel(); completeQuest(q); }
    else if (act === 'shop') openVendor();
    else closePanel();
  });
}

// ---------- panels ----------
function openPanel(title, html) { if (!state.panel) sfx.click(); $('ptitle').textContent = title; $('pbody').innerHTML = html; $('panel').classList.remove('hidden'); $('card').classList.add('hidden'); state.paused = true; state.panel = title; }
function closePanel() { $('panel').classList.add('hidden'); $('card').classList.add('hidden'); state.paused = false; state.panel = null; state.vendorOpen = false; writeSave(); }
$('pclose').onclick = closePanel;
function cellHTML(it, attrs = '') {
  if (!it) return `<div class="cell empty"></div>`;
  return `<button class="cell" style="border-color:${rc(it.rarity)}" ${attrs} title="${esc(it.name)}">${SLOT_ICONS[it.slot]}<span class="il">${it.ilvl}</span></button>`;
}
function statLines(it) { return Object.entries(it.stats).map(([k, v]) => `<div>${k === 'dmg' || k === 'armor' ? '' : '+'}${v} ${STAT_NAMES[k]}</div>`).join(''); }
function compareHTML(it) {
  const eq = save.equip[it.slot]; if (eq && eq.id === it.id) return '';
  if (!eq) return '<div class="cmp up">Empty slot: an upgrade!</div>';
  const keys = new Set([...Object.keys(it.stats), ...Object.keys(eq.stats)]); let h = '';
  for (const k of keys) { const dv = (it.stats[k] || 0) - (eq.stats[k] || 0); if (dv) h += `<span class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '+' : ''}${dv} ${STAT_NAMES[k]}</span> `; }
  return `<div class="cmp">Compared with ${esc(eq.name)}: ${h || 'same stats'}</div>`;
}
function showCard(it, where, vendorPrice) {
  const c = $('card');
  let btns = '';
  if (where === 'bag') { btns += `<button class="pbtn go" data-c="equip">Equip</button>`; btns += state.vendorOpen ? `<button class="pbtn" data-c="sell">Sell ${it.value}g</button>` : `<button class="pbtn" data-c="drop">Destroy</button>`; }
  if (where === 'equip') btns += `<button class="pbtn" data-c="unequip">Unequip</button>`;
  if (where === 'shop') btns += `<button class="pbtn go" data-c="buy" ${save.gold < vendorPrice ? 'disabled' : ''}>Buy ${vendorPrice}g</button>`;
  btns += `<button class="pbtn" data-c="x">Close</button>`;
  c.innerHTML = `<div class="nm" style="color:${rc(it.rarity)}">${esc(it.name)}</div><div style="color:#bbb">${RARITY[it.rarity].name} ${SLOT_NAMES[it.slot]} · item level ${it.ilvl}</div>${statLines(it)}<div style="color:#ffd54a;font-size:12px">Sells for ${it.value}g</div>${compareHTML(it)}<div class="btnrow">${btns}</div>`;
  c.classList.remove('hidden');
  c.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
    const a = b.dataset.c;
    if (a === 'equip') equipItem(it);
    else if (a === 'unequip') unequipItem(it.slot);
    else if (a === 'sell') { const i = save.bag.indexOf(it); if (i >= 0) { save.bag.splice(i, 1); save.gold += it.value; sfx.coin(); log(`Sold ${itemHTML(it)} for ${it.value}g`); } }
    else if (a === 'drop') { const i = save.bag.indexOf(it); if (i >= 0) save.bag.splice(i, 1); }
    else if (a === 'buy') { if (save.bag.length >= 20) toast('', 'Your bag is full'); else if (save.gold >= vendorPrice) { save.gold -= vendorPrice; const copy = { ...it, id: newId(), stats: { ...it.stats } }; save.bag.push(copy); sfx.coin(); log(`Bought ${itemHTML(copy)}`); } }
    c.classList.add('hidden');
    if (a !== 'x') { if (state.vendorOpen) openVendor(); else openChar(); updateHUD(true); writeSave(); }
  });
}
function equipItem(it) {
  const i = save.bag.indexOf(it); if (i < 0) return;
  const old = save.equip[it.slot]; save.bag.splice(i, 1); if (old) save.bag.splice(i, 0, old);
  save.equip[it.slot] = it; refreshStats(); sfx.loot(); log(`Equipped ${itemHTML(it)}`);
}
function unequipItem(slot) { const it = save.equip[slot]; if (!it) return; if (save.bag.length >= 20) { toast('', 'Your bag is full'); return; } delete save.equip[slot]; save.bag.push(it); refreshStats(); }
function bagGrid() { let h = '<div class="grid">'; for (let i = 0; i < 20; i++) h += cellHTML(save.bag[i], save.bag[i] ? `data-bag="${i}"` : ''); return h + '</div>'; }
function wireBag() { $('pbody').querySelectorAll('[data-bag]').forEach((b) => b.onclick = () => showCard(save.bag[+b.dataset.bag], 'bag')); }
function openChar() {
  const s = state.player.stats;
  let eq = '<div class="eq">'; for (const k of SLOTS) eq += save.equip[k] ? cellHTML(save.equip[k], `data-eq="${k}"`) : `<div class="cell empty" title="${SLOT_NAMES[k]}">${SLOT_ICONS[k]}</div>`; eq += '</div>';
  const html = `<div class="cols"><div><div class="h3">Equipped</div>${eq}<div class="stats"><div>Level ${save.level} Warden</div><div>❤️ Health: ${s.maxHp}</div><div>⚔️ Attack power: ${s.ap}</div><div>🛡️ Armour: ${s.armor} (takes ${Math.round(100 - 6000 / (60 + s.armor))}% less damage)</div><div>💥 Crit chance: ${s.critC}%</div><div>⏱️ Haste: ${s.haste}%</div><div>🪙 Gold: ${save.gold} · 🧪 Draughts: ${save.potions}</div><div style="color:#aaa">Kills: ${save.stats.kills} · Deaths: ${save.stats.deaths}</div></div></div><div><div class="h3">Bag (${save.bag.length}/20)</div>${bagGrid()}<div style="font-size:12px;color:#aaa;margin-top:8px">Tap an item to see it, compare it and equip it.</div></div></div>`;
  openPanel('Character', html); state.vendorOpen = false; wireBag();
  $('pbody').querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => showCard(save.equip[b.dataset.eq], 'equip'));
}
function vendorItem(v) { return makeItem(v.item.slot, v.item.rarity, v.item.ilvl, mulberry(hashStr(v.item.name)), v.item.name); }
function openVendor() {
  let list = '';
  VENDOR_STOCK.forEach((v, i) => {
    if (v.kind === 'potion') list += `<div class="vrow" data-v="${i}"><span class="cell" style="width:38px;height:38px;font-size:20px">🧪</span><span>${esc(v.name)}<br><small style="color:#aaa">Heals 45% of your health</small></span><span class="pr">${v.price}g</span></div>`;
    else { const it = vendorItem(v); list += `<div class="vrow" data-v="${i}"><span class="cell" style="width:38px;height:38px;font-size:20px;border-color:${rc(it.rarity)}">${SLOT_ICONS[it.slot]}</span><span style="color:${rc(it.rarity)}">${esc(it.name)}<br><small style="color:#aaa">${SLOT_NAMES[it.slot]} · ilvl ${it.ilvl}</small></span><span class="pr">${v.price}g</span></div>`; }
  });
  openPanel('Pip\'s Goods', `<div class="cols"><div><div class="h3">For sale · you have 🪙 ${save.gold}</div>${list}</div><div><div class="h3">Your bag: tap an item to sell it</div>${bagGrid()}</div></div>`);
  state.vendorOpen = true; wireBag();
  $('pbody').querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
    const v = VENDOR_STOCK[+b.dataset.v];
    if (v.kind === 'potion') { if (save.gold >= v.price) { save.gold -= v.price; save.potions++; sfx.coin(); log('Bought a Healing Draught'); openVendor(); updateHUD(true); writeSave(); } else toast('', 'Not enough gold'); }
    else showCard(vendorItem(v), 'shop', v.price);
  });
}
function openMenu() {
  const onoff = (v) => v ? 'On' : 'Off';
  openPanel('Menu', `<div class="btnrow"><button class="pbtn go" data-m="resume">Resume</button><button class="pbtn" data-m="save">Save now</button><button class="pbtn" data-m="new">New game</button></div><div class="h3" style="margin-top:12px">Settings</div><div class="btnrow"><button class="pbtn" data-m="quality">Graphics: ${QUALITY_NAMES[settings.quality]}${settings.quality === 'auto' ? ` (${QUALITY_NAMES[autoLevel]})` : ''}</button><button class="pbtn" data-m="shadows">Shadows: ${onoff(settings.shadows)}</button><button class="pbtn" data-m="music">Music: ${onoff(settings.music)}</button><button class="pbtn" data-m="sfx">Sounds: ${onoff(settings.sfx)}</button><button class="pbtn" data-m="fps">Show FPS: ${onoff(settings.fps)}</button></div><div style="font-size:12px;color:#aaa;margin-top:4px">If the game feels slow on your phone, set Graphics to Low (this also turns shadows off).</div><div class="info"><b>Controls</b><br>${IS_TOUCH ? 'Drag on the left side to move. ⚔️ attacks the nearest enemy. Tap an enemy to target it.' : 'WASD / arrows: move · Click: target · F or Tab: attack nearest · 1–4: skills · Q: potion · E: talk / enter · C/B: bag · T: talents · Wheel: zoom'}</div><div class="info">3D models and sound effects by Kenney (kenney.nl), CC0. Music by RandomMind (opengameart.org), CC0. Engine: three.js (MIT). Shards of Vael is an original world by Rob, his son and Grok Bot.</div>`);
  $('pbody').querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    const m = b.dataset.m;
    if (m === 'save') { writeSave(); closePanel(); toast('', 'Game saved'); }
    else if (m === 'quality') { const order = ['auto', 'low', 'medium', 'high']; settings.quality = order[(order.indexOf(settings.quality) + 1) % 4]; saveSettings(); applyQuality(); openMenu(); }
    else if (m === 'shadows' || m === 'music' || m === 'sfx' || m === 'fps') { settings[m] = !settings[m]; saveSettings(); applyQuality(); if (m === 'music' && typeof updateMusic === 'function') updateMusic(); openMenu(); }
    else if (m === 'new') { if (confirm('Start again from level 1? Your current progress will be erased.')) { localStorage.removeItem(SAVE_KEY); save = null; location.reload(); } }
    else closePanel();
  });
}
function showMillEnding() {
  openPanel('The Mill Falls Silent', `<div class="dlg"><p>The great millstone stops turning. The ash settles. Somewhere far to the east, past the hills, a bell rings once, though no one is there to ring it.</p><div class="rw">🎉 You finished everything in this test build: four Greenhollow quests and the Mill of Ashes. You can run the Mill again for more loot. What comes next is up to Rob and his son!</div><div class="btnrow"><button class="pbtn go" id="endok">Continue</button></div></div>`);
  $('endok').onclick = closePanel;
}
function showEnding() {
  openPanel('A Vision in the Shrine', `<div class="dlg"><p>As the wraith dissolves, the shrine flares with moonlight. For a heartbeat you see a throne of black glass, and a crown with no light in it.</p><p><i>"Little Warden. You have lit one candle. I am the night that swallows them all."</i></p><p>The vision fades. Greenhollow is safe, for now.</p><div class="rw">🎉 You finished the Greenhollow test slice! Next: Captain Edda has one more job for you, down in the Mill of Ashes.</div><div class="btnrow"><button class="pbtn go" id="endok">Continue</button></div></div>`);
  $('endok').onclick = closePanel;
}

// ---------- HUD ----------
function buildHotbar() {
  const hb = $('hotbar'); hb.innerHTML = '';
  const mk = (html, cls, onClick, title) => { const b = document.createElement('button'); b.className = 'slot ' + cls; b.innerHTML = html; b.title = title; b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); }); hb.appendChild(b); return b; };
  const k = (s) => IS_TOUCH ? '' : `<span class="k">${s}</span>`;
  state.hbAtk = mk(`${k('F')}⚔️`, 'atk', attackCmd, 'Attack the nearest enemy (F)');
  state.hbSkills = SKILLS.map((s, i) => mk(`${k(s.key)}${s.icon}<div class="cd hidden"></div>`, save.level < s.level ? 'locked' : '', () => useSkill(i), `${s.name}: ${s.desc}${save.level < s.level ? ` (unlocks at level ${s.level})` : ''}`));
  state.hbPot = mk(`${k('Q')}🧪<span class="n"></span><div class="cd hidden"></div>`, '', usePotion, 'Healing Draught (Q)');
}
let hudN = 0;
function updateHUD(force = false) {
  const p = state.player; if (!p) return;
  if (!force && (hudN++ % 4)) return;
  const s = p.stats;
  $('plvl').textContent = save.level; $('php').style.width = (100 * Math.max(0, p.hp) / s.maxHp) + '%'; $('phpt').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${s.maxHp}`;
  $('pres').style.width = p.resolve + '%'; $('prest').textContent = `Resolve ${Math.floor(p.resolve)}`;
  $('pgold').textContent = save.gold; $('ppot').textContent = `🧪 ${save.potions}`;
  const need = xpToNext(save.level); $('xpfill').style.width = (save.level >= LEVEL_CAP ? 100 : 100 * save.xp / need) + '%'; $('xptext').textContent = save.level >= LEVEL_CAP ? 'Max level for this test build' : `Level ${save.level} · XP ${save.xp} / ${need}`;
  const t = p.target;
  if (t && t.state !== 'dead') { $('tframe').classList.remove('hidden'); $('tname').textContent = t.def.name; $('tlvl').textContent = t.def.level; $('thp').style.width = (100 * t.hp / t.maxHp) + '%'; $('thpt').textContent = `${Math.ceil(t.hp)} / ${t.maxHp}`; }
  else $('tframe').classList.add('hidden');
  if (state.hbSkills) {
    SKILLS.forEach((sk, i) => {
      const b = state.hbSkills[i]; const cd = p.cds[sk.id] || 0; const cdel = b.querySelector('.cd');
      b.classList.toggle('locked', save.level < sk.level); b.classList.toggle('nores', save.level >= sk.level && p.resolve < skillCost(sk));
      if (cd > 0) { cdel.classList.remove('hidden'); cdel.textContent = Math.ceil(cd); } else cdel.classList.add('hidden');
    });
    state.hbPot.querySelector('.n').textContent = save.potions; const pc = state.hbPot.querySelector('.cd');
    if (p.potCd > 0) { pc.classList.remove('hidden'); pc.textContent = Math.ceil(p.potCd); } else pc.classList.add('hidden');
    state.hbPot.classList.toggle('locked', save.potions <= 0);
  }
  const tb = document.querySelector('#topbtns [data-act=talents]'); if (tb) tb.classList.toggle('glow', talentPoints() > 0);
  const n = nearbyInteractable();
  if (n && !state.paused) { $('interact').classList.remove('hidden'); $('interact').textContent = n.portal ? `🌀 ${IS_TOUCH ? '' : '[E] '}${n.def.verb}` : `💬 ${IS_TOUCH ? '' : '[E] '}Talk to ${n.def.name.split(' ').slice(-2).join(' ')}`; } else $('interact').classList.add('hidden');
}
const mm = $('minimap').getContext('2d');
let mmT = 0;
function drawMinimap() {
  const p = state.player; const S = 160, R = 30; const inMill = state.area === 'mill';
  const M = inMill ? { x0: MILL.ox - 10, z0: MILL.oz - 50, size: 120, bg: millBg } : { x0: -70, z0: -70, size: 140, bg: minimapBg };
  const scale = 160 / M.size;
  mm.save(); mm.clearRect(0, 0, S, S); mm.beginPath(); mm.arc(80, 80, 79, 0, 7); mm.clip();
  if (inMill) { mm.fillStyle = '#0b0908'; mm.fillRect(0, 0, S, S); }
  const z = M.size / (R * 2); const px = (p.pos.x - M.x0) * scale, pz = (p.pos.z - M.z0) * scale;
  mm.translate(80, 80); mm.rotate(Math.PI / 4); mm.scale(z, z); mm.translate(-px, -pz);
  mm.drawImage(M.bg, 0, 0);
  const dot = (x, zz, col, r) => { mm.fillStyle = col; mm.beginPath(); mm.arc((x - M.x0) * scale, (zz - M.z0) * scale, r / z, 0, 7); mm.fill(); };
  for (const pt of state.portals) if (pt.g.visible) dot(pt.pos.x, pt.pos.z, '#c9a4ff', 4);
  for (const e of state.enemies) if (e.state !== 'dead') dot(e.pos.x, e.pos.z, e.def.boss || e.def.elite ? '#ff3a3a' : '#ff8a6a', e.def.boss || e.def.elite ? 4 : 2.5);
  for (const qi of state.questItems) dot(qi.x, qi.z, '#7fffd0', 3);
  for (const id in state.npcs) { const n = state.npcs[id]; const q = npcQuestFor(id); dot(n.pos.x, n.pos.z, q && q.kind !== 'active' ? '#ffd23f' : '#9fe39a', 3.5); }
  if (!inMill) for (const q of QUESTS) { const s = qstate(q.id); if (s?.status === 'active') { mm.strokeStyle = '#ffd23f'; mm.lineWidth = 2 / z; mm.beginPath(); mm.arc((q.hint[0] - M.x0) * scale, (q.hint[1] - M.z0) * scale, 10 / z, 0, 7); mm.stroke(); } }
  mm.restore();
  mm.fillStyle = '#fff'; mm.beginPath(); mm.arc(80, 80, 4, 0, 7); mm.fill(); mm.strokeStyle = '#000'; mm.lineWidth = 1; mm.stroke();
}

// ---------- input ----------
const keys = {};
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
addEventListener('keydown', (e) => {
  if (!state.started) return;
  const k = e.key.toLowerCase(); keys[k] = true; unlockAudio();
  if (k === 'tab') e.preventDefault();
  if (e.repeat) return;
  if (k === 'escape') { if (!$('card').classList.contains('hidden')) $('card').classList.add('hidden'); else if (state.panel) closePanel(); else openMenu(); return; }
  if (state.panel) { if (k === 'c' || k === 'b' || k === 'i' || k === 't' || k === 'n') closePanel(); return; }
  if (['1', '2', '3', '4'].includes(k)) useSkill(+k - 1);
  else if (k === 'q') usePotion();
  else if (k === 'f') attackCmd();
  else if (k === 'tab') cycleTarget();
  else if (k === 'e') interact();
  else if (k === 'c' || k === 'b' || k === 'i') openChar();
  else if (k === 't' || k === 'n') openTalents();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { writeSave(); for (const k in keys) keys[k] = false; } updateMusic(); clock.getDelta(); });
document.addEventListener('pointerdown', () => unlockAudio(), true);
function cycleTarget() {
  const p = state.player; const list = state.enemies.filter((e) => e.state !== 'dead' && e.pos.distanceTo(p.pos) < 16).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
  if (!list.length) return; const i = list.indexOf(p.target); setTarget(list[(i + 1) % list.length], true);
}
renderer.domElement.addEventListener('wheel', (e) => { viewH = Math.max(13, Math.min(32, viewH + Math.sign(e.deltaY) * 1.5)); resize(); }, { passive: true });
function screenOf(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }
function pickAt(x, y) {
  let best = null, bd = IS_TOUCH ? 60 : 45;
  for (const e of state.enemies) { if (e.state === 'dead') continue; const s = screenOf(e.pos.clone().setY(0.9 * e.def.scale)); const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = { type: 'enemy', e }; } }
  for (const id in state.npcs) { const n = state.npcs[id]; const s = screenOf(n.pos.clone().setY(0.9)); const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = { type: 'npc', n }; } }
  return best;
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!state.started || state.paused) return; unlockAudio();
  const hit = pickAt(e.clientX, e.clientY);
  if (hit?.type === 'enemy') { setTarget(hit.e, true); return; }
  if (hit?.type === 'npc') { if (hit.n.pos.distanceTo(state.player.pos) < 3.5) openDialog(hit.n.id); else { state.player.walkTo = hit.n.pos.clone(); state.player.walkToNpc = hit.n.id; } return; }
  if ((e.pointerType === 'touch' || IS_TOUCH) && e.clientX < innerWidth * 0.6 && !joy.active) {
    joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
    const j = $('joy'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.classList.remove('hidden'); $('joyknob').style.transform = '';
  }
});
addEventListener('pointermove', (e) => {
  if (joy.active && e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 50; if (d > m) { dx *= m / d; dy *= m / d; }
    joy.dx = dx / m; joy.dy = dy / m; $('joyknob').style.transform = `translate(${dx}px,${dy}px)`;
  }
});
const endJoy = (e) => { if (joy.active && e.pointerId === joy.id) { joy.active = false; joy.dx = joy.dy = 0; $('joy').classList.add('hidden'); } };
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
$('interact').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); interact(); });
document.querySelectorAll('#topbtns button').forEach((b) => b.addEventListener('click', () => { if (state.panel) { closePanel(); return; } if (b.dataset.act === 'char') openChar(); else if (b.dataset.act === 'talents') openTalents(); else openMenu(); }));

// ---------- update ----------
const FWD = new THREE.Vector3(-1, 0, -1).normalize(), RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const debugMove = { x: 0, y: 0 };
function inputVector() {
  let x = 0, y = 0;
  if (keys['w'] || keys['arrowup']) y += 1; if (keys['s'] || keys['arrowdown']) y -= 1;
  if (keys['d'] || keys['arrowright']) x += 1; if (keys['a'] || keys['arrowleft']) x -= 1;
  if (joy.active) { x += joy.dx; y -= joy.dy; }
  x += debugMove.x; y += debugMove.y;
  const v = new THREE.Vector3().addScaledVector(RIGHT, x).addScaledVector(FWD, y);
  if (v.length() > 1) v.normalize();
  return v;
}
function turnTo(holder, target, rate, dt) { let dr = target - holder.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); holder.rotation.y += dr * Math.min(1, dt * rate); }
function updatePlayer(dt) {
  const p = state.player; const c = p.c;
  for (const k in p.cds) p.cds[k] = Math.max(0, p.cds[k] - dt);
  p.potCd = Math.max(0, p.potCd - dt); p.braceT = Math.max(0, p.braceT - dt); p.combatT += dt;
  if (p.combatT > 5) { p.unbreakUsed = false; p.resolve = Math.max(0, p.resolve - 6 * dt); if (!p.dead) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.05 * dt); }
  c.lockT = Math.max(0, c.lockT - dt);
  if (p.dead) { c.mixer.update(dt); return; }
  if (p.target && p.target.state === 'dead') { p.target = null; p.engage = false; }
  if (p.dash) {
    const t = p.dash.target; const to = t.pos.clone().sub(p.pos); to.y = 0; const d = to.length();
    if (d <= 1.6 + t.rad || t.state === 'dead' || p.dash.t > 1) {
      if (t.state !== 'dead') { dealToEnemy(t, tal('bloodrush') ? 1.6 : 0.8, { stun: 1 }); ringEffect(t.pos, 2, 0xffffff, 0.35); }
      p.resolve = Math.min(100, p.resolve + 20); p.dash = null; c.lockT = 0; play(c, 'attack-melee-right', true, 1.6);
    } else { p.pos.addScaledVector(to.normalize(), Math.min(22 * dt, d - 1.5)); faceTo(p, t.pos); p.dash.t += dt; }
    resolveCollision(p.pos, 0.45);
  } else {
    let mv = inputVector();
    if (mv.lengthSq() > 0.01) { p.engage = false; p.walkTo = null; p.queued = null; }
    else if (p.walkTo) {
      const to = p.walkTo.clone().sub(p.pos); to.y = 0;
      if (to.length() < 2.6) { const id = p.walkToNpc; p.walkTo = null; p.walkToNpc = null; if (id) openDialog(id); } else mv = to.normalize();
    } else if (p.engage && p.target) {
      const to = p.target.pos.clone().sub(p.pos); to.y = 0;
      if (to.length() > 1.7 + p.target.rad) mv = to.normalize();
    }
    if (mv.lengthSq() > 0.01) {
      const ml = Math.min(1, mv.length() * 1.2);
      p.pos.addScaledVector(mv.clone().normalize(), 5.6 * dt * ml); p.facing = Math.atan2(mv.x, mv.z);
      if (c.lockT <= 0) play(c, ml > 0.6 ? 'sprint' : 'walk', false, ml > 0.6 ? 1.1 : 1.2);
    } else if (c.lockT <= 0) play(c, 'idle');
    resolveCollision(p.pos, 0.45);
  }
  p.atkT -= dt;
  const t = p.target;
  if (t && t.state !== 'dead') {
    const d = t.pos.distanceTo(p.pos);
    if (p.queued != null && d <= SKILLS[p.queued].range + t.rad) { const q = p.queued; p.queued = null; useSkill(q); }
    if (t.state !== 'dead' && d <= 2.1 + t.rad && p.atkT <= 0 && !p.dash) {
      faceTo(p, t.pos); play(c, 'attack-melee-right', true, 1.4); p.atkT = p.stats.atkInt;
      p.resolve = Math.min(100, p.resolve + 10); const dd = dealToEnemy(t, 1.0); if (dd && tal('renew')) { const h = Math.max(1, Math.round(dd * 0.2)); p.hp = Math.min(p.stats.maxHp, p.hp + h); }
    }
  }
  for (const l of [...state.loot]) if (l.m.position.distanceTo(p.pos) < 1.5) pickupLoot(l);
  for (const qi of [...state.questItems]) if (Math.hypot(qi.x - p.pos.x, qi.z - p.pos.z) < 1.5) {
    scene.remove(qi.m); state.questItems.splice(state.questItems.indexOf(qi), 1); sfx.loot(); questEvent('collect', qi.item);
    if (qstate('q2')?.status !== 'active') { for (const o of state.questItems) scene.remove(o.m); state.questItems = []; }
  }
  turnTo(c.holder, p.facing, 14, dt);
  c.holder.position.copy(p.pos);
  c.mixer.update(dt); updateFlash(c, dt);
  if (p.target && p.target.state !== 'dead') { p.selRing.visible = true; p.selRing.position.set(p.target.pos.x, 0.05, p.target.pos.z); const s = p.target.def.scale; p.selRing.scale.set(s, 1, s); } else p.selRing.visible = false;
}
function updateEnemy(e, dt) {
  const p = state.player; const def = e.def; const c = e.c;
  c.lockT = Math.max(0, c.lockT - dt);
  if (e.state === 'dead') {
    e.deadT += dt; if (c.holder.visible) c.mixer.update(dt);
    if (e.deadT > 2.5 && e.deadT < 4.5) c.holder.position.y = -(e.deadT - 2.5) * 0.8;
    if (e.deadT > 4) c.holder.visible = false;
    if (e.summon) { if (e.deadT > 4) removeEnemy(e); return; }
    if (e.sp.dungeon) return; // dungeon enemies stay beaten until you leave
    const respawn = def.boss || def.elite ? 75 : 28;
    if (e.deadT > respawn && e.home.distanceTo(p.pos) > 20) { e.hp = e.maxHp; e.state = 'idle'; e.pos.copy(e.home); c.holder.visible = true; c.holder.position.copy(e.pos); play(c, 'idle'); e.summonDone = []; e.enraged = false; e.specT = (def.slam?.every || 99) * 0.6; e.rainT = (def.rain?.every || 99) * 0.6; }
    return;
  }
  e.stunT = Math.max(0, e.stunT - dt); e.atkT -= dt;
  const dP = e.pos.distanceTo(p.pos);
  let mv = null, speed = def.speed;
  if (e.state === 'idle') {
    if (!p.dead && dP < def.aggro) aggro(e);
    e.wanderT -= dt;
    if (e.wanderT <= 0) { e.wanderT = rand(3, 7); e.wanderTo = Math.random() < 0.6 ? e.home.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))) : null; }
    if (e.wanderTo) { const to = e.wanderTo.clone().sub(e.pos); if (to.length() > 0.3) { mv = to.normalize(); speed = def.speed * 0.35; } else e.wanderTo = null; }
  } else if (e.state === 'chase') {
    if (p.dead || e.pos.distanceTo(e.home) > 24) e.state = 'return';
    else if (e.stunT <= 0) {
      const reach = 1.4 + e.rad;
      if (dP > reach) mv = p.pos.clone().sub(e.pos).normalize();
      else {
        e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        if (e.atkT <= 0) { e.atkT = e.enraged ? 1.15 : 1.6; play(c, 'attack-melee-right', true, 1.2); e.pendingHit = 0.3; }
      }
      e.specT -= dt; e.rainT -= dt;
      if (def.slam && e.specT <= 0) { const sp = def.slam; e.specT = sp.every; addTelegraph(e.pos.x, e.pos.z, sp.radius, sp.windup, sp.dmg, e); e.stunT = sp.windup; e.pendingHit = undefined; play(c, 'crouch', true, 0.8); toast('', `${def.name} winds up a slam: move out of the red!`); }
      else if (def.rain && e.rainT <= 0 && (!def.rain.below || e.hp < e.maxHp * def.rain.below)) { const sp = def.rain; e.rainT = sp.every; addTelegraph(p.pos.x, p.pos.z, sp.radius, sp.windup, sp.dmg, e); if (e.hp < e.maxHp * 0.6) addTelegraph(p.pos.x + rand(-3, 3), p.pos.z + rand(-3, 3), sp.radius, sp.windup + 0.4, sp.dmg, e); }
      if (def.summon) def.summon.forEach((th, i) => { if (!e.summonDone[i] && e.hp < e.maxHp * th) { e.summonDone[i] = true; for (let k = 0; k < 2; k++) { const s = spawnEnemy({ type: def.summonType || 'ghost', x: e.pos.x + rand(-3, 3), z: e.pos.z + rand(-3, 3), dungeon: e.sp.dungeon }); s.summon = true; s.state = 'chase'; s.home.copy(e.home); e.summoned.push(s); } toast('', def.summonText || 'The Wraith calls its shades!'); } });
      if (def.enrage && !e.enraged && e.hp < e.maxHp * def.enrage) { e.enraged = true; speed *= 1.25; flash(c, 0xff3a1a, 0.4); toast('', `${def.name} is enraged! Use Second Wind and potions!`); }
      if (e.enraged) speed = def.speed * 1.25;
    }
    if (e.pendingHit !== undefined) { e.pendingHit -= dt; if (e.pendingHit <= 0) { e.pendingHit = undefined; if (e.stunT <= 0 && e.pos.distanceTo(p.pos) < 1.4 + e.rad + 0.8) hurtPlayer(def.dmg); } }
  } else if (e.state === 'return') {
    const to = e.home.clone().sub(e.pos); if (to.length() < 0.5) { e.state = 'idle'; e.hp = e.maxHp; } else { mv = to.normalize(); speed = def.speed * 1.4; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5 * dt); }
  }
  if (mv && e.stunT <= 0) { e.pos.addScaledVector(mv, speed * dt); e.facing = Math.atan2(mv.x, mv.z); if (c.lockT <= 0) play(c, speed > def.speed * 0.6 ? 'sprint' : 'walk', false, def.model.includes('zombie') ? 0.7 : 1); }
  else if (c.lockT <= 0) play(c, 'idle');
  for (const o of state.enemies) { if (o === e || o.state === 'dead') continue; const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = e.rad + o.rad; if (d < m && d > 1e-4) { e.pos.x += dx / d * (m - d) * 0.5; e.pos.z += dz / d * (m - d) * 0.5; } }
  if (!p.dead) { const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz), m = e.rad + 0.45; if (d < m && d > 1e-4) { e.pos.x += dx / d * (m - d); e.pos.z += dz / d * (m - d); } }
  resolveCollision(e.pos, e.rad);
  turnTo(c.holder, e.facing, 10, dt);
  c.holder.position.copy(e.pos);
  if (def.model.includes('ghost')) c.holder.position.y = 0.25 + Math.sin(state.time * 2 + e.home.x) * 0.15;
  c.holder.rotation.z = e.stunT > 0 ? Math.sin(state.time * 30) * 0.05 : 0;
  c.mixer.update(dt); updateFlash(c, dt);
}
function updateTelegraphs(dt) {
  const p = state.player;
  for (const t of [...state.telegraphs]) {
    t.t += dt; const f = Math.min(1, t.t / t.windup); t.fill.scale.set(Math.max(0.01, f), 1, Math.max(0.01, f));
    if (t.t >= t.windup) {
      if (!p.dead && t.src.state !== 'dead' && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < t.radius - 0.2) hurtPlayer(t.dmg);
      ringEffect(new THREE.Vector3(t.x, 0, t.z), t.radius, 0xff6a2a, 0.4);
      scene.remove(t.base); scene.remove(t.fill); state.telegraphs.splice(state.telegraphs.indexOf(t), 1);
    }
  }
}
function updateLabels() {
  const p = state.player;
  for (const e of state.enemies) {
    const vis = e.state !== 'dead' && e.pos.distanceTo(p.pos) < 26;
    if (!vis) { e.label.style.display = 'none'; continue; }
    const s = screenOf(e.pos.clone().setY(2.05 * e.def.scale + 0.2));
    e.label.style.display = ''; e.label.style.left = s.x + 'px'; e.label.style.top = s.y + 'px';
    e.label.classList.toggle('tgt', p.target === e);
    e.label.querySelector('.hb div').style.width = (100 * e.hp / e.maxHp) + '%';
    e.label.querySelector('.nm').style.display = (p.target === e || e.def.boss || e.def.elite || e.hp < e.maxHp) ? '' : 'none';
  }
  for (const id in state.npcs) {
    const n = state.npcs[id]; const s = screenOf(n.pos.clone().setY(2.3 * (n.def.scale || 1)));
    if (!n.mark) { n.mark = document.createElement('div'); n.mark.className = 'mark'; $('labels').appendChild(n.mark); n.name = document.createElement('div'); n.name.className = 'npcn'; n.name.innerHTML = `${esc(n.def.name)}<br><i>&lt;${esc(n.def.title)}&gt;</i>`; $('labels').appendChild(n.name); }
    const q = npcQuestFor(id);
    n.mark.textContent = q ? (q.kind === 'avail' ? '!' : '?') : ''; n.mark.classList.toggle('grey', q?.kind === 'active');
    n.mark.style.left = s.x + 'px'; n.mark.style.top = (s.y - 26) + 'px';
    n.name.style.left = s.x + 'px'; n.name.style.top = s.y + 'px';
  }
  for (const pt of state.portals) {
    if (!pt.label) { pt.label = document.createElement('div'); pt.label.className = 'npcn portal'; pt.label.innerHTML = `${esc(pt.def.name)}<br><i>&lt;${esc(pt.def.title)}&gt;</i>`; $('labels').appendChild(pt.label); }
    const vis = pt.g.visible && pt.pos.distanceTo(p.pos) < 30; pt.label.style.display = vis ? '' : 'none';
    if (vis) { const s = screenOf(pt.pos.clone().setY(2.9)); pt.label.style.left = s.x + 'px'; pt.label.style.top = s.y + 'px'; }
  }
  for (const f of state.floats) { const s = screenOf(f.pos); f.el.style.left = s.x + 'px'; f.el.style.top = (s.y - f.t * 50) + 'px'; f.el.style.opacity = 1 - Math.max(0, f.t - 0.6) / 0.5; }
}
const clock = new THREE.Clock();
let saveT = 10;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const n = (window.VAEL && window.VAEL.speed) || 1;
  if (state.started && !state.paused && !document.hidden) perfTick(dt); else if (perf.el && !settings.fps) { perf.el.remove(); perf.el = null; }
  try { if (state.started && state.player) for (let i = 0; i < n; i++) step(n > 1 ? 0.05 : dt); } catch (err) { console.error(err); }
  renderer.render(scene, camera);
}
function step(dt) {
  state.time += dt;
  const p = state.player;
  if (!state.paused) {
    updatePlayer(dt);
    for (const e of [...state.enemies]) updateEnemy(e, dt);
    updateTelegraphs(dt);
    for (const l of state.loot) { l.t += dt; l.m.children[0].rotation.y += dt * 2; l.m.children[0].position.y = 0.15 + Math.sin(l.t * 3) * 0.08; }
    for (const qi of state.questItems) qi.m.children[0].rotation.y += dt * 1.5;
    for (const id in state.npcs) { const n = state.npcs[id]; n.c.mixer.update(dt); if (n.pos.distanceTo(p.pos) < 6) turnTo(n.c.holder, Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z), 4, dt); }
    saveT -= dt; if (saveT <= 0) { saveT = 10; writeSave(); }
  }
  for (const fx of [...state.effects]) { fx.t += dt; if (fx.follow) fx.m.position.set(p.pos.x, fx.m.position.y, p.pos.z); fx.update(Math.min(1, fx.t / fx.life)); if (fx.t >= fx.life) { scene.remove(fx.m); state.effects.splice(state.effects.indexOf(fx), 1); } }
  for (const f of [...state.floats]) { f.t += dt; if (f.t > f.life) { f.el.remove(); state.floats.splice(state.floats.indexOf(f), 1); } }
  for (const pt of state.portals) if (pt.g.visible) { pt.g.children[0].rotation.z += dt * 0.8; pt.g.children[1].material.opacity = 0.3 + Math.sin(state.time * 3) * 0.1; }
  if (state.area === 'mill' && world.torch) { world.torch.position.set(p.pos.x + 0.6, 3.2, p.pos.z + 0.6); world.torch.intensity = 24 + Math.sin(state.time * 11) * 3 + Math.sin(state.time * 5.3) * 3; }
  if (world.shrineLight) world.shrineLight.intensity = 25 + Math.sin(state.time * 3) * 8;
  if (world.fire) world.fire.intensity = 12 + Math.sin(state.time * 13) * 2 + Math.sin(state.time * 7) * 2;
  const target = p.pos.clone(); target.y = 0.8;
  camera.position.copy(target).add(CAM_OFF); camera.lookAt(target);
  sun.position.set(p.pos.x + 25, 45, p.pos.z + 12); sun.target.position.set(p.pos.x, 0, p.pos.z);
  updateLabels(); updateHUD();
  mmT -= dt; if (mmT <= 0) { mmT = 0.15; drawMinimap(); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').innerHTML = ''; }
}

// ---------- boot ----------
function startGame(fresh) {
  if (fresh) { localStorage.removeItem(SAVE_KEY); save = freshSave(); } else save = loadSave() || freshSave();
  spawnPlayer();
  for (const sp of SPAWNS) spawnEnemy(sp);
  spawnQuestItems();
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  buildHotbar(); renderTracker(); updateHUD(true);
  state.started = true;
  if (!save.quests.q1) setTimeout(() => toast('Welcome to Greenhollow', IS_TOUCH ? 'Talk to Captain Edda (the yellow !)' : 'Talk to Captain Edda (the yellow !). Press E when close.'), 600);
  writeSave(); unlockAudio(); setMusic('overworld');
}
async function boot() {
  try { await loadAssets((f) => { $('loadfill').style.width = (f * 100) + '%'; }); }
  catch (err) { $('loadbar').outerHTML = `<div style="color:#f88">Could not load the game files. Please refresh. (${esc(err.message)})</div>`; throw err; }
  buildWorld(); buildMill(); defineSpawns(); spawnNPCs(); loadSfx(); setMusic('title');
  camera.position.set(0, 0.8, 3).add(CAM_OFF); camera.lookAt(0, 0.8, 3);
  sun.position.set(25, 45, 15); sun.target.position.set(0, 0, 3);
  $('loadbar').classList.add('hidden'); $('tbuttons').classList.remove('hidden');
  if (loadSave()) $('btn-continue').classList.remove('hidden');
  $('btn-continue').onclick = () => startGame(false);
  $('btn-new').onclick = () => { if (loadSave() && !confirm('Start a new game? Your saved progress will be erased.')) return; startGame(true); };
  $('btn-howto').onclick = () => { $('howto').classList.toggle('hidden'); $('credits').classList.add('hidden'); };
  $('btn-credits').onclick = () => { $('credits').classList.toggle('hidden'); $('howto').classList.add('hidden'); };
  window.VAEL_READY = true;
}
frame();
boot();

// ---------- hooks for automated playtests ----------
window.VAEL = {
  state, get save() { return save; }, QUESTS, startGame, debugMove, useSkill, usePotion, attackCmd, interact, openDialog, closePanel, openChar, openVendor,
  completeQuest: (id) => completeQuest(QUESTS.find((q) => q.id === id)), acceptQuest: (id) => acceptQuest(QUESTS.find((q) => q.id === id)), equipItem, nearbyInteractable, npcQuestFor,
  enterMill, exitMill, openPortal, learnTalent, openTalents, talentPoints, MILL_PATH: MILL_PATH.map(([x, z]) => millTile(x, z)), PORTAL_WORLD, get area() { return state.area; }, millTile: (x, z) => millTile(x, z),
  setZoom: (h) => { viewH = h; resize(); },
  setSetting: (k, v) => { settings[k] = v; saveSettings(); applyQuality(); }, get settings() { return settings; }, get perf() { return perf; },
};
