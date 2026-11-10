/**
 * Data center (D-014): o cenário da tela de entrada. Um corredor escuro entre duas fileiras de
 * racks, chão polido que reflete o logo e os LEDs, faixas de luz no teto e névoa azul.
 *
 * - Os LEDs são os nós da marca: quadrados pequenos, brancos ou no texto secundário (#B7C5D4) e
 *   poucos no Ciano Cibernético (acento). Nenhuma cor funcional (verde, âmbar, vermelho).
 * - A frente dos racks segue a matriz: 42U em blocos de 4U (unidades de 1U, 2U e 4U), furos
 *   quadrados nos trilhos e perfuração em losango (45°) nos servidores.
 * - Intro: os racks ligam numa frente em losango (distância L1 no chão) a partir da base do logo;
 *   depois os LEDs saem dos racks e montam o logo (swarm.ts, logoParticles.ts). Ao fim do commit,
 *   os LEDs que saíram acendem de novo, numa única passada. Depois, tudo fica parado (D-004).
 * - Fora de foco: o foco é o logo. Os LEDs perto da câmera viram losangos desfocados; os de
 *   trás desfocam pouco.
 * - Tudo em código: nenhuma imagem ou HDRI baixado.
 *
 * Espaço: mundo (y para cima; a câmera final fica em z = 10, olhando para a origem).
 */
import * as THREE from 'three';
import { rng } from './field';
import { type HazeUniforms, hazeGlsl, type LightUniforms, lightGlsl } from './light';

/* ───────────────────────── Medidas (mundo) ───────────────────────── */

/** Largura de um rack (ao longo de z) e altura. */
const PITCH = 2.2;
const RACK_H = 7.0;
/** O corredor vai de Z_NEAR (atrás da câmera inicial) até Z_FAR. */
const Z_NEAR = 24;
const Z_FAR = -46;
const RACKS = Math.ceil((Z_NEAR - Z_FAR) / PITCH);
/** Parede escura entre o topo dos racks e o teto. */
const CEIL_GAP = 0.45;
const UNITS = 42;
/** Frações da altura: rodapé e tampa; fração da largura: trilhos laterais. */
const PLINTH = 0.03;
const CAP = 0.045;
const RAIL = 0.07;
/** Altura de 1U. */
const U_H = (RACK_H * (1 - PLINTH - CAP)) / UNITS;
/** Colunas entre racks: quanto avançam no corredor e largura. */
const POST_D = 0.09;
const POST_W = 0.07;
/** Meio-lado de um LED (3 mm num rack de 60 cm). */
export const LED_HALF = 0.011;

/** Janelas (z do mundo) de onde saem os nós: o enxame do símbolo e o nome + assinatura. */
const SWARM_WINDOW: readonly [number, number] = [-14, 10];
const LOGO_WINDOW: readonly [number, number] = [-16, 6];
const LOGO_POOL = 3000;
/** "Nunca": o LED não sai do rack. */
const NEVER = 1e6;

const f = (x: number) => (Number.isInteger(x) ? `${x}.0` : String(x));

/* ───────────────────────── Unidades do rack (o mesmo cálculo em JS e GLSL) ───────────────────────── */

const EMPTY = 0;
const BLANK = 1;
const SERVER = 2;
const STORAGE = 3;
const SWITCH = 4;

/** Padrões de um bloco de 4U, de baixo para cima. */
const PATTERNS: readonly (readonly number[])[] = [[4], [2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1], [4]];

/** Hash inteiro (lowbias32): idêntico ao do shader, bit a bit. */
function hash32(x: number) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function typeFor(t: number, size: number) {
  if (size === 4) return t < 2 ? EMPTY : t < 5 ? STORAGE : SERVER;
  if (size === 2) return t < 1 ? EMPTY : t < 2 ? BLANK : t < 5 ? STORAGE : SERVER;
  return t < 2 ? BLANK : t < 6 ? SWITCH : SERVER;
}

interface Unit {
  start: number;
  size: number;
  type: number;
}

function rackUnits(rack: number, sideBit: number): Unit[] {
  const units: Unit[] = [];
  for (let b = 0; b < 10; b++) {
    const h = hash32(rack * 128 + sideBit * 64 + b);
    let s0 = 0;
    PATTERNS[h % 6].forEach((size, ui) => {
      const th = hash32(h ^ Math.imul(ui + 1, 0x9e3779b9));
      units.push({ start: b * 4 + s0, size, type: typeFor(th % 10, size) });
      s0 += size;
    });
  }
  units.push({ start: 40, size: 1, type: SWITCH }, { start: 41, size: 1, type: BLANK });
  return units;
}

const unitGlsl = /* glsl */ `
  uint hash32(uint x) {
    x ^= x >> 16u;
    x *= 0x7feb352du;
    x ^= x >> 15u;
    x *= 0x846ca68bu;
    x ^= x >> 16u;
    return x;
  }

  float typeFor(uint t, float size) {
    if (size > 3.5) return t < 2u ? 0.0 : t < 5u ? 3.0 : 2.0;
    if (size > 1.5) return t < 1u ? 0.0 : t < 2u ? 1.0 : t < 5u ? 3.0 : 2.0;
    return t < 2u ? 1.0 : t < 6u ? 4.0 : 2.0;
  }

  // Unidade que ocupa a linha 'row' (U): x = início (U), y = tamanho (U), z = tipo.
  vec3 unitAt(float rack, float sideBit, float row) {
    if (row >= 41.0) return vec3(41.0, 1.0, 1.0);
    if (row >= 40.0) return vec3(40.0, 1.0, 4.0);
    float block = floor(row / 4.0);
    uint h = hash32(uint(rack) * 128u + uint(sideBit) * 64u + uint(block));
    uint pat = h % 6u;
    vec4 sz = pat == 1u ? vec4(2.0, 2.0, 0.0, 0.0)
      : pat == 2u ? vec4(1.0, 1.0, 2.0, 0.0)
      : pat == 3u ? vec4(2.0, 1.0, 1.0, 0.0)
      : pat == 4u ? vec4(1.0)
      : vec4(4.0, 0.0, 0.0, 0.0);
    float local = row - block * 4.0;
    float s0 = 0.0;
    float size = sz.x;
    uint ui = 0u;
    for (int i = 0; i < 4; i++) {
      size = sz[i];
      if (local < s0 + size) {
        ui = uint(i);
        break;
      }
      s0 += size;
    }
    uint th = hash32(h ^ ((ui + 1u) * 0x9e3779b9u));
    return vec3(block * 4.0 + s0, size, typeFor(th % 10u, size));
  }
`;

