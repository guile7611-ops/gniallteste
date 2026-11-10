/**
 * Partículas do logo (D-012): nós amostrados do arquivo oficial do logo vertical.
 *
 * - Intro: os nós do nome GNIALL e da assinatura SOFTWARE & IA saem dos LEDs dos racks
 *   (datacenter.ts, D-014) e pousam sobre os pixels do arquivo, nas cores exatas dele. O LED do
 *   rack apaga quando o nó sai. O símbolo vem do enxame + metal (swarm.ts).
 * - Commit (D-013): uma varredura na diagonal da matriz troca os nós pousados pelas letras em
 *   metal (logoMetal.ts). Sem as letras em metal, os nós somem por baixo do logo HTML (D-012).
 * - O furo do cursor (D-012) saiu: depois da intro, o cursor só inclina e ilumina o logo (D-013).
 *
 * O arquivo nunca é alterado: só é rasterizado num canvas fora da tela, para saber onde há tinta
 * e de que cor. Espaço: o do grupo do símbolo (field.ts).
 */
import * as THREE from 'three';
import { type CorridorUniforms, corridorGlsl, type LedSlots, ledZ } from './datacenter';
import { type FieldUniforms, fieldFragmentGlsl, fieldVertexGlsl, nodeInstancedGeometry, rng } from './field';
import { SYMBOL_CENTER_VB, VIEWBOX } from './symbolGeometry';

export const LOGO_SRC = '/brand/oficial/lg-vt-color-inverted.svg';

/** No arquivo vertical, o símbolo vai até y ≈ 624 e o nome começa em y ≈ 691 (vb). */
const SYMBOL_BOTTOM_VB = 660;

/**
 * Fração mínima de tinta numa célula para virar nó. Baixa porque os traços da assinatura têm
 * ~1 célula de espessura e quase sempre caem divididos entre duas células.
 */
const MIN_COVERAGE = 0.25;

/** Subamostras por célula, em cada eixo. */
const SS = 4;

/** O texto do arquivo oficial (para rasterizar e para extrudar as letras). */
export async function fetchLogoSvg(signal: AbortSignal): Promise<string> {
  const res = await fetch(LOGO_SRC, { signal });
  if (!res.ok) throw new Error(`logo: HTTP ${res.status}`);
  return res.text();
}

/**
 * O SVG oficial como imagem rasterizável. O arquivo declara 100% × 100% (sem tamanho
 * intrínseco); só nesta cópia em memória o tamanho passa a ser o do viewBox.
 */
