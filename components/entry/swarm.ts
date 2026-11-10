/**
 * Enxame de nós (D-011, direção A; partida nos LEDs do data center desde a D-014): os LEDs dos
 * racks se soltam e voam até os alvos dentro do volume das 4 peças do símbolo oficial.
 * Antes de partir, cada nó é o próprio LED (datacenter.ts): mesma posição, mesma cor. O LED do
 * rack apaga no instante em que o nó sai (leds.hide) e acende de novo depois do commit.
 *
 * Um único InstancedMesh-like (InstancedBufferGeometry + ShaderMaterial): a posição de cada nó
 * é calculada no vertex shader a partir do tempo, sem atualizar buffers por quadro.
 *
 * Espaço: o do grupo do símbolo (field.ts). O LED vem do mundo por uWorldOrigin / uWorldUnit.
 */
import * as THREE from 'three';
import { type CorridorUniforms, corridorGlsl, type LedSlots, ledZ } from './datacenter';
import { type FieldUniforms, fieldFragmentGlsl, fieldVertexGlsl, nodeInstancedGeometry, rng } from './field';
import type { PieceDef } from './pieces';

export interface SwarmTiming {
  /** Primeira partida (s). */
  depart: number;
  /** Espalhamento das partidas, dos LEDs perto do logo para os do fundo (s). */
  spread: number;
  /** Duração média do voo (s). */
  flight: number;
}

export interface Swarm {
  geometry: THREE.InstancedBufferGeometry;
  count: number;
  /** Último pouso (s). */
  lastLanding: number;
}

/** Nós pareados em blocos: dentro do bloco, o LED mais alto vai para o alvo mais alto. */
const CHUNK = 48;

/**
 * Pareia cada alvo do símbolo com um LED do grupo do enxame e marca a saída do LED em leds.hide.
 * O pareamento não depende do tamanho da tela (lado, altura e z do LED são fixos).
 */
export function buildSwarm(pieces: PieceDef[], timing: SwarmTiming, leds: LedSlots): Swarm {
  const rand = rng(0x6e1a11);

  // ── Alvos (local da peça) e posição no símbolo parado
  type Target = { piece: number; x: number; y: number; z: number; sx: number; sy: number; rad: number };
  const targets: Target[] = [];
  pieces.forEach((p, piece) => {
    for (let i = 0; i < p.targets.length; i += 3) {
      const x = p.targets[i];
      const y = p.targets[i + 1];
      const sx = x + p.center.x;
      const sy = y + p.center.y;
      targets.push({ piece, x, y, z: p.targets[i + 2], sx, sy, rad: Math.hypot(sx, sy) });
    }
  });
  const n = targets.length;

  // ── LEDs de partida (repete se faltar LED na janela)
  const pool = leds.swarmPool;
  const m = Math.max(pool.length, 1);
  type Src = { slot: number; side: number; h: number; d: number };
  const srcs: Src[] = [];
  for (let i = 0; i < n; i++) {
    const slot = pool.length ? pool[i % m] : 0;
    srcs.push({ slot, side: leds.slots[slot * 4], h: leds.slots[slot * 4 + 2], d: Math.abs(ledZ(leds, slot)) });
  }

  // ── Pares: a parede da esquerda monta a metade esquerda do símbolo. Em cada lado, os LEDs mais
  // perto do logo (que saem primeiro) vão para os alvos de dentro; no bloco, por altura.
  targets.sort((a, b) => a.sx - b.sx);
  const left = srcs.filter((s) => s.side < 0);
  const right = srcs.filter((s) => s.side >= 0);
  const pairs: [Target, Src][] = [];
  const pairSide = (ts: Target[], ss: Src[]) => {
    ts.sort((a, b) => a.rad - b.rad);
    ss.sort((a, b) => a.d - b.d);
    for (let i = 0; i < ts.length; i += CHUNK) {
      const tc = ts.slice(i, i + CHUNK).sort((a, b) => a.sy - b.sy);
      const sc = ss.slice(i, i + CHUNK).sort((a, b) => a.h - b.h);
      tc.forEach((t, j) => pairs.push([t, sc[j]]));
    }
  };
  pairSide(targets.slice(0, left.length), left);
  pairSide(targets.slice(left.length), right);

  let dMin = Infinity;
  let dMax = -Infinity;
  for (const s of srcs) {
    dMin = Math.min(dMin, s.d);
    dMax = Math.max(dMax, s.d);
  }
  const dSpan = dMax > dMin ? dMax - dMin : 1;

  const aSlot = new Float32Array(n * 4);
  const aTarget = new Float32Array(n * 3);
  const aPiece = new Float32Array(n);
  const aMeta = new Float32Array(n * 4);
  let lastLanding = 0;
  pairs.forEach(([t, s], i) => {
    aSlot.set(leds.slots.subarray(s.slot * 4, s.slot * 4 + 4), i * 4);
    aTarget.set([t.x, t.y, t.z], i * 3);
    aPiece[i] = t.piece;
    // Sai na ordem em que a energia chegou (do logo para o fundo); quem vem de longe voa mais.
    const dn = (s.d - dMin) / dSpan;
    const depart = timing.depart + timing.spread * dn + rand() * 0.05;
    const dur = timing.flight * (0.85 + 0.25 * dn) * (0.95 + rand() * 0.1);
    lastLanding = Math.max(lastLanding, depart + dur);
    aMeta.set([depart, dur, (rand() - 0.5) * 2, 0], i * 4);
    leds.hide[s.slot] = Math.min(leds.hide[s.slot], depart);
  });

  const geometry = nodeInstancedGeometry(n);
  geometry.setAttribute('aSlot', new THREE.InstancedBufferAttribute(aSlot, 4));
  geometry.setAttribute('aTarget', new THREE.InstancedBufferAttribute(aTarget, 3));
  geometry.setAttribute('aPiece', new THREE.InstancedBufferAttribute(aPiece, 1));
  geometry.setAttribute('aMeta', new THREE.InstancedBufferAttribute(aMeta, 4));
  return { geometry, count: n, lastLanding };
}

