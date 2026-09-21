import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* =====================  PENERBANGAN MALAM · BAB 1: PENERBANGAN PULANG  =====================
   MC pulang dari Sumatra. Ia terbangun di kursi pesawat, kapten meminta penumpang tenang,
   pesawat berguncang hebat, lalu semua orang melihat monster raksasa di balik awan badai. */

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const el = {
  gl: $('#gl'), touch: $('#touch'), toast: $('#toast'), fade: $('#fade'), card: $('#card'), panel: $('#panel'), err: $('#err'),
  pause: $('#pauseBtn'), mute: $('#muteBtn'), redfx: $('#redfx'), blur: $('#blur'), sub: $('#sub'), pa: $('#pa'), hint: $('#hint'),
  loading: $('#loading'), ldFill: $('#ldFill'), ldPct: $('#ldPct')
};
function showErr(m) { el.err.textContent = String(m).slice(0, 320); el.err.classList.add('on'); }
window.addEventListener('error', e => showErr(e.message + ' @' + (e.lineno || '')));
window.addEventListener('unhandledrejection', e => showErr('janji ditolak: ' + (e.reason && e.reason.message || e.reason)));

/* ---------- ukuran kabin (diukur dari model) ---------- */
const FLOORY = 5.15, CUSHION = 5.55, ROW0 = -9.14, PITCH = 0.845, NROW = 26;
const rowZ = k => ROW0 + PITCH * k;
const seatX = (side, col) => side * (0.56 + 0.48 * col);       // col 0 = sisi lorong, 2 = dekat jendela

/* ---------- renderer, adegan, kamera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: el.gl, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const BR = [1.0, 1.4, 2.0], BRN = ['normal', 'terang', 'sangat terang']; let brI = 1;
try { brI = clamp(parseInt(localStorage.getItem('pw_br3')), 0, 2); if (isNaN(brI)) brI = 1; } catch (e) { }
function applyBright() { renderer.toneMappingExposure = BR[brI]; }
function cycleBright() { brI = (brI + 1) % 3; try { localStorage.setItem('pw_br3', String(brI)); } catch (e) { } applyBright(); }
applyBright();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8dbf2);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 1200);
const QUAL = { pr: Math.min(window.devicePixelRatio || 1, 1.25) };
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setPixelRatio(QUAL.pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();

const ambient = new THREE.AmbientLight(0xffffff, 1.1); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7d6a, 1.1); scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff0d8, 1.2); sunLight.position.set(-3, 2, -2.5); scene.add(sunLight);
const cabinL = [0, 1].map(() => { const l = new THREE.PointLight(0xffe7c2, 3, 8, 1.4); scene.add(l); return l; });
const flashL = new THREE.PointLight(0xdfe8ff, 0, 400, 1.0); flashL.position.set(60, 40, 10); scene.add(flashL);

/* ---------- langit siang: matahari, lautan awan, dan gumpalan mendung ---------- */
function mkCanvas(w, h, draw) {
  try { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext && c.getContext('2d'); if (!g) return null; draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; } catch (e) { return null; }
}
const srgbLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
function blobs(g, w, h, n, r0, r1, col, a0, a1, wrap) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = r0 + Math.random() * (r1 - r0), a = a0 + Math.random() * (a1 - a0);
    for (const ox of (wrap ? [-w, 0, w] : [0])) for (const oy of (wrap ? [-h, 0, h] : [0])) {
      const cx = x + ox, cy = y + oy; if (cx < -r || cx > w + r || cy < -r || cy > h + r) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
}
{
  const g = new THREE.SphereGeometry(900, 24, 16), pos = g.attributes && g.attributes.position;
  if (pos && pos.count) {
    const cols = new Float32Array(pos.count * 3), top = [0.22, 0.48, 0.90], hor = [0.80, 0.89, 0.97];
    for (let i = 0; i < pos.count; i++) { const t = Math.pow(clamp(pos.getY(i) / 900, 0, 1), 0.55); for (let k = 0; k < 3; k++) cols[i * 3 + k] = srgbLin(lerp(hor[k], top[k], t)); }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; scene.add(dome);
  }
}
const sunTex = mkCanvas(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,240,1)'); r.addColorStop(0.12, 'rgba(255,246,205,1)'); r.addColorStop(0.3, 'rgba(255,226,150,.42)'); r.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, color: sunTex ? 0xffffff : 0xfff2c8, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
sun.position.set(-350, 120, -300); sun.scale.set(260, 260, 1); scene.add(sun);
const cloudTex = mkCanvas(512, 512, (g, w, h) => { g.fillStyle = 'rgb(204,219,238)'; g.fillRect(0, 0, w, h); blobs(g, w, h, 110, 30, 100, '150,172,206', 0.16, 0.3, true); blobs(g, w, h, 230, 22, 82, '255,255,255', 0.2, 0.45, true); });
const wispTex = mkCanvas(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); blobs(g, w, h, 150, 24, 90, '255,255,255', 0.06, 0.2, true); });
if (cloudTex) { cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat && cloudTex.repeat.set(5, 5); }
if (wispTex) { wispTex.wrapS = wispTex.wrapT = THREE.RepeatWrapping; wispTex.repeat && wispTex.repeat.set(6, 6); }
const cloudsLow = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ map: cloudTex, color: cloudTex ? 0xffffff : 0xc8dbf2, fog: false }));
cloudsLow.rotation.x = -Math.PI / 2; cloudsLow.position.y = -55; scene.add(cloudsLow);
const cloudsNear = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshBasicMaterial({ map: wispTex, color: 0xffffff, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
cloudsNear.rotation.x = -Math.PI / 2; cloudsNear.position.y = -9; scene.add(cloudsNear);
const cumTex = mkCanvas(256, 256, (g, w, h) => { blobs(g, w, h, 14, 40, 70, '186,198,218', 0.8, 0.95, false); blobs(g, w, h, 16, 30, 60, '255,255,255', 0.75, 0.95, false); });
function mkSprite(tex, col, op, x, y, z, sw, sh, keep) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tex ? col : 0xdde6f4, transparent: true, opacity: op, fog: false, depthWrite: false }));
  sp.position.set(x, y, z); sp.scale.set(sw, sh, 1); scene.add(sp); return sp;
}
for (let i = 0; i < 16; i++) {          // gumpalan awan putih di kejauhan
  const az = Math.random() * 6.283, rad = 260 + Math.random() * 380; if (Math.abs(Math.atan2(Math.sin(az), Math.cos(az))) < 0.6 && rad < 420) continue;
  const w = 170 + Math.random() * 170; mkSprite(cumTex, 0xffffff, 0.96, Math.cos(az) * rad, -25 + Math.random() * 90, Math.sin(az) * rad, w, w * 0.62);
}
// mendung tebal di sisi kiri (tempat monster muncul): latar abu terang di belakang, gumpalan gelap menutupi di depan
const stormMats = [];
function stormSprite(tex, col, op, x, y, z, w, h) { const sp = mkSprite(tex, 0xffffff, op, x, y, z, w, h); const c = new THREE.Color(col); stormMats.push({ mat: sp.material, base: [c.r, c.g, c.b], op }); sp.material.color.setRGB(c.r, c.g, c.b); return sp; }
const stormBackTex = mkCanvas(256, 256, (g, w, h) => { blobs(g, w, h, 22, 40, 90, '176,186,204', 0.7, 0.95, false); });
const stormTex = mkCanvas(256, 256, (g, w, h) => { blobs(g, w, h, 20, 34, 84, '78,88,108', 0.6, 0.95, false); });
const stormVeil = [];
for (let i = 0; i < 3; i++) stormSprite(stormBackTex, 0xffffff, 1, 290 + i * 25, 15 + i * 22, 10 + i * 65, 720, 430);
for (let i = 0; i < 9; i++) stormVeil.push(stormSprite(stormTex, 0xffffff, 0.6, 96 + (i % 3) * 14, -70 + (i * 37) % 95, 6 + i * 13, 95 + (i % 4) * 26, 68 + (i % 3) * 14));

