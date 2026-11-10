/**
 * Luz da cena (D-013): foco no logo, dois feixes nas diagonais da matriz e a luz do cursor.
 * Desde a D-014, a mesma névoa do fundo cobre o que está longe no corredor do data center.
 *
 * - Tudo em px CSS da tela, y para cima: o fundo, o campo de nós e os nós em profundidade recebem
 *   a mesma luz, calculada no mesmo lugar.
 * - Os uniforms são objetos únicos, compartilhados por referência entre os materiais.
 *
 * Origem no conceito da marca: os feixes descem pelas diagonais da matriz 45° e se encontram no
 * logo; a luz do cursor é a mesma que corre pelo metal. A luz é branca: o azul fica mais claro,
 * sem cor nova.
 */
import * as THREE from 'three';
import { descentGlsl } from './descent';

export function createLightUniforms(light: string) {
  return {
    /** Tamanho da tela (px CSS) e densidade de pixels (gl_FragCoord → px CSS). */
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    /** Centro do foco (px, y para cima) e raio (px). */
    uLightPx: { value: new THREE.Vector2() },
    uLightR: { value: 300 },
    /** Foco e feixes: 0 apagado, 1 aceso (sobem uma vez na intro). */
    uFocusK: { value: 0 },
    uBeamK: { value: 0 },
    /** Meia-largura do feixe junto ao logo (px) e comprimento até a fonte (px). */
    uBeamW: { value: 200 },
    uBeamLen: { value: 900 },
    /** Luz de fundo dos nós: 1 na intro; menor quando o foco acende. */
    uAmbient: { value: 1 },
    /** Cursor (px, y para cima) e presença 0..1; raio (px). */
    uCursorPx: { value: new THREE.Vector3() },
    uCursorR: { value: 240 },
    uLightCol: { value: new THREE.Color(light) },
    /**
     * Corte da passagem para o Sobre (D-015), em px CSS com y para baixo: x = c da linha
     * (lado do Sobre: x + y > c), y = largura da borda, z = lado da célula, w = ligado (0/1).
     */
    uCut: { value: new THREE.Vector4(1e5, 1, 1, 0) },
    /** Segundo corte (D-019): da descida para o Sobre, no mesmo formato de uCut. */
    uCutB: { value: new THREE.Vector4(1e5, 1, 1, 0) },
    /** Luz suave atrás do símbolo no Sobre: centro (px, y para baixo), raio (px), intensidade. */
    uSobre: { value: new THREE.Vector4(0, 0, 1, 0) },
    /** Fundo do Sobre (D-034): cursor (px CSS, y para baixo), presença do cursor 0..1, tempo (s). */
    uSobreFx: { value: new THREE.Vector4(0, 0, 0, 0) },
    /** Nós da borda do corte: entre a borda e o texto secundário; alguns em ciano (acento). */
    uNodeCol: { value: new THREE.Color('#B7C5D4') },
    uNodeAccent: { value: new THREE.Color('#00D2D3') },
  };
}

export type LightUniforms = ReturnType<typeof createLightUniforms>;

/**
 * Corte diagonal da passagem para o Sobre (D-015), na matriz 45°: a tela vira células em losango;
 * a linha "/" separa o data center (acima e à esquerda) do Sobre (abaixo e à direita). Na borda,
 * cada célula troca de lado numa hora diferente e algumas viram nós. Tudo é função da posição e
 * da rolagem (nada anima sozinho).
 *
 * cutAt(px CSS, y para baixo) → x = lado do Sobre (0/1), y = nó (0/1), z = nó em ciano (0/1).
 * Desde a D-019 há dois cortes: uCut (A) leva da entrada para a descida e uCutB, da descida para
 * o Sobre. cutAt é o corte A; cutWith(corte, px) serve para os dois.
 */
export const cutGlsl = /* glsl */ `
  uniform vec4 uCut;

  float cutHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  vec3 cutWith(vec4 c, vec2 pd) {
    if (c.w < 0.5) return vec3(0.0);
    vec2 uv = vec2(pd.x + pd.y, pd.x - pd.y) * (0.70710678 / c.z);
    vec2 cell = floor(uv);
    vec2 f = uv - cell - 0.5;
    float d = ((cell.x + 0.5) * c.z * 1.41421356 - c.x) / c.y;
    // D-033: a borda falha. c.w - 1 é o tempo (s); cada célula sorteia de novo em passos de 0,4 s
    // (fase própria), então nenhum nó troca mais de 2,5 vezes por segundo (SC 2.3.1).
    float t = max(c.w - 1.0, 0.0);
    float h0 = cutHash(cell + vec2(17.31, 5.17));
    float k = floor(t * 2.5 + h0 * 13.0);
    float ks = floor(t * 1.5 + h0 * 7.0);
    float side = d >= 0.5 ? 1.0 : (d <= -0.5 ? 0.0 : step(cutHash(cell + vec2(ks * 3.1, ks * 0.7)), d + 0.5));
    float h = cutHash(cell + vec2(17.31 + k * 1.37, 5.17 + k * 0.29));
    float inner = step(max(abs(f.x), abs(f.y)), 0.21);
    float node = inner * step(h, 0.45) * (1.0 - smoothstep(0.35, 0.9, abs(d)));
    return vec3(side, node, step(h, 0.036));
  }

  vec3 cutAt(vec2 pd) { return cutWith(uCut, pd); }
`;

