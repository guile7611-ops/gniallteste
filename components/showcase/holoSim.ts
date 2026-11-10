/**
 * Simulação dos pontos do holograma na GPU (D-055). Cada ponto tem um deslocamento e uma velocidade
 * guardados em texturas; a cada quadro:
 *
 * - o cursor empurra os pontos perto dele (para fora e na direção em que andou);
 * - pontos soltos seguem um fluxo de ruído sem divergência (curl), o que dá o ar de líquido;
 * - uma mola fraca, com amortecimento, os traz de volta ao lugar, devagar.
 *
 * Tudo no espaço do holograma (x para a direita, y para cima, z para a frente).
 */
import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

/** Ruído simplex 3D (Ashima/Stefan Gustavson, domínio público) e o curl dele. */
const NOISE = /* glsl */ `
  vec3 m289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 m289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 perm(vec4 x){ return m289(((x * 34.0) + 10.0) * x); }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - 0.5;
    i = m289(i);
    vec4 p = perm(perm(perm(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
    vec4 x_ = floor(j * (1.0 / 7.0));
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
    vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 g0 = vec3(a0.xy, h.x);
    vec3 g1 = vec3(a0.zw, h.y);
    vec3 g2 = vec3(a1.xy, h.z);
    vec3 g3 = vec3(a1.zw, h.w);
    vec4 nr = inversesqrt(vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));
    g0 *= nr.x; g1 *= nr.y; g2 *= nr.z; g3 *= nr.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3)));
  }
  vec3 curl(vec3 p){
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
    vec3 a = vec3(snoise(p), snoise(p + vec3(31.4, 0.0, 0.0)), snoise(p + vec3(0.0, 47.2, 0.0)));
    vec3 ax = vec3(snoise(p + dx), snoise(p + dx + vec3(31.4, 0.0, 0.0)), snoise(p + dx + vec3(0.0, 47.2, 0.0)));
    vec3 ay = vec3(snoise(p + dy), snoise(p + dy + vec3(31.4, 0.0, 0.0)), snoise(p + dy + vec3(0.0, 47.2, 0.0)));
    vec3 az = vec3(snoise(p + dz), snoise(p + dz + vec3(31.4, 0.0, 0.0)), snoise(p + dz + vec3(0.0, 47.2, 0.0)));
    vec3 ddx = (ax - a) / e, ddy = (ay - a) / e, ddz = (az - a) / e;
    return vec3(ddy.z - ddz.y, ddz.x - ddx.z, ddx.y - ddy.x);
  }
`;

const VELOCITY = /* glsl */ `
  uniform sampler2D tHome;
  uniform sampler2D tRand;
  uniform float uDt;
  uniform float uTime;
  uniform vec4 uCursor;    // xy no plano do símbolo, z = força (0..1), w = raio
  uniform vec2 uCursorVel; // unidades/s, já limitada
  uniform float uAgit;     // 0..1: quão agitado (sobe com o cursor, apaga devagar sem ele)
  ${NOISE}
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 home = texture2D(tHome, uv).xyz;
    vec4 rnd = texture2D(tRand, uv);
    vec3 off = texture2D(textureOffset, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;
    vec3 pos = home + off;

    vec3 force = vec3(0.0);
    // Cursor: empurra para fora e no sentido do movimento; cada ponto reage com força diferente
    // (uns poucos voam longe).
    float rad = uCursor.w * (0.7 + 0.6 * rnd.x);
    float d = distance(pos.xy, uCursor.xy);
    float fall = uCursor.z * (1.0 - smoothstep(0.0, rad, d));
    fall *= fall;
    vec2 outw = normalize(pos.xy - uCursor.xy + 1e-4);
    float kick = 0.8 + 2.6 * pow(rnd.w, 2.0);
    force += fall * kick * (vec3(outw * 14.0, (rnd.z - 0.35) * 14.0) + vec3(uCursorVel * 4.0, 0.0));

    // Fluxo de líquido: só para quem está solto e só enquanto há agitação; sem cursor, apaga e a
    // mola vence (o símbolo sempre volta inteiro).
    float loose = smoothstep(0.0, 0.12, length(off));
    vec3 flow = curl(pos * 1.4 + vec3(0.0, uTime * 0.5, uTime * 0.3)) * 1.4;
    force += flow * (0.7 + 0.6 * rnd.y) * max(loose, fall) * uAgit;

    // Mola de volta (fraca perto do cursor, mais firme quando a agitação apaga) e amortecimento.
    float k = mix(11.0 + 5.0 * rnd.y, 1.2 + 1.2 * rnd.y, uAgit) * (1.0 - 0.9 * fall);
    force -= off * k;
    vel += force * uDt;
    vel *= exp(-uDt * mix(5.5, 3.2, uAgit) * (0.85 + 0.3 * rnd.z));
    gl_FragColor = vec4(vel, 1.0);
  }
`;