/** Portas de um switch de 1U: dois grupos de 12, em duas linhas (coordenadas da unidade). */
const PORT_GROUPS = [0.06, 0.5] as const;
const PORT_SPAN = 0.4;

/** LEDs de uma unidade: (u ao longo da largura útil, v ao longo da altura da unidade), 0..1. */
function unitLeds(u: Unit, rand: () => number): [number, number][] {
  const out: [number, number][] = [];
  if (u.type === SERVER) {
    const v = 1 - 0.5 / u.size;
    out.push([0.9, v], [0.935, v]);
    if (rand() < 0.5) out.push([0.035, v]);
  } else if (u.type === STORAGE) {
    const rows = u.size / 2;
    const bay = 0.96 / 12;
    for (let r = 0; r < rows; r++) {
      for (let b = 0; b < 12; b++) {
        if (rand() < 0.12) continue; // baia vazia
        const u0 = 0.02 + b * bay;
        const v = (r * 2 + 0.22) / u.size;
        out.push([u0 + bay * 0.3, v], [u0 + bay * 0.7, v]);
      }
    }
  } else if (u.type === SWITCH) {
    for (const g of PORT_GROUPS) {
      for (let i = 0; i < 12; i++) {
        const pu = g + ((i + 0.5) / 12) * PORT_SPAN;
        if (rand() < 0.72) out.push([pu, 0.86]); // porta de cima com link
        if (rand() < 0.72) out.push([pu, 0.14]); // porta de baixo com link
      }
    }
    out.push([0.95, 0.5], [0.975, 0.5]);
  }
  return out;
}

/* ───────────────────────── LEDs ───────────────────────── */

export interface LedSlots {
  count: number;
  /** Por LED: lado (−1/1), posição ao longo do corredor (em racks, a partir de Z_NEAR), altura (0..1 do rack), semente. */
  slots: Float32Array;
  /** Por LED: instante em que o nó sai do rack (s). NEVER se não sai. */
  hide: Float32Array;
  /** LEDs que viram nós do enxame (símbolo) e do nome + assinatura. */
  swarmPool: Uint32Array;
  logoPool: Uint32Array;
}

/** z do mundo de um LED (não depende do tamanho da tela). */
export function ledZ(leds: LedSlots, i: number) {
  return Z_NEAR - leds.slots[i * 4 + 1] * PITCH;
}

function shuffled(list: number[], rand: () => number) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function buildLeds(swarmCount: number): LedSlots {
  const rand = rng(0xd47ace);
  const out: number[] = [];
  const usable = 1 - PLINTH - CAP;
  for (let sideBit = 0; sideBit < 2; sideBit++) {
    const side = sideBit ? 1 : -1;
    for (let rack = 0; rack < RACKS; rack++) {
      for (const u of rackUnits(rack, sideBit)) {
        for (const [lu, lv] of unitLeds(u, rand)) {
          const zp = rack + RAIL + lu * (1 - 2 * RAIL);
          if (Z_NEAR - zp * PITCH < Z_FAR + 0.3) continue;
          out.push(side, zp, PLINTH + ((u.start + lv * u.size) / UNITS) * usable, rand());
        }
      }
    }
  }
  const count = out.length / 4;
  const slots = new Float32Array(out);
  const hide = new Float32Array(count).fill(NEVER);
  const zOf = (i: number) => Z_NEAR - slots[i * 4 + 1] * PITCH;

  // Primeiro o nome + assinatura (mais perto do logo), depois o enxame, sem repetir LED.
  const taken = new Uint8Array(count);
  const pick = (win: readonly [number, number], n: number) => {
    const cand: number[] = [];
    for (let i = 0; i < count; i++) {
      const z = zOf(i);
      if (!taken[i] && z >= win[0] && z <= win[1]) cand.push(i);
    }
    const chosen = shuffled(cand, rand).slice(0, n);
    for (const i of chosen) taken[i] = 1;
    return Uint32Array.from(chosen);
  };
  const logoPool = pick(LOGO_WINDOW, LOGO_POOL);
  const swarmPool = pick(SWARM_WINDOW, swarmCount);
  return { count, slots, hide, swarmPool, logoPool };
}

/** Raios L1 (no chão, a partir de (ox, 0)): o corredor inteiro e a região de onde saem os nós. */
export function corridorReach(aisle: number, ox: number) {
  const base = aisle + Math.abs(ox);
  const win = Math.max(-SWARM_WINDOW[0], SWARM_WINDOW[1], -LOGO_WINDOW[0], LOGO_WINDOW[1]);
  return { power: base + Math.max(Z_NEAR, -Z_FAR), relight: base + win + 1 };
}

/* ───────────────────────── Uniforms e GLSL compartilhados ───────────────────────── */

