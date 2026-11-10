'use client';

/**
 * Cena do portfólio (D-024, D-026): no centro, o holograma do símbolo oficial feito de pontos,
 * projetado por uma base de LED em degraus; em volta, os cards de vidro grosso numa órbita. A
 * rolagem gira a câmera de um card para o próximo (`helix.ts`). Técnica estudada na penúltima seção
 * do igloo.inc (figura de pontos sobre uma base com luz na borda, que esfarela perto do cursor) e no
 * portfólio do Active Theory (vidro, título fatiado); o código é nosso.
 *
 * - Canvas próprio, com alfa: do lado de antes do corte C fica transparente (aparece o Sobre, em
 *   HTML); a borda de nós é desenhada aqui.
 * - Holograma (D-026): pontos tirados da superfície das 4 peças do símbolo extrudado (o arquivo
 *   oficial, D-013), sempre de frente para a câmera. Forma-se da lente para cima quando o portfólio
 *   entra (2 s); com o cursor em cima (ou um toque, no celular), esfarela todo a partir do ponto
 *   tocado; sem cursor, volta inteiro.
 * - Só desenha quando algo muda: rolagem, cursor, entrada, câmera chegando ao lugar, holograma se
 *   formando ou esfarelando e o relógio de atividade (LEDs e varredura), que para cerca de 2 s
 *   depois do último movimento do usuário (SC 2.2.2).
 * - Cada quadro desenha a cena duas vezes: tudo menos os cards em meia resolução (o que o vidro
 *   refrata) e depois a cena inteira.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PIECE_HEIGHT, buildPieces } from '../entry/pieces';
import type { SmoothScroll } from '../entry/smoothScroll';
import type { Cut } from '../entry/transition';
import { BASE, CARD, FOV, HOLO, RADIUS, cameraPose, clamp01, framing, helixPosition, helixStep } from './helix';
import type { Project } from './projects';
import {
  backgroundFragment,
  backgroundVertex,
  beamFragment,
  beamVertex,
  floorFragment,
  glassFragment,
  glassVertex,
  haloFragment,
  holoFragment,
  holoVertex,
  ledGlowFragment,
  pedestalFragment,
  pedestalVertex,
  titleFragment,
  titleVertex,
} from './shaders';

/** Estado da rolagem do portfólio num quadro (px CSS do trilho fixo, o mesmo tamanho do canvas). */
export interface PortfolioFrame {
  /** Corte C (D-024). */
  cut: Cut;
  /** O corte já passou pela tela toda. */
  done: boolean;
  /** Progresso da câmera pela órbita (0..1). */
  q: number;
}

interface PortfolioCanvasProps {
  projects: readonly Project[];
  /** Lido a cada quadro; `null` quando o portfólio não está na tela. */
  read: () => PortfolioFrame | null;
  scroller: SmoothScroll;
  /** O WebGL caiu: a seção volta para a lista simples. */
  onLost: () => void;
}

const HEX = {
  bg: '#0C1E36', // Azul Noturno Soberano
  bgDeep: '#071321', // --color-background
  silver: '#B7C5D4', // --color-text-secondary
  white: '#F4F8FC', // --color-text-primary
  accent: '#00D2D3', // Ciano Cibernético (acento)
} as const;

const color = (hex: string) => new THREE.Color(hex);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Fator por quadro (a 60 quadros/s) corrigido pela duração real do quadro. */
const follow = (k: number, dt: number) => 1 - Math.pow(1 - k, dt * 60);

/** Entrada dos cards: cada um cresce do zero em 1,2 s, 0,2 s depois do anterior. */
const INTRO = { dur: 1.2, stagger: 0.2 } as const;
/** Formação do holograma quando o portfólio entra: 0,2 s depois, em 2 s (menos de 5 s). */
const FORM = { delay: 0.2, dur: 2 } as const;
/** Esfarelar: até o fim em 1,4 s com o cursor em cima; volta em 1,6 s. Um toque segura 1,2 s. */
const CRUMBLE = { up: 1.4, down: 1.6, touch: 1.2 } as const;
/** Relógio de atividade: anda até 1,2 s depois do último movimento e para em 0,8 s. */
const ACTIVITY = { hold: 1.2, fade: 0.8 } as const;
/** Câmera: fração da distância que falta, por quadro a 60 quadros/s (a do Active Theory). */
const FOLLOW = 0.2;
/** O holograma acompanha a câmera com atraso, no máximo 0,6 rad (nunca fica de costas). */
const HOLO_LAG = { k: 0.07, max: 0.6 } as const;

/**
 * Perfil da base: chanfro e fita de LED na borda de cada degrau, raio de cada borda e altura do
 * topo de cada degrau (o último é o pé, que vai até o chão).
 */
