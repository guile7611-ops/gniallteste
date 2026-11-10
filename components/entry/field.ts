/**
 * Campo de nós (D-012): o que as partículas da entrada têm em comum.
 *
 * - Enxame do símbolo (swarm.ts) e partículas do logo (logoParticles.ts) vivem no espaço do
 *   grupo do símbolo: unidades do viewBox do logo vertical, origem no centro do símbolo, y para
 *   cima, z saindo do chão em direção à câmera final. O fundo é o corredor do data center
 *   (datacenter.ts, D-014), em coordenadas de mundo; os nós partem dos LEDs dele.
 * - Os uniforms abaixo são objetos únicos, compartilhados por referência entre os materiais:
 *   atualizar um valor por quadro atualiza todos.
 *
 * Origem no conceito da marca: as partículas são nós (pequenos quadrados); o campo, a revelação
 * e as ondas de commit são losangos (distância L1, a geometria da matriz 45°); as ondas
 * empurram os nós na diagonal da matriz.
 */
import * as THREE from 'three';

/** Gerador determinístico (mulberry32): o campo é igual em toda visita. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFieldUniforms(colors: { fog: string; line: string; lineHi: string; accent: string }) {
  return {
    uTime: { value: 0 },
    /** Raio L1 da revelação (vb) e brilho da frente (0..1). */
    uDraw: { value: 0 },
    uEdge: { value: 0 },
    /** Câmera no espaço do grupo (vb): projeta os nós no chão para o cursor e o texto. */
    uCamLocal: { value: new THREE.Vector3(0, 0, 1e4) },
    /** Cursor no chão (vb) e presença 0..1; raio de alcance no campo (vb). */
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uMouseR: { value: 200 },
    /** Ondas de commit: xy origem, z raio (vb); amplitude; largura e empurrão (vb). */
    uWaveA: { value: new THREE.Vector3() },
    uWaveAAmp: { value: 0 },
    uWaveB: { value: new THREE.Vector3() },
    uWaveBAmp: { value: 0 },
    uWaveW: { value: 60 },
    uWavePush: { value: 40 },
    /** Zona calma atrás do nome, da assinatura e do texto: centro e meia-largura/altura (vb). */
    uQuiet: { value: new THREE.Vector4(-1e5, -1e5, 0, 0) },
    uQuietFade: { value: 150 },
    uCalmK: { value: 1 },
    /** Só o bloco de texto (vb): os nós do logo que se soltam não passam por baixo dele. */
    uCopy: { value: new THREE.Vector4(-1e5, -1e5, 0, 0) },
    /** Meio-lado base de um nó do campo (vb). */
    uNode: { value: 3 },
    /** Profundidade de vista (mundo) em que o nó some perto da câmera: início, fim. */
    uNear: { value: new THREE.Vector2(0.1, 0.5) },
    /** Névoa radial em volta do símbolo (vb), só durante a grua. */
    uFog: { value: new THREE.Vector2(1e4, 2e4) },
    uFogK: { value: 0 },
    uFogColor: { value: new THREE.Color(colors.fog) },
    uLine: { value: new THREE.Color(colors.line) },
    uLineHi: { value: new THREE.Color(colors.lineHi) },
    uAccent: { value: new THREE.Color(colors.accent) },
    uWhite: { value: new THREE.Color('#ffffff') },
  };
}

export type FieldUniforms = ReturnType<typeof createFieldUniforms>;