export function createCorridorUniforms(c: { rack: string; ledA: string; ledB: string; accent: string }) {
  return {
    /** Meia-largura do corredor (x da frente dos racks) e altura do chão (y). */
    uAisle: { value: 2.4 },
    uFloor: { value: -1 },
    /** Meio-lado do LED (mundo). */
    uLed: { value: LED_HALF },
    /** Ligação dos racks: origem no chão (x, z), raio L1 da frente, largura e brilho da frente. */
    uPowerO: { value: new THREE.Vector2() },
    uPower: { value: 0 },
    uPowerW: { value: 1.6 },
    uPowerEdge: { value: 0 },
    /** Segunda frente: os LEDs que saíram acendem de novo (raio L1). */
    uRelight: { value: 0 },
    /** Densidade da névoa. */
    uFogD: { value: 0.045 },
    /** Foco (distância ao logo), desfoque em px CSS por unidade de |d − foco| / d e máximo. */
    uFocusD: { value: 10 },
    uCoc: { value: 30 },
    uCocMax: { value: 46 },
    uTanH: { value: 0.27 },
    /** Atrás do texto (px CSS, y para cima: centro e meia-largura/altura): LEDs e reflexos apagam. */
    uQuietPx: { value: new THREE.Vector4(-1e5, -1e5, 0, 0) },
    uQuietSoft: { value: 48 },
    /** 1 durante o passe do reflexo (sem efeitos de tela). */
    uReflect: { value: 0 },
    /** Luz que sai do logo (posição no mundo, intensidade) e luz do teto. */
    uGlow: { value: new THREE.Vector3() },
    uGlowK: { value: 0 },
    /** Giro dos nós soltos em volta do eixo vertical do logo (rad), junto com o símbolo (D-036). */
    uSpin: { value: 0 },
    /** Meia largura do símbolo (mundo): escala da poeira perto do logo (D-038). */
    uDustR: { value: 1 },
    /** Relógio da poeira (s): ela flutua devagar (D-038). */
    uDrift: { value: 0 },
    uCeilK: { value: 1 },
    /** Ondas no chão quando os nós do símbolo caem: raio L1 e amplitude (A, B). */
    uWaves: { value: new THREE.Vector4() },
    /** Mundo → espaço do símbolo (para os nós que saem dos LEDs). */
    uWorldOrigin: { value: new THREE.Vector3() },
    uWorldUnit: { value: 1 },
    uRackCol: { value: new THREE.Color(c.rack) },
    uLedA: { value: new THREE.Color(c.ledA) },
    uLedB: { value: new THREE.Color(c.ledB) },
    uLedC: { value: new THREE.Color(c.accent) },
  };
}

export type CorridorUniforms = ReturnType<typeof createCorridorUniforms>;

/** Declarações e funções do corredor (vertex e fragment). Não depende de lightGlsl. */
export const corridorGlsl = /* glsl */ `
  uniform float uAisle;
  uniform float uFloor;
  uniform float uLed;
  uniform vec2 uPowerO;
  uniform float uPower;
  uniform float uPowerW;
  uniform float uPowerEdge;
  uniform float uRelight;
  uniform float uFogD;
  uniform float uFocusD;
  uniform float uCoc;
  uniform float uCocMax;
  uniform float uTanH;
  uniform vec4 uQuietPx;
  uniform float uQuietSoft;
  uniform float uReflect;
  uniform vec3 uGlow;
  uniform float uGlowK;
  uniform float uCeilK;
  uniform vec4 uWaves;
  uniform vec3 uWorldOrigin;
  uniform float uWorldUnit;
  uniform vec3 uRackCol;
  uniform vec3 uLedA;
  uniform vec3 uLedB;
  uniform vec3 uLedC;

  const float C_PITCH = ${f(PITCH)};
  const float C_RACK_H = ${f(RACK_H)};
  const float C_Z_NEAR = ${f(Z_NEAR)};
  const float C_Z_FAR = ${f(Z_FAR)};
  const float C_CEIL_GAP = ${f(CEIL_GAP)};
  const float C_PLINTH = ${f(PLINTH)};
  const float C_CAP = ${f(CAP)};
  const float C_RAIL = ${f(RAIL)};
  const float C_UH = ${f(U_H)};
  const float C_POST_D = ${f(POST_D)};
  const float C_POST_W = ${f(POST_W)};

  // Posição de um LED no mundo (um pouco à frente da face do rack).
  vec3 ledWorld(vec4 slot) {
    // D-046: de volta à frente dos racks (D-014).
    return vec3(slot.x * (uAisle - uLed * 1.6), uFloor + slot.z * C_RACK_H, C_Z_NEAR - slot.y * C_PITCH);
  }

  // Distância L1 no chão (losango, a geometria da matriz) até a base do logo.
  float floorL1(vec3 w) { return abs(w.x - uPowerO.x) + abs(w.z - uPowerO.y); }
  float powerLit(vec3 w) { return 1.0 - smoothstep(uPower - uPowerW, uPower, floorL1(w)); }
  float powerFront(vec3 w) {
    float d = (floorL1(w) - uPower) / (uPowerW * 0.5);
    return exp(-d * d) * uPowerEdge;
  }
  float relit(vec3 w) { return 1.0 - smoothstep(uRelight - uPowerW, uRelight, floorL1(w)); }

  // Névoa: começa a 6 unidades da câmera; no fim do corredor, só névoa (sem emenda com o fundo).
  float fogAt(vec3 w, float dist) {
    float fo = 1.0 - exp(-max(dist - 6.0, 0.0) * uFogD);
    return max(fo, smoothstep(C_Z_FAR + 14.0, C_Z_FAR + 1.0, w.z));
  }

  // Desfoque (px CSS) a uma distância: cheio na frente do foco, pouco atrás dele.
  float cocPx(float dist) {
    float dd = dist - uFocusD;
    return min(uCoc * abs(dd) / max(dist, 0.05) * (dd < 0.0 ? 1.0 : 0.25), uCocMax);
  }

  // 1 atrás do texto (só no passe principal).
  float quietAt(vec2 px) {
    if (uReflect > 0.5) return 0.0;
    vec2 d = abs(px - uQuietPx.xy) - uQuietPx.zw;
    float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    return 1.0 - smoothstep(0.0, uQuietSoft, sd);
  }

  // Cor de um LED (HDR): texto secundário ou branco; poucos no acento; alguns mais fortes.
  vec3 ledColor(float seed) {
    vec3 c = fract(seed * 11.31) > 0.94 ? uLedC : mix(uLedA, uLedB, step(0.6, fract(seed * 5.77)));
    float k = mix(0.8, 1.45, fract(seed * 3.97)) + step(0.93, fract(seed * 2.31)) * 1.5;
    return c * k;
  }
`;

