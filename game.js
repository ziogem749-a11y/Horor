import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* =====================  PENERBANGAN MALAM  =====================
   Kamu terjebak di kabin pesawat yang sunyi. Sesuatu yang sangat besar mengitari pesawat dari luar.
   Ia tertarik pada cahaya dan suara. Cari 3 sekring, pasang di panel depan, lalu bertahan sampai bantuan datang. */

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const el = {
  gl: $('#gl'), touch: $('#touch'), joy: $('#joy'), obj: $('#obj'), toast: $('#toast'), act: $('#actBtn'), fade: $('#fade'), card: $('#card'),
  panel: $('#panel'), err: $('#err'), pause: $('#pauseBtn'), mute: $('#muteBtn'), alertFill: $('#alertFill'), alertWrap: $('#alertWrap'), hp: $('#hp'),
  redfx: $('#redfx'), crouch: $('#btnCrouch'), flash: $('#btnFlash'), sprint: $('#btnSprint'), loading: $('#loading'), ldFill: $('#ldFill'), ldPct: $('#ldPct')
};
function showErr(m) { el.err.textContent = String(m).slice(0, 300); el.err.classList.add('on'); }
window.addEventListener('error', e => showErr(e.message + ' @' + (e.lineno || '')));
window.addEventListener('unhandledrejection', e => showErr('janji ditolak: ' + (e.reason && e.reason.message || e.reason)));

/* ---------- konstanta kabin (diukur dari model pesawat_garuda.glb) ---------- */
const FLOOR = 4.5, EYE = 1.62, EYE_CR = 1.05, AISLE = 0.22, Z0 = -9.6, Z1 = 14.0;
const SEG = 1.5, SEG0 = -8.6, NSEG = 15;             // tirai jendela dibagi 15 segmen per sisi
const QUAL = { pr: Math.min(window.devicePixelRatio || 1, 1.25) };

/* ---------- renderer, adegan, kamera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: el.gl, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const BR = [1.2, 1.9, 2.8]; let brI = 0; try { brI = clamp(parseInt(localStorage.getItem('pw_br')) || 0, 0, 2); } catch (e) { }
const BRN = ['normal', 'terang', 'sangat terang'];
function applyBright() { renderer.toneMappingExposure = BR[brI]; }
function cycleBright() { brI = (brI + 1) % 3; try { localStorage.setItem('pw_br', String(brI)); } catch (e) { } applyBright(); }
applyBright();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
scene.fog = new THREE.FogExp2(0x03050c, 0.045);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(QUAL.pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  el.rot && el.rot.classList && el.rot.classList.toggle('on', h > w * 1.05);
}
window.addEventListener('resize', resize); resize();

const hemi = new THREE.HemisphereLight(0x3a4a66, 0x120c0a, 0.34); scene.add(hemi);
const flash = new THREE.SpotLight(0xfff2d6, 3.2, 18, 0.5, 0.65, 1.2); scene.add(flash); scene.add(flash.target);
const emer = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff3a26, 1.1, 4.2, 2); scene.add(l); return l; });

/* ---------- langit malam: bintang, bulan, awan yang bergulir ---------- */
function mkCanvas(w, h, draw) {
  try { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext && c.getContext('2d'); if (!g) return null; draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; } catch (e) { return null; }
}
{
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = Math.acos(Math.random() * 0.95 + 0.02), r = 500; pos[i * 3] = Math.sin(b) * Math.cos(a) * r; pos[i * 3 + 1] = Math.cos(b) * r; pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: 0xcfe0ff, fog: false })));
}
const moonTex = mkCanvas(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(235,240,255,1)'); r.addColorStop(0.35, 'rgba(200,215,245,.95)'); r.addColorStop(0.5, 'rgba(120,150,210,.25)'); r.addColorStop(1, 'rgba(60,80,140,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const moon = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ map: moonTex, color: moonTex ? 0xffffff : 0xdde6ff, transparent: true, fog: false, depthWrite: false }));
moon.position.set(-260, 210, 320); scene.add(moon);
const cloudTex = mkCanvas(512, 512, (g, w, h) => {
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() * h, r = 22 + Math.random() * 60, a = 0.06 + Math.random() * 0.12; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(80,100,150,' + a + ')'); gr.addColorStop(1, 'rgba(80,100,150,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
});
if (cloudTex) { cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat && cloudTex.repeat.set(4, 4); }
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ map: cloudTex, color: cloudTex ? 0xffffff : 0x0d1220, transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
clouds.rotation.x = -Math.PI / 2; clouds.position.set(0, -55, 0); scene.add(clouds);

/* ---------- audio buatan (tanpa berkas) ---------- */
const AU = { ctx: null, on: true, master: null, heartT: 0 };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AU.ctx = new C(); AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.on ? 0.9 : 0; AU.master.connect(AU.ctx.destination);
    const c = AU.ctx, len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
    const s = c.createBufferSource(); s.buffer = b; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 210; const g = c.createGain(); g.gain.value = 0.55;
    s.connect(f); f.connect(g); g.connect(AU.master); s.start();
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 57; const og = c.createGain(); og.gain.value = 0.018; o.connect(og); og.connect(AU.master); o.start();
    AU.noise = b;
  } catch (e) { AU.ctx = null; }
}
function tone(f, d, type, v, f2) {
  if (!AU.ctx || !AU.on) return;
  try { const c = AU.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + 0.02); } catch (e) { }
}
function nburst(d, v, fc) {
  if (!AU.ctx || !AU.on || !AU.noise) return;
  try { const c = AU.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc || 600; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * 1.5, d + 0.05); } catch (e) { }
}
const sfx = {
  step(v) { nburst(0.1, 0.16 * v, 520); },
  chime() { tone(880, 0.5, 'sine', 0.14); tone(1320, 0.7, 'sine', 0.09); },
  click() { tone(240, 0.05, 'square', 0.06); },
  heart(k) { tone(52, 0.16, 'sine', 0.22 + 0.25 * k, 38); setTimeout(() => tone(46, 0.18, 'sine', 0.16 + 0.2 * k, 34), 190); },
  growl() { tone(48, 1.6, 'sawtooth', 0.14, 30); nburst(1.4, 0.16, 300); },
  slam() { nburst(0.7, 0.5, 900); tone(60, 0.6, 'sine', 0.5, 25); },
  crack() { nburst(0.35, 0.28, 3200); tone(1500, 0.12, 'square', 0.05, 400); },
  power() { tone(110, 1.4, 'sawtooth', 0.12, 330); tone(220, 1.6, 'sine', 0.1, 660); }
};