/** Declarações e funções de luz (vertex e fragment). */
export const lightGlsl = /* glsl */ `
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec2 uLightPx;
  uniform float uLightR;
  uniform float uFocusK;
  uniform float uBeamK;
  uniform float uBeamW;
  uniform float uBeamLen;
  uniform float uAmbient;
  uniform vec3 uCursorPx;
  uniform float uCursorR;
  uniform vec3 uLightCol;
  uniform vec4 uSobre;
  uniform vec4 uSobreFx;
  uniform vec3 uNodeCol;
  uniform vec3 uNodeAccent;
  ${cutGlsl}

  // Nó da borda do corte por cima da cor (cut = cutAt(...)).
  vec3 cutNode(vec3 col, vec3 cut) {
    vec3 nc = mix(uNodeCol * 0.5, uNodeAccent * 0.85, cut.z);
    return mix(col, nc, cut.y);
  }

  float lHash(float n) { return fract(sin(n) * 43758.5453); }
  float lNoise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(lHash(i), lHash(i + 1.0), f * f * (3.0 - 2.0 * f));
  }

  // Um feixe que desce por uma diagonal da matriz até o logo. Estreito na fonte e largo no logo,
  // com raios fixos (ruído na largura); some logo abaixo do centro do foco.
  float lightBeam(vec2 rel, vec2 dir, float seed) {
    float along = dot(rel, dir);
    float across = dot(rel, vec2(dir.y, -dir.x));
    float k = clamp(along / uBeamLen, 0.0, 1.0);
    float x = across / (uBeamW * (1.0 - 0.72 * k));
    float rays = 0.65 + 0.7 * lNoise(x * 4.0 + seed) * lNoise(x * 11.0 + seed * 3.1);
    float len = smoothstep(-0.6 * uBeamW, 0.5 * uBeamW, along) * (1.0 - smoothstep(0.8, 1.2, along / uBeamLen));
    return exp(-x * x * 1.7) * rays * len * mix(0.8, 1.0, k);
  }

  float beamsAt(vec2 px) {
    if (uBeamK <= 0.0) return 0.0;
    vec2 rel = px - uLightPx;
    const float D = 0.70710678;
    return (lightBeam(rel, vec2(-D, D), 1.7) + lightBeam(rel, vec2(D, D), 7.3)) * uBeamK;
  }

  float focusAt(vec2 px) {
    vec2 d = (px - uLightPx) / uLightR;
    return exp(-dot(d, d)) * uFocusK;
  }

  float cursorAt(vec2 px) {
    vec2 d = (px - uCursorPx.xy) / uCursorR;
    return exp(-dot(d, d)) * uCursorPx.z;
  }

  // Luz total sobre um nó.
  float sceneLight(vec2 px) {
    return uAmbient + 1.1 * focusAt(px) + 0.9 * beamsAt(px) + 0.7 * cursorAt(px);
  }

  vec2 clipToPx(vec4 clip) { return (clip.xy / clip.w * 0.5 + 0.5) * uRes; }
`;

/* ───────────────────────── Névoa: o fundo e o que está longe no corredor ───────────────────────── */

/** Cores da névoa (fundo). Objetos únicos, compartilhados pelo fundo e pelo corredor (D-014). */
export function createHazeUniforms(bg: string, bgDeep: string) {
  return {
    uBg: { value: new THREE.Color(bg) },
    uBgDeep: { value: new THREE.Color(bgDeep) },
    /** D-038: o vazio da tela de entrada (quase preto, puxado para o azul) e a luz fria no canto. */
    uVoid: { value: new THREE.Color('#0A1216') },
    uVoidDeep: { value: new THREE.Color('#040708') },
    uVoidHi: { value: new THREE.Color('#17364A') },
    /** 0..1: mais profundo durante a entrada da câmera. */
    uDeep: { value: 0 },
  };
}

export type HazeUniforms = ReturnType<typeof createHazeUniforms>;