/* ---------- audio buatan ---------- */
const AU = { ctx: null, on: true, master: null, hum: null, rumble: null, noise: null, murmur: null };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = AU.ctx = new C(); AU.master = c.createGain(); AU.master.gain.value = AU.on ? 0.9 : 0; AU.master.connect(c.destination);
    const len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
    AU.noise = b;
    const s = c.createBufferSource(); s.buffer = b; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 230; const g = c.createGain(); g.gain.value = 0.5; s.connect(f); f.connect(g); g.connect(AU.master); s.start(); AU.hum = { g, f };
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 56; const og = c.createGain(); og.gain.value = 0.014; o.connect(og); og.connect(AU.master); o.start();
    const s2 = c.createBufferSource(); s2.buffer = b; s2.loop = true; s2.playbackRate.value = 1.7; const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 140; const g2 = c.createGain(); g2.gain.value = 0; s2.connect(f2); f2.connect(g2); g2.connect(AU.master); s2.start(); AU.rumble = g2;
    const s3 = c.createBufferSource(); s3.buffer = b; s3.loop = true; s3.playbackRate.value = 2.4; const f3 = c.createBiquadFilter(); f3.type = 'bandpass'; f3.frequency.value = 520; f3.Q.value = 0.7; const g3 = c.createGain(); g3.gain.value = 0.05; s3.connect(f3); f3.connect(g3); g3.connect(AU.master); AU.murmur = g3; s3.start();
  } catch (e) { AU.ctx = null; }
}
function tone(f, d, type, v, f2, delay) {
  if (!AU.ctx || !AU.on) return;
  try { const c = AU.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + 0.03); } catch (e) { }
}
function nburst(d, v, fc, delay) {
  if (!AU.ctx || !AU.on || !AU.noise) return;
  try { const c = AU.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(); s.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc || 600; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * 1.5, d + 0.05); } catch (e) { }
}
const sfx = {
  chime() { tone(880, 0.9, 'sine', 0.16); tone(660, 1.1, 'sine', 0.16, null, 0.42); },
  blip() { tone(150 + Math.random() * 120, 0.07, 'sawtooth', 0.05); },
  click() { tone(300, 0.04, 'square', 0.07); tone(180, 0.05, 'square', 0.05, null, 0.05); },
  thunder(delay) { nburst(2.6, 0.55, 260, delay || 0); tone(48, 2.2, 'sine', 0.3, 26, delay || 0); },
  crack() { nburst(0.25, 0.4, 4200); },
  slam() { nburst(1.0, 0.7, 700); tone(54, 1.2, 'sine', 0.6, 22); },
  scream(k) { const f = 620 + Math.random() * 380; tone(f, 0.9 + Math.random() * 0.5, 'sawtooth', 0.045 * (k || 1), f * 1.5, Math.random() * 0.15); tone(f * 2, 0.7, 'square', 0.02 * (k || 1), f * 2.6); },
  static(d) { nburst(d || 0.8, 0.22, 3800); },
  growl() { tone(46, 2.4, 'sawtooth', 0.2, 30); nburst(2.0, 0.2, 280); },
  rattle() { nburst(0.5, 0.14, 1500); }
};