/* ---------- monster raksasa di luar pesawat (dibuat lewat kode, tanpa model) ---------- */
const mon = { g: new THREE.Group(), side: 1, z: -30, dir: 1, dist: 16, y: 6.4, state: 'patrol', t: 0, cool: 6, phase: 0, reach: 0, eyeGlow: 0, hitDone: false, blockedHit: false };
const NT = 7, NS = 16, TLEN = 11;
const tent = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), NT * NS);
{
  const c = new THREE.Color();
  for (let t = 0; t < NT; t++) for (let i = 0; i < NS; i++) { const s = i / (NS - 1); c.setRGB(0.07 + 0.1 * s, 0.05 + 0.07 * s, 0.13 + 0.16 * s); tent.setColorAt(t * NS + i, c); }
  if (tent.instanceColor) tent.instanceColor.needsUpdate = true;
}
tent.frustumCulled = false; mon.g.add(tent);
const body = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0x0c0916, fog: false }));
body.scale.set(1.25, 1, 1.5); body.position.set(0, 0, -4.2); mon.g.add(body);
const eyeG = new THREE.Group(); mon.g.add(eyeG);
const scleraTex = mkCanvas(256, 128, (g, w, h) => { g.fillStyle = '#c8bf94'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,20,20,.55)'; g.lineWidth = 1.4; for (let i = 0; i < 46; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 16; g.lineTo(x, y); } g.stroke(); } });
const sclera = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 18), new THREE.MeshBasicMaterial({ map: scleraTex, color: scleraTex ? 0xffffff : 0xc8bf94, fog: false }));
eyeG.add(sclera);
const irisTex = mkCanvas(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2); r.addColorStop(0, '#f6d640'); r.addColorStop(0.45, '#c8541a'); r.addColorStop(0.85, '#5c0d0d'); r.addColorStop(1, 'rgba(30,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h); g.fillStyle = '#050203'; g.beginPath(); g.ellipse(w / 2, h / 2, 16, 88, 0, 0, 6.283); g.fill();
});
const iris = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ map: irisTex, color: irisTex ? 0xffffff : 0xc8541a, transparent: true, fog: false, depthWrite: false }));
iris.position.set(0, 0, 2.66); eyeG.add(iris);
mon.g.position.set(mon.side * mon.dist, mon.y, mon.z); scene.add(mon.g);
const _d = new THREE.Object3D();
function updateMonster(dt, t) {
  mon.t += dt;
  const sideV = mon.side;
  if (mon.state === 'patrol') {
    mon.z += mon.dir * 7.5 * dt; mon.dist = lerp(mon.dist, 16 + Math.sin(t * 0.4) * 2.5, Math.min(1, dt * 2));
    if (mon.z > 34 || mon.z < -34) { mon.dir *= -1; mon.side *= -1; mon.z = clamp(mon.z, -34, 34); }
    if (mon.cool > 0) mon.cool -= dt;
    mon.reach = lerp(mon.reach, 0.15, Math.min(1, dt * 2));
  } else if (mon.state === 'approach') {
    mon.dist = lerp(mon.dist, 5.4, Math.min(1, dt * 1.7)); mon.z += (P.z - mon.z) * Math.min(1, dt * 2.6); mon.reach = lerp(mon.reach, 1, Math.min(1, dt * 2));
    mon.phase += dt;
    if (mon.dist < 6.4 && mon.phase > 1.6) { mon.state = 'hit'; mon.phase = 0; mon.hitDone = false; }
  } else if (mon.state === 'hit') {
    mon.phase += dt;
    if (!mon.hitDone && mon.phase > 0.25) { mon.hitDone = true; monsterHit(); }
    if (mon.phase > 0.9) { mon.state = 'retreat'; mon.phase = 0; }
  } else if (mon.state === 'retreat') {
    mon.phase += dt; mon.dist = lerp(mon.dist, 19, Math.min(1, dt * 1.4)); mon.reach = lerp(mon.reach, 0, Math.min(1, dt * 2)); mon.z += mon.dir * 4 * dt;
    if (mon.phase > 2.6) { mon.state = 'patrol'; mon.cool = G.powered ? 3 : 9; }
  }
  mon.g.position.set(sideV * mon.dist, mon.y + Math.sin(t * 0.7) * 0.6, mon.z);
  mon.g.lookAt(0, mon.y, mon.z + (mon.state === 'patrol' ? mon.dir * 3 : 0));
  // mata menoleh ke kabin saat curiga
  eyeG.rotation.y = lerp(eyeG.rotation.y || 0, mon.state === 'patrol' ? Math.sin(t * 0.6) * 0.5 : 0, Math.min(1, dt * 3));
  mon.eyeGlow = G.alert;
  // tentakel
  for (let k = 0; k < NT; k++) {
    const a = k / NT * 6.283 + 0.4, rx = Math.cos(a) * 3.4, ry = Math.sin(a) * 2.4, dx = Math.cos(a), dy = Math.sin(a);
    for (let i = 0; i < NS; i++) {
      const s = i / (NS - 1), len = s * TLEN, wob = Math.sin(t * 0.9 + i * 0.45 + k * 1.3), wob2 = Math.cos(t * 0.7 + i * 0.4 + k * 0.9);
      const fwd = -1.5 + len * (0.35 + 1.1 * mon.reach * s) - (1 - mon.reach) * len * 0.5;
      _d.position.set(rx + dx * len * 0.55 + wob * s * 1.7, ry + dy * len * 0.4 + wob2 * s * 1.3, fwd);
      _d.scale.setScalar(0.95 * (1 - 0.86 * s) + 0.08);
      _d.updateMatrix(); tent.setMatrixAt(k * NS + i, _d.matrix);
    }
  }
  tent.instanceMatrix.needsUpdate = true;
}