/** Superfícies do corredor (fragment): luz, névoa e bordas suaves. Depende de light + haze + corridor. */
const surfaceGlsl = /* glsl */ `
  float aaBand(float x, float a, float b, float fw) {
    return smoothstep(a - fw, a + fw, x) - smoothstep(b - fw, b + fw, x);
  }

  // 1 no furo (fração 'duty' do período), com borda suave; vira a média quando o furo some na distância.
  float squareWave(float x, float duty, float fw) {
    float d = abs(fract(x) - 0.5);
    float c = 1.0 - smoothstep(duty * 0.5 - fw, duty * 0.5 + fw, d);
    return mix(c, duty, smoothstep(0.15, 0.45, fw));
  }

  float glowAt(vec3 w) {
    vec3 d = w - uGlow;
    return uGlowK / (1.0 + dot(d, d) * 0.09);
  }

  // Luz da sala: apagada até a frente de energia passar; o teto ilumina mais o alto dos racks.
  // Os racks perto da câmera ficam na sombra (a luz está no corredor, à frente).
  float roomLight(vec3 w, float hv) {
    float near = mix(0.3, 1.0, smoothstep(1.5, 9.0, length(cameraPosition - w)));
    return mix(0.2, 1.0, powerLit(w)) * (0.3 + uCeilK * 0.8 * smoothstep(0.15, 1.05, hv)) * near;
  }

  // Névoa (a mesma do fundo no passe principal) e um pouco da luz do foco e dos feixes no ar.
  vec3 finish(vec3 col, vec3 w) {
    float dist = length(cameraPosition - w);
    float fo = fogAt(w, dist);
    vec3 fogCol = uBg;
    vec3 cut = vec3(0.0);
    if (uReflect < 0.5) {
      vec2 px = gl_FragCoord.xy / uDpr;
      // Passagem para o Sobre (D-015): o corredor some do lado do Sobre, célula a célula.
      cut = cutAt(vec2(px.x, uRes.y - px.y));
      if (cut.x > 0.5) discard;
      fogCol = hazeAt(px);
      col += uLightCol * (0.003 * focusAt(px) + 0.005 * beamsAt(px)) * (1.0 - fo);
    }
    return cutNode(mix(col, fogCol, fo), cut);
  }
`;

/* ───────────────────────── Shaders ───────────────────────── */