/* ---------- variabel keadaan ---------- */
const G = { state: 'load', started: false, turb: 0, cabin: 1, flash: 0, blackout: 0, look: 0, brace: 0, panic: 0, ibuTalk: 0 };
const CAM = { mode: 'cine', px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 70, leanX: 0, leanY: 0, leanZ: 0 };
const SEAT = { x: seatX(1, 2), z: rowZ(12) + 0.28, eye: CUSHION + 0.77, yaw: 0, pitch: 0, guide: false, yawT: 0, pitT: 0, lookSum: 0 };
let TW = [], TIM = [], shakeAmp = 0, roll = 0, flickerT = 0;
function tween(obj, props, dur, fn) {
  return new Promise(res => { const from = {}; for (const k in props) from[k] = obj[k]; TW.push({ obj, from, to: props, t: 0, dur: Math.max(0.001, dur), res, fn: fn || ease }); });
}
function wait(sec) { return new Promise(res => TIM.push({ t: sec, res })); }
function stepTweens(dt) {
  for (const w of TW) { w.t += dt; const k = w.fn(clamp(w.t / w.dur, 0, 1)); for (const p in w.to) w.obj[p] = lerp(w.from[p], w.to[p], k); if (w.t >= w.dur) w.done = true; }
  const dn = TW.filter(w => w.done); TW = TW.filter(w => !w.done); dn.forEach(w => w.res());
  for (const w of TIM) w.t -= dt; const dt2 = TIM.filter(w => w.t <= 0); TIM = TIM.filter(w => w.t > 0); dt2.forEach(w => w.res());
}