/**
 * Cor da névoa num pixel (px CSS, y para cima): Azul Noturno Soberano no centro, mais profundo
 * nas bordas, clareado pelo foco e pelos feixes. O fundo é essa cor; no corredor, o que está longe
 * se mistura com ela. Depende de lightGlsl.
 */
export const hazeGlsl = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uVoid;
  uniform vec3 uVoidDeep;
  uniform vec3 uVoidHi;
  uniform float uDeep;

  vec3 hazeAt(vec2 px) {
    vec2 uv = px / uRes - 0.5;
    uv.x *= uRes.x / uRes.y;
    float vig = smoothstep(0.3, 1.05, length(uv));
    // D-046: de volta ao Azul Noturno do data center (D-014).
    vec3 col = mix(uBg, uBgDeep, vig * 0.9);
    // Luz branca na névoa: o próprio azul clareia (multiplica) e ganha um pouco da luz.
    float f = focusAt(px);
    float b = beamsAt(px);
    col = col * (1.0 + 1.5 * f + 1.1 * b) + uLightCol * (0.006 * f + 0.005 * b);
    return mix(col, uBgDeep, uDeep);
  }

  float sobreHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

  // Fundo do Sobre (px CSS, y para baixo), D-034: Azul Noturno com a luz suave atrás do símbolo e
  // um brilho de metal escovado (sem grade).
  vec3 sobreAt(vec2 pd) {
    vec2 d = (pd - uSobre.xy) / max(uSobre.z, 1.0);
    float r = mix(length(d), (abs(d.x) + abs(d.y)) * 0.70710678, 0.55);
    float l = exp(-r * r * 1.6) * uSobre.w;
    // D-039: fundo quase preto, com uma luz fria que entra pela esquerda (mais forte em cima).
    vec3 col = uVoid * (1.0 + 0.8 * l) + uLightCol * 0.0035 * l;
    float gx = pd.x / (uRes.x * 0.3);
    col += uVoidHi * exp(-gx * gx) * (0.35 + 0.65 * (1.0 - pd.y / uRes.y));

    // D-034: luz em metal escovado. Fios finos horizontais (ruído esticado ao longo de x) só
    // aparecem onde a luz bate: um reflexo largo e alongado que segue o cursor, a luz do símbolo e
    // um brilho diagonal que passa devagar, como luz correndo numa chapa polida.
    float t = uSobreFx.w;
    float row = floor(pd.y / 1.5);
    float brush = 0.55 + 0.45 * sobreHash(vec2(row, floor(pd.x / 260.0 + sobreHash(vec2(row, 1.0)) * 4.0)));
    brush = mix(brush, 0.55 + 0.45 * sobreHash(vec2(row + 0.5, 7.0)), 0.5);
    vec2 cd = (pd - uSobreFx.xy) / vec2(520.0, 170.0);
    float spec = exp(-dot(cd, cd) * 1.6) * uSobreFx.z;
    float diag = (pd.x - pd.y * 0.6) / max(uRes.x, 1.0);
    float pos = fract(t / 12.0) * 2.4 - 0.7;
    float sweep = exp(-pow((diag - pos) / 0.09, 2.0)) * (0.6 + 0.4 * sin(t * 0.3));
    float wide = 0.5 + 0.5 * sin(pd.y / max(uRes.y, 1.0) * 3.1 + t * 0.12);
    float lit = 0.35 * l + 0.9 * spec + 0.55 * sweep + 0.12 * wide;
    vec3 metal = mix(vec3(0.20, 0.27, 0.36), vec3(0.62, 0.70, 0.78), brush);
    col += metal * lit * 0.085 * (0.6 + 0.4 * brush);
    col += uNodeAccent * 0.008 * spec;
    return col;
  }
`;

export const backgroundVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fundo: data center até o corte A, descida (D-019) entre os dois cortes e Sobre depois do corte B.
 * Os nós das bordas dos dois cortes ficam por cima.
 */
export const backgroundFragment = /* glsl */ `
  precision highp float;
  ${lightGlsl}
  ${hazeGlsl}
  uniform vec4 uCutB;
  ${descentGlsl}

  void main() {
    vec2 px = gl_FragCoord.xy / uDpr;
    vec2 pd = vec2(px.x, uRes.y - px.y);
    vec3 cutA = cutAt(pd);
    vec3 cutB = cutWith(uCutB, pd);
    vec3 col = cutA.x < 0.5 ? hazeAt(px) : (cutB.x > 0.5 ? sobreAt(pd) : descentAt(pd));
    col = cutNode(col, cutA);
    col = cutNode(col, cutB);
    // Pontilhado fino contra faixas no degradê escuro (fixo: não anima).
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.0016;
    gl_FragColor = vec4(col, 1.0);
  }
`;