const rackVertex = /* glsl */ `
  ${corridorGlsl}
  attribute float aSide;
  varying vec3 vW;
  varying float vSide;

  void main() {
    float u = position.x + 0.5;
    float v = position.y + 0.5;
    vec3 w = vec3(aSide * uAisle, uFloor + v * (C_RACK_H + C_CEIL_GAP), C_Z_NEAR - u * (C_Z_NEAR - C_Z_FAR));
    vW = w;
    vSide = aSide;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const rackFragment = /* glsl */ `
  precision highp float;
  precision highp int;
  ${lightGlsl}
  ${hazeGlsl}
  ${corridorGlsl}
  ${surfaceGlsl}
  ${unitGlsl}
  varying vec3 vW;
  varying float vSide;

  void main() {
    vec3 w = vW;
    float dist = length(cameraPosition - w);
    // Sem passe de profundidade de campo: perto da câmera, os detalhes somem (fora de foco).
    float blur = cocPx(dist) * 2.0 * dist * uTanH / uRes.y;
    float fz = max(fwidth(w.z), blur);
    float fy = max(fwidth(w.y), blur);

    float zr = (C_Z_NEAR - w.z) / C_PITCH;
    float rack = floor(zr);
    float fu = zr - rack;
    float hv = (w.y - uFloor) / C_RACK_H;
    float fuW = fz / C_PITCH;

    float alb = 0.1;
    float hl = 0.0;
    if (hv >= 1.0) {
      alb = 0.07; // parede até o teto
    } else if (hv < C_PLINTH) {
      alb = 0.14; // rodapé
    } else if (hv > 1.0 - C_CAP) {
      float cv = (hv - (1.0 - C_CAP)) / C_CAP;
      alb = 0.46 - 0.22 * aaBand(cv, 0.35, 0.65, fy / (C_CAP * C_RACK_H));
      hl = aaBand(cv, 0.0, 0.08, fy / (C_CAP * C_RACK_H));
    } else {
      float uu = (hv - C_PLINTH) / (1.0 - C_PLINTH - C_CAP) * 42.0;
      float fuu = fy / C_UH;
      float row = min(floor(uu), 41.0);
      float lu = (fu - C_RAIL) / (1.0 - 2.0 * C_RAIL);
      if (lu < 0.0 || lu > 1.0) {
        // Trilho: furos quadrados (porcas-gaiola), 3 por U.
        float ru = (lu < 0.0 ? fu : 1.0 - fu) / C_RAIL;
        float hole = aaBand(ru, 0.4, 0.72, fuW / C_RAIL) * squareWave(uu * 3.0, 0.42, fuu * 3.0);
        alb = 0.4 - 0.32 * hole;
      } else {
        vec3 un = unitAt(rack, vSide > 0.0 ? 1.0 : 0.0, row);
        float size = un.y;
        float lv = (uu - un.x) / size;
        float uw = C_PITCH * (1.0 - 2.0 * C_RAIL);
        float uh = C_UH * size;
        float flu = fz / uw;
        float flv = fy / uh;
        float type = un.z;
        if (type < 0.5) {
          alb = 0.06; // vão vazio
        } else if (type < 1.5) {
          alb = 0.56 - 0.22 * aaBand(lv, 0.46, 0.54, flv); // tampa cega
        } else if (type < 2.5) {
          // Servidor: frente perfurada em losango (a matriz 45°), orelhas sólidas.
          float ear = 1.0 - aaBand(lu, 0.07, 0.86, flu);
          vec2 q = vec2(lu * uw, lv * uh) / 0.034;
          vec2 r = vec2(q.x + q.y, q.x - q.y) * 0.70710678;
          float fq = max(fz, fy) / 0.034;
          float holes = squareWave(r.x, 0.5, fq) * squareWave(r.y, 0.5, fq);
          float grille = aaBand(lv, 0.14, 0.86, flv) * (1.0 - ear);
          alb = mix(0.74, 0.12, holes * grille);
          alb = mix(alb, 0.66, ear);
          hl = ear * aaBand(lv, 0.3, 0.7, flv) * aaBand(lu, 0.015, 0.03, flu);
        } else if (type < 3.5) {
          // Storage: baias de disco, com puxador claro embaixo.
          float bay = 0.96 / 12.0;
          float bf = fract((lu - 0.02) / bay);
          float inBay = aaBand(lu, 0.02, 0.98, flu) * aaBand(bf, 0.08, 0.92, flu / bay);
          float rows = size / 2.0;
          float rv = fract(lv * rows);
          float handle = aaBand(rv, 0.09, 0.17, flv * rows);
          float vent = aaBand(rv, 0.5, 0.86, flv * rows) * squareWave(bf * 5.0, 0.5, flu / bay * 5.0);
          alb = mix(0.1, 0.54, inBay);
          alb = mix(alb, 0.2, vent * inBay);
          hl = handle * inBay;
        } else {
          // Switch: duas linhas de portas.
          float g = lu < 0.48 ? (lu - 0.06) / 0.4 : (lu - 0.5) / 0.4;
          float inG = aaBand(g, 0.0, 1.0, flu / 0.4);
          float pc = fract(g * 12.0);
          float port = inG * aaBand(pc, 0.12, 0.88, flu * 30.0)
            * (aaBand(lv, 0.24, 0.47, flv) + aaBand(lv, 0.53, 0.76, flv));
          alb = mix(0.68, 0.04, port);
        }
        // Fresta escura embaixo de cada unidade e bisel claro em cima.
        float gap = 1.0 - smoothstep(0.0, 0.014 / uh + flv, lv);
        alb *= 1.0 - 0.8 * gap;
        hl += aaBand(lv, 1.0 - 0.012 / uh, 1.0, flv) * step(0.5, type);
      }
    }

    float L = roomLight(w, hv) + glowAt(w);
    vec3 col = uRackCol * alb * L * 0.72 + uLedA * hl * 0.035 * L;
    // Acabamento premium: porta de vidro fumê. Fresnel rasante e reflexo das duas faixas do teto,
    // que correm na horizontal pela porta (mais forte no alto, perto da luz).
    vec3 V = normalize(cameraPosition - w);
    float fres = pow(1.0 - abs(V.x), 4.0);
    float pwr = powerLit(w);
    float band = exp(-pow((hv - 0.93) / 0.05, 2.0)) + 0.35 * exp(-pow((hv - 0.08) / 0.04, 2.0));
    float doorK = (hv < 1.0 ? 1.0 : 0.0) * pwr * uCeilK;
    col += uLedB * (0.010 + 0.05 * band) * fres * doorK;
    // Linha fina de luz na quina de cada rack (perfil de alumínio).
    float edge = aaBand(fu, 0.0, 0.012, fuW) + aaBand(fu, 0.988, 1.0, fuW);
    col += uLedB * edge * 0.04 * pwr * smoothstep(0.0, 0.3, hv) * (1.0 - smoothstep(0.95, 1.0, hv));
    col += uLedC * powerFront(w) * 0.3;
    gl_FragColor = vec4(finish(col, w), 1.0);
  }