/* ---------- pemuatan model ---------- */
const root = new THREE.Group(); scene.add(root);
const M = { cabin: null, luar: null, orang: null };
const seatChunks = {};      // ci -> { H: [], L: [], zc }
const lampMats = [];
function loadGLB(url, w0, w1) {
  return new Promise((res, rej) => {
    new GLTFLoader().load(url, g => res(g), x => { if (x && x.total) { const p = Math.round(w0 + (w1 - w0) * x.loaded / x.total); el.ldFill.style.width = p + '%'; el.ldPct.textContent = p + '%'; } }, e => rej(new Error(url + ' tidak bisa dimuat (' + (e && e.message || 'tidak ditemukan') + ')')));
  });
}
function litMat(src, useVC) { const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: !!useVC }); if (src && src.map) { m.map = src.map; } return m; }
function nameOf(o) { return (o.name || '') + '|' + ((o.parent && o.parent.name) || ''); }
function setupCabin(g) {
  const glass = new THREE.MeshBasicMaterial({ color: 0x0a1420, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false });
  g.scene.traverse(o => {
    if (!o.isMesh) return; const nm = nameOf(o);
    const hasVC = !!(o.geometry && o.geometry.attributes && o.geometry.attributes.color);
    if (/Kaca/.test(nm)) { o.material = glass; o.renderOrder = 2; return; }
    if (/Lampu/.test(nm)) { const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); o.material = m; lampMats.push(m); return; }
    o.material = litMat(o.material, hasVC);
    const m = /Kursi_(\d+)_([HL])/.exec(nm);
    if (m) { const ci = +m[1]; (seatChunks[ci] = seatChunks[ci] || { H: [], L: [], zc: -10.3 + 1.7 * (ci + 0.5) })[m[2]].push(o); }
  });
  root.add(g.scene); M.cabin = g.scene;
}
function setupLuar(g) { g.scene.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); } }); g.scene.visible = false; root.add(g.scene); M.luar = g.scene; }
const kr = { g: new THREE.Group(), mats: [], rise: 0, near: 0, amp: 0.11, flashT: 0, pos: null, base: null, fc: 0 };
function setupKraken(g) {
  let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return;
  const geo = mesh.geometry;
  const m = new THREE.MeshBasicMaterial({ color: 0x11161f, fog: false, side: THREE.DoubleSide }); kr.mats.push(m);   // siluet gelap tanpa detail
  const k = new THREE.Mesh(geo, m); k.frustumCulled = false; kr.g.add(k);
  if (geo.attributes && geo.attributes.position && geo.attributes.position.array) { kr.pos = geo.attributes.position; kr.base = new Float32Array(kr.pos.array); }
  kr.g.scale.setScalar(40); kr.g.rotation.y = -Math.PI / 2; kr.g.position.set(160, -150, 46); kr.g.visible = false; scene.add(kr.g);
}
// tentakel meliuk: titik-titik jauh dari kepala bergeser mengikuti gelombang
function animKraken(t) {
  if (!kr.pos || !kr.base) return;
  const p = kr.pos.array, b = kr.base, A = kr.amp, n = b.length / 3;
  for (let i = 0; i < n; i++) {
    const x = b[i * 3], y = b[i * 3 + 1], z = b[i * 3 + 2];
    const w = clamp((2.2 - y) / 2.6, 0, 1) * clamp(0.35 + Math.hypot(x, z) * 0.7, 0, 1);
    if (w <= 0) { p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; continue; }
    const ph = t * 1.6 + y * 2.8 + x * 2.0;
    p[i * 3] = x + A * w * Math.sin(ph); p[i * 3 + 1] = y + A * 0.5 * w * Math.sin(t * 1.7 + x * 3 + z * 2); p[i * 3 + 2] = z + A * w * Math.cos(ph * 0.9 + z * 2.5);
  }
  kr.pos.needsUpdate = true;
}
function orangNode(name) { let f = null; if (!M.orang) return null; M.orang.traverse(o => { if (!f && (o.name === name)) f = o; }); return f; }
const npcs = [];
function prepOrang(g) {
  g.scene.traverse(o => { if (!o.isMesh) return; const hasVC = !!(o.geometry && o.geometry.attributes && o.geometry.attributes.color); o.material = litMat(o.material, hasVC); });
  M.orang = g.scene;
}
const PIV = { PS1: [0, 1.144, 0.016], Wanita: [-0.029, 1.102, 0.023], Pria: [-0.002, 1.164, 0.068] }, HIP = [0, 0.47, 0];
const kindOf = n => n.indexOf('PS1') === 0 ? 'PS1' : (n.indexOf('Wanita') === 0 ? 'Wanita' : 'Pria');
const BEH = ['look', 'look', 'calm', 'calm', 'read', 'sleep'];
function putNpc(name, x, z, ry, tag) {
  const g = new THREE.Group(); g.position.set(x, FLOORY - 0.05, z); g.rotation.y = ry || 0;
  const n = { o: g, x, z, y: g.position.y, tag: tag || name, ph: Math.random() * 6.28, w: 0.35 + Math.random() * 0.4, side: x >= 0 ? 1 : -1, beh: BEH[Math.floor(Math.random() * BEH.length)], lw: 0.7 + Math.random() * 0.3, bw: 0.5 + Math.random() * 0.7, tk: 0, torP: null, headP: null };
  const legS = orangNode(name + '_leg'), torS = orangNode(name + '_tor'), headS = orangNode(name + '_head');
  if (legS && torS && headS) {
    const nk = PIV[kindOf(name)];
    g.add(legS.clone(true));
    const torP = new THREE.Group(); torP.position.set(HIP[0], HIP[1], HIP[2]); const tor = torS.clone(true); tor.position.set(-HIP[0], -HIP[1], -HIP[2]); torP.add(tor); g.add(torP);
    const headP = new THREE.Group(); headP.position.set(nk[0] - HIP[0], nk[1] - HIP[1], nk[2] - HIP[2]); const head = headS.clone(true); head.position.set(-nk[0], -nk[1], -nk[2]); headP.add(head); torP.add(headP);
    n.torP = torP; n.headP = headP;
  } else { const src = orangNode(name); if (!src) return null; g.add(src.clone(true)); }
  root.add(g); npcs.push(n); return n;
}
// gerakan penumpang: napas, menoleh, membaca, tertidur; saat panik merunduk atau menoleh ke jendela
function animNpcs(t, dt) {
  const k = Math.min(1, dt * 5), look = G.look, brace = G.brace, tb = G.turb;
  for (const n of npcs) {
    const ph = n.ph, g = n.o;
    if (tb > 0.2) { g.position.y = n.y + Math.sin(t * 14 + ph) * 0.012 * tb; g.rotation.z = Math.sin(t * 9 + ph) * 0.03 * tb; g.position.x = n.x + Math.sin(t * 11 + ph * 2) * 0.012 * tb; }
    else { g.position.y = n.y; g.position.x = n.x; g.rotation.z = 0; }
    if (!n.torP) {                                   // model tunggal (penumpang jauh / MC tidur)
      g.scale.y = 1 + Math.sin(t * 1.5 + ph) * 0.004;
      g.rotation.y += (look * 0.55 * n.lw - g.rotation.y) * k; g.rotation.x += (brace * 0.1 * n.bw - g.rotation.x) * k;
      continue;
    }
    let hy = 0, hp = 0, lean = 0, rz = 0;
    if (n.beh === 'look') { const gate = clamp(Math.sin(t * n.w * 0.37 + ph * 2) * 3, -1, 1) * 0.5 + 0.5; hy = Math.sin(t * n.w + ph) * 0.6 * gate; hp = Math.sin(t * 0.4 + ph) * 0.05; }
    else if (n.beh === 'read') { hp = 0.32 + Math.sin(t * 0.8 + ph) * 0.03; lean = 0.09 + Math.sin(t * 0.5 + ph) * 0.01; hy = Math.sin(t * 0.3 + ph) * 0.1; }
    else if (n.beh === 'sleep') { hp = 0.42 + Math.sin(t * 0.5 + ph) * 0.06; lean = 0.1; rz = Math.sin(t * 0.2 + ph) * 0.03; }
    else { hy = Math.sin(t * 0.4 + ph) * 0.18; lean = Math.sin(t * 0.6 + ph) * 0.015; hp = Math.sin(t * 0.3 + ph) * 0.04; }
    if (n.tag === 'ibu') { n.tk = lerp(n.tk, G.ibuTalk, Math.min(1, dt * 3)); hy = lerp(hy, 0.75, n.tk); hp = lerp(hp, 0.05, n.tk); lean = lerp(lean, 0, n.tk); }
    const wl = look * n.lw, bw = brace * n.bw;
    hy = lerp(hy, 1.15, wl); hp = lerp(hp, -0.05, wl); lean += bw * 0.3; hp += bw * 0.35;
    hy += Math.sin(t * 17 + ph * 3) * 0.08 * G.panic;
    n.torP.rotation.x += (lean - n.torP.rotation.x) * k; n.torP.rotation.z += (rz - n.torP.rotation.z) * k; n.torP.scale.y = 1 + Math.sin(t * 1.6 + ph) * 0.004;
    n.headP.rotation.y += (hy - n.headP.rotation.y) * k; n.headP.rotation.x += (hp - n.headP.rotation.x) * k;
  }
}
function populate() {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], mcRow = 12;
  const hero = { '11:1:1': 'Wanita_B', '13:1:0': 'Pria_B', '12:-1:1': 'Wanita_C', '12:-1:0': 'Pria_C', '10:-1:2': 'Pria_A' };
  for (let k = 0; k < NROW; k++) for (const side of [1, -1]) for (let col = 0; col < 3; col++) {
    if (k === mcRow && side === 1) { if (col === 2) continue; if (col === 1) { putNpc('Wanita_A', seatX(side, col), rowZ(k) + 0.3, 0, 'ibu'); continue; } if (col === 0) { putNpc('Pria_A', seatX(side, col), rowZ(k) + 0.3, 0, 'bapak'); continue; } }
    const key = k + ':' + side + ':' + col;
    if (hero[key]) { putNpc(hero[key], seatX(side, col), rowZ(k) + 0.3, 0); continue; }
    if (rnd() > (Math.abs(k - mcRow) < 7 ? 0.75 : 0.45)) continue;
    const near = Math.abs(k - mcRow) <= 3, v = cols[Math.floor(rnd() * 8)];
    putNpc((near ? 'PS1_' : 'PS1L_') + v, seatX(side, col), rowZ(k) + 0.3, 0);
  }
}

