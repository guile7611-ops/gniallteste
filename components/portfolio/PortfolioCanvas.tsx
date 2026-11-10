'use client';

/**
 * Cena do portfólio (D-024): cards de vidro grosso numa espiral em volta de uma coluna de nós. A
 * rolagem gira e desce a câmera de um card para o próximo (`helix.ts`).
 *
 * - Canvas próprio, com alfa: do lado de antes do corte C fica transparente (aparecem os detalhes
 *   do Sobre, em HTML); a borda de nós é desenhada aqui.
 * - Só desenha quando algo muda: rolagem, cursor, entrada dos cards, câmera chegando ao lugar e o
 *   relógio de atividade da coluna (que para cerca de 2 s depois do último movimento do usuário,
 *   SC 2.2.2).
 * - Cada quadro desenha a cena duas vezes: fundo e coluna em meia resolução (o que o vidro
 *   refrata) e depois a cena inteira.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SmoothScroll } from '../entry/smoothScroll';
import { sobreLimit, type Cut } from '../entry/transition';
import { CARD, FOV, RADIUS, STEP, Y_STEP, cameraPose, cardScale, clamp01, helixPosition } from './helix';
import type { Project } from './projects';
import {
  backgroundFragment,
  backgroundVertex,
  columnFragment,
  columnVertex,
  detailFragment,
  detailVertex,
  glassFragment,
  glassVertex,
  TITLE_MAX_LETTERS,
  titleFragment,
  titleVertex,
} from './shaders';

/** Estado da rolagem do portfólio num quadro (px CSS do trilho fixo, o mesmo tamanho do canvas). */
export interface PortfolioFrame {
  /** Corte C (D-024). */
  cut: Cut;
  /** O corte já passou pela tela toda. */
  done: boolean;
  /** Progresso da câmera pela espiral (0..1). */
  q: number;
}

/**
 * Projeto aberto (D-049), dividido com a seção: a seção escolhe o projeto e o alvo (abrir ou
 * fechar); o canvas anda o progresso `d` até o alvo e avisa quando chega (`onSettled`).
 */
export interface PortfolioDetail {
  /** Projeto aberto (ou abrindo, ou fechando); -1 sem projeto aberto. */
  index: number;
  /** 1 para abrir, 0 para fechar. */
  target: 0 | 1;
  /** Progresso da passagem (0..1), escrito pelo canvas. */
  d: number;
  /** Pede um quadro (o canvas só desenha sob demanda). */
  wake: () => void;
  /** Caixas do texto, do aviso e do botão na tela (px CSS: x0, y0, x1, y1), para o teto de luminância. */
  text: [number, number, number, number];
  hint: [number, number, number, number];
  side: [number, number, number, number];
}