/* ───────────────────────── Shader ───────────────────────── */

export function createSwarmUniforms(field: FieldUniforms, corridor: CorridorUniforms) {
  return {
    ...field,
    ...corridor,
    uPiece: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
    uFront: { value: -1e5 },
    uCube: { value: 4 },
    uHeat: { value: 1.6 },
  };
}

export type SwarmUniforms = ReturnType<typeof createSwarmUniforms>;

const swarmVertex = /* glsl */ `
  ${fieldVertexGlsl}
  ${corridorGlsl}
  uniform mat4 uPiece[4];
  uniform float uFront;    // frente da varredura do commit (q = (x + y)·√½, vb)
  uniform float uCube;     // meio-lado do nó em voo e pousado (vb)

  attribute vec4 aSlot;    // LED de partida (datacenter.ts)
  attribute vec3 aTarget;  // alvo no espaço local da peça (vb)
  attribute float aPiece;
  attribute vec4 aMeta;    // partida (s), duração (s), giro (−1..1), —

  varying vec3 vN;
  varying float vT;
  varying float vHeat;
  varying float vGlow;
  varying vec3 vLed;
  varying float vFog;

  void main() {
    vec3 w0 = ledWorld(aSlot);
    vec3 p0 = (w0 - uWorldOrigin) / uWorldUnit;
    vec3 p2 = (uPiece[int(aPiece + 0.5)] * vec4(aTarget, 1.0)).xyz;

    float t = clamp((uTime - aMeta.x) / aMeta.y, 0.0, 1.0);
    float e = easeInOutCubic(t);

    // Arco: sai do rack para o corredor, gira de lado e sobe um pouco.
    vec3 d = p2 - p0;
    float len = length(d);
    vec2 sxz = length(d.xz) > 0.001 ? normalize(vec2(-d.z, d.x)) : vec2(0.0);
    vec3 p1 = (p0 + p2) * 0.5 + vec3(sxz.x, 0.0, sxz.y) * len * 0.22 * aMeta.z + vec3(0.0, len * 0.12 + 40.0, 0.0);
    vec3 c = mix(mix(p0, p1, e), mix(p1, p2, e), e);

    // Existe a partir da saída (no mesmo instante, o LED do rack apaga).
    float alive = step(aMeta.x, uTime) * powerLit(w0);

    // Some quando a varredura do commit passa (o metal assume no mesmo ponto).
    float qn = (c.x + c.y) * R;
    float scanned = 1.0 - smoothstep(uFront - 6.0, uFront + 6.0, qn);
    float ahead = (qn - uFront) / 22.0;

    float grow = smoothstep(0.0, 0.3, t);
    float h = mix(uLed / uWorldUnit, uCube, grow) * alive * (1.0 - scanned);
    vec4 wp = modelMatrix * vec4(c + position * h, 1.0);

    vN = normal;
    vT = t;
    vHeat = t > 0.0 && t < 1.0 ? sin(3.14159265 * t) : 0.0;
    vGlow = exp(-ahead * ahead) * step(1.0, t) * step(-1e4, uFront);
    vLed = ledColor(aSlot.w);
    // Névoa do corredor no caminho; pousado, o nó fica na cor dele.
    vFog = fogAt(wp.xyz, length(cameraPosition - wp.xyz)) * (1.0 - smoothstep(0.0, 0.6, t));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const swarmFragment = /* glsl */ `
  ${fieldFragmentGlsl}
  uniform float uHeat;

  varying vec3 vN;
  varying float vT;
  varying float vHeat;
  varying float vGlow;
  varying vec3 vLed;
  varying float vFog;

  void main() {
    vec3 landed = uAccent * 0.82 * lambert(vN);
    vec3 col = mix(vLed, landed, smoothstep(0.0, 0.45, vT)) + uAccent * (vHeat * uHeat + vGlow * 1.4);
    gl_FragColor = vec4(mix(col, uFogColor, vFog), 1.0);
  }
`;

export function createSwarmMaterial(uniforms: SwarmUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ vertexShader: swarmVertex, fragmentShader: swarmFragment, uniforms: { ...uniforms } });
}