/* ---------- kabin pesawat (model .glb) ---------- */
const cabin = new THREE.Group(); scene.add(cabin);
const modelState = { loaded: false, err: '' };
function loadCabin(onDone) {
  const ld = new GLTFLoader();
  ld.load('pesawat_garuda.glb', gltf => {
    try {
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        if (o.name === 'Exterior') { o.visible = false; return; }
        if (o.name === 'Kaca') { o.material = new THREE.MeshBasicMaterial({ color: 0x0b1622, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, fog: false }); return; }
        o.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
        o.frustumCulled = false;
      });
      cabin.add(gltf.scene); modelState.loaded = true; onDone(true);
    } catch (e) { modelState.err = 'gagal memasang pesawat: ' + e.message; showErr(modelState.err); onDone(false); }
  }, xhr => {
    if (xhr && xhr.total) { const p = Math.round(100 * xhr.loaded / xhr.total); el.ldFill.style.width = p + '%'; el.ldPct.textContent = p + '%'; }
  }, err => { modelState.err = 'pesawat_garuda.glb tidak bisa dimuat (' + (err && err.message || 'tidak ditemukan') + '). Pastikan file ada di folder utama repo.'; showErr(modelState.err); onDone(false); });
}

/* ---------- lampu darurat lantai + tirai jendela + sekring + panel ---------- */
const stripes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.02, 0.2), new THREE.MeshBasicMaterial({ color: 0xff3a26, fog: false }), 54);
{ let n = 0; for (let z = -9.4; z < 14; z += 0.9) for (const sx of [-1, 1]) { if (n >= 54) break; _d.position.set(sx * 0.29, FLOOR + 0.02, z); _d.scale.setScalar(1); _d.updateMatrix(); stripes.setMatrixAt(n++, _d.matrix); } stripes.count = n; stripes.instanceMatrix.needsUpdate = true; scene.add(stripes); }
const shadeMat = new THREE.MeshLambertMaterial({ color: 0xd8ccb2, side: THREE.DoubleSide });
const shades = { 1: [], '-1': [] }, closed = { 1: [], '-1': [] };
for (const sx of [1, -1]) for (let i = 0; i < NSEG; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, SEG - 0.06), shadeMat); m.position.set(sx * 1.79, 6.15, SEG0 + i * SEG); m.visible = false; scene.add(m); shades[sx].push(m); closed[sx].push(false);
}
const haloTex = mkCanvas(64, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(120,255,160,1)'); r.addColorStop(0.35, 'rgba(60,220,110,.5)'); r.addColorStop(1, 'rgba(0,120,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function mkGlow(x, y, z, col) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: col, fog: false })); g.add(b);
  const h = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: haloTex, color: haloTex ? 0xffffff : col, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); h.position.y = 0.05; g.add(h);
  scene.add(g); return { g, halo: h };
}
const FUSE_POS = [[0.5, FLOOR + 1.02, -4.2], [-0.5, FLOOR + 1.02, 3.6], [0.5, FLOOR + 1.02, 10.4]];
const fuses = FUSE_POS.map(p => ({ x: p[0], y: p[1], z: p[2], taken: false, glow: mkGlow(p[0], p[1], p[2], 0x44ff88) }));
const panel = mkGlow(0, FLOOR + 1.1, 13.9, 0xff4433);
panel.g.scale.set(2.2, 2.2, 2.2);