export async function loadLogoImage(text: string): Promise<HTMLImageElement> {
  const sized = text.replace(/<svg\b([^>]*?)\swidth="[^"]*"\s+height="[^"]*"/, `<svg$1 width="${VIEWBOX}" height="${VIEWBOX}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface LogoSample {
  count: number;
  /** x, y (vb, espaço do símbolo), branco (0/1), símbolo (0/1). */
  rest: Float32Array;
  /** Passo da grade de amostragem (vb). */
  step: number;
}

/** Uma célula de `stepVb` vira um nó quando tem tinta suficiente. null se o canvas falhar. */
export function sampleLogo(img: HTMLImageElement, stepVb: number): LogoSample | null {
  const cells = Math.ceil(VIEWBOX / stepVb);
  const step = VIEWBOX / cells;
  const S = cells * SS;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  let data: Uint8ClampedArray;
  try {
    ctx.drawImage(img, 0, 0, S, S);
    data = ctx.getImageData(0, 0, S, S).data;
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  const out: number[] = [];
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      let a = 0;
      let red = 0;
      for (let sy = 0; sy < SS; sy++) {
        let i = ((cy * SS + sy) * S + cx * SS) * 4;
        for (let sx = 0; sx < SS; sx++, i += 4) {
          a += data[i + 3];
          red += data[i] * data[i + 3];
        }
      }
      if (a < MIN_COVERAGE * SS * SS * 255) continue;
      const vbx = (cx + 0.5) * step;
      const vby = (cy + 0.5) * step;
      // Branco (255, 255, 255) ou Ciano Cibernético (0, 210, 211): o vermelho separa os dois.
      out.push(vbx - SYMBOL_CENTER_VB.x, -(vby - SYMBOL_CENTER_VB.y), red / a > 128 ? 1 : 0, vby < SYMBOL_BOTTOM_VB ? 1 : 0);
    }
  }
  return { count: out.length / 4, rest: new Float32Array(out), step };
}

export interface LogoTiming {
  /** Primeira partida (s). */
  depart: number;
  /** Atraso da esquerda para a direita do nome (s). */
  sweep: number;
  /** Duração média do voo (s). */
  flight: number;
}

/** Nós pareados em blocos: dentro do bloco, o LED mais alto vai para o nó mais alto. */
const CHUNK = 48;

/**
 * Pareia cada nó do nome e da assinatura com um LED do grupo do logo (repete LED se faltar).
 * Devolve, para assignLogoLeds, o LED e a partida de cada nó.
 */
export function buildLogoParticles(sample: LogoSample, timing: LogoTiming, leds: LedSlots) {
  const { count: n, rest } = sample;
  const rand = rng(0x10601);
  let minX = Infinity;
  let maxX = -Infinity;
  const nodes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (rest[i * 4 + 3] > 0.5) continue;
    nodes.push(i);
    minX = Math.min(minX, rest[i * 4]);
    maxX = Math.max(maxX, rest[i * 4]);
  }
  const spanX = maxX > minX ? maxX - minX : 1;
  const midX = (minX + maxX) / 2;

  // LEDs: a parede da esquerda monta a metade esquerda do nome; os LEDs mais perto saem primeiro.
  type Src = { slot: number; h: number; d: number };
  const left: Src[] = [];
  const right: Src[] = [];
  for (const slot of leds.logoPool) {
    const src = { slot, h: leds.slots[slot * 4 + 2], d: Math.abs(ledZ(leds, slot)) };
    (leds.slots[slot * 4] < 0 ? left : right).push(src);
  }
  const slotOf = new Uint32Array(n);
  const pair = (ids: number[], own: Src[]) => {
    const ss = own.length ? own : left.length ? left : right;
    if (!ids.length || !ss.length) return;
    // Do centro do nome para as pontas: os primeiros nós ficam com os LEDs mais perto.
    ids.sort((a, b) => Math.abs(rest[a * 4] - midX) - Math.abs(rest[b * 4] - midX));
    ss.sort((a, b) => a.d - b.d);
    for (let i = 0; i < ids.length; i += CHUNK) {
      const tc = ids.slice(i, i + CHUNK).sort((a, b) => rest[a * 4 + 1] - rest[b * 4 + 1]);
      const sc: Src[] = [];
      for (let j = 0; j < tc.length; j++) sc.push(ss[(i + j) % ss.length]);
      sc.sort((a, b) => a.h - b.h);
      tc.forEach((id, j) => {
        slotOf[id] = sc[j].slot;
      });
    }
  };
  pair(nodes.filter((i) => rest[i * 4] < midX), left);
  pair(nodes.filter((i) => rest[i * 4] >= midX), right);

  const aSlot = new Float32Array(n * 4);
  const aMeta = new Float32Array(n * 2);
  const slots = new Uint32Array(nodes.length);
  const departs = new Float32Array(nodes.length);
  let lastLanding = 0;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const slot = slotOf[i];
    aSlot.set(leds.slots.subarray(slot * 4, slot * 4 + 4), i * 4);
    const xNorm = THREE.MathUtils.clamp((rest[i * 4] - minX) / spanX, 0, 1);
    const depart = timing.depart + timing.sweep * xNorm + rand() * 0.15;
    const dur = timing.flight * (0.9 + rand() * 0.25);
    aMeta.set([depart, dur], i * 2);
    if (rest[i * 4 + 3] > 0.5) continue;
    lastLanding = Math.max(lastLanding, depart + dur);
    slots[k] = slot;
    departs[k] = depart;
    k++;
  }

  const geometry = nodeInstancedGeometry(n);
  geometry.setAttribute('aRest', new THREE.InstancedBufferAttribute(rest, 4));
  geometry.setAttribute('aSlot', new THREE.InstancedBufferAttribute(aSlot, 4));
  geometry.setAttribute('aMeta', new THREE.InstancedBufferAttribute(aMeta, 2));
  return { geometry, lastLanding, slots, departs };
}

/* ───────────────────────── Shader ───────────────────────── */

export function createLogoUniforms(field: FieldUniforms, corridor: CorridorUniforms) {
  return {
    ...field,
    ...corridor,
    /** Meio-lado do nó pousado (vb). */
    uDot: { value: 1 },
    /** 1 → 0 quando o logo (metal ou HTML) já assumiu. */
    uShow: { value: 1 },
    /** Frente da varredura do commit em q = (x + y)·√½ (vb): os nós atrás dela já viraram metal. */
    uCommit: { value: -1e5 },
  };
}

export type LogoUniforms = ReturnType<typeof createLogoUniforms>;

const logoVertex = /* glsl */ `
  ${fieldVertexGlsl}
  ${corridorGlsl}
  uniform float uDot;
  uniform float uShow;
  uniform float uCommit;

  attribute vec4 aRest;   // x, y (vb), branco (0/1), símbolo (0/1)
  attribute vec4 aSlot;   // LED de partida (datacenter.ts)
  attribute vec2 aMeta;   // partida (s), duração (s)

  varying vec3 vN;
  varying float vExact;
  varying float vShade;
  varying float vWhite;
  varying vec3 vLed;
  varying float vFog;

  void main() {
    float seed = aSlot.w;
    vec3 rest = vec3(aRest.xy, 0.0);

    // Do LED do rack até o pixel do arquivo (só o nome e a assinatura).
    vec3 w0 = ledWorld(aSlot);
    vec3 p0 = (w0 - uWorldOrigin) / uWorldUnit;
    float t = clamp((uTime - aMeta.x) / aMeta.y, 0.0, 1.0);
    float e = easeInOutCubic(t);
    vec3 d = rest - p0;
    float len = length(d);
    vec2 sxz = length(d.xz) > 0.001 ? normalize(vec2(-d.z, d.x)) : vec2(0.0);
    float swirl = (fract(seed * 91.7) - 0.5) * 2.0;
    vec3 p1 = (p0 + rest) * 0.5 + vec3(sxz.x, 0.0, sxz.y) * len * 0.2 * swirl + vec3(0.0, len * 0.1 + 40.0, 0.0);
    vec3 c = mix(mix(p0, p1, e), mix(p1, rest, e), e);
    float land = smoothstep(0.0, 0.6, t);

    // Existe a partir da saída (no mesmo instante, o LED do rack apaga).
    float alive = step(aMeta.x, uTime) * powerLit(w0);
    float s = mix(uLed / uWorldUnit, uDot, smoothstep(0.0, 0.3, t)) * alive * (1.0 - aRest.w) * uShow;

    // Commit: atrás da frente da varredura, o nó já virou metal.
    s *= smoothstep(uCommit - 4.0, uCommit + 4.0, (rest.x + rest.y) * R);

    // Os nós em voo não passam por cima do texto (contraste do texto).
    s *= smoothstep(0.0, uDot * 3.0, sdBox(toPlane(c) - uCopy.xy, uCopy.zw));

    // Em voo, o nó tem volume; pousado, é chapado.
    vec3 lp = position * vec3(s, s, s * mix(0.25, 1.0, 1.0 - land));
    vec4 wp = modelMatrix * vec4(c + lp, 1.0);

    vN = normal;
    vExact = land;
    vShade = 1.0 - land;
    vWhite = aRest.z;
    vLed = ledColor(seed);
    vFog = fogAt(wp.xyz, length(cameraPosition - wp.xyz)) * (1.0 - land);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const logoFragment = /* glsl */ `
  ${fieldFragmentGlsl}
  varying vec3 vN;
  varying float vExact;
  varying float vShade;
  varying float vWhite;
  varying vec3 vLed;
  varying float vFog;

  void main() {
    // Em voo: a luz do LED. Pousado: a cor exata do arquivo (branco ou Ciano), sem passar de 1 (sem bloom).
    vec3 exact = mix(uAccent, uWhite, vWhite);
    vec3 col = mix(vLed, exact, vExact);
    col *= mix(1.0, lambert(vN), vShade);
    gl_FragColor = vec4(mix(col, uFogColor, vFog), 1.0);
  }
`;

export function createLogoMaterial(uniforms: LogoUniforms) {
  return new THREE.ShaderMaterial({ vertexShader: logoVertex, fragmentShader: logoFragment, uniforms: { ...uniforms } });
}