const PROFILE = {
  chamfer: 0.04,
  strip: 0.03,
  edges: [1.0, 1.34, 1.7, 2.06, BASE.outer],
  tops: [BASE.top, -0.18, -0.4, -0.66, -0.92],
} as const;
/** Meia altura do brilho em volta de cada fita. */
const LED_GLOW = 0.13;
/** A lente fica um pouco abaixo do topo (o anel de LED em volta). */
const LENS_Y = BASE.top - 0.025;
/** Feixe da lente até o anel de luz de cima. */
const BEAM = { top: BASE.top + 2.55, radius: 1.55 } as const;
const HALO_RADIUS = 1.65;

const ADDITIVE = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
} as const;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────── Geometria ───────────────────────── */

function cardGeometry() {
  const { w, h, depth, radius: r } = CARD;
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = 0.025;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Trecho do perfil de um torno: de `a` a `b`, em (raio, altura). */
interface Seg {
  a: readonly [number, number];
  b: readonly [number, number];
  kind: number;
  level: number;
}

/**
 * Torno: gira cada trecho do perfil em volta do eixo y. Cada trecho tem os próprios vértices
 * (quinas vivas entre trechos). Normais para fora do perfil; atributos `aKind`, `aDist` (distância
 * desde o começo do trecho) e `aLevel`.
 */
function lathe(segs: readonly Seg[], n = 128) {
  const pos: number[] = [];
  const nor: number[] = [];
  const kind: number[] = [];
  const dist: number[] = [];
  const level: number[] = [];
  const index: number[] = [];
  for (const s of segs) {
    const tr = s.b[0] - s.a[0];
    const ty = s.b[1] - s.a[1];
    const len = Math.hypot(tr, ty);
    if (len < 1e-6) continue;
    const nr = -ty / len;
    const ny = tr / len;
    const start = pos.length / 3;
    const ends = [s.a, s.b];
    for (let e = 0; e < 2; e++) {
      const [r, y] = ends[e];
      for (let j = 0; j <= n; j++) {
        const phi = (j / n) * Math.PI * 2;
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);
        pos.push(r * sp, y, r * cp);
        nor.push(nr * sp, ny, nr * cp);
        kind.push(s.kind);
        dist.push(e * len);
        level.push(s.level);
      }
    }
    for (let j = 0; j < n; j++) {
      const a0 = start + j;
      const b0 = start + n + 1 + j;
      index.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  geo.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  geo.setAttribute('aLevel', new THREE.Float32BufferAttribute(level, 1));
  geo.setIndex(index);
  return geo;
}

/**
 * Perfil da base de LED, do eixo para fora: a lente (a matriz de LEDs), o anel aceso em volta e os
 * degraus, cada um com chanfro, fita de LED, lateral e o topo do degrau de baixo.
 */
function pedestalProfile() {
  const { chamfer: C, strip: S, edges, tops } = PROFILE;
  const segs: Seg[] = [];
  const strips: { r: number; y: number; level: number }[] = [];
  const seg = (a: readonly [number, number], b: readonly [number, number], kind: number, level: number) =>
    segs.push({ a, b, kind, level });
  seg([0, LENS_Y], [BASE.lens, LENS_Y], 0, 0);
  seg([BASE.lens, LENS_Y], [BASE.lens, BASE.top], 1, 0);
  seg([BASE.lens, BASE.top], [edges[0] - C, BASE.top], 1, 0);
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const top = tops[i];
    const bottom = i + 1 < tops.length ? tops[i + 1] : BASE.floor;
    seg([e - C, top], [e, top - C], 5, i);
    seg([e, top - C], [e, top - C - S], 3, i);
    strips.push({ r: e, y: top - C - S / 2, level: i });
    seg([e, top - C - S], [e, bottom], 4, i);
    if (i + 1 < edges.length) seg([e, bottom], [edges[i + 1] - C, bottom], 2, i + 1);
  }
  return { segs, strips };
}

interface HoloGrid {
  x0: number;
  y0: number;
  cell: number;
  cols: number;
  rows: number;
  cells: Uint8Array;
}

/**
 * Pontos do holograma: amostrados na superfície das 4 peças do símbolo oficial extrudado (a face
 * da frente com mais pontos), no espaço do holograma (largura `HOLO.width`, centrado, y para cima,
 * frente em +z). Também a grade de ocupação do símbolo visto de frente (o cursor está em cima?).
 */
function holoPoints(count: number, seed: number) {
  const rand = mulberry(seed);
  const pieces = buildPieces();
  const tri: number[] = [];
  const weight: number[] = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const piece of pieces) {
    const pos = piece.geometry.getAttribute('position');
    const idx = piece.geometry.getIndex();
    const total = idx ? idx.count : pos.count;
    for (let t = 0; t + 2 < total; t += 3) {
      for (let k = 0; k < 3; k++) {
        const i = idx ? idx.getX(t + k) : t + k;
        v[k].set(pos.getX(i) + piece.center.x, pos.getY(i) + piece.center.y, pos.getZ(i) - PIECE_HEIGHT / 2);
        minX = Math.min(minX, v[k].x);
        maxX = Math.max(maxX, v[k].x);
        minY = Math.min(minY, v[k].y);
        maxY = Math.max(maxY, v[k].y);
      }
      e1.subVectors(v[1], v[0]);
      e2.subVectors(v[2], v[0]);
      nrm.crossVectors(e1, e2);
      const len = nrm.length();
      if (len < 1e-9) continue;
      nrm.divideScalar(len);
      const face = nrm.z > 0.9 ? 1.5 : nrm.z < -0.9 ? 0.5 : 0.6;
      tri.push(v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z, nrm.x, nrm.y, nrm.z);
      weight.push((len / 2) * face);
    }
    piece.geometry.dispose();
  }

  const cum = new Float64Array(weight.length);
  let sum = 0;
  for (let i = 0; i < weight.length; i++) {
    sum += weight[i];
    cum[i] = sum;
  }
  const s = HOLO.width / (maxX - minX);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const depth = 1.3;

  const position = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const target = rand() * sum;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const o = lo * 12;
    let a = rand();
    let b = rand();
    if (a + b > 1) {
      a = 1 - a;
      b = 1 - b;
    }
    const c = 1 - a - b;
    const px = tri[o] * c + tri[o + 3] * a + tri[o + 6] * b;
    const py = tri[o + 1] * c + tri[o + 4] * a + tri[o + 7] * b;
    const pz = tri[o + 2] * c + tri[o + 5] * a + tri[o + 8] * b;
    // Um pouco para dentro da superfície: o símbolo ganha corpo.
    const inward = rand() * 0.014;
    position[i * 3] = (px - cx) * s - tri[o + 9] * inward;
    position[i * 3 + 1] = (py - cy) * s - tri[o + 10] * inward;
    position[i * 3 + 2] = pz * s * depth - tri[o + 11] * inward;
    rnd[i * 4] = rand();
    rnd[i * 4 + 1] = rand();
    rnd[i * 4 + 2] = rand();
    rnd[i * 4 + 3] = rand();
    // Esferas de tamanhos variados (algumas bem maiores), grandes o bastante para ler o volume.
    size[i] = rand() < 0.05 ? 0.075 + 0.025 * rand() : 0.04 + 0.025 * rand();
  }

  const half = ((maxY - minY) * s) / 2;
  const cols = 50;
  const cell = HOLO.width / (cols - 2);
  const x0 = -HOLO.width / 2 - cell;
  const y0 = -half - cell;
  const rows = Math.ceil((2 * half) / cell) + 2;
  const raw = new Uint8Array(cols * rows);
  for (let i = 0; i < count; i++) {
    const cc = Math.floor((position[i * 3] - x0) / cell);
    const rr = Math.floor((position[i * 3 + 1] - y0) / cell);
    if (cc >= 0 && rr >= 0 && cc < cols && rr < rows) raw[rr * cols + cc] = 1;
  }
  // Uma célula de folga em volta.
  const cells = new Uint8Array(cols * rows);
  for (let rr = 0; rr < rows; rr++) {
    for (let cc = 0; cc < cols; cc++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1 && !on; dx++) {
          const y = rr + dy;
          const x = cc + dx;
          if (x >= 0 && y >= 0 && x < cols && y < rows) on = raw[y * cols + x];
        }
      }
      cells[rr * cols + cc] = on;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const grid: HoloGrid = { x0, y0, cell, cols, rows, cells };
  return { geo, grid, span: [-half, half] as const };
}