interface PortfolioCanvasProps {
  projects: readonly Project[];
  detail: PortfolioDetail;
  /** Clique no card da vez (só os que têm vídeo). */
  onPick: (index: number) => void;
  /** A passagem chegou ao alvo. */
  onSettled: (target: 0 | 1) => void;
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

/** Entrada dos cards: cada um cresce do zero em 1,2 s, 0,2 s depois do anterior. */
const INTRO = { dur: 1.2, stagger: 0.2 } as const;
/** Relógio de atividade da coluna: anda até 1,2 s depois do último movimento e para em 0,8 s. */
const ACTIVITY = { hold: 1.2, fade: 0.8 } as const;
/** Câmera: fração da distância que falta, por quadro a 60 quadros/s (a do Active Theory). */
/** Câmera não segue o cursor: a paralaxe fica só na entrada (D-046). */
const CAM_TILT = 0;
const FOLLOW = 0.2;
/**
 * Projeto aberto (D-049), nos tempos do Active Theory: abrir leva 2,2 s (a câmera mergulha no card
 * até a metade, o vídeo vira o painel e o túnel cresce em volta) e fechar, 1,1 s, de volta pelo
 * mesmo caminho.
 */
const DETAIL = { open: 2.2, close: 1.1 } as const;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Proporção do painel: a dos vídeos (16:9), para o vídeo aparecer inteiro, sem corte. */
const PANEL_ASPECT = 16 / 9;
/** Lugar final do painel do vídeo, px CSS com y para baixo: x0, y0, x1, y1. Até 84% da largura
 * (90% no celular) e 56% da altura, na proporção do vídeo. Os mesmos números estão no CSS do texto. */
function panelRect(w: number, h: number, out: THREE.Vector4) {
  const ph = Math.min(h * 0.56, (w * (w < 700 ? 0.9 : 0.84)) / PANEL_ASPECT);
  const pw = ph * PANEL_ASPECT;
  const cy = h * 0.5;
  return out.set((w - pw) / 2, cy - ph / 2, (w + pw) / 2, cy + ph / 2);
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

function columnGeometry(count: number, seed: number) {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pos = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const kind = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    rnd[i * 4] = rand();
    rnd[i * 4 + 1] = rand();
    rnd[i * 4 + 2] = rand();
    rnd[i * 4 + 3] = rand();
    const k = rand();
    kind[i] = k < 0.72 ? 0 : k < 0.84 ? 1 : 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  return geo;
}

/* ───────────────────────── Título ───────────────────────── */

const TITLE_W = 1024;
const TITLE_H = 256;
/** Largura do plano do título, em fração da largura do card (o texto fica no meio dele). */
const TITLE_PLANE = 0.9;
/**
 * Tamanho da fonte do título, em unidades do mundo: a altura das maiúsculas fica perto de 12% da
 * altura do card, e um nome curto ocupa menos da metade da largura (a proporção do Active Theory).
 */
const TITLE_EM = 0.24;
/** Espaço entre letras, em fração do tamanho da fonte. */
const TITLE_TRACKING = 0.16;
/** O título fica solto na frente do vidro (visto de lado, se desloca em relação ao card). */
const TITLE_LIFT = 0.2;

/**
 * Textura do título: o texto no canal R e um halo (o texto desfocado) no canal G. A fonte é a dos
 * títulos (`--font-family-display`, D-018), em caixa alta, letra por letra com espaço entre elas.
 * Devolve as bordas da célula de cada letra (uv), para o efeito do `titleFragment`.
 */
function drawTitle(canvas: HTMLCanvasElement, text: string, family: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const chars = Array.from(text);
  const planeW = CARD.w * TITLE_PLANE;
  let size = (TITLE_EM / planeW) * TITLE_W;
  ctx.font = `400 ${size}px ${family}`;
  const span = (s: number) =>
    chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + s * TITLE_TRACKING * (chars.length - 1);
  const fit = span(size);
  if (fit > TITLE_W * 0.92) size *= (TITLE_W * 0.92) / fit;
  ctx.font = `400 ${size}px ${family}`;
  const advances = chars.map((ch) => ctx.measureText(ch).width);
  const track = size * TITLE_TRACKING;
  const total = advances.reduce((sum, w) => sum + w, 0) + track * (chars.length - 1);
  const cap = ctx.measureText('H').actualBoundingBoxAscent || size * 0.7;
  const baseline = TITLE_H / 2 + cap / 2;
  const startX = (TITLE_W - total) / 2;

  // Bordas das células: cada letra com metade do espaço de cada lado. Passando do máximo, o resto
  // fica na última célula.
  const cuts = [startX - track / 2];
  let x = startX;
  advances.forEach((w, i) => {
    x += w + track;
    if (i < TITLE_MAX_LETTERS - 1 || i === advances.length - 1) cuts.push(x - track / 2);
    else cuts[cuts.length - 1] = x - track / 2;
  });

  const layer = (glow: boolean) => {
    const c = document.createElement('canvas');
    c.width = TITLE_W;
    c.height = TITLE_H;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#000';
    g.fillRect(0, 0, TITLE_W, TITLE_H);
    g.font = `400 ${size}px ${family}`;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff';
    if (glow) {
      g.shadowColor = '#fff';
      g.shadowBlur = size * 0.16;
      g.lineWidth = size * 0.064;
      g.strokeStyle = '#fff';
    }
    let px = startX;
    chars.forEach((ch, i) => {
      if (glow) g.strokeText(ch, px, baseline);
      g.fillText(ch, px, baseline);
      px += advances[i] + track;
    });
    return g.getImageData(0, 0, TITLE_W, TITLE_H);
  };
  const sharp = layer(false);
  const halo = layer(true);
  if (!sharp || !halo) return [];
  const out = ctx.createImageData(TITLE_W, TITLE_H);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = sharp.data[i];
    out.data[i + 1] = halo.data[i];
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return cuts.map((c) => c / TITLE_W);
}

/* ───────────────────────── Cena ───────────────────────── */

function Scene({ projects, detail, onPick, onSettled, read, scroller, onLost }: PortfolioCanvasProps) {
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
        depthBuffer: false,
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
        uBg: { value: color(HEX.bg) },
        uNodeCol: { value: color(HEX.silver) },
        uNodeAccent: { value: color(HEX.accent) },
        uAxisX: { value: 0.5 },
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

  const column = useMemo(() => {
    const geo = columnGeometry(narrow ? 12000 : 22000, 24);
    const mat = new THREE.ShaderMaterial({
      vertexShader: columnVertex,
      fragmentShader: columnFragment,
      uniforms: {
        ...shared,
        uSpin: { value: 0 },
        uTop: { value: 4.5 },
        uBottom: { value: -4.5 },
        uPx: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }, [shared, narrow]);

  const cards = useMemo(() => {
    const geo = cardGeometry();
    const titleGeo = new THREE.PlaneGeometry(CARD.w * TITLE_PLANE, (CARD.w * TITLE_PLANE * TITLE_H) / TITLE_W);
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    const root = new THREE.Group();
    const list = projects.map((project, i) => {
      const angle = i * STEP;
      const group = new THREE.Group();
      group.position.set(RADIUS * Math.sin(angle), -i * Y_STEP, RADIUS * Math.cos(angle));
      group.rotation.y = angle;
      const glass = new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        uniforms: {
          ...shared,
          uScene: { value: rt.texture },
          uMedia: { value: blank as THREE.Texture },
          uMediaOn: { value: 0 },
          uMediaFit: { value: new THREE.Vector2(1, 1) },
          uCursor: { value: new THREE.Vector3() },
          uHalf: { value: new THREE.Vector2(CARD.w / 2, CARD.h / 2) },
          uCorner: { value: CARD.radius },
          uCurrent: { value: 0 },
          uLift: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(geo, glass);
      // Vidro por cima da coluna: nenhuma partícula passa na frente do card (D-043).
      if (project.video?.length) {
        glass.depthTest = false;
        // Transparente só para entrar na fila depois da coluna (a saída continua opaca).
        glass.transparent = true;
        mesh.renderOrder = 2;
      }
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
          uCuts: { value: new Float32Array(TITLE_MAX_LETTERS + 1) },
          uCount: { value: 0 },
          uSeed: { value: i * 17.31 },
          uEdge: { value: 0 },
          uSide: { value: 0 },
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
      title.position.z = CARD.depth / 2 + TITLE_LIFT;
      title.renderOrder = 3;
      group.add(title);
      root.add(group);
      // Linha pequena acima do título (D-043), em Plex Sans, translúcida como se estivesse no vidro.
      let tag: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; map: THREE.CanvasTexture; canvas: HTMLCanvasElement } | null = null;
      if (project.tag) {
        const tc = document.createElement('canvas');
        tc.width = 1024;
        tc.height = 96;
        const tmap = new THREE.CanvasTexture(tc);
        tmap.colorSpace = THREE.SRGBColorSpace;
        tmap.anisotropy = 4;
        const tmat = new THREE.MeshBasicMaterial({ map: tmap, transparent: true, depthWrite: false, depthTest: false });
        const tw = CARD.w * TITLE_PLANE;
        const tmesh = new THREE.Mesh(new THREE.PlaneGeometry(tw, (tw * 96) / 1024), tmat);
        tmesh.position.set(0, 0.25, CARD.depth / 2 + TITLE_LIFT);
        tmesh.renderOrder = 3;
        group.add(tmesh);
        tag = { mesh: tmesh, mat: tmat, map: tmap, canvas: tc };
      }
      return { project, angle, group, glass, titleMat, map, canvas, tag };
    });
    return { root, list, geo, titleGeo, blank };
  }, [projects, n, shared, rt]);

  // Projeto aberto (D-049): o painel do vídeo e o túnel, em tela cheia, por cima de tudo.
  const overlay = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: detailVertex,
      fragmentShader: detailFragment,
      uniforms: {
        ...shared,
        uMedia: { value: cards.blank as THREE.Texture },
        uMediaOn: { value: 0 },
        uFit: { value: new THREE.Vector2(1, 1) },
        uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uText: { value: new THREE.Vector4() },
        uHint: { value: new THREE.Vector4() },
        uSide: { value: new THREE.Vector4() },
        uLod: { value: 10 },
        uLook: { value: new THREE.Vector2() },
        uPanel: { value: 0 },
        uTunnel: { value: 0 },
        uBg: { value: color(HEX.bg) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10;
    mesh.visible = false;
    return mesh;
  }, [shared, cards]);
  useEffect(
    () => () => {
      overlay.geometry.dispose();
      (overlay.material as THREE.Material).dispose();
    },
    [overlay],
  );
  // Vídeos por card (para o painel do projeto aberto).
  const videos = useRef<({ video: HTMLVideoElement; tex: THREE.VideoTexture } | null)[]>([]);
  // Retângulo do card da vez na tela (px CSS), para o clique.
  const hit = useRef<{ i: number; x0: number; y0: number; x1: number; y1: number; lim: number } | null>(null);

  // A seção pede quadros pelo `wake`.
  useEffect(() => {
    detail.wake = invalidate;
  }, [detail, invalidate]);

  // Clique no card da vez (com vídeo): abre o projeto. Cursor de mão em cima dele.
  useEffect(() => {
    const el = gl.domElement;
    const inside = (e: MouseEvent) => {
      const h = hit.current;
      if (!h || detail.index >= 0) return -1;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      return x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1 && x + y > h.lim ? h.i : -1;
    };
    const blocked = (e: Event) =>
      e.target instanceof Element && e.target.closest('a, button, input, select, textarea, [role="dialog"]') !== null;
    let pointing = false;
    const move = (e: PointerEvent) => {
      const on = !blocked(e) && inside(e) >= 0;
      if (on !== pointing) {
        pointing = on;
        document.body.style.cursor = on ? 'pointer' : '';
      }
    };
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || blocked(e)) return;
      const i = inside(e);
      if (i >= 0) {
        pointing = false;
        document.body.style.cursor = '';
        onPick(i);
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('click', click);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('click', click);
      if (pointing) document.body.style.cursor = '';
    };
  }, [gl, detail, onPick]);

  // Títulos: desenhados quando a fonte dos títulos estiver carregada.
  useEffect(() => {
    let alive = true;
    const css = getComputedStyle(document.body);
    const family = css.getPropertyValue('--font-family-display').trim() || 'sans-serif';
    const tagFamily = css.getPropertyValue('--font-family-brand').trim() || 'sans-serif';
    const draw = () => {
      if (!alive) return;
      for (const c of cards.list) {
        const cuts = drawTitle(c.canvas, c.project.name.toUpperCase(), family);
        const u = c.titleMat.uniforms;
        (u.uCuts.value as Float32Array).fill(0).set(cuts.slice(0, TITLE_MAX_LETTERS + 1));
        u.uCount.value = Math.max(0, Math.min(TITLE_MAX_LETTERS, cuts.length - 1));
        c.map.needsUpdate = true;
        if (c.tag && c.project.tag) {
          const g = c.tag.canvas.getContext('2d');
          if (g) {
            g.clearRect(0, 0, 1024, 96);
            g.font = `400 40px ${tagFamily}`;
            g.letterSpacing = '12px';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = '#fff';
            g.fillText(c.project.tag.toUpperCase(), 512, 48);
            c.tag.map.needsUpdate = true;
          }
        }
      }
      invalidate();
    };
    document.fonts
      .load(`400 200px ${family}`)
      .then(draw, draw)
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cards, invalidate]);

  // Cursor (px CSS do canvas, y para baixo) e relógio de atividade.
  const input = useRef({ x: 0, y: 0, on: 0, last: -1e9, nx: 0, ny: 0 });
  // Na tela? A coluna e o vidro se movem sozinhos só enquanto o portfólio aparece (D-042).
  const onScreen = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting;
      if (e.isIntersecting) invalidate();
    });
    io.observe(gl.domElement);
    return () => io.disconnect();
  }, [gl, invalidate]);
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const s = input.current;
      s.x = e.clientX - r.left;
      s.y = e.clientY - r.top;
      s.on = e.pointerType === 'mouse' || e.pointerType === 'pen' ? 1 : 0;
      s.last = performance.now() / 1000;
      invalidate();
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
    window.addEventListener('mouseout', out);
    window.addEventListener('scroll', scrolled, { passive: true });
    const off = scroller.onFrame(scrolled);
    return () => {
      window.removeEventListener('pointermove', move);
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

  // Cada recurso é liberado quando é trocado (a coluna muda com a largura) ou na desmontagem.
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
      column.geometry.dispose();
      (column.material as THREE.Material).dispose();
    },
    [column],
  );
  // Vídeo dos cards (D-043): sem som, em loop, só tocando enquanto o portfólio está na tela.
  useEffect(() => {
    const made: { video: HTMLVideoElement; tex: THREE.VideoTexture }[] = [];
    videos.current = cards.list.map(() => null);
    for (const [ci, c] of cards.list.entries()) {
      const srcs = c.project.video;
      if (!srcs?.length) continue;
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      for (const src of srcs) {
        const s = document.createElement('source');
        s.src = src;
        s.type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
        video.appendChild(s);
      }
      const tex = new THREE.VideoTexture(video);
      tex.colorSpace = THREE.SRGBColorSpace;
      // Mipmaps: o projeto aberto (D-049) reflete só a cor do vídeo, tirada dos níveis baixos.
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      const u = c.glass.uniforms;
      video.addEventListener('loadeddata', () => {
        // Cobre o card sem distorcer: corta o que sobra do vídeo.
        const va = video.videoWidth / video.videoHeight;
        const ca = CARD.w / CARD.h;
        (u.uMediaFit.value as THREE.Vector2).set(va > ca ? ca / va : 1, va > ca ? 1 : va / ca);
        u.uMedia.value = tex;
        u.uMediaOn.value = 1;
        invalidate();
      });
      made.push({ video, tex });
      videos.current[ci] = { video, tex };
    }
    const io = new IntersectionObserver(([e]) => {
      for (const m of made) {
        if (e.isIntersecting) m.video.play().catch(() => undefined);
        else m.video.pause();
      }
    });
    io.observe(gl.domElement);
    return () => {
      io.disconnect();
      videos.current = [];
      for (const m of made) {
        m.video.pause();
        m.video.removeAttribute('src');
        m.video.load();
        m.tex.dispose();
      }
    };
  }, [cards, gl, invalidate]);

  useEffect(
    () => () => {
      cards.geo.dispose();
      cards.titleGeo.dispose();
      cards.blank.dispose();
      for (const c of cards.list) {
        c.glass.dispose();
        c.titleMat.dispose();
        c.map.dispose();
        if (c.tag) {
          c.tag.mesh.geometry.dispose();
          c.tag.mat.dispose();
          c.tag.map.dispose();
        }
      }
    },
    [cards],
  );

  const run = useRef({
    drawn: false,
    introStart: -1,
    last: -1,
    pose: null as null | { angle: number; y: number; dist: number },
    cursor: new THREE.Vector3(),
    tilt: new THREE.Vector2(),
    toCam: new THREE.Vector3(),
    axis: new THREE.Vector3(),
    corner: new THREE.Vector3(),
    live: new THREE.Vector4(),
    final: new THREE.Vector4(),
    /** Água do projeto aberto (D-049): energia das ondas, fase e o último ponto do cursor. */
  });

  useFrame((state) => {
    const { camera, size } = state;
    const r = run.current;
    const f = read();
    const now = performance.now() / 1000;
    // Quadros sob demanda: depois de uma pausa, o primeiro quadro conta como um quadro normal.
    const gap = now - r.last;
    const dt = r.last < 0 || gap > 0.1 ? 1 / 60 : Math.min(Math.max(gap, 0), 1 / 15);
    r.last = now;

    if (!f || !f.cut.on) {
      if (r.drawn) {
        gl.setRenderTarget(null);
        gl.clear();
        r.drawn = false;
      }
      r.introStart = -1;
      r.pose = null;
      return;
    }
    let again = false;

    // ── Medidas e corte
    const dpr = gl.getPixelRatio();
    shared.uRes.value.set(size.width, size.height);
    shared.uDpr.value = dpr;
    shared.uCutC.value.set(f.cut.c, f.cut.band, f.cut.cell, 1 + ((performance.now() / 1000) % 600)); // w: tempo da falha (D-033)
    const rw = Math.max(1, Math.round((size.width * dpr) / 2));
    const rh = Math.max(1, Math.round((size.height * dpr) / 2));
    if (rt.width !== rw || rt.height !== rh) rt.setSize(rw, rh);
    const aspect = size.width / Math.max(1, size.height);

    // ── Câmera: persegue a pose da rolagem (fator por quadro corrigido pela taxa de quadros).
    const x = helixPosition(f.q, n);
    const target = cameraPose(x, n, aspect);
    if (!r.pose) r.pose = { ...target };
    const k = 1 - Math.pow(1 - FOLLOW, dt * 60);
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

    // ── Projeto aberto (D-049): o progresso anda até o alvo.
    const det = detail;
    const open = det.index >= 0 ? cards.list[det.index] : null;
    let settled = false;
    if (open && det.d !== det.target) {
      det.d = clamp01(det.d + (det.target ? dt / DETAIL.open : -dt / DETAIL.close));
      if (det.d === det.target) settled = true;
      else again = true;
    }
    const o = open ? det.d : 0;
    // Câmera: mergulha no card até ele cobrir a tela (um pouco além da borda).
    const dolly = easeInOutCubic(clamp01(o / 0.5));
    let camAngle = p.angle;
    let camY = p.y;
    let camDist = p.dist;
    if (open && dolly > 0) {
      const sc = cardScale(aspect);
      const tanHalf = Math.tan((FOV * Math.PI) / 360);
      const fit = Math.min((CARD.h * sc) / (2 * tanHalf), (CARD.w * sc) / (2 * tanHalf * aspect)) * 0.82;
      camAngle = lerp(p.angle, open.angle, dolly);
      camY = lerp(p.y, open.group.position.y, dolly);
      camDist = lerp(p.dist, RADIUS + (CARD.depth * sc) / 2 + fit, dolly);
    }

    // Cursor: a câmera desvia um pouco para o lado dele; o vidro acende perto dele.
    const inp = input.current;
    const nx = inp.on ? (inp.x / size.width) * 2 - 1 : 0;
    const ny = inp.on ? (inp.y / size.height) * 2 - 1 : 0;
    const kc = 1 - Math.pow(1 - 0.08, dt * 60);
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
    const yaw = camAngle - r.tilt.x * CAM_TILT * 0.035;
    cam.position.set(
      camDist * Math.sin(camAngle) + Math.cos(camAngle) * r.tilt.x * CAM_TILT * 0.18,
      camY - r.tilt.y * CAM_TILT * 0.12,
      camDist * Math.cos(camAngle) - Math.sin(camAngle) * r.tilt.x * CAM_TILT * 0.18,
    );
    cam.rotation.set(r.tilt.y * CAM_TILT * 0.025, yaw, 0, 'YXZ');
    cam.updateMatrixWorld();

    // ── Relógio da coluna e do vidro: anda sozinho enquanto o portfólio está na tela (D-042,
    // exceção ao SC 2.2.2); fora dela, para como antes, junto com a atividade do usuário.
    const idle = now - inp.last;
    const act = onScreen.current ? 1 : 1 - smoothstep(ACTIVITY.hold, ACTIVITY.hold + ACTIVITY.fade, idle);
    shared.uTime.value += dt * act;
    if (act > 0) again = true;

    // ── Coluna de nós
    const cu = (column.material as THREE.ShaderMaterial).uniforms;
    cu.uSpin.value = -f.q * Math.PI * 0.8;
    cu.uTop.value = 5.5;
    cu.uBottom.value = -(n - 1) * Y_STEP - 5.5;
    cu.uPx.value = aspect < 1 ? 0.8 : 1;

    // ── Cards: entrada, escala da tela, ângulo de visão
    if (r.introStart < 0) r.introStart = now;
    const scale = cardScale(aspect);
    const toCam = r.toCam;
    for (let i = 0; i < cards.list.length; i++) {
      const c = cards.list[i];
      const t = clamp01((now - r.introStart - INTRO.stagger * i) / INTRO.dur);
      if (t < 1) again = true;
      const s = scale * Math.max(1e-3, easeOutQuint(t));
      c.group.scale.setScalar(s);
      toCam.copy(cam.position).sub(c.group.position).normalize();
      const across = toCam.x * Math.cos(c.angle) - toCam.z * Math.sin(c.angle);
      const facing = toCam.x * Math.sin(c.angle) + toCam.z * Math.cos(c.angle);
      c.titleMat.uniforms.uEdge.value = smoothstep(0.08, 0.6, Math.abs(across));
      c.titleMat.uniforms.uSide.value = across;
      // Título meio opaco, como se estivesse junto ao vidro (D-043).
      // O título do projeto aberto some quando a câmera atravessa o vidro (D-049).
      const through = c === open ? 1 - smoothstep(0.3, 0.44, o) : 1;
      const fade = smoothstep(0.02, 0.35, facing) * easeOutQuint(clamp01(t * 1.4 - 0.3)) * through;
      c.titleMat.uniforms.uFade.value = fade * 0.85;
      if (c.tag) c.tag.mat.opacity = fade * 0.7 * (1 - c.titleMat.uniforms.uEdge.value);
      c.glass.uniforms.uCurrent.value = 1 - smoothstep(0, 0.5, Math.abs(x - i));
      c.glass.uniforms.uCursor.value.copy(r.cursor);
      // O vídeo do card aberto clareia enquanto a câmera chega perto (o vidro fumê sai da frente).
      c.glass.uniforms.uLift.value = c === open ? smoothstep(0.05, 0.42, o) : 0;
    }

    // Retângulo de um card na tela (px CSS, y para baixo): os 4 cantos da face da frente.
    const rectOf = (c: (typeof cards.list)[number], out: THREE.Vector4) => {
      c.group.updateMatrixWorld();
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let k = 0; k < 4; k++) {
        r.corner
          .set((k & 1 ? 0.5 : -0.5) * CARD.w, (k & 2 ? 0.5 : -0.5) * CARD.h, CARD.depth / 2)
          .applyMatrix4(c.group.matrixWorld)
          .project(cam);
        const px = (r.corner.x * 0.5 + 0.5) * size.width;
        const py = (0.5 - r.corner.y * 0.5) * size.height;
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);
      }
      return out.set(x0, y0, x1, y1);
    };

    // Clique: só o card da vez, com vídeo. Durante o corte, só do lado já revelado (x + y depois
    // da borda de nós); o card vale enquanto for o da vez, não só parado de frente.
    const ci = Math.round(x);
    const cc = cards.list[ci];
    if (!open && f.cut.on && cc && cc.project.video?.length && Math.abs(x - ci) < 0.45) {
      const h = rectOf(cc, r.live);
      hit.current = { i: ci, x0: h.x, y0: h.y, x1: h.z, y1: h.w, lim: f.done ? -Infinity : sobreLimit(f.cut) };
    } else {
      hit.current = null;
    }

    // ── Painel e túnel do projeto aberto: o retângulo sai do card e vai para o lugar final.
    const ou = (overlay.material as THREE.ShaderMaterial).uniforms;
    const vid = open ? videos.current[det.index] : null;
    const panelA = smoothstep(0.26, 0.36, o);
    // A sala fica inteira em 0,44 (0,97 s), ainda atrás do painel, que encolhe e mostra a sala;
    // o texto só entra depois (REVEAL_AT, na seção).
    const tunnelA = smoothstep(0.3, 0.44, o);
    if (open && panelA + tunnelA > 0) {
      const live = rectOf(open, r.live);
      const fin = panelRect(size.width, size.height, r.final);
      // Depois de chegar, o painel ainda cresce devagar até o tamanho final.
      const grow = lerp(0.9, 1, easeOutQuint(clamp01((o - 0.55) / 0.45)));
      const fcx = (fin.x + fin.z) / 2;
      const fcy = (fin.y + fin.w) / 2;
      const fhw = ((fin.z - fin.x) / 2) * grow;
      const fhh = ((fin.w - fin.y) / 2) * grow;
      const b = easeInOutCubic(clamp01((o - 0.3) / 0.32));
      const rv = ou.uRect.value as THREE.Vector4;
      rv.set(
        lerp(live.x, fcx - fhw, b),
        lerp(live.y, fcy - fhh, b),
        lerp(live.z, fcx + fhw, b),
        lerp(live.w, fcy + fhh, b),
      );
      if (vid && vid.video.videoWidth > 0) {
        const va = vid.video.videoWidth / vid.video.videoHeight;
        const ra = (rv.z - rv.x) / Math.max(1, rv.w - rv.y);
        (ou.uFit.value as THREE.Vector2).set(va > ra ? ra / va : 1, va > ra ? 1 : va / ra);
        ou.uMedia.value = vid.tex;
        ou.uMediaOn.value = 1;
        ou.uLod.value = Math.log2(Math.max(vid.video.videoWidth, vid.video.videoHeight));
      } else {
        ou.uMediaOn.value = 0;
      }
      // Câmera da sala: orbita com o cursor (suavizado).
      (ou.uLook.value as THREE.Vector2).set(r.tilt.x, r.tilt.y);
      (ou.uText.value as THREE.Vector4).fromArray(det.text);
      (ou.uHint.value as THREE.Vector4).fromArray(det.hint);
      (ou.uSide.value as THREE.Vector4).fromArray(det.side);
      ou.uPanel.value = panelA;
      ou.uTunnel.value = tunnelA;
      again = true;
    }

    // Luz da coluna no fundo: onde o eixo cai na tela.
    const axis = r.axis.set(0, p.y, 0).project(cam);
    (background.material as THREE.ShaderMaterial).uniforms.uAxisX.value = axis.x * 0.5 + 0.5;

    // ── Passe 1: fundo e coluna, sem os cards, na textura da refração.
    cards.root.visible = false;
    overlay.visible = false;
    shared.uAll.value = 1;
    gl.setRenderTarget(rt);
    gl.render(state.scene, cam);
    // ── Passe 2: a cena inteira, com o corte.
    cards.root.visible = true;
    overlay.visible = !!open && panelA + tunnelA > 0;
    shared.uAll.value = f.done ? 1 : 0;
    gl.setRenderTarget(null);
    gl.render(state.scene, cam);
    r.drawn = true;

    if (again) invalidate();
    if (settled) onSettled(det.target);
  }, 1);

  return (
    <>
      <primitive object={background} />
      <primitive object={column} />
      <primitive object={cards.root} />
      <primitive object={overlay} />
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