/* ---------- status permainan ---------- */
const G = { state: 'load', hp: 3, nf: 0, powered: false, alert: 0, win: 0, blackout: 0, shake: 0, time: 0, over: false };
const P = { x: 0, z: -9.3, yaw: 0, pitch: 0, eye: EYE, crouch: false, sprint: false, speed: 0, bob: 0, stepT: 0 };
let SENS = 1, flashOn = true;
try { SENS = parseFloat(localStorage.getItem('pw_sens')) || 1; } catch (e) { }

function objText() {
  if (G.powered) return 'Bantuan dipanggil lewat radio. Bertahan ' + Math.max(0, Math.ceil(G.win)) + ' detik lagi.';
  if (G.nf < 3) return 'Cari 3 sekring hijau di kursi (' + G.nf + '/3). Matikan senter kalau mata di luar mendekat.';
  return 'Bawa sekring ke panel merah di ujung lorong (dekat kokpit).';
}
function setHud() {
  el.obj.textContent = objText(); el.obj.classList.add('on'); el.obj.style.display = 'block';
  el.hp.innerHTML = 'Badan pesawat <b>' + '\u25AE'.repeat(G.hp) + '<span style="opacity:.25">' + '\u25AE'.repeat(3 - G.hp) + '</span></b>';
}
let toastT = 0;
function toast(m, ms) { el.toast.textContent = m; el.toast.classList.add('on'); toastT = (ms || 3000) / 1000; }