/* ---------- pengatur kamera ---------- */
let lookId = null, lookL = { x: 0, y: 0 }, allowLook = false;
el.touch.addEventListener('pointerdown', e => { e.preventDefault(); auInit(); if (!allowLook || lookId !== null) return; lookId = e.pointerId; lookL = { x: e.clientX, y: e.clientY }; try { el.touch.setPointerCapture(e.pointerId); } catch (er) { } });
el.touch.addEventListener('pointermove', e => {
  if (e.pointerId !== lookId || !allowLook || SEAT.guide) return;
  const dx = e.clientX - lookL.x, dy = e.clientY - lookL.y; lookL = { x: e.clientX, y: e.clientY };
  const ny = clamp(SEAT.yaw - dx * 0.0055, -1.9, 1.9), np = clamp(SEAT.pitch - dy * 0.0045, -0.7, 0.75);
  SEAT.lookSum += Math.abs(ny - SEAT.yaw) + Math.abs(np - SEAT.pitch); SEAT.yaw = ny; SEAT.pitch = np;
});
function endPtr(e) { if (e.pointerId === lookId) lookId = null; }
el.touch.addEventListener('pointerup', endPtr); el.touch.addEventListener('pointercancel', endPtr);
window.addEventListener('mousemove', e => { if (e.buttons && allowLook && !SEAT.guide) { SEAT.yaw = clamp(SEAT.yaw - (e.movementX || 0) * 0.004, -1.9, 1.9); SEAT.pitch = clamp(SEAT.pitch - (e.movementY || 0) * 0.003, -0.7, 0.75); SEAT.lookSum += 0.01; } });
function updateCamera(dt, t) {
  let px, py, pz, lx, ly, lz;
  if (CAM.mode === 'seat') {
    if (SEAT.guide) { SEAT.yaw = lerp(SEAT.yaw, SEAT.yawT, Math.min(1, dt * 2.2)); SEAT.pitch = lerp(SEAT.pitch, SEAT.pitT, Math.min(1, dt * 2.2)); }
    px = SEAT.x + CAM.leanX; py = SEAT.eye + CAM.leanY; pz = SEAT.z + CAM.leanZ;
    const cp = Math.cos(SEAT.pitch), sp = Math.sin(SEAT.pitch), fx = Math.sin(SEAT.yaw) * cp, fz = Math.cos(SEAT.yaw) * cp;
    py += Math.sin(t * 0.7) * 0.004; lx = px + fx; ly = py + sp; lz = pz + fz;
  } else { px = CAM.px; py = CAM.py; pz = CAM.pz; lx = CAM.lx; ly = CAM.ly; lz = CAM.lz; }
  let sx = 0, sy = 0, sz = 0;
  const amp = shakeAmp + G.turb * 0.05;
  if (amp > 0.0005) { sx = (Math.random() - 0.5) * amp; sy = (Math.random() - 0.5) * amp * 0.8; sz = (Math.random() - 0.5) * amp * 0.6; shakeAmp = Math.max(0, shakeAmp - dt * 0.6); }
  camera.position.set(px + sx, py + sy, pz + sz); camera.up.set(Math.sin(roll) * 0.6, 1, 0); camera.lookAt(lx + sx * 0.5, ly + sy * 0.5, lz + sz * 0.5);
  if (Math.abs(camera.fov - CAM.fov) > 0.02) { camera.fov = CAM.fov; camera.updateProjectionMatrix(); }
}
function cine(pos, look, dur) { return tween(CAM, { px: pos[0], py: pos[1], pz: pos[2], lx: look[0], ly: look[1], lz: look[2] }, dur); }
function setCine(pos, look) { CAM.mode = 'cine'; CAM.px = pos[0]; CAM.py = pos[1]; CAM.pz = pos[2]; CAM.lx = look[0]; CAM.ly = look[1]; CAM.lz = look[2]; }