`;

const postVertex = /* glsl */ `
  ${corridorGlsl}
  attribute vec2 aPost; // lado, índice
  varying vec3 vW;
  varying vec3 vN;

  void main() {
    vec3 c = vec3(aPost.x * (uAisle - C_POST_D * 0.5), uFloor + C_RACK_H * 0.5, C_Z_NEAR - aPost.y * C_PITCH);
    vec3 w = c + position * vec3(C_POST_D, C_RACK_H, C_POST_W);
    vW = w;
    vN = normal;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const postFragment = /* glsl */ `
  precision highp float;
  ${lightGlsl}
  ${hazeGlsl}
  ${corridorGlsl}
  ${surfaceGlsl}
  varying vec3 vW;
  varying vec3 vN;

  void main() {
    vec3 w = vW;
    vec3 n = normalize(vN);
    float hv = (w.y - uFloor) / C_RACK_H;
    float facing = abs(n.x) > 0.5 ? 1.0 : 0.5;
    float lg = max(dot(n, normalize(uGlow - w)), 0.0);
    float L = roomLight(w, hv) * facing + glowAt(w) * (0.3 + 1.4 * lg);
    vec3 col = uRackCol * 0.42 * L;
    col += uLedC * powerFront(w) * 0.3;
    gl_FragColor = vec4(finish(col, w), 1.0);
  }
`;

const ceilingVertex = /* glsl */ `
  ${corridorGlsl}
  varying vec3 vW;

  void main() {
    float u = position.x + 0.5;
    float v = position.y + 0.5;
    vec3 w = vec3(mix(-uAisle, uAisle, u), uFloor + C_RACK_H + C_CEIL_GAP, C_Z_NEAR - v * (C_Z_NEAR - C_Z_FAR));
    vW = w;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const ceilingFragment = /* glsl */ `
  precision highp float;
  ${lightGlsl}
  ${hazeGlsl}
  ${corridorGlsl}
  ${surfaceGlsl}
  varying vec3 vW;

  void main() {
    vec3 w = vW;
    float fx = fwidth(w.x);
    float fz = fwidth(w.z);
    float pw = powerLit(vec3(w.x, uFloor, w.z));
    // Duas faixas de luminárias, em painéis com a largura de um rack.
    float sx = abs(w.x) - uAisle * 0.45;
    float strip = aaBand(sx, -0.08, 0.08, fx);
    float seg = fract((C_Z_NEAR - w.z) / C_PITCH);
    float lamp = strip * aaBand(seg, 0.08, 0.92, fz / C_PITCH);
    float halo = exp(-sx * sx / 0.06) * 0.05;
    vec3 col = uRackCol * 0.16 * mix(0.3, 1.0, pw) + uLedB * (lamp * 1.15 + halo) * pw * uCeilK;
    gl_FragColor = vec4(finish(col, w), 1.0);
  }
`;

const floorVertex = /* glsl */ `
  ${corridorGlsl}
  varying vec3 vW;

  void main() {
    float u = position.x + 0.5;
    float v = position.y + 0.5;
    vec3 w = vec3(mix(-40.0, 40.0, u), uFloor, mix(C_Z_NEAR + 8.0, C_Z_FAR, v));
    vW = w;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const floorFragment = /* glsl */ `
  precision highp float;
  ${lightGlsl}
  ${hazeGlsl}
  ${corridorGlsl}
  ${surfaceGlsl}
  uniform sampler2D uRefl;
  uniform mat4 uTexMat;
  uniform float uReflK;
  uniform float uStreak;
  varying vec3 vW;

  void main() {
    vec3 w = vW;
    vec3 V = normalize(cameraPosition - w);
    float fr = 0.04 + 0.96 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
    float pw = powerLit(w);

    // Chão escuro; uma poça de luz embaixo do logo.
    float dx = (w.x - uPowerO.x) / max(uAisle * 0.85, 0.5);
    float dz = (w.z - uPowerO.y) / 3.2;
    float pool = exp(-dx * dx - dz * dz);
    vec3 col = uBg * (0.55 + 0.25 * pw) + uLightCol * 0.016 * pool * uGlowK;

    // Piso elevado: placas de meio rack com junta escura fina; cada placa reflete um pouco diferente.
    vec2 tq = vec2(w.x, w.z) / (C_PITCH * 0.5);
    vec2 tf = fract(tq);
    vec2 tw = fwidth(tq);
    float seam = max(1.0 - smoothstep(0.0, 0.03 + tw.x, min(tf.x, 1.0 - tf.x)),
                     1.0 - smoothstep(0.0, 0.03 + tw.y, min(tf.y, 1.0 - tf.y)));
    seam *= 1.0 - smoothstep(0.08, 0.3, max(tw.x, tw.y));
    vec2 tid = floor(tq);
    float tileVar = 0.85 + 0.3 * fract(sin(dot(tid, vec2(12.9898, 78.233))) * 43758.5453);
    // Luz das duas faixas do teto caindo no corredor.
    float sxf = abs(w.x) - uAisle * 0.45;
    col += uLedB * 0.012 * exp(-sxf * sxf / 0.25) * pw * uCeilK * step(abs(w.x), uAisle);

    // Reflexo polido: riscos verticais (como num piso encerado) e um pouco de desfoque.
    vec4 tc = uTexMat * vec4(w, 1.0);
    vec2 uv = tc.xy / tc.w;
    vec3 refl = vec3(0.0);
    float ws = 0.0;
    for (int i = -3; i <= 3; i++) {
      float o = float(i) / 3.0;
      float k = exp(-o * o * 2.2);
      refl += textureLod(uRefl, uv + vec2(0.0, o * uStreak), 1.0 + abs(o) * 1.5).rgb * k;
      ws += k;
    }
    refl /= ws;
    float q = quietAt(gl_FragCoord.xy / uDpr);
    col += refl * mix(0.22, 0.85, fr) * uReflK * tileVar * (1.0 - 0.9 * q);
    col *= 1.0 - 0.35 * seam;

    // Frente de energia e ondas do commit (losangos no chão, acento fino).
    float l1 = floorL1(w);
    float wa = (l1 - uWaves.x) / 0.35;
    float wb = (l1 - uWaves.z) / 0.35;
    float waves = exp(-wa * wa) * uWaves.y + exp(-wb * wb) * uWaves.w;
    col += uLedC * (powerFront(w) * 0.5 + waves * 0.16) * (1.0 - 0.9 * q);

    gl_FragColor = vec4(finish(col, w), 1.0);
  }
`;

const ledVertex = /* glsl */ `
  ${lightGlsl}
  ${corridorGlsl}
  uniform float uTime;
  uniform float uSpin;
  uniform float uDustR;
  uniform float uDrift;
  attribute vec4 aSlot;
  attribute float aHide;
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vShape;

  // D-038: poeira de luz perto do logo. Duas nuvens soltas, uma de cada lado, mais cheias embaixo;
  // poucos pontos espalhados em volta. Tudo preso ao símbolo: desce junto com ele.
  float dustHash(float s, float k) { return fract(sin(s * k + k * 0.37) * 43758.5453); }

  vec3 dustWorld(float seed) {
    float h1 = dustHash(seed, 91.7);
    float h2 = dustHash(seed, 37.3);
    float h3 = dustHash(seed, 13.1);
    float h4 = dustHash(seed, 57.9);
    float R = uDustR;
    // Do símbolo até o chão.
    float reach = max(uGlow.y - uFloor, R);
    vec3 p;
    if (dustHash(seed, 23.9) < 0.07) {
      p = uGlow + vec3((h1 - 0.5) * 14.0 * R, R * 1.5 - h2 * (reach + R), (h3 - 0.7) * 8.0 * R);
    } else {
      float side = h4 < 0.5 ? -1.0 : 1.0;
      float fall = pow(h2, 0.6);
      float spread = R * (0.3 + 1.3 * fall);
      p = uGlow + vec3(
        side * R * (1.0 + 1.6 * fall) + (h1 + dustHash(seed, 71.3) - 1.0) * spread,
        R * 0.4 - fall * (reach + R * 0.2),
        (h3 - 0.5) * R * 3.5
      );
    }
    // Flutua devagar: cada ponto anda num laço pequeno, no seu ritmo (ciclos de 20 a 40 s).
    float t = uDrift;
    p += R * 0.22 * vec3(
      sin(t * (0.16 + 0.12 * h1) + h2 * 40.0),
      sin(t * (0.14 + 0.10 * h3) + h1 * 31.0) * 0.8,
      cos(t * (0.15 + 0.10 * h2) + h3 * 23.0)
    );
    return p;
  }

  void main() {
    float seed = aSlot.w;
    // D-046: sem a poeira solta; todos os LEDs ficam nos racks.
    vec3 w = ledWorld(aSlot);
    // Acende com a frente de energia; apaga quando o nó sai; acende de novo com a segunda frente.
    float on = powerLit(w) * (uTime < aHide ? 1.0 : 0.0);
    // D-036: dos nós que não viram logo, fica um terço (poeira de luz, não parede de pontos).
    vec4 mv = viewMatrix * vec4(w, 1.0);
    float dist = -mv.z;
    if (on < 0.002 || dist < 0.05) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    float pxW = 2.0 * dist * uTanH / uRes.y; // mundo por px CSS nessa distância
    // D-036: os nós soltos têm tamanhos variados (poucos grandes), como poeira de luz.
    float big = 1.0;
    float sharp = uLed * big / pxW;
    float minPx = mix(0.9, 1.6, uReflect);
    // Menor que o mínimo: fica mais fraco em vez de menor (sem cintilar).
    float comp = min(sharp / minPx, 1.0);
    sharp = max(sharp, minPx);
    float coc = cocPx(dist) * mix(0.8, 1.2, fract(seed * 7.13));
    float hs = max(sharp, coc);
    // A luz do LED se espalha pelo disco de desfoque (energia conservada, com um piso pequeno).
    float k = sharp / hs;
    float energy = max(k * k, 0.004);
    float near = smoothstep(0.15, 0.9, dist);
    vec2 px = clipToPx(projectionMatrix * mv);
    // Do lado do Sobre (D-015), o LED sai junto com a célula do corte.
    if (uReflect < 0.5 && cutAt(vec2(px.x, uRes.y - px.y)).x > 0.5) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    float fo = fogAt(w, length(cameraPosition - w));
    // D-038: a poeira solta é branca e ciano (as cores do logo).
    vec3 tint = ledColor(seed);
    if (false) {
      tint = mix(uLedB, uLedC, step(0.55, dustHash(seed, 7.7)))
        * (mix(0.7, 1.5, dustHash(seed, 3.97)) + step(0.94, dustHash(seed, 2.31)) * 1.6);
    }
    vCol = tint * on * comp * energy * near * (1.0 - fo) * (1.0 - 0.92 * quietAt(px))
      * (1.0 + 1.2 * powerFront(w));
    vShape = smoothstep(1.3, 3.0, hs / sharp);
    vUv = position.xy;
    // Fora de foco, o disco é largo e o rack (visto de lado) cortaria metade dele: o LED vai um
    // pouco para a frente na profundidade, no mesmo ponto e tamanho da tela.
    float pull = 1.0 - 0.12 * vShape;
    mv.xyz *= pull;
    mv.xy += position.xy * hs * pxW * pull;
    gl_Position = projectionMatrix * mv;
  }
`;

const ledFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vShape;

  void main() {
    // Nítido: o nó (quadrado). Fora de foco: losango, com a borda um pouco mais clara.
    // D-036: pontos redondos. Em foco, um ponto macio; fora de foco, um disco com a borda mais clara.
    float r = length(vUv);
    float pt = exp(-r * r * 2.6) * (1.0 - smoothstep(0.85, 1.0, r)) * 1.5;
    float disc = (1.0 - smoothstep(0.82, 1.0, r)) * (0.6 + 0.4 * smoothstep(0.45, 0.9, r));
    vec3 c = vCol * mix(pt, disc, vShape);
    if (max(c.r, max(c.g, c.b)) < 0.0004) discard;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/* ───────────────────────── Malhas ───────────────────────── */

function instanced(base: THREE.BufferGeometry, count: number) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.getAttribute('position'));
  const n = base.getAttribute('normal');
  if (n) g.setAttribute('normal', n);
  g.instanceCount = count;
  base.dispose();
  return g;
}

export interface Corridor {
  group: THREE.Group;
  /** O chão fica fora do passe do reflexo. */
  floor: THREE.Mesh;
  /** Instante de saída de cada LED (atualizar depois de mudar leds.hide). */
  ledHide: THREE.InstancedBufferAttribute;
  dispose: () => void;
}

export function createCorridor(
  leds: LedSlots,
  corridor: CorridorUniforms,
  light: LightUniforms,
  haze: HazeUniforms,
  time: { value: number },
  reflection: Reflection,
): Corridor {
  const shared = { ...light, ...haze, ...corridor };
  const material = (vertexShader: string, fragmentShader: string, extra: Record<string, THREE.IUniform> = {}) =>
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...shared, ...extra } });

  // Frente dos racks: um plano por lado, calculado no shader a partir de uAisle e uFloor.
  const rackGeo = instanced(new THREE.PlaneGeometry(1, 1), 2);
  rackGeo.setAttribute('aSide', new THREE.InstancedBufferAttribute(new Float32Array([-1, 1]), 1));
  const rackMat = material(rackVertex, rackFragment);
  rackMat.side = THREE.DoubleSide;
  const racks = new THREE.Mesh(rackGeo, rackMat);

  // Colunas entre os racks.
  const postCount = (RACKS + 1) * 2;
  const postGeo = instanced(new THREE.BoxGeometry(1, 1, 1), postCount);
  const posts = new Float32Array(postCount * 2);
  for (let i = 0; i <= RACKS; i++) {
    posts.set([-1, i], i * 4);
    posts.set([1, i], i * 4 + 2);
  }
  postGeo.setAttribute('aPost', new THREE.InstancedBufferAttribute(posts, 2));
  const postMesh = new THREE.Mesh(postGeo, material(postVertex, postFragment));

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(ceilingVertex, ceilingFragment));
  (ceiling.material as THREE.ShaderMaterial).side = THREE.DoubleSide;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    material(floorVertex, floorFragment, {
      uRefl: { value: reflection.target.texture },
      uTexMat: { value: reflection.matrix },
      uReflK: { value: 1 },
      uStreak: { value: 0.018 },
    }),
  );
  (floor.material as THREE.ShaderMaterial).side = THREE.DoubleSide;

  // LEDs: um quadrado voltado para a câmera por LED.
  const ledGeo = instanced(new THREE.PlaneGeometry(2, 2), leds.count);
  ledGeo.setAttribute('aSlot', new THREE.InstancedBufferAttribute(leds.slots, 4));
  const ledHide = new THREE.InstancedBufferAttribute(leds.hide, 1);
  ledHide.setUsage(THREE.DynamicDrawUsage);
  ledGeo.setAttribute('aHide', ledHide);
  const ledMat = new THREE.ShaderMaterial({
    vertexShader: ledVertex,
    fragmentShader: ledFragment,
    uniforms: { ...light, ...corridor, uTime: time },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);

  // D-036: o corredor de racks sai; ficam o chão polido e os nós soltos no escuro.
  // D-046: o corredor de racks volta (D-014).
  racks.visible = true;
  postMesh.visible = true;
  ceiling.visible = true;

  const group = new THREE.Group();
  for (const m of [racks, postMesh, ceiling, floor, ledMesh]) {
    m.frustumCulled = false;
    group.add(m);
  }

  return {
    group,
    floor,
    ledHide,
    dispose: () => {
      for (const m of [racks, postMesh, ceiling, floor, ledMesh]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}

/** Nome + assinatura: marca a saída de cada LED usado (o mais cedo, se dois nós usam o mesmo LED). */
export function assignLogoLeds(leds: LedSlots, corridor: Corridor, slots: Uint32Array, departs: Float32Array) {
  for (const s of leds.logoPool) leds.hide[s] = NEVER;
  for (let i = 0; i < slots.length; i++) leds.hide[slots[i]] = Math.min(leds.hide[slots[i]], departs[i]);
  corridor.ledHide.needsUpdate = true;
}

/* ───────────────────────── Reflexo do chão (espelho plano) ───────────────────────── */

export interface Reflection {
  target: THREE.WebGLRenderTarget;
  /** Mundo → coordenadas do reflexo (uv projetado). */
  matrix: THREE.Matrix4;
  render: (
    gl: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    floorY: number,
    hide: THREE.Object3D,
    flag: { value: number },
  ) => void;
  dispose: () => void;
}

/**
 * Reflexo do chão: a cena vista por uma câmera espelhada no plano y = floorY, em meia resolução,
 * com mipmaps (desfoque do piso). Cobre só a camada 0: o fundo e o HUD ficam na camada 1.
 */
export function createReflection(gl: THREE.WebGLRenderer): Reflection {
  const type = gl.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const target = new THREE.WebGLRenderTarget(2, 2, {
    type,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: true,
  });
  const cam = new THREE.PerspectiveCamera();
  const matrix = new THREE.Matrix4();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const rot = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = new THREE.Vector3();
  const size = new THREE.Vector2();
  const plane = new THREE.Plane();
  const clip = new THREE.Vector4();
  const q = new THREE.Vector4();
  const normal = new THREE.Vector3(0, 1, 0);
  const point = new THREE.Vector3();
  const clear = new THREE.Color();

  const render: Reflection['render'] = (renderer, scene, camera, floorY, hide, flag) => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(2, Math.round(size.x / 2));
    const h = Math.max(2, Math.round(size.y / 2));
    if (target.width !== w || target.height !== h) target.setSize(w, h);

    // Câmera espelhada (como o Reflector do three.js).
    camera.updateMatrixWorld();
    pos.setFromMatrixPosition(camera.matrixWorld);
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(pos);
    up.set(0, 1, 0).applyMatrix4(rot);
    cam.position.set(pos.x, 2 * floorY - pos.y, pos.z);
    cam.up.set(up.x, -up.y, up.z);
    cam.lookAt(look.x, 2 * floorY - look.y, look.z);
    cam.updateMatrixWorld();
    cam.projectionMatrix.copy(camera.projectionMatrix);
    matrix.copy(bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

    // Plano de corte oblíquo: nada abaixo do chão entra no reflexo.
    plane.setFromNormalAndCoplanarPoint(normal, point.set(0, floorY, 0)).applyMatrix4(cam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const e = cam.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    e[2] = clip.x;
    e[6] = clip.y;
    e[10] = clip.z + 1 - 0.003;
    e[14] = clip.w;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    const prev = renderer.getRenderTarget();
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    hide.visible = false;
    flag.value = 1;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    hide.visible = true;
    flag.value = 0;
    renderer.setRenderTarget(prev);
    renderer.setClearColor(clear, alpha);
  };

  return { target, matrix, render, dispose: () => target.dispose() };
}