/* ---------- masukan ---------- */
const mv = { x: 0, y: 0 }, keys = {};
let joyId = null, joyO = { x: 0, y: 0 }, lookId = null, lookL = { x: 0, y: 0 };
el.touch.addEventListener('pointerdown', e => {
  e.preventDefault(); auInit();
  if (G.state !== 'play') return;
  if (e.clientX < window.innerWidth * 0.45 && joyId === null) {
    joyId = e.pointerId; joyO = { x: e.clientX, y: e.clientY }; el.joy.style.left = (e.clientX - 55) + 'px'; el.joy.style.top = (e.clientY - 55) + 'px'; el.joy.classList.add('on');
  } else if (lookId === null) { lookId = e.pointerId; lookL = { x: e.clientX, y: e.clientY }; }
  try { el.touch.setPointerCapture(e.pointerId); } catch (err) { }
});
el.touch.addEventListener('pointermove', e => {
  if (e.pointerId === joyId) {
    let dx = e.clientX - joyO.x, dy = e.clientY - joyO.y; const l = Math.hypot(dx, dy), m = 46; if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    mv.x = dx / m; mv.y = -dy / m; const i = el.joy.firstElementChild; if (i) i.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  } else if (e.pointerId === lookId) {
    const dx = e.clientX - lookL.x, dy = e.clientY - lookL.y; lookL = { x: e.clientX, y: e.clientY };
    P.yaw -= dx * 0.0062 * SENS; P.pitch = clamp(P.pitch - dy * 0.0048 * SENS, -1.15, 1.15);
  }
});
function endPtr(e) {
  if (e.pointerId === joyId) { joyId = null; mv.x = mv.y = 0; el.joy.classList.remove('on'); const i = el.joy.firstElementChild; if (i) i.style.transform = ''; }
  if (e.pointerId === lookId) lookId = null;
}
el.touch.addEventListener('pointerup', endPtr); el.touch.addEventListener('pointercancel', endPtr);
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === 'c') toggleCrouch(); if (e.key.toLowerCase() === 'f') toggleFlash(); if (e.key.toLowerCase() === 'e') doAct(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
let mouseDown = false;
window.addEventListener('mousedown', e => { if (e.target === el.touch) mouseDown = true; });
window.addEventListener('mouseup', () => { mouseDown = false; });
window.addEventListener('mousemove', e => { if (mouseDown && G.state === 'play') { P.yaw -= (e.movementX || 0) * 0.004; P.pitch = clamp(P.pitch - (e.movementY || 0) * 0.003, -1.15, 1.15); } });

function toggleCrouch() { if (G.state !== 'play') return; P.crouch = !P.crouch; el.crouch.classList.toggle('on', P.crouch); sfx.click(); }
function toggleFlash() { if (G.state !== 'play') return; flashOn = !flashOn; el.flash.classList.toggle('on', flashOn); sfx.click(); }
el.crouch.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); auInit(); toggleCrouch(); });
el.flash.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); auInit(); toggleFlash(); });
el.sprint.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); auInit(); P.sprint = true; });
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.sprint.addEventListener(t, () => { P.sprint = false; }));
el.act.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); auInit(); doAct(); });
el.mute.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.on = !AU.on; el.mute.textContent = AU.on ? '\u{1F50A}' : '\u{1F507}'; if (AU.master) AU.master.gain.value = AU.on ? 0.9 : 0; });
el.pause.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---------- aksi kontekstual ---------- */
let act = null;      // { label, run }
function sideFacing() { const s = Math.sin(P.yaw); return s > 0.5 ? 1 : (s < -0.5 ? -1 : 0); }   // +x = sisi kiri saat menghadap kokpit
function findAct() {
  for (const f of fuses) if (!f.taken && Math.hypot(f.x - P.x, f.z - P.z) < 1.6) return { label: 'Ambil sekring', run() { f.taken = true; f.glow.g.visible = false; G.nf++; sfx.chime(); toast(G.nf < 3 ? 'Sekring ' + G.nf + '/3 didapat' : 'Semua sekring didapat. Ke panel merah di depan.'); setHud(); } };
  if (G.nf >= 3 && !G.powered && Math.hypot(0 - P.x, 13.9 - P.z) < 2.2) return { label: 'Pasang sekring', run() { powerOn(); } };
  const sf = sideFacing();
  if (sf !== 0) {
    const i0 = clamp(Math.round((P.z - SEG0) / SEG), 0, NSEG - 1), idx = [i0 - 1, i0, i0 + 1].filter(i => i >= 0 && i < NSEG && !closed[sf][i]);
    if (idx.length) return { label: 'Tutup tirai ' + (sf === 1 ? 'kiri' : 'kanan'), run() { idx.forEach(i => { closed[sf][i] = true; shades[sf][i].visible = true; }); sfx.click(); nburst(0.12, 0.08, 1400); } };
  }
  return null;
}
function doAct() { if (G.state !== 'play') return; if (act) { act.run(); act = null; } }