/* ---------- antarmuka cerita ---------- */
function hint(t) { if (!t) { el.hint.classList.remove('on'); return; } el.hint.textContent = t; el.hint.classList.add('on'); }
async function say(who, text, o) {
  o = o || {}; const w = el.sub.querySelector('.who'), x = el.sub.querySelector('.txt');
  G.ibuTalk = who && who.indexOf('Ibu') === 0 ? 1 : 0;
  w.textContent = who || ''; w.style.display = who ? 'block' : 'none'; x.className = 'txt' + (o.thought ? ' th' : ''); x.textContent = ''; el.sub.classList.add('on');
  for (let i = 1; i <= text.length; i++) { x.textContent = text.slice(0, i); if (i % 3 === 0 && o.voice) sfx.blip(); await wait(0.028); }
  await wait(o.hold !== undefined ? o.hold : Math.max(1.3, text.length * 0.035));
  G.ibuTalk = 0;
  if (!o.keep) el.sub.classList.remove('on');
}
const think = (t, o) => say('', t, Object.assign({ thought: true }, o));
async function pa(text) {
  const x = el.pa.querySelector('.pax'); x.textContent = ''; el.pa.classList.add('on'); sfx.chime(); await wait(1.3); sfx.static(0.25);
  for (let i = 1; i <= text.length; i++) { x.textContent = text.slice(0, i); if (i % 2 === 0) sfx.blip(); await wait(0.03); }
  await wait(Math.max(1.6, text.length * 0.03)); el.pa.classList.remove('on');
}
function card(t, s, ms) { el.card.querySelector('.ct').textContent = t; el.card.querySelector('.cs').textContent = s || ''; el.card.classList.add('on'); return wait(ms / 1000).then(() => el.card.classList.remove('on')); }
function fade(o, s) { el.fade.style.transition = 'opacity ' + s + 's'; el.fade.style.opacity = String(o); return wait(s); }
function eyes(o, s) { el.blur.style.transition = 'opacity ' + s + 's'; el.blur.style.opacity = String(o); return wait(s); }
function bolt(k) { G.flash = k === undefined ? 1 : k; sfx.crack(); sfx.thunder(0.5 + Math.random() * 0.6); }
function flickerLights(s) { flickerT = s; }

/* ---------- cerita ---------- */
async function story() {
  G.started = true; G.turb = 0; G.cabin = 1; kr.g.visible = false; kr.rise = 0;
  hint(''); el.sub.classList.remove('on'); el.pa.classList.remove('on');
  /* 1. pembuka: pesawat dari luar */
  if (M.luar) M.luar.visible = true;
  setCine([70, 13, 62], [0, 7.5, 2]); await fade(0, 1.6);
  cine([44, 10, -34], [0, 7, 2], 10);
  await wait(1.2);
  await say('', 'Tiga hari di Padang. Pemakaman Nenek, tangis Ibu, dan bau hujan di kampung.', { thought: true });
  await say('', 'Sekarang aku hanya ingin pulang.', { thought: true });
  await card('PENERBANGAN PULANG', 'Padang \u2192 Jakarta \u00b7 Pukul 14.47', 3600);
  /* 2. di dalam kabin: MC tertidur */
  await fade(1, 0.9); if (M.luar) M.luar.visible = false;
  const mc = putNpc('MC_tidur', SEAT.x, rowZ(12) + 0.3, 0, 'mc');
  setCine([0.06, 6.42, 2.5], [1.32, 6.05, 1.25]); CAM.fov = 60; await fade(0, 1.2);
  cine([0.35, 6.4, 2.05], [1.4, 6.0, 1.25], 6);
  await wait(2.4);
  G.turb = 0.35; sfx.rattle(); await wait(1.0); G.turb = 0; shakeAmp = 0.05;
  await fade(1, 0.6);
  if (mc) { root.remove(mc.o); const i = npcs.indexOf(mc); if (i >= 0) npcs.splice(i, 1); }
  CAM.mode = 'seat'; CAM.fov = 72; SEAT.yaw = 0; SEAT.pitch = 0; SEAT.guide = false; SEAT.lookSum = 0;
  await eyes(1, 0.01); await fade(0, 0.05);
  await eyes(0.75, 1.2); await eyes(0.2, 0.7); await eyes(0.55, 0.5); await eyes(0, 1.1);
  await think('Uh... aku ketiduran.');
  allowLook = true;
  hint('Geser jari di layar untuk melihat sekeliling'); const t0 = SEAT.lookSum;
  for (let i = 0; i < 60 && SEAT.lookSum - t0 < 3.2; i++) await wait(0.25);
  hint('');
  await think('Kabin hangat dan tenang. Cahaya matahari masuk dari jendela. Ada yang membaca, ada yang tidur, ada yang menonton film.');
  await say('Ibu di sebelah', 'Sudah bangun, Nak? Tadi sempat goyang sedikit.', { voice: true });
  await say('Aku', 'Sudah jam berapa, Bu?', { voice: true });
  await say('Ibu di sebelah', 'Baru jam tiga kurang, Nak. Katanya sebentar lagi kita masuk awan mendung.', { voice: true });
  await think('Awan mendung? Padahal tadi langit cerah sekali.');
  /* 3. kapten */
  await pa('Selamat siang, Bapak dan Ibu penumpang. Di sini kapten kalian berbicara.');
  await pa('Di depan kita ada awan mendung yang sangat tebal. Kami akan berusaha melewatinya secepat mungkin.');
  await pa('Mohon semua penumpang tetap duduk, kencangkan sabuk pengaman, dan tetap tenang.');
  if (AU.murmur) AU.murmur.gain.value = 0.11;
  sfx.click(); await think('Klik. Sabuk pengaman terpasang.');
  await say('Ibu di sebelah', 'Aduh, semoga tidak lama...', { voice: true });
  /* 4. guncangan */
  G.turb = 0.5; G.brace = 0.3; sfx.rattle(); if (AU.rumble) AU.rumble.gain.value = 0.25; flickerLights(2.5);
  await wait(2.2); bolt(0.6); await wait(1.4);
  await say('Penumpang di belakang', 'Ini bukan turbulensi biasa!', { voice: true, hold: 0.6 });
  G.turb = 0.9; G.brace = 0.6; if (AU.rumble) AU.rumble.gain.value = 0.5; bolt(1); for (let i = 0; i < 4; i++) sfx.scream(0.7);
  await wait(1.6);
  await pa('Bapak Ibu... kami mengalami turbulensi... harap semua... kembali ke...');
  sfx.static(1.2); G.turb = 1.4; shakeAmp = 0.12; if (AU.rumble) AU.rumble.gain.value = 0.85;
  for (let i = 0; i < 7; i++) sfx.scream(1);
  bolt(1); flickerLights(3); roll = 0.05;
  await wait(2.4); bolt(1);
  await say('Ibu di sebelah', 'Ya Allah! Lihat! Di luar jendela!', { voice: true, hold: 0.5 });
  /* 5. melihat ke jendela */
  tween(G, { look: 1, brace: 0.15 }, 1.6); SEAT.guide = true; SEAT.yawT = 1.5; SEAT.pitT = -0.13;
  tween(CAM, { leanX: 0.2, leanY: -0.13, leanZ: -0.14 }, 1.6); CAM.fov = 66;
  await wait(1.2);
  kr.g.visible = true; kr.tt = 0; sfx.growl(); tween(kr, { near: 1 }, 10); await tween(kr, { rise: 1 }, 5.0);
  await say('', 'Di balik awan hitam itu... ada sesuatu.', { thought: true, hold: 0.8 });
  bolt(1); await wait(0.4);
  kr.flashT = 1; await wait(0.9);
  await say('Ibu di sebelah', 'Itu... itu apa...?', { voice: true, hold: 0.7 });
  bolt(1); for (let i = 0; i < 6; i++) sfx.scream(1.1);
  G.panic = 1; await say('Penumpang di belakang', 'MONSTER! ITU MONSTER!', { voice: true, hold: 0.5 });
  await think('Itu bukan awan. Itu... hidup.', { hold: 1.0 });
  await pa('Semua kru... ke posisi... Ya Tuhan... jangan... jangan lihat...');
  /* 6. hantaman */
  G.turb = 2; shakeAmp = 0.4; kr.amp = 0.3; tween(G, { look: 0, brace: 1 }, 0.4); sfx.slam(); bolt(1); flickerLights(1.5);
  await wait(0.7); sfx.slam(); G.blackout = 3; shakeAmp = 0.7; sfx.scream(1.3);
  await wait(1.0); await fade(1, 0.35);
  G.turb = 0; shakeAmp = 0; hint('');
  await wait(1.6);
  await card('BAB 1 SELESAI', 'Bersambung ke Bab 2...', 4200);
  endStory();
}