/** Declarações e funções do campo, para os vertex shaders. */
export const fieldVertexGlsl = /* glsl */ `
  uniform float uTime;
  uniform float uDraw;
  uniform float uEdge;
  uniform vec3 uCamLocal;
  uniform vec3 uMouse;
  uniform float uMouseR;
  uniform vec3 uWaveA;
  uniform float uWaveAAmp;
  uniform vec3 uWaveB;
  uniform float uWaveBAmp;
  uniform float uWaveW;
  uniform float uWavePush;
  uniform vec4 uQuiet;
  uniform float uQuietFade;
  uniform float uCalmK;
  uniform vec4 uCopy;
  uniform float uNode;
  uniform vec2 uNear;
  uniform vec2 uFog;
  uniform float uFogK;

  const float R = 0.70710678;

  float l1(vec2 v) { return abs(v.x) + abs(v.y); }

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  // (0..1)² → losango de raio L1 1 (o quadrado girado 45°), com densidade uniforme.
  vec2 diamond(vec2 uv) {
    vec2 q = uv * 2.0 - 1.0;
    return vec2(q.x - q.y, q.x + q.y) * 0.5;
  }

  // Ponto do chão (z = 0) que a câmera vê atrás do nó: é ali que o cursor e o texto estão.
  vec2 toPlane(vec3 p) {
    float s = uCamLocal.z / max(uCamLocal.z - p.z, 1.0);
    return uCamLocal.xy + (p.xy - uCamLocal.xy) * s;
  }

  // Revelação em losango a partir do centro do símbolo.
  float revealLit(vec2 p) { return 1.0 - smoothstep(uDraw - 60.0, uDraw, l1(p)); }
  float revealEdge(vec2 p) {
    float d = (l1(p) - uDraw) / 45.0;
    return exp(-d * d) * uEdge;
  }

  // Onda de commit em losango: empurra na diagonal da matriz (normal do losango).
  // xy = deslocamento (vb), z = intensidade 0..1 na frente da onda.
  vec3 wave(vec2 p, vec3 w, float amp) {
    if (amp <= 0.0) return vec3(0.0);
    vec2 d = p - w.xy;
    float x = (l1(d) - w.z) / uWaveW;
    float g = exp(-x * x) * amp;
    vec2 dir = vec2(d.x >= 0.0 ? 1.0 : -1.0, d.y >= 0.0 ? 1.0 : -1.0) * R;
    return vec3(dir * g * uWavePush, g);
  }

  // Cursor: afasta o nó no chão. xy = deslocamento (vb), z = proximidade 0..1.
  vec3 repel(vec2 pp) {
    vec2 d = pp - uMouse.xy;
    float dl = length(d);
    float m = 1.0 - smoothstep(0.0, uMouseR, dl);
    m *= m * uMouse.z;
    vec2 dir = dl > 1e-3 ? d / dl : vec2(0.0);
    return vec3(dir * m * uMouseR * 0.35, m);
  }

  // 1 longe do texto; 0 atrás do nome, da assinatura e do texto (com a zona calma ligada).
  float calmAt(vec2 pp) {
    float qd = sdBox(pp - uQuiet.xy, uQuiet.zw);
    return 1.0 - uCalmK * (1.0 - smoothstep(0.0, uQuietFade, qd));
  }

  // x = escala por proximidade da câmera (0 colado nela), y = névoa (0..1).
  vec2 depthFade(vec3 p) {
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float near = smoothstep(uNear.x, uNear.y, -mv.z);
    float fog = smoothstep(uFog.x, uFog.y, length(p.xy)) * uFogK;
    return vec2(near * (1.0 - fog * 0.6), fog);
  }

  // Meio-lado de um nó do campo, a partir da semente.
  float nodeSize(float seed) { return uNode * mix(0.55, 1.25, fract(seed * 13.7)); }

  vec3 rotZ(vec3 v, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
  }

  vec3 rotX(vec3 v, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
  }
`;

/** Cor e luz de um nó, para os fragment shaders. */
export const fieldFragmentGlsl = /* glsl */ `
  uniform vec3 uFogColor;
  uniform vec3 uLine;
  uniform vec3 uLineHi;
  uniform vec3 uAccent;
  uniform vec3 uWhite;

  // Nó apagado: entre a borda (#29415B) e o texto secundário (#B7C5D4); alguns mais claros.
  vec3 nodeColor(float bright) {
    float k = 0.12 + 0.3 * bright + step(0.94, bright) * 0.35;
    return mix(uLine * 1.4, uLineHi, k);
  }

  float lambert(vec3 n) {
    return 0.55 + 0.45 * max(dot(normalize(n), normalize(vec3(-0.35, -0.55, 0.76))), 0.0);
  }
`;

/** Um cubo de lado 2 (de −1 a 1) instanciado: a base de todo nó. */
export function nodeInstancedGeometry(count: number) {
  const box = new THREE.BoxGeometry(2, 2, 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = box.index;
  geometry.setAttribute('position', box.getAttribute('position'));
  geometry.setAttribute('normal', box.getAttribute('normal'));
  geometry.instanceCount = count;
  box.dispose();
  return geometry;
}