function powerOn() {
  G.powered = true; G.win = 30; sfx.power(); hemi.intensity = 0.8; scene.fog.density = 0.028; toast('Listrik pulih. Radio mengirim sinyal darurat!', 4000);
  panel.g.children[0].material.color.setHex(0x44ff88); mon.cool = 0.5; setHud();
}

/* ---------- serangan monster & kewaspadaan ---------- */
function openFrac(side, z) {
  let tot = 0, op = 0;
  for (let i = 0; i < NSEG; i++) { const zc = SEG0 + i * SEG; if (Math.abs(zc - z) < 3.1) { tot++; if (!closed[side][i]) op++; } }
  return tot ? op / tot : 0;
}
function monsterHit() {
  const of = openFrac(mon.side, P.z);
  if (of < 0.4 && !flashOn) { toast('Monster mencakar tirai... lalu menjauh.', 2500); sfx.slam(); G.shake = 0.5; return; }
  G.hp--; G.shake = 1.6; G.blackout = 3.2; sfx.slam(); sfx.crack(); setHud();
  toast(G.hp > 0 ? 'Badan pesawat retak! Sisa ' + G.hp : 'Badan pesawat hancur...', 2600);
  if (G.hp <= 0) endGame(false);
}
function updateAlert(dt) {
  if (mon.state !== 'patrol') { G.alert = Math.max(G.alert, 0.35); return; }
  const near = Math.abs(mon.z - P.z) < 10;
  const noise = (P.speed < 0.2) ? 0 : (P.sprint ? 0.5 : (P.crouch ? 0.05 : 0.18));
  const ex = openFrac(mon.side, P.z) * (0.22 + (flashOn ? 0.65 : 0) + noise);
  if (near && ex > 0.14 && mon.cool <= 0) G.alert += ex * (G.powered ? 1.5 : 0.75) * dt;
  else G.alert = Math.max(0, G.alert - 0.3 * dt);
  if (G.alert >= 1) { G.alert = 0.4; mon.state = 'approach'; mon.phase = 0; sfx.growl(); toast('Ia melihatmu! Tutup tirai atau matikan senter!', 2200); }
}