/* ---------- layar ---------- */
function showPanel(html) { el.panel.innerHTML = html; el.panel.classList.add('on'); }
function hidePanel() { el.panel.classList.remove('on'); }
function showTitle() {
  G.state = 'title'; allowLook = false; hint(''); el.sub.classList.remove('on'); el.pa.classList.remove('on');
  showPanel('<div class="board"><h1>Penerbangan Pulang</h1><h2>Bab 1: Awan Mendung</h2><p>Kamu pulang dari Sumatra dengan pesawat siang. Semua tampak biasa... sampai awan di luar jendela berubah. Putar HP ke mendatar dan pakai earphone.</p><button class="cta" data-do="start">Mulai</button><button class="cta alt" data-do="bright">Kecerahan: ' + BRN[brI] + '</button></div>');
}
function endStory() { G.state = 'end'; showPanel('<div class="board"><h1>Bersambung</h1><h2>Bab 1 selesai</h2><p>Bab 2 akan dimulai dengan kamu terbangun di kabin yang gelap. Kabari aku bagian mana yang ingin diperbaiki dulu.</p><button class="cta" data-do="start">Ulangi Bab 1</button><button class="cta alt" data-do="menu">Ke menu</button></div>'); }
function resetStory() {
  TW = []; TIM = []; G.turb = 0; G.flash = 0; G.blackout = 0; G.look = 0; G.brace = 0; G.panic = 0; G.ibuTalk = 0; kr.amp = 0.11; kr.near = 0; shakeAmp = 0; roll = 0; flickerT = 0; CAM.leanX = CAM.leanY = CAM.leanZ = 0; SEAT.guide = false; allowLook = false;
  kr.g.visible = false; kr.rise = 0; el.blur.style.opacity = '0'; el.card.classList.remove('on'); hint(''); el.sub.classList.remove('on'); el.pa.classList.remove('on');
  for (let i = npcs.length - 1; i >= 0; i--) if (npcs[i].tag === 'mc') { root.remove(npcs[i].o); npcs.splice(i, 1); }
  if (M.luar) M.luar.visible = false;
  if (AU.rumble) AU.rumble.gain.value = 0; if (AU.murmur) AU.murmur.gain.value = 0.05;
}
function startStory() {
  if (!M.cabin) { showErr('Model kabin belum termuat.'); return; }
  hidePanel(); resetStory(); G.state = 'play'; fade(1, 0.01); story().catch(e => showErr('cerita: ' + (e && e.message || e)));
}
function pauseGame() { if (G.state !== 'play') return; G.state = 'pause'; showPanel('<div class="board"><h1>Dijeda</h1><button class="cta" data-do="resume">Lanjut</button><button class="cta alt" data-do="bright">Kecerahan: ' + BRN[brI] + '</button><button class="cta alt" data-do="menu">Ke menu</button></div>'); }
el.panel.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-do]'); if (!b) return; auInit();
  const a = b.dataset.do;
  if (a === 'start') startStory(); else if (a === 'menu') { resetStory(); setCine([0.4, 6.5, -6], [0.8, 6, 6]); fade(0, 0.6); showTitle(); }
  else if (a === 'resume') { hidePanel(); G.state = 'play'; }
  else if (a === 'bright') { cycleBright(); if (G.state === 'pause') { G.state = 'play'; pauseGame(); } else showTitle(); }
});
el.mute.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.on = !AU.on; el.mute.textContent = AU.on ? '\u{1F50A}' : '\u{1F507}'; if (AU.master) AU.master.gain.value = AU.on ? 0.9 : 0; });
el.pause.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ---------- pembaruan tiap bingkai ---------- */
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function updateWorld(dt, t) {
  G.flash = Math.max(0, G.flash - dt * 2.6);
  flashL.intensity = G.flash * 900;
  const sf = 1 + G.flash * 1.8; stormMats.forEach(x => x.mat.color.setRGB(Math.min(3, x.base[0] * sf), Math.min(3, x.base[1] * sf), Math.min(3, x.base[2] * sf)));
  const kf = 1 + kr.flashT * 1.2 + G.flash * 0.8; kr.mats.forEach(m => m.color.setRGB(0.006 * kf, 0.008 * kf, 0.014 * kf));
  if (kr.flashT) kr.flashT = Math.max(0, kr.flashT - dt * 0.5);
  let cab = G.cabin;
  if (flickerT > 0) { flickerT -= dt; cab *= (Math.sin(t * 43) > 0.1 ? 1 : 0.05); }
  if (G.blackout > 0) { G.blackout -= dt; cab = 0; }
  const li = 0.15 + 0.85 * cab;
  ambient.intensity = 1.1 * li; hemi.intensity = 1.1 * li + G.flash * 1.4; sunLight.intensity = 1.2 * li;
  cabinL.forEach((l, i) => { l.intensity = 3 * cab; l.position.set(0.3 - i * 0.6, 6.8, SEAT.z + (i ? 2.2 : -1.5)); });
  lampMats.forEach(m => m.color.setRGB(cab, cab * 0.95, cab * 0.85));
  if (cloudTex && cloudTex.offset) { cloudTex.offset.y += dt * 0.018; cloudTex.offset.x += dt * 0.004; }
  if (wispTex && wispTex.offset) { wispTex.offset.y += dt * 0.03; wispTex.offset.x += dt * 0.008; }
  root.rotation.z = Math.sin(t * 1.3) * 0.004 * (1 + G.turb * 6) + (G.turb > 1 ? Math.sin(t * 9) * 0.01 * G.turb : 0);
  root.position.y = Math.sin(t * 2.1) * 0.02 * G.turb;
  animNpcs(t, dt);
  if (kr.rise > 0.005) {
    kr.g.visible = true; kr.tt = (kr.tt || 0) + dt;
    const nr = ease(clamp(kr.near, 0, 1)), x = lerp(165, 122, nr) + Math.sin(t * 0.3) * 4, y = lerp(-150, -95, ease(clamp(kr.rise, 0, 1))), z = 42 + Math.sin(kr.tt * 0.14) * 24;
    kr.g.position.set(x, y + Math.sin(t * 0.6) * 1.5, z); kr.g.rotation.y = -Math.PI / 2 + Math.sin(t * 0.25) * 0.14; kr.g.scale.setScalar(40 * (1 + Math.sin(t * 0.9) * 0.012));
    if ((kr.fc = (kr.fc + 1) % 2) === 0) animKraken(t);
  } else kr.g.visible = false;
  stormVeil.forEach((p, i) => { p.material.opacity = 0.5 + 0.12 * Math.sin(t * 0.4 + i); p.position.y += Math.sin(t * 0.3 + i) * 0.03; });
  for (const ci in seatChunks) { const c = seatChunks[ci], near = Math.abs(c.zc - camera.position.z) < 3.6; c.H.forEach(o => { o.visible = near; }); c.L.forEach(o => { o.visible = !near; }); }
  el.redfx.style.opacity = String(clamp(G.turb * 0.1 + (G.blackout > 0 ? 0.2 : 0), 0, 0.6));
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  if (G.state === 'play') stepTweens(dt);
  if (G.state === 'play' || G.state === 'end' || G.state === 'title') updateWorld(dt, t);
  updateCamera(dt, t);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 2.5) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; if (fps < 24 && QUAL.pr > 0.7) { QUAL.pr = Math.max(0.7, QUAL.pr - 0.15); resize(); } }
}

/* ---------- mulai ---------- */
setCine([0.4, 6.5, -6], [0.8, 6, 6]);
(async () => {
  try {
    const gc = await loadGLB('kabin2_garuda.glb', 0, 55); setupCabin(gc);
    const go = await loadGLB('orang.glb', 55, 68); prepOrang(go); populate();
    try { const gk = await loadGLB('kraken.glb', 68, 82); setupKraken(gk); } catch (e) { showErr(e.message); }
    try { const gl = await loadGLB('pesawat_luar.glb', 82, 100); setupLuar(gl); } catch (e) { showErr(e.message); }
    el.loading.style.display = 'none'; fade(0, 1.0); showTitle();
  } catch (e) { el.loading.style.display = 'none'; showErr(e.message); showTitle(); }
})();
requestAnimationFrame(loop);
if (window.__DEBUG) window.__dbg = { G, CAM, SEAT, kr, npcs, seatChunks, M, story, startStory, get shake() { return shakeAmp; }, camera, scene, sfx, TIMn: () => TIM.length };