const pickRay = new THREE.Ray();
const pickInv = new THREE.Matrix4();

/**
 * O ponto (px CSS do canvas) está em cima do símbolo? Cruza o raio do cursor com o plano do
 * holograma (z = 0 no espaço dele) e consulta a grade. Se estiver, `out` recebe o ponto (espaço do
 * holograma).
 */
function pick(
  px: number,
  py: number,
  size: { width: number; height: number },
  cam: THREE.Camera,
  obj: THREE.Object3D,
  grid: HoloGrid,
  out: THREE.Vector3,
) {
  pickRay.origin.setFromMatrixPosition(cam.matrixWorld);
  pickRay.direction
    .set((px / size.width) * 2 - 1, 1 - (py / size.height) * 2, 0.5)
    .unproject(cam)
    .sub(pickRay.origin)
    .normalize();
  pickInv.copy(obj.matrixWorld).invert();
  pickRay.applyMatrix4(pickInv);
  const dz = pickRay.direction.z;
  if (Math.abs(dz) < 1e-4) return false;
  const t = -pickRay.origin.z / dz;
  if (t <= 0) return false;
  const x = pickRay.origin.x + pickRay.direction.x * t;
  const y = pickRay.origin.y + pickRay.direction.y * t;
  const c = Math.floor((x - grid.x0) / grid.cell);
  const r = Math.floor((y - grid.y0) / grid.cell);
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows || !grid.cells[r * grid.cols + c]) return false;
  out.set(x, y, 0);
  return true;
}