/* ---------- alur permainan ---------- */
function showPanel(html) { el.panel.innerHTML = html; el.panel.classList.add('on'); }
function hidePanel() { el.panel.classList.remove('on'); }
function fadeTo(o, s) { el.fade.style.transition = 'opacity ' + (s || 1) + 's'; el.fade.style.opacity = String(o); }
function showTitle() {
  G.state = 'title'; act = null; el.act.classList.remove('on'); el.obj.style.display = 'none';
  showPanel('<div class="board"><h1>Penerbangan Malam</h1><h2>Horor di dalam pesawat</h2><p>Semua penumpang menghilang. Sesuatu yang sangat besar mengitari pesawat di luar, dan ia tertarik pada cahaya dan suara. Putar HP ke mendatar dan pakai earphone.</p><button class="cta" data-do="start">Mulai</button><button class="cta alt" data-do="how">Cara bermain</button><button class="cta alt" data-do="bright">Kecerahan: ' + BRN[brI] + '</button></div>');
}
function showHow() {
  showPanel('<div class="board"><h1>Cara bermain</h1><ul><li><b>Jalan:</b> geser jari di sisi kiri layar. <b>Lihat sekeliling:</b> geser di sisi kanan.</li><li><b>Senter dan suara menarik mata di luar.</b> Kalau ia mendekat: matikan senter (tombol senter), jongkok (tombol jongkok), dan berjalan pelan.</li><li><b>Tutup tirai:</b> hadapkan pandangan ke jendela lalu tekan tombol emas. Tirai yang tertutup membuatmu tak terlihat.</li><li>Cari 3 sekring hijau, pasang di panel merah di ujung lorong, lalu bertahan sampai bantuan datang.</li><li>Berlari memang cepat, tapi sangat berisik.</li></ul><button class="cta" data-do="start">Mulai</button><button class="cta alt" data-do="menu">Kembali</button></div>');
}
function resetGame() {
  G.hp = 3; G.nf = 0; G.powered = false; G.alert = 0; G.win = 0; G.blackout = 0; G.shake = 0; G.time = 0; G.over = false;
  P.x = 0; P.z = -9.3; P.yaw = 0; P.pitch = 0; P.crouch = false; P.sprint = false; el.crouch.classList.remove('on'); flashOn = true; el.flash.classList.add('on');
  hemi.intensity = 0.34; scene.fog.density = 0.045;
  fuses.forEach(f => { f.taken = false; f.glow.g.visible = true; });
  panel.g.children[0].material.color.setHex(0xff4433);
  for (const sx of [1, -1]) for (let i = 0; i < NSEG; i++) { closed[sx][i] = false; shades[sx][i].visible = false; }
  mon.state = 'patrol'; mon.side = 1; mon.z = -34; mon.dir = 1; mon.dist = 16; mon.cool = 8; mon.reach = 0; mon.phase = 0;
}
function startGame() {
  if (!modelState.loaded) { showErr(modelState.err || 'Pesawat belum termuat.'); return; }
  hidePanel(); resetGame(); G.state = 'play'; setHud(); fadeTo(0, 1.6);
  toast('Kabin sunyi. Cari 3 sekring hijau. Jangan berisik.', 4200);
}
function endGame(win) {
  if (G.over) return; G.over = true; G.state = 'end'; act = null; el.act.classList.remove('on'); joyId = lookId = null; mv.x = mv.y = 0; el.joy.classList.remove('on');
  setTimeout(() => {
    if (win) showPanel('<div class="board"><h1>Selamat!</h1><h2>Bantuan datang</h2><p>Dua jet tempur muncul di kedua sisi pesawat. Di luar, sesuatu yang sangat besar tenggelam kembali ke dalam awan. Kamu selamat malam ini.</p><button class="cta" data-do="start">Main lagi</button><button class="cta alt" data-do="menu">Ke menu</button></div>');
    else showPanel('<div class="board"><h1>Pesawat jatuh</h1><h2>Kamu tidak selamat</h2><p>Coba lagi: tutup tirai lebih awal, matikan senter saat mata di luar mendekat, dan jangan berlari.</p><button class="cta" data-do="start">Coba lagi</button><button class="cta alt" data-do="menu">Ke menu</button></div>');
  }, win ? 1200 : 2200);
}
function pauseGame() { if (G.state !== 'play') return; G.state = 'pause'; joyId = lookId = null; mv.x = mv.y = 0; el.joy.classList.remove('on'); P.sprint = false; showPanel('<div class="board"><h1>Dijeda</h1><p>Sesuatu masih mengintai di luar.</p><button class="cta" data-do="resume">Lanjut</button><button class="cta alt" data-do="bright">Kecerahan: ' + BRN[brI] + '</button><button class="cta alt" data-do="menu">Ke menu</button></div>'); }
el.panel.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-do]'); if (!b) return; auInit();
  const a = b.dataset.do;
  if (a === 'start') startGame(); else if (a === 'how') showHow(); else if (a === 'menu') showTitle();
  else if (a === 'resume') { hidePanel(); G.state = 'play'; }
  else if (a === 'bright') { cycleBright(); if (G.state === 'pause') { G.state = 'play'; pauseGame(); } else showTitle(); }
});