const OFFSET = /* glsl */ `
  uniform float uDt;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 off = texture2D(textureOffset, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;
    off += vel * uDt;
    // Teto de segurança: nenhum ponto vai embora de vez.
    float l = length(off);
    if (l > 1.1) off *= 1.1 / l;
    gl_FragColor = vec4(off, 1.0);
  }
`;

export interface HoloSim {
  /** Coordenada de cada ponto na textura (atributo `aRef`). */
  ref: Float32Array;
  /** Avança a simulação; deve ser chamada antes de desenhar. */
  step(dt: number, time: number): void;
  /** Textura atual dos deslocamentos. */
  offset(): THREE.Texture;
  cursor: THREE.Vector4;
  cursorVel: THREE.Vector2;
  /** Agitação (0..1), uniforme `uAgit`. */
  agit: { value: number };
  /** Zera deslocamentos e velocidades. */
  reset(): void;
  dispose(): void;
}

export function createHoloSim(
  renderer: THREE.WebGLRenderer,
  position: Float32Array,
  rand: Float32Array,
  count: number,
): HoloSim | null {
  const side = Math.ceil(Math.sqrt(count));
  const gpu = new GPUComputationRenderer(side, side, renderer);
  const home = gpu.createTexture();
  const rnd = gpu.createTexture();
  const hd = home.image.data as Float32Array;
  const rd = rnd.image.data as Float32Array;
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    hd[i * 4] = position[i * 3];
    hd[i * 4 + 1] = position[i * 3 + 1];
    hd[i * 4 + 2] = position[i * 3 + 2];
    hd[i * 4 + 3] = 1;
    rd[i * 4] = rand[i * 4];
    rd[i * 4 + 1] = rand[i * 4 + 1];
    rd[i * 4 + 2] = rand[i * 4 + 2];
    rd[i * 4 + 3] = rand[i * 4 + 3];
    ref[i * 2] = ((i % side) + 0.5) / side;
    ref[i * 2 + 1] = (Math.floor(i / side) + 0.5) / side;
  }
  const off0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  const vel: Variable = gpu.addVariable('textureVelocity', VELOCITY, vel0);
  const off: Variable = gpu.addVariable('textureOffset', OFFSET, off0);
  gpu.setVariableDependencies(vel, [vel, off]);
  gpu.setVariableDependencies(off, [vel, off]);
  const cursor = new THREE.Vector4(0, 0, 0, 0.5);
  const cursorVel = new THREE.Vector2();
  const vu = vel.material.uniforms;
  vu.tHome = { value: home };
  vu.tRand = { value: rnd };
  vu.uDt = { value: 0 };
  vu.uTime = { value: 0 };
  vu.uCursor = { value: cursor };
  vu.uCursorVel = { value: cursorVel };
  vu.uAgit = { value: 0 };
  off.material.uniforms.uDt = { value: 0 };
  if (gpu.init() !== null) {
    gpu.dispose();
    home.dispose();
    rnd.dispose();
    return null;
  }
  const clear = () => {
    gpu.renderTexture(off0, off.renderTargets[0]);
    gpu.renderTexture(off0, off.renderTargets[1]);
    gpu.renderTexture(vel0, vel.renderTargets[0]);
    gpu.renderTexture(vel0, vel.renderTargets[1]);
  };
  return {
    ref,
    cursor,
    cursorVel,
    agit: vu.uAgit,
    step(dt, time) {
      // Passos de no máximo 1/60 s: a mola e o fluxo ficam estáveis em qualquer taxa de quadros.
      const n = Math.min(4, Math.max(1, Math.ceil(dt * 60 - 1e-3)));
      const h = dt / n;
      vu.uDt.value = h;
      off.material.uniforms.uDt.value = h;
      for (let i = 0; i < n; i++) {
        vu.uTime.value = time - (n - 1 - i) * h;
        gpu.compute();
      }
    },
    offset: () => gpu.getCurrentRenderTarget(off).texture,
    reset: clear,
    dispose() {
      gpu.dispose();
      home.dispose();
      rnd.dispose();
      off0.dispose();
      vel0.dispose();
    },
  };
}