/* ───────────────────────── Título ───────────────────────── */

const TITLE_W = 1024;
const TITLE_H = 512;

/**
 * Textura do título: o texto no canal R e um halo (o texto desfocado) no canal G. A fonte é a dos
 * títulos (`--font-family-display`, D-018), em caixa alta.
 */
function drawTitle(canvas: HTMLCanvasElement, text: string, family: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const layer = (glow: boolean) => {
    const c = document.createElement('canvas');
    c.width = TITLE_W;
    c.height = TITLE_H;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#000';
    g.fillRect(0, 0, TITLE_W, TITLE_H);
    let size = 220;
    g.font = `300 ${size}px ${family}`;
    const width = g.measureText(text).width;
    if (width > TITLE_W * 0.86) size *= (TITLE_W * 0.86) / width;
    g.font = `300 ${size}px ${family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    if (glow) {
      g.shadowColor = '#fff';
      g.shadowBlur = 36;
      g.lineWidth = 14;
      g.strokeStyle = '#fff';
      g.strokeText(text, TITLE_W / 2, TITLE_H / 2);
    }
    g.fillText(text, TITLE_W / 2, TITLE_H / 2);
    return g.getImageData(0, 0, TITLE_W, TITLE_H);
  };
  const sharp = layer(false);
  const halo = layer(true);
  if (!sharp || !halo) return;
  const out = ctx.createImageData(TITLE_W, TITLE_H);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = sharp.data[i];
    out.data[i + 1] = halo.data[i];
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

/* ───────────────────────── Cena ───────────────────────── */

function Scene({ projects, read, scroller, onLost }: PortfolioCanvasProps) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const n = projects.length;
  const narrow = useThree((s) => s.size.width < 700);

  const shared = useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uCutC: { value: new THREE.Vector4(1e5, 1, 1, 0) },
      uAll: { value: 0 },
      uTime: { value: 0 },
      /** A base acesa e o feixe ligado (0..1), na entrada. */
      uOn: { value: 0 },
      uLens: { value: BASE.lens },
      uBg: { value: color(HEX.bg) },
      uSilver: { value: color(HEX.silver) },
      uWhite: { value: color(HEX.white) },
      uAccent: { value: color(HEX.accent) },
      uBgDeep: { value: color(HEX.bgDeep) },
      // cutGlsl declara o corte A da entrada; aqui não é usado.
      uCut: { value: new THREE.Vector4(1e5, 1, 1, 0) },
    }),
    [],
  );

  const rt = useMemo(
    () =>
      // Meio float: a cena fica em RGB linear, e os azuis escuros em 8 bits fariam faixas.
      new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: true,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      }),
    [],
  );

  const background = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: backgroundVertex,
      fragmentShader: backgroundFragment,
      uniforms: {
        ...shared,
        uNodeCol: { value: color(HEX.silver) },
        uNodeAccent: { value: color(HEX.accent) },
        uGlow: { value: new THREE.Vector3(0.5, 0.35, 0) },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    return mesh;
  }, [shared]);

  // Base de LED, brilho das fitas, feixe, anel de luz e chão.
  const stage = useMemo(() => {
    const { segs, strips } = pedestalProfile();
    const geos: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const root = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      geos.push(geo);
      mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      root.add(mesh);
      return mesh;
    };

    add(
      lathe(segs),
      new THREE.ShaderMaterial({
        vertexShader: pedestalVertex,
        fragmentShader: pedestalFragment,
        uniforms: { ...shared, uHoloPos: { value: new THREE.Vector3(0, HOLO.y, 0) } },
      }),
    );

    add(
      lathe(
        strips.map(
          (s): Seg => ({
            a: [s.r + 0.004, s.y + LED_GLOW],
            b: [s.r + 0.004, s.y - LED_GLOW],
            kind: 0,
            level: s.level,
          }),
        ),
      ),
      new THREE.ShaderMaterial({
        vertexShader: pedestalVertex,
        fragmentShader: ledGlowFragment,
        uniforms: { ...shared, uHalfH: { value: LED_GLOW } },
        ...ADDITIVE,
      }),
    );

    const beamH = BEAM.top - LENS_Y;
    const beamGeo = new THREE.CylinderGeometry(BEAM.radius, BASE.lens - 0.02, beamH, 96, 1, true);
    beamGeo.translate(0, LENS_Y + beamH / 2, 0);
    add(
      beamGeo,
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { ...shared },
        side: THREE.DoubleSide,
        ...ADDITIVE,
      }),
    );

    for (const core of [1, 0]) {
      const geo = new THREE.TorusGeometry(HALO_RADIUS, core ? 0.009 : 0.07, core ? 6 : 16, 192);
      geo.rotateX(Math.PI / 2);
      geo.translate(0, BEAM.top, 0);
      add(
        geo,
        new THREE.ShaderMaterial({
          vertexShader: beamVertex,
          fragmentShader: haloFragment,
          uniforms: { ...shared, uCore: { value: core } },
          ...ADDITIVE,
        }),
      );
    }

    const floorGeo = new THREE.CircleGeometry(7, 128);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, BASE.floor + 0.002, 0);
    add(
      floorGeo,
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: floorFragment,
        uniforms: { ...shared, uOuter: { value: BASE.outer } },
        ...ADDITIVE,
      }),
    );

    return { root, geos, mats };
  }, [shared]);

  // Holograma do símbolo (D-026). Menos pontos em telas estreitas.
  const holo = useMemo(() => {
    const { geo, grid, span } = holoPoints(narrow ? 6500 : 10000, 26);
    const mat = new THREE.ShaderMaterial({
      vertexShader: holoVertex,
      fragmentShader: holoFragment,
      uniforms: {
        ...shared,
        uForm: { value: 0 },
        uReach: { value: -0.6 },
        uHit: { value: new THREE.Vector4() },
        uCenter: { value: new THREE.Vector3() },
        uGlitch: { value: 0 },
        uPxScale: { value: 1 },
        uBaseY: { value: LENS_Y - HOLO.y },
        uSpan: { value: new THREE.Vector2(span[0], span[1]) },
      },
    });
    const points = new THREE.Points(geo, mat);
    points.position.set(0, HOLO.y, 0);
    points.frustumCulled = false;
    return { points, mat, geo, grid };
  }, [shared, narrow]);

  const cards = useMemo(() => {
    const step = helixStep(n);
    const geo = cardGeometry();
    const titleGeo = new THREE.PlaneGeometry(CARD.w * 0.94, (CARD.w * 0.94 * TITLE_H) / TITLE_W);
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    const root = new THREE.Group();
    const list = projects.map((project, i) => {
      const angle = i * step;
      const group = new THREE.Group();
      group.rotation.y = angle;
      const glass = new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        uniforms: {
          ...shared,
          uScene: { value: rt.texture },
          uMedia: { value: blank as THREE.Texture },
          uMediaOn: { value: 0 },
          uCursor: { value: new THREE.Vector3() },
          uHalf: { value: new THREE.Vector2(CARD.w / 2, CARD.h / 2) },
          uCorner: { value: CARD.radius },
          uCurrent: { value: 0 },
          uDim: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(geo, glass);
      group.add(mesh);

      const canvas = document.createElement('canvas');
      canvas.width = TITLE_W;
      canvas.height = TITLE_H;
      const map = new THREE.CanvasTexture(canvas);
      map.anisotropy = 4;
      const titleMat = new THREE.ShaderMaterial({
        vertexShader: titleVertex,
        fragmentShader: titleFragment,
        uniforms: {
          ...shared,
          uMap: { value: map },
          uAspect: { value: TITLE_W / TITLE_H },
          uEdge: { value: 0 },
          uFade: { value: 1 },
          uHalo: { value: color(HEX.bgDeep) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const title = new THREE.Mesh(titleGeo, titleMat);
      title.position.z = CARD.depth / 2 + 0.02;
      group.add(title);
      root.add(group);
      return { project, angle, group, glass, titleMat, map, canvas };
    });
    return { root, list, geo, titleGeo, blank };
  }, [projects, n, shared, rt]);

  // Títulos: desenhados quando a fonte dos títulos estiver carregada.
  useEffect(() => {
    let alive = true;
    const family = getComputedStyle(document.body).getPropertyValue('--font-family-display').trim() || 'sans-serif';
    const draw = () => {
      if (!alive) return;
      for (const c of cards.list) {
        drawTitle(c.canvas, c.project.name.toUpperCase(), family);
        c.map.needsUpdate = true;
      }
      invalidate();
    };
    document.fonts
      .load(`300 200px ${family}`)
      .then(draw, draw)
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cards, invalidate]);

  // Cursor (px CSS do canvas, y para baixo), toques curtos (celular) e relógio de atividade.
  const input = useRef({
    x: 0,
    y: 0,
    on: 0,
    last: -1e9,
    down: null as null | { id: number; x: number; y: number; t: number },
    tap: null as null | { x: number; y: number },
  });
  useEffect(() => {
    const el = gl.domElement;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const move = (e: PointerEvent) => {
      const s = input.current;
      const p = local(e);
      s.x = p.x;
      s.y = p.y;
      s.on = e.pointerType === 'mouse' || e.pointerType === 'pen' ? 1 : 0;
      s.last = performance.now() / 1000;
      invalidate();
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const p = local(e);
      input.current.down = { id: e.pointerId, x: p.x, y: p.y, t: performance.now() / 1000 };
    };
    const up = (e: PointerEvent) => {
      const s = input.current;
      const d = s.down;
      s.down = null;
      if (!d || d.id !== e.pointerId) return;
      const p = local(e);
      // Toque curto e parado (não uma rolagem).
      if (Math.hypot(p.x - d.x, p.y - d.y) < 12 && performance.now() / 1000 - d.t < 0.5) {
        s.tap = p;
        s.last = performance.now() / 1000;
        invalidate();
      }
    };
    const cancel = () => {
      input.current.down = null;
    };
    const out = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      input.current.on = 0;
      invalidate();
    };
    const scrolled = () => {
      input.current.last = performance.now() / 1000;
      invalidate();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('mouseout', out);
    window.addEventListener('scroll', scrolled, { passive: true });
    const off = scroller.onFrame(scrolled);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('mouseout', out);
      window.removeEventListener('scroll', scrolled);
      off();
    };
  }, [gl, invalidate, scroller]);

  // Se o WebGL cair, a seção volta para a lista simples.
  useEffect(() => {
    const el = gl.domElement;
    const lost = () => onLost();
    el.addEventListener('webglcontextlost', lost);
    return () => el.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);

  // Cada recurso é liberado quando é trocado (o holograma muda com a largura) ou na desmontagem.
  useEffect(() => () => rt.dispose(), [rt]);
  useEffect(
    () => () => {
      background.geometry.dispose();
      (background.material as THREE.Material).dispose();
    },
    [background],
  );
  useEffect(
    () => () => {
      for (const g of stage.geos) g.dispose();
      for (const m of stage.mats) m.dispose();
    },
    [stage],
  );
  useEffect(
    () => () => {
      holo.geo.dispose();
      holo.mat.dispose();
    },
    [holo],
  );
  useEffect(
    () => () => {
      cards.geo.dispose();
      cards.titleGeo.dispose();
      cards.blank.dispose();
      for (const c of cards.list) {
        c.glass.dispose();
        c.titleMat.dispose();
        c.map.dispose();
      }
    },
    [cards],
  );

  const run = useRef({
    drawn: false,
    introStart: -1,
    last: -1,
    /** O quadro anterior pediu outro (animação contínua). */
    chained: false,
    pose: null as null | { angle: number; y: number; dist: number },
    cursor: new THREE.Vector3(),
    tilt: new THREE.Vector2(),
    toCam: new THREE.Vector3(),
    proj: new THREE.Vector3(),
    holoYaw: 0,
    prevAngle: 0,
    glitch: 0,
    crumble: 0,
    hitW: 0,
    touchUntil: 0,
    hit: new THREE.Vector3(),
    center: new THREE.Vector3(),
  });

  useFrame((state) => {
    const { camera, size } = state;
    const r = run.current;
    const inp = input.current;
    const f = read();
    const now = performance.now() / 1000;
    // Quadros sob demanda: o primeiro depois de uma pausa conta como um quadro normal; numa animação
    // contínua, vale o tempo real (no máximo 1/15 s, para não saltar num aparelho lento).
    const gap = now - r.last;
    const dt = r.last < 0 || (!r.chained && gap > 0.1) ? 1 / 60 : Math.min(Math.max(gap, 1e-3), 1 / 15);
    r.last = now;
    r.chained = false;

    if (!f || !f.cut.on) {
      if (r.drawn) {
        gl.setRenderTarget(null);
        gl.clear();
        r.drawn = false;
      }
      // Na próxima entrada, tudo de novo: cards crescendo, base acendendo, holograma se formando.
      r.introStart = -1;
      r.pose = null;
      r.crumble = 0;
      r.hitW = 0;
      r.glitch = 0;
      r.touchUntil = 0;
      inp.tap = null;
      return;
    }
    let again = false;

    // ── Medidas e corte
    const dpr = gl.getPixelRatio();
    shared.uRes.value.set(size.width, size.height);
    shared.uCutC.value.set(f.cut.c, f.cut.band, f.cut.cell, 1);
    const rw = Math.max(1, Math.round((size.width * dpr) / 2));
    const rh = Math.max(1, Math.round((size.height * dpr) / 2));
    if (rt.width !== rw || rt.height !== rh) rt.setSize(rw, rh);
    const aspect = size.width / Math.max(1, size.height);
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    const fr = framing(aspect);

    // ── Câmera: persegue a pose da rolagem (fator por quadro corrigido pela taxa de quadros).
    const x = helixPosition(f.q, n);
    const target = cameraPose(x, n, aspect);
    if (!r.pose) {
      r.pose = { ...target };
      r.holoYaw = target.angle;
      r.prevAngle = target.angle;
    }
    const k = follow(FOLLOW, dt);
    const p = r.pose;
    p.angle += (target.angle - p.angle) * k;
    p.y += (target.y - p.y) * k;
    p.dist += (target.dist - p.dist) * k;
    if (
      Math.abs(target.angle - p.angle) > 1e-4 ||
      Math.abs(target.y - p.y) > 1e-4 ||
      Math.abs(target.dist - p.dist) > 1e-4
    ) {
      again = true;
    }

    // Cursor: a câmera desvia um pouco para o lado dele; o vidro acende perto dele.
    const nx = inp.on ? (inp.x / size.width) * 2 - 1 : 0;
    const ny = inp.on ? (inp.y / size.height) * 2 - 1 : 0;
    const kc = follow(0.08, dt);
    r.tilt.x += (nx - r.tilt.x) * kc;
    r.tilt.y += (ny - r.tilt.y) * kc;
    if (r.cursor.z === 0 && inp.on) r.cursor.set(inp.x, inp.y, 0);
    r.cursor.x += (inp.x - r.cursor.x) * Math.min(1, kc * 3);
    r.cursor.y += (inp.y - r.cursor.y) * Math.min(1, kc * 3);
    r.cursor.z += (inp.on - r.cursor.z) * kc;
    if (Math.abs(nx - r.tilt.x) + Math.abs(ny - r.tilt.y) > 1e-3 || Math.abs(inp.on - r.cursor.z) > 1e-3) {
      again = true;
    }

    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }
    cam.position.set(
      p.dist * Math.sin(p.angle) + Math.cos(p.angle) * r.tilt.x * 0.18,
      p.y - r.tilt.y * 0.12,
      p.dist * Math.cos(p.angle) - Math.sin(p.angle) * r.tilt.x * 0.18,
    );
    cam.rotation.set(-fr.pitch + r.tilt.y * 0.025, p.angle - r.tilt.x * 0.035, 0, 'YXZ');
    cam.updateMatrixWorld();

    // ── Relógio de atividade (SC 2.2.2): só anda enquanto o usuário rola ou mexe o cursor.
    const idle = now - inp.last;
    const act = 1 - smoothstep(ACTIVITY.hold, ACTIVITY.hold + ACTIVITY.fade, idle);
    shared.uTime.value += dt * act;
    if (act > 0) again = true;

    // ── Entrada: a base acende e o holograma se forma da lente para cima.
    if (r.introStart < 0) r.introStart = now;
    const since = now - r.introStart;
    const form = clamp01((since - FORM.delay) / FORM.dur);
    if (form < 1) again = true;
    shared.uOn.value = smoothstep(0, 0.3, form);

    // ── Holograma: de frente para a câmera (com atraso), inclinando para o cursor.
    r.holoYaw += (p.angle - r.holoYaw) * follow(HOLO_LAG.k, dt);
    r.holoYaw = p.angle - Math.max(-HOLO_LAG.max, Math.min(HOLO_LAG.max, p.angle - r.holoYaw));
    if (Math.abs(p.angle - r.holoYaw) > 1e-4) again = true;
    const pts = holo.points;
    pts.rotation.set(r.tilt.y * 0.12, r.holoYaw + r.tilt.x * 0.3, 0, 'YXZ');
    pts.updateMatrixWorld();

    // Esfarelar: com o cursor em cima do símbolo (ou depois de um toque nele).
    const hu = holo.mat.uniforms;
    const formed = form > 0.8;
    const hover = formed && inp.on === 1 && pick(inp.x, inp.y, size, cam, pts, holo.grid, r.hit);
    let tapped = false;
    if (inp.tap) {
      if (formed && pick(inp.tap.x, inp.tap.y, size, cam, pts, holo.grid, r.hit)) {
        tapped = true;
        r.touchUntil = now + CRUMBLE.touch;
      }
      inp.tap = null;
    }
    const want = hover || now < r.touchUntil;
    if ((hover || tapped) && r.crumble <= 0) r.center.copy(r.hit);
    else if (hover || tapped) r.center.lerp(r.hit, follow(0.03, dt));
    r.crumble = clamp01(r.crumble + (want ? dt / CRUMBLE.up : -dt / CRUMBLE.down));
    if (want || r.crumble > 0) again = true;
    r.hitW += ((hover ? 1 : 0) - r.hitW) * follow(0.1, dt);
    if (r.hitW < 1e-3) r.hitW = 0;
    if (r.hitW > 0) again = true;
    const ce = r.crumble * r.crumble * (3 - 2 * r.crumble);
    hu.uReach.value = -0.6 + 4.6 * ce;
    hu.uCenter.value.copy(r.center);
    hu.uHit.value.set(r.hit.x, r.hit.y, 0, r.hitW);
    hu.uForm.value = form;

    // Fatias "/" com a câmera girando rápido (sobe e desce suave: nada pisca).
    const speed = Math.abs(p.angle - r.prevAngle) / dt;
    r.prevAngle = p.angle;
    r.glitch += (smoothstep(0.8, 3, speed) - r.glitch) * follow(0.12, dt);
    if (r.glitch < 1e-3) r.glitch = 0;
    else again = true;
    hu.uGlitch.value = r.glitch;

    // ── Cards: entrada, lugar e escala da tela, ângulo de visão
    const toCam = r.toCam;
    for (let i = 0; i < cards.list.length; i++) {
      const c = cards.list[i];
      const t = clamp01((since - INTRO.stagger * i) / INTRO.dur);
      if (t < 1) again = true;
      c.group.position.set(RADIUS * Math.sin(c.angle), fr.cardY, RADIUS * Math.cos(c.angle));
      toCam.copy(cam.position).sub(c.group.position).normalize();
      const across = toCam.x * Math.cos(c.angle) - toCam.z * Math.sin(c.angle);
      const facing = toCam.x * Math.sin(c.angle) + toCam.z * Math.cos(c.angle);
      // Indo para trás do holograma, o card encolhe até sumir (não fica atrás do símbolo).
      const away = 1 - smoothstep(-0.15, -0.8, facing);
      c.group.scale.setScalar(fr.scale * Math.max(1e-3, easeOutQuint(t) * away));
      c.group.visible = away > 1e-3;
      c.titleMat.uniforms.uEdge.value = smoothstep(0.08, 0.6, Math.abs(across));
      c.titleMat.uniforms.uFade.value = smoothstep(0.02, 0.35, facing) * easeOutQuint(clamp01(t * 1.4 - 0.3));
      c.glass.uniforms.uCurrent.value = 1 - smoothstep(0, 0.5, Math.abs(x - i));
      // Do outro lado da órbita (atrás do holograma), o card fica escuro.
      c.glass.uniforms.uDim.value = 1 - smoothstep(-0.6, 0.1, facing);
      c.glass.uniforms.uCursor.value.copy(r.cursor);
    }

    // Luz do holograma no fundo: onde o centro dele cai na tela.
    const hp = r.proj.set(0, HOLO.y, 0).project(cam);
    (background.material as THREE.ShaderMaterial).uniforms.uGlow.value.set(
      hp.x * 0.5 + 0.5,
      0.5 - hp.y * 0.5,
      shared.uOn.value,
    );

    // ── Passe 1: tudo menos os cards, em meia resolução, na textura da refração.
    cards.root.visible = false;
    shared.uAll.value = 1;
    shared.uDpr.value = rw / Math.max(1, size.width);
    hu.uPxScale.value = rh / (2 * tanHalf);
    gl.setRenderTarget(rt);
    gl.render(state.scene, cam);
    // ── Passe 2: a cena inteira, com o corte.
    cards.root.visible = true;
    shared.uAll.value = f.done ? 1 : 0;
    shared.uDpr.value = dpr;
    hu.uPxScale.value = (size.height * dpr) / (2 * tanHalf);
    gl.setRenderTarget(null);
    gl.render(state.scene, cam);
    r.drawn = true;

    if (again) {
      r.chained = true;
      invalidate();
    }
  }, 1);

  return (
    <>
      <primitive object={background} />
      <primitive object={stage.root} />
      <primitive object={holo.points} />
      <primitive object={cards.root} />
    </>
  );
}

export default function PortfolioCanvas(props: PortfolioCanvasProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop="demand"
      resize={{ scroll: false }}
      camera={{ fov: FOV, near: 0.1, far: 80, position: [0, 0, 10] }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene {...props} />
    </Canvas>
  );
}