/* ---------- pembaruan tiap bingkai ---------- */
function updatePlayer(dt) {
  const f = [Math.sin(P.yaw), Math.cos(P.yaw)], r = [-Math.cos(P.yaw), Math.sin(P.yaw)];
  let ax = mv.x + (keys.d ? 1 : 0) - (keys.a ? 1 : 0), ay = mv.y + (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const l = Math.hypot(ax, ay); if (l > 1) { ax /= l; ay /= l; }
  const sp = P.crouch ? 0.85 : (P.sprint ? 3.5 : 1.75);
  const vx = (f[0] * ay + r[0] * ax) * sp, vz = (f[1] * ay + r[1] * ax) * sp;
  const nx = clamp(P.x + vx * dt, -AISLE, AISLE), nz = clamp(P.z + vz * dt, Z0, Z1);
  P.speed = Math.hypot(nx - P.x, nz - P.z) / Math.max(dt, 1e-4);
  P.x = nx; P.z = nz;
  P.eye = lerp(P.eye, P.crouch ? EYE_CR : EYE, Math.min(1, dt * 7));
  if (P.speed > 0.3) {
    P.bob += dt * P.speed * 3.4; P.stepT -= dt * (P.speed / 1.75);
    if (P.stepT <= 0) { P.stepT = 0.56; sfx.step(P.crouch ? 0.35 : (P.sprint ? 1.6 : 0.8)); }
  }
}
function updateCamera(dt) {
  const bob = Math.sin(P.bob) * 0.024 * (P.crouch ? 0.5 : 1) * clamp(P.speed / 1.75, 0, 1.6);
  let sx = 0, sy = 0;
  if (G.shake > 0) { const q = Math.min(G.shake, 1); sx = (Math.random() - 0.5) * 0.06 * q; sy = (Math.random() - 0.5) * 0.05 * q; G.shake = Math.max(0, G.shake - dt * 1.2); }
  const y = FLOOR + P.eye + bob;
  camera.position.set(P.x + sx, y + sy, P.z);
  const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), fx = Math.sin(P.yaw) * cp, fz = Math.cos(P.yaw) * cp;
  camera.lookAt(P.x + fx, y + sp, P.z + fz);
  // senter di tangan kanan, searah pandangan
  const rx = -Math.cos(P.yaw) * 0.16, rz = Math.sin(P.yaw) * 0.16;
  flash.position.set(P.x + rx, y - 0.14, P.z + rz); flash.target.position.set(P.x + fx * 9, y + sp * 9, P.z + fz * 9);
  moon.lookAt(camera.position.x, camera.position.y, camera.position.z);
  if (cloudTex && cloudTex.offset) cloudTex.offset.y += dt * 0.012;
}
let flickT = 0;
function updateLights(dt, t) {
  let k = 1;
  if (G.blackout > 0) { G.blackout -= dt; k = (Math.sin(t * 47) > 0.3 && G.blackout < 1.4) ? 0.7 : 0.0; }
  else if (G.alert > 0.5) k = 0.8 + 0.2 * Math.sin(t * 31);
  flash.intensity = flashOn ? 3.2 * k : 0;
  const zs = []; for (let z = -9.0; z < 14; z += 1.8) zs.push(z);
  zs.sort((a, b) => Math.abs(a - P.z) - Math.abs(b - P.z));
  for (let i = 0; i < 3; i++) { emer[i].position.set((i % 2 ? -1 : 1) * 0.3, FLOOR + 0.35, zs[i]); emer[i].intensity = 1.1 * (G.blackout > 0 ? 0 : 1); }
}
function updateActBtn() {
  act = G.state === 'play' ? findAct() : null;
  if (act) { el.act.textContent = act.label; el.act.classList.add('on'); } else el.act.classList.remove('on');
}
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) el.toast.classList.remove('on'); }
  if (G.state === 'play') {
    G.time += dt;
    updatePlayer(dt); updateAlert(dt); updateLights(dt, t); updateActBtn();
    if (G.powered && !G.over) { G.win -= dt; el.obj.textContent = objText(); if (G.win <= 0) endGame(true); }
    if (G.alert > 0.45) { AU.heartT -= dt; if (AU.heartT <= 0) { AU.heartT = 1.15 - G.alert * 0.65; sfx.heart(G.alert); } }
    if (mon.state === 'patrol' && Math.abs(mon.z - P.z) < 6 && Math.abs(Math.sin(t * 0.13)) > 0.999) sfx.growl();
  } else if (G.state !== 'pause') { act = null; }
  if (G.state === 'play' || G.state === 'title' || G.state === 'end') updateMonster(dt, t);
  updateCamera(dt);
  el.alertFill.style.width = Math.round(clamp(G.alert, 0, 1) * 100) + '%';
  el.redfx.style.opacity = String(clamp(G.alert * 0.9 + (G.blackout > 0 ? 0.3 : 0), 0, 0.95));
  renderer.render(scene, camera);
  // penyesuaian kualitas otomatis
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 2.5) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; if (fps < 24 && QUAL.pr > 0.7) { QUAL.pr = Math.max(0.7, QUAL.pr - 0.15); resize(); } }
}

/* ---------- mulai ---------- */
setHud(); el.obj.style.display = 'none';
window.addEventListener('load', () => { });
loadCabin(ok => {
  el.loading.style.display = 'none';
  camera.position.set(0, FLOOR + EYE, -9.3); camera.lookAt(0, FLOOR + EYE, 0);
  fadeTo(0, 1.2); showTitle(); if (!ok) toast('Model pesawat gagal dimuat', 6000);
});
requestAnimationFrame(loop);
if (window.__DEBUG) window.__dbg = { G, P, mon, closed, fuses, get flashOn() { return flashOn; }, set flashOn(v) { flashOn = v; }, keys, mv, act: () => act, doAct, startGame, showTitle, camera, scene, modelState, sfx };
