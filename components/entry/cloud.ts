/**
 * Partículas da descida (D-019, D-020, D-022): a câmera desce por uma pluma de nós em volta do eixo do
 * símbolo, no modelo das partículas do Active Theory (estudado nos shaders públicos do site deles;
 * implementação nossa).
 *
 * O que dá o visual:
 * - nós pequenos (1 a 5 px), redondos; os maiores viram bolhas com sombreado de esfera, iluminadas
 *   do lado da luz mais forte (lado claro, brilho especular e borda);
 * - tamanhos sorteados (quase todos pequenos), "respiração" do tamanho e brilho que sobe e some
 *   devagar, nó a nó; uma parte some de vez por alguns segundos;
 * - cor: cada nó pega o tom de UMA das luzes da descida (D-019), sorteada com peso pela distância,
 *   o que forma lobos de cor em volta do símbolo; uma parte (OWN_HUE) tem cor própria da paleta.
 *   Acende forte quando uma luz passa e, perto do centro dela, puxa para o branco;
 * - a pluma: fitas de nós em hélice em volta do eixo do símbolo (como o borrifo em volta da fita
 *   do Active Theory), densas no miolo, em aglomerados e vazios, com borrifo para fora; uma coluna
 *   rala em volta do símbolo, nós soltos pelo volume e uma camada funda bem pequena;
 * - ciclo de vida: cada nó nasce no seu lugar da pluma, é levado por um fluxo e apaga, e renasce no
 *   lugar;
 * - fluxo de fluido (D-032): a posição de cada nó é simulada na GPU (uma textura com o desvio e a
 *   idade de cada nó, atualizada a cada quadro). A velocidade vem de um campo sem divergência (o
 *   rotacional de um ruído, em duas escalas), de um giro em volta do eixo do símbolo e de uma subida
 *   leve. Vizinhos andam juntos, então as fitas ondulam e soltam fios, como fumaça;
 * - profundidade de campo (D-032): o plano do símbolo é o plano de foco. Fora dele, o nó vira um
 *   disco maior, macio e mais fraco (a mesma luz numa área maior), com a borda um pouco mais clara;
 * - mistura aditiva: os nós somam luz por cima do vídeo (o brilho de cada um tem teto em vCol).
 *
 * Origem no conceito da marca: os nós (D-022 registra que, na descida, o dono da marca preferiu o nó
 * redondo e pequeno do modelo de referência ao losango).
 *
 * Cursor (como no Active Theory, D-023): o movimento do cursor solta traços finos ao longo do caminho,
 * com a cabeça branca e a cauda de uma das cores da descida (mais vezes o rosa). Cada traço sai no
 * sentido do movimento, um pouco aberto para os lados, freia, faz uma curva leve, se estica e apaga
 * em 1 a 2 s. A nuvem não se deforma: o cursor só a desloca um pouco pela profundidade (paralaxe).
 *
 * Rolagem: a câmera desce pela pluma e gira um pouco em volta do eixo do símbolo. Os nós não se
 * esticam nem borram com a rolagem (D-032).
 *
 * Movimento (D-020): tudo anda sozinho só enquanto a descida está na tela.
 *
 * Fotossensibilidade (SC 2.3.1): os nós são pequenos (muito abaixo da área de um flash) e o brilho de
 * cada um sobe e desce em 3 s ou mais. Os traços do cursor são finos (1 a 3 px), acendem uma vez e
 * apagam devagar (1 a 2 s), sem piscar.
 *
 * Sem textura float para desenhar (EXT_color_buffer_float), não há simulação: o nó segue um fluxo
 * de conta fechada, mais simples.
 *
 * Desenho: quads instanciados em px da tela (não usam a câmera da cena). Profundidade só de dois
 * valores: na frente do símbolo (passa por cima do metal) ou atrás (o metal esconde). Fora da descida
 * (antes do corte A e depois do corte B), o nó é descartado.
 */
import * as THREE from 'three';
import { type DescentUniforms, LIGHT_HEX, ORB_K, orbGlsl } from './descent';
import { rng } from './field';
import { cutGlsl } from './light';

/** Quanto a câmera desce pela pluma ao longo da descida (unidades). */
const TRAVEL = 3;
/** Distância da câmera ao plano do símbolo, que é o plano de foco (unidades). */
const CAM_D = 2.2;
/** Meia largura e meia altura máximas da tela no plano do símbolo (unidades; ver `U` em update). */
const HALF = { x: 0.82, y: 0.72 };
/** Voltas da pluma em volta do eixo do símbolo ao longo da descida. */
const SPIN_TURNS = 0.06;
/** Profundidade de campo: raio do disco de desfoque (px numa tela de referência) e teto. */
const COC = { k: 10, max: 26 };
/** Largura da textura da simulação (um texel por nó). */
const SIM_W = 256;
/**
 * Fluxo da simulação (unidades/s): rotacional do ruído em duas escalas (força e frequência), giro em
 * volta do eixo do símbolo e subida.
 */
const FLOW = { a1: 0.05, f1: 1.5, a2: 0.02, f2: 3.7, swirl: 0.035, rise: 0.02 } as const;
/** Vida de cada nó (s): do nascimento ao apagar. */
const LIFE = { min: 4, max: 10 } as const;
/** Aquecimento: passos da simulação rodados de uma vez na primeira vez (e o passo de cada um, s). */
const WARMUP = { steps: 48, dt: 0.15 } as const;
/** Fração dos nós desenhada em telas pequenas (a ordem é sorteada: qualquer começo é uma amostra). */
const SMALL_SHARE = 0.55;
/** Quantidade de nós por camada. */
const COUNT = { plume: 56000, loose: 5000, deep: 6000 } as const;

/**
 * Traços do cursor: quantos existem ao mesmo tempo (os mais velhos dão lugar aos novos), um a cada
 * quantos px de caminho, teto por quadro, e o cursor mais lento que ainda solta traços (px/s).
 */
const SPARK = { pool: 480, spacing: 9, perFrame: 14, minSpeed: 40 } as const;
/** Fração da velocidade do cursor que o traço leva, teto dela (px/s) e vida (s). */
const SPARK_KICK = { min: 0.1, max: 0.3, cap: 620 } as const;
const SPARK_LIFE = { min: 0.9, max: 1.9 } as const;
/** Cor da cauda: peso de cada luz da descida (ordem de LIGHT_HEX: ciano, violeta, rosa, laranja, limão). */
const SPARK_HUE = [0.24, 0.16, 0.42, 0.12, 0.06] as const;

/** Fração dos nós com cor própria da paleta da descida (D-019), em vez da cor da luz mais perto. */
const OWN_HUE = 0.12;

/** Paleta da descida (D-019) em RGB linear, saturada (canal mais forte = 1), como função GLSL. */
const paletteGlsl = (() => {
  const v = (x: number) => x.toFixed(4);
  const cols = LIGHT_HEX.map((hex) => {
    const c = new THREE.Color(hex);
    const m = Math.max(c.r, c.g, c.b);
    return `vec3(${v(c.r / m)}, ${v(c.g / m)}, ${v(c.b / m)})`;
  });
  const body = cols.map((c, i) => (i < cols.length - 1 ? `if (k < ${i + 1}.0) return ${c};` : `return ${c};`));
  return `vec3 palette(float k) { ${body.join(' ')} }`;
})();

const QUAD = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

type Uniform<T> = { value: T };

/** Uniforms da luz da cena que as partículas usam (mesmos objetos: atualizar lá atualiza aqui). */
export interface CloudLight {
  uRes: Uniform<THREE.Vector2>;
  uDpr: Uniform<number>;
  uCut: Uniform<THREE.Vector4>;
  uCutB: Uniform<THREE.Vector4>;
}

/* ───────────────────────── Estrutura ───────────────────────── */

/** Ruído de valor 3D (0..1), determinístico. */
function valueNoise3(seed: number) {
  const h = (x: number, y: number, z: number) => {
    let n = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const f = (t: number) => t * t * (3 - 2 * t);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return (x: number, y: number, z: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = f(x - ix);
    const fy = f(y - iy);
    const fz = f(z - iz);
    const a = l(l(h(ix, iy, iz), h(ix + 1, iy, iz), fx), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx), fy);
    const b = l(
      l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx),
      l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx),
      fy,
    );
    return l(a, b, fz);
  };
}

/**
 * Gera a pluma: nós em volta do eixo do símbolo (que serpenteia e respira ao longo da descida), em
 * aglomerados; nós soltos pelo volume; e uma camada funda. Determinística.
 * `aPos.w`: camada (0 pluma, 1 solto, 2 fundo). `aR`: tamanho, brilho, fase, vida (acasos 0..1).
 */
function buildPlume() {
  const rand = rng(0x6e0de5);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * Math.cos(2 * Math.PI * rand());
  const range = (a: number, b: number) => a + (b - a) * rand();
  const noise = valueNoise3(7);
  const pos: number[] = [];
  const look: number[] = [];
  const persp = (z: number) => CAM_D / (CAM_D - z);
  /** Faixa vertical que a câmera vê numa profundidade, ao longo da descida inteira. */
  const yRange = (z: number): [number, number] => {
    const h = HALF.y / persp(z) + 0.25;
    return [-TRAVEL - h, h];
  };
  const add = (x: number, y: number, z: number, layer: number) => {
    pos.push(x, y, z, layer);
    look.push(rand(), rand(), rand(), rand());
  };

  // Pluma: duas fitas de nós que giram em hélice em volta do eixo do símbolo (passam na frente e
  // atrás dele), cada uma com o miolo denso, aglomerados e vazios ao longo dela e um borrifo para
  // fora; e uma coluna mais rala em volta do próprio símbolo.
  {
    const [a, b] = yRange(0);
    let n = 0;
    const strands = Math.round(COUNT.plume * 0.8);
    while (n < COUNT.plume) {
      const y = range(a, b);
      let x: number;
      let z: number;
      if (n < strands) {
        const k = n % 2;
        const th = y * 1.7 + k * Math.PI + 0.25 * Math.sin(y * 0.9 + k);
        const rh = 0.4 + 0.1 * Math.sin(y * 1.3 + k * 2.1);
        const sx = Math.cos(th) * rh * 1.25;
        const sz = Math.sin(th) * rh * 0.85 - 0.1;
        // Miolo fino e borrifo que se abre (cauda longa).
        const sigma = 0.035 + 0.05 * noise(y * 2.2 + k * 9, 3, 1);
        const spray = rand() < 0.3 ? 2.5 + 5 * rand() ** 2 : 1;
        x = sx + gauss() * sigma * spray;
        const yy = gauss() * sigma * spray * 0.6;
        z = sz + gauss() * sigma * spray * 0.8;
        // Aglomerados ao longo da fita.
        const d = noise(y * 4.5 + k * 17, x * 3, z * 3);
        if (rand() > 0.06 + 0.94 * Math.max(0, (d - 0.3) / 0.7) ** 1.3) continue;
        if (z > 1.1) continue;
        add(x, y + yy, z, 0);
      } else {
        const r = 0.26 * Math.abs(gauss()) ** 1.2;
        const ang = rand() * Math.PI * 2;
        x = Math.cos(ang) * r * 1.3;
        z = -0.1 + Math.sin(ang) * r * 0.8;
        const d = noise(x * 5 + 3, y * 5, z * 5);
        if (rand() > 0.1 + 0.9 * Math.max(0, (d - 0.35) / 0.65)) continue;
        add(x, y, z, 0);
      }
      n++;
    }
  }
  // Soltos: o volume todo, ralo.
  for (let i = 0; i < COUNT.loose; i++) {
    const z = range(-2.4, 1.0);
    const hx = (HALF.x / persp(z)) * 1.25;
    const [a, b] = yRange(z);
    add(range(-hx, hx), range(a, b), z, 1);
  }
  // Fundo: pequeno e fraco, dá profundidade.
  for (let i = 0; i < COUNT.deep; i++) {
    const z = range(-6, -2.4);
    const hx = (HALF.x / persp(z)) * 1.2;
    const [a, b] = yRange(z);
    add(range(-hx, hx), range(a, b), z, 2);
  }

  // Ordem sorteada: qualquer começo da lista é uma amostra da pluma inteira.
  const count = look.length / 4;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const P = new Float32Array(count * 4);
  const R = new Float32Array(count * 4);
  order.forEach((src, dst) => {
    for (let c = 0; c < 4; c++) {
      P[dst * 4 + c] = pos[src * 4 + c];
      R[dst * 4 + c] = look[src * 4 + c];
    }
  });
  return { pos: P, look: R, count };
}

/* ───────────────────────── Shaders ───────────────────────── */

const vertex = /* glsl */ `
  ${orbGlsl}
  uniform vec2 uRes;
  /** x: px por unidade, y: altura da câmera (unidades), z: eixo do símbolo (unidades a partir do centro
   *  da tela), w: presença. */
  uniform vec4 uView;
  /** Giro da pluma em volta do eixo do símbolo (cos, sen). */
  uniform vec2 uSpin;
  /** Cursor (px, y para baixo) e presença dele. */
  uniform vec3 uCursor;
  /** Centro do símbolo (px, y para baixo). */
  uniform vec2 uSym;
  uniform float uTime;
  /** Estado da simulação: desvio do nó em relação ao seu lugar (xyz) e idade (w, 0..1). */
  uniform sampler2D uState;
  /** 1 quando a simulação está rodando; 0 usa o fluxo de conta fechada. */
  uniform float uSim;
  attribute vec4 aPos;
  attribute vec4 aR;
  varying vec3 vCol;
  /** Posição no quad (px). */
  varying vec2 vQ;
  /** Raio (px), livre, quanto é bolha (0..1), quanto está fora de foco (0..1). */
  varying vec4 vShape;
  /** Direção da luz mais forte na tela (para o lado claro da bolha). */
  varying vec2 vLight;

  const float CAM_D = ${CAM_D.toFixed(2)};
  const float COC_K = ${COC.k.toFixed(2)};
  const float COC_MAX = ${COC.max.toFixed(2)};
  const int SIM_W = ${SIM_W};
  const float ORB_K = ${ORB_K.toFixed(3)};
  const float OWN_HUE = ${OWN_HUE.toFixed(3)};
  ${paletteGlsl}

  void hide() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }

  void main() {
    float on = uView.w;
    if (on <= 0.0) { hide(); return; }
    float t = uTime;
    float layer = aPos.w;
    vec4 r = aR;

    // Ciclo de vida: nasce no seu lugar, é levado pelo fluxo e apaga (4 a 10 s).
    vec3 P = aPos.xyz;
    float age;
    if (uSim > 0.5) {
      // Simulação na GPU: o desvio e a idade vêm da textura de estado.
      vec4 st = texelFetch(uState, ivec2(gl_InstanceID % SIM_W, gl_InstanceID / SIM_W), 0);
      P += st.xyz;
      age = st.w;
    } else {
      // Sem simulação: fluxo de conta fechada.
      float period = mix(${LIFE.min.toFixed(1)}, ${LIFE.max.toFixed(1)}, r.w);
      age = fract(t / period + r.w * 7.31 + r.z * 3.17);
      vec3 flow = vec3(
        sin(P.y * 2.1 + P.z * 1.3 + 1.0),
        0.7 + 0.3 * sin(P.x * 1.7 + 2.0),
        cos(P.x * 1.9 - P.y * 1.4)
      );
      P += flow * (0.05 + 0.06 * r.x) * age;
      P += 0.012 * vec3(sin(t * 0.43 + r.z * 40.0 + P.y * 2.0), sin(t * 0.37 + r.w * 31.0), cos(t * 0.41 + r.x * 23.0 + P.x * 2.0));
    }
    float fade = smoothstep(0.0, 0.18, age) * (1.0 - smoothstep(0.7, 1.0, age));

    float X = P.x * uSpin.x - P.z * uSpin.y;
    float Z = P.x * uSpin.y + P.z * uSpin.x;
    float Y = P.y - uView.y;
    float dz = CAM_D - Z;
    float U = uView.x;
    float s = CAM_D / max(dz, 1e-3);
    vec2 p = vec2(uRes.x * 0.5 + (uView.z + X) * U * s, uRes.y * 0.5 - Y * U * s);

    // Tamanho: quase todos pequenos; cresce pouco com a proximidade e "respira".
    float scale = clamp(U / 700.0, 0.6, 1.4);
    float base = mix(1.0, 4.8, pow(r.x, 2.2));
    if (layer > 1.5) base *= 0.6;
    float breathe = 1.0 + 0.3 * (0.5 + 0.5 * sin(t * 2.6 + r.z * 20.0));
    float focus = base * scale * pow(clamp(s, 0.2, 2.2), 0.65) * breathe;
    // Profundidade de campo: fora do plano do símbolo, o nó vira um disco de desfoque.
    float coc = min(COC_K * abs(dz - CAM_D) / max(dz, 1e-3), COC_MAX) * scale;
    float R = focus + coc;
    float blur = coc / R;
    // Rente à câmera, o nó some (no Active Theory, quem chega perto encolhe).
    float nearCam = smoothstep(0.35, 0.9, dz);

    float margin = R + 80.0;
    if (dz < 0.3 || p.x < -margin || p.x > uRes.x + margin || p.y < -margin || p.y > uRes.y + margin) {
      hide();
      return;
    }

    // Paralaxe do cursor: a nuvem inteira se desloca um pouco pela profundidade, sem se deformar.
    p += (uCursor.xy - uRes * 0.5) * (s - 1.0) * 0.04 * uCursor.z;

    // Cor: cada nó pega a cor saturada de UMA das luzes da descida, a mais perto, com uma preferência
    // própria (onde duas luzes se cruzam, a nuvem fica de duas cores, sem virar um tom lavado); alguns
    // têm cor própria da paleta. Brilho: acende onde a luz passa e quase some longe dela.
    vec3 hue = vec3(0.0);
    float hw = 0.0;
    float lit = 0.0;
    vec2 lp = vec2(0.0);
    float lw = 0.0;
    for (int i = 0; i < 3; i++) {
      vec4 o = uOrb[i];
      float q = length(o.xy - p) / max(o.z, 1.0);
      float pref = fract(r.z * 7.13 + float(i) * 0.391);
      float wi = o.w / (1.0 + q * q * 2.0) * (0.25 + pref * pref * pref);
      wi *= wi;
      vec3 oc = uOrbCol[i];
      hue += oc / max(max(oc.r, oc.g), max(oc.b, 1e-4)) * wi;
      hw += wi;
      float la = orbAt(p, o, uOrbShape[i]) + o.w * 0.3 / (1.0 + q * q);
      lit += la;
      lp += o.xy * la * la;
      lw += la * la;
    }
    hue = hw > 1e-8 ? hue / hw : vec3(0.55, 0.85, 1.0);
    // Lado claro da bolha: virado para a luz mais forte (sem luz, para cima e à esquerda).
    vec2 ld = lw > 1e-8 ? lp / lw - p : vec2(-0.5, -0.8);
    ld = length(ld) > 1.0 ? normalize(ld) : vec2(-0.53, -0.85);
    if (fract(r.w * 13.37 + r.x * 3.1) < OWN_HUE) hue = palette(floor(fract(r.z * 5.71 + r.y * 2.3) * 5.0));
    lit /= ORB_K;
    vec2 hs = (p - uSym) / (0.35 * U);
    float haze = exp(-dot(hs, hs));

    // No miolo da luz, o nó esquenta para quase branco (como no Active Theory).
    hue = mix(hue, vec3(1.0, 0.97, 0.92), 0.45 * smoothstep(0.7, 1.8, lit));
    vec3 col = hue * (0.05 + 0.5 * lit + 0.06 * haze);
    // Brilho de cada nó: uns mais fortes que outros; sobe e some devagar (período ~3 s).
    float bright = 0.35 + 0.65 * pow(r.y, 1.3);
    float sparkle = clamp(0.35 + sin(t * 2.0 + r.z * 20.0 + r.y * 9.0), 0.0, 1.35);
    if (layer > 1.5) bright *= 0.5;
    if (layer > 0.5 && layer < 1.5) bright *= 0.8;
    col *= bright * sparkle * fade * nearCam;
    // Um em cada 60 é um brilho claro.
    if (r.y > 0.983) col = mix(col, vec3(1.0, 0.97, 0.9) * fade * nearCam * (0.4 + 0.6 * sparkle / 1.35), 0.6);
    // Disco desfocado é mais fraco (a mesma luz numa área maior).
    col *= pow(focus / R, 1.15);
    // Soma ao fundo: os mais fortes passam de 1 e o bloom da cena dá um halo neles.
    vCol = min(col, vec3(1.6)) * on;

    // Bolha só em foco: o disco de desfoque é liso.
    vShape = vec4(R, 0.0, smoothstep(1.6, 3.4, focus) * (1.0 - smoothstep(0.3, 0.7, blur)), blur);
    vLight = ld;

    vQ = position.xy * (R + 1.5);
    vec2 qp = p + vQ;
    gl_Position = vec4(qp.x / uRes.x * 2.0 - 1.0, 1.0 - qp.y / uRes.y * 2.0, Z > 0.0 ? -0.999 : 0.999, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec4 uCutB;
  ${cutGlsl}
  varying vec3 vCol;
  varying vec2 vQ;
  varying vec4 vShape;
  varying vec2 vLight;

  void main() {
    float R = vShape.x;
    float blur = vShape.w;
    vec2 n = vQ / R;
    float r = length(n);
    // Em foco, a borda tem 1 px; fora de foco, fica macia.
    float edge = max(min(1.0, 1.1 / R), 0.5 * blur);
    float cov = 1.0 - smoothstep(1.0 - edge, 1.0, r);
    if (cov <= 0.003) discard;
    // Só entre o corte A (data center) e o corte B (Sobre).
    vec2 pd = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
    if (cutAt(pd).x < 0.5 || cutWith(uCutB, pd).x > 0.5) discard;
    // Bolha: esfera iluminada pela luz mais forte (lado claro, ponto de brilho e borda acesa).
    vec3 N = vec3(n, sqrt(max(1.0 - r * r, 0.0)));
    vec3 Ld = normalize(vec3(vLight * 0.8, 0.6));
    float dif = max(dot(N, Ld), 0.0);
    float spec = pow(max(dot(N, normalize(Ld + vec3(0.0, 0.0, 1.0))), 0.0), 24.0);
    float ball = 0.2 + 0.85 * dif + 0.9 * spec + 0.35 * smoothstep(0.6, 1.0, r);
    // Disco de desfoque: a borda um pouco mais clara que o miolo.
    float shade = mix(1.0, ball, vShape.z) * (1.0 + 0.3 * blur * smoothstep(0.4, 0.85, r));
    // Mistura aditiva: a luz do nó soma à do fundo.
    gl_FragColor = vec4(vCol * shade * cov, 0.0);
  }
`;

/**
 * Simulação (D-032): um texel por nó, com o desvio em relação ao lugar do nó (xyz) e a idade (w,
 * 0..1). A cada passo, o nó anda pela velocidade do campo no ponto onde está; quando a vida acaba,
 * volta para o lugar (o brilho está em zero nas duas pontas da vida, então a volta não aparece).
 */
const simVertex = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const simFragment = /* glsl */ `
  precision highp float;
  /** Estado do passo anterior. */
  uniform sampler2D uState;
  /** Lugar do nó na pluma (xyz) e vida dele (w, s). */
  uniform sampler2D uHome;
  uniform float uDt;
  uniform float uTime;
  /** 1 no primeiro passo: sorteia a idade de cada nó. */
  uniform float uInit;

  float hash2(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  /** Gradiente de um ruído de valor 3D (derivada exata da interpolação). */
  vec3 noiseGrad(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    vec3 w = f * f * (3.0 - 2.0 * f);
    vec3 dw = 6.0 * f * (1.0 - f);
    float a = hash3(i);
    float b = hash3(i + vec3(1.0, 0.0, 0.0));
    float c = hash3(i + vec3(0.0, 1.0, 0.0));
    float d = hash3(i + vec3(1.0, 1.0, 0.0));
    float e = hash3(i + vec3(0.0, 0.0, 1.0));
    float g = hash3(i + vec3(1.0, 0.0, 1.0));
    float h = hash3(i + vec3(0.0, 1.0, 1.0));
    float k = hash3(i + vec3(1.0, 1.0, 1.0));
    float k1 = b - a;
    float k2 = c - a;
    float k3 = e - a;
    float k4 = a - b - c + d;
    float k5 = a - c - e + h;
    float k6 = a - b - e + g;
    float k7 = -a + b + c - d + e - g - h + k;
    return dw * vec3(
      k1 + k4 * w.y + k6 * w.z + k7 * w.y * w.z,
      k2 + k5 * w.z + k4 * w.x + k7 * w.z * w.x,
      k3 + k6 * w.x + k5 * w.y + k7 * w.x * w.y
    );
  }
  /** Rotacional de um potencial de três ruídos: campo sem divergência (não junta nem espalha os nós). */
  vec3 curl(vec3 p) {
    vec3 g1 = noiseGrad(p);
    vec3 g2 = noiseGrad(p + vec3(31.4, 17.7, 5.2));
    vec3 g3 = noiseGrad(p + vec3(-12.1, 43.3, 27.9));
    return vec3(g3.y - g2.z, g1.z - g3.x, g2.x - g1.y);
  }

  void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    if (uInit > 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, hash2(vec2(c) + 0.5));
      return;
    }
    vec4 home = texelFetch(uHome, c, 0);
    vec4 st = texelFetch(uState, c, 0);
    vec3 P = home.xyz + st.xyz;
    float t = uTime;
    vec3 v = curl(P * ${FLOW.f1.toFixed(2)} + vec3(0.0, -t * 0.06, t * 0.03)) * ${FLOW.a1.toFixed(4)};
    v += curl(P * ${FLOW.f2.toFixed(2)} + vec3(t * 0.05 + 9.0, 4.0, -t * 0.04)) * ${FLOW.a2.toFixed(4)};
    // Giro em volta do eixo do símbolo, mais forte perto dele.
    vec2 ax = P.xz - vec2(0.0, -0.1);
    v += vec3(-ax.y, 0.0, ax.x) * (${FLOW.swirl.toFixed(4)} / (0.15 + dot(ax, ax)));
    v.y += ${FLOW.rise.toFixed(4)};
    vec3 off = st.xyz + v * uDt;
    float age = st.w + uDt / max(home.w, 1.0);
    if (age >= 1.0) {
      off = vec3(0.0);
      age = fract(age);
    }
    gl_FragColor = vec4(off, age);
  }
`;

/**
 * Traços do cursor. Cada um nasce num ponto do caminho do cursor com uma velocidade (px/s) que freia
 * e vira um pouco; a posição sai da conta fechada (sem simular quadro a quadro). O traço vai da
 * posição de agora (cabeça) à de quando ele tinha metade da idade (cauda): começa como ponto, se
 * estica enquanto corre e encurta quando para.
 */
const sparkVertex = /* glsl */ `
  uniform vec2 uRes;
  /** Relógio da descida (s). */
  uniform float uTime;
  /** Presença da descida (0..1). */
  uniform float uOn;
  /** Onde nasce (px, y para baixo) e velocidade inicial (px/s). */
  attribute vec4 aSpawn;
  /** Nascimento (s, no relógio da descida), vida (s), cor (índice da paleta), acaso (0..1). */
  attribute vec4 aMeta;
  /** Cor da cauda (rgb) e envelope do brilho (a). */
  varying vec4 vCol;
  /** Posição no quad (px, no eixo do traço). */
  varying vec2 vQ;
  /** Espessura (raio, px) e meia-extensão do traço (px). */
  varying vec2 vShape;

  const float TAIL = 0.5;
  const float MAX_LEN = 56.0;
  ${paletteGlsl}

  vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
  vec2 cdiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b); }
  /** Deslocamento depois de t s de uma velocidade v0 que freia (k, 1/s) e gira (w, rad/s). */
  vec2 travel(vec2 v0, float k, float w, float t) {
    vec2 z = exp(-k * t) * vec2(cos(w * t), sin(w * t));
    return cdiv(cmul(v0, vec2(1.0, 0.0) - z), vec2(k, -w));
  }

  void main() {
    float age = uTime - aMeta.x;
    float life = aMeta.y;
    if (uOn <= 0.0 || age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float seed = aMeta.w;
    float k = mix(1.4, 2.6, fract(seed * 7.13));
    float w = (fract(seed * 3.91) - 0.5) * 2.4;
    vec2 v0 = aSpawn.zw;
    vec2 head = aSpawn.xy + travel(v0, k, w, age);
    vec2 tail = aSpawn.xy + travel(v0, k, w, age * TAIL);
    vec2 axis = head - tail;
    float L = length(axis);
    vec2 dir = L > 0.01 ? axis / L : normalize(v0 + vec2(1e-3, 0.0));
    float scale = clamp(min(uRes.x, uRes.y) / 800.0, 0.8, 1.3);
    L = min(L, MAX_LEN * scale);
    tail = head - dir * L;

    // Acende logo ao nascer e apaga devagar até o fim da vida.
    float n = age / life;
    float env = smoothstep(0.0, 0.06, age) * pow(1.0 - n, 1.6) * uOn;
    vCol = vec4(palette(aMeta.z), env);
    float R = mix(1.0, 1.9, fract(seed * 5.37)) * scale;
    float hl = 0.5 * L;
    vShape = vec2(R, hl);

    vec2 nrm = vec2(-dir.y, dir.x);
    vQ = position.xy * (vec2(hl + R, R) + 1.5);
    vec2 qp = (head + tail) * 0.5 + dir * vQ.x + nrm * vQ.y;
    gl_Position = vec4(qp.x / uRes.x * 2.0 - 1.0, 1.0 - qp.y / uRes.y * 2.0, -0.999, 1.0);
  }
`;

const sparkFragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec4 uCutB;
  ${cutGlsl}
  varying vec4 vCol;
  varying vec2 vQ;
  varying vec2 vShape;

  void main() {
    float hl = vShape.y;
    // u: 0 na ponta da cauda, 1 na cabeça. A cauda afina e escurece; a cabeça é branca.
    float u = hl > 0.5 ? clamp((vQ.x + hl) / (2.0 * hl), 0.0, 1.0) : 1.0;
    float R = vShape.x * mix(0.45, 1.0, u);
    vec2 q = vec2(sign(vQ.x) * max(abs(vQ.x) - hl, 0.0), vQ.y);
    float r = length(q) / R;
    float cov = 1.0 - smoothstep(1.0 - min(1.0, 1.1 / R), 1.0, r);
    if (cov <= 0.003) discard;
    // Só entre o corte A (data center) e o corte B (Sobre).
    vec2 pd = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
    if (cutAt(pd).x < 0.5 || cutWith(uCutB, pd).x > 0.5) discard;
    vec3 col = mix(vCol.rgb * 1.6, vec3(1.0, 0.97, 0.95) * 2.6, smoothstep(0.6, 1.0, u));
    float I = mix(0.18, 1.0, pow(u, 1.2));
    // Mistura aditiva; a cabeça passa de 1 e o bloom da cena dá o brilho em volta.
    gl_FragColor = vec4(col * I * cov * vCol.a, 0.0);
  }
`;

/* ───────────────────────── Montagem ───────────────────────── */

export interface CloudFrame {
  /** Passo do relógio (s). */
  dt: number;
  width: number;
  height: number;
  /** Progresso da descida (0..1). */
  d: number;
  /** Presença da descida (0..1); em 0 as partículas somem e param. */
  presence: number;
  /** Centro do símbolo (px CSS, y para baixo). */
  symX: number;
  symY: number;
  /** Cursor suavizado (px CSS) e presença dele (0..1): paralaxe. */
  cursorX: number;
  cursorY: number;
  cursorOn: number;
  /** Cursor de verdade (px CSS), sem suavizar, e se ele está na tela (0/1): de onde saem os traços. */
  pointerX: number;
  pointerY: number;
  pointerOn: number;
  /** Giro do símbolo (rad): a pluma gira junto, em volta do mesmo eixo (D-037). */
  spin: number;
}

export interface NodeCloud {
  object: THREE.Group;
  /** Atualiza as partículas (e dá um passo na simulação). Chamar uma vez por quadro, antes de desenhar a cena. */
  update(f: CloudFrame, gl: THREE.WebGLRenderer): void;
  dispose(): void;
}

/** Cria a pluma de nós da descida e os traços do cursor. */
export function createNodeCloud(descent: DescentUniforms, light: CloudLight): NodeCloud {
  const plume = buildPlume();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setIndex(QUAD_INDEX);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(QUAD, 3));
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(plume.pos, 4));
  geo.setAttribute('aR', new THREE.InstancedBufferAttribute(plume.look, 4));
  geo.instanceCount = plume.count;

  const u = {
    uView: { value: new THREE.Vector4() },
    uSpin: { value: new THREE.Vector2(1, 0) },
    uCursor: { value: new THREE.Vector3() },
    uSym: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uState: { value: null as THREE.Texture | null },
    uSim: { value: 0 },
  };

  // ── Simulação: lugar e vida de cada nó numa textura; o estado em dois alvos que se alternam.
  const simH = Math.ceil(plume.count / SIM_W);
  const homeData = new Float32Array(SIM_W * simH * 4);
  for (let i = 0; i < plume.count; i++) {
    homeData[i * 4] = plume.pos[i * 4];
    homeData[i * 4 + 1] = plume.pos[i * 4 + 1];
    homeData[i * 4 + 2] = plume.pos[i * 4 + 2];
    homeData[i * 4 + 3] = LIFE.min + (LIFE.max - LIFE.min) * plume.look[i * 4 + 3];
  }
  const home = new THREE.DataTexture(homeData, SIM_W, simH, THREE.RGBAFormat, THREE.FloatType);
  home.minFilter = home.magFilter = THREE.NearestFilter;
  home.needsUpdate = true;
  const target = () =>
    new THREE.WebGLRenderTarget(SIM_W, simH, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
  let read = target();
  let write = target();
  const su = {
    uState: { value: null as THREE.Texture | null },
    uHome: { value: home },
    uDt: { value: 0 },
    uTime: { value: 0 },
    uInit: { value: 0 },
  };
  const simMat = new THREE.ShaderMaterial({
    vertexShader: simVertex,
    fragmentShader: simFragment,
    uniforms: su,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
  const simGeo = new THREE.BufferGeometry();
  // Um triângulo que cobre a tela.
  simGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const simMesh = new THREE.Mesh(simGeo, simMat);
  simMesh.frustumCulled = false;
  const simScene = new THREE.Scene();
  simScene.add(simMesh);
  const simCam = new THREE.Camera();
  /** null: ainda não conferido; false: sem textura float para desenhar (fica o fluxo de conta fechada). */
  let simOk: boolean | null = null;
  let seeded = false;
  let canvas: HTMLCanvasElement | null = null;
  // Se o WebGL cair e voltar, o estado se perde: sorteia de novo.
  const onRestored = () => {
    seeded = false;
  };
  const pass = (gl: THREE.WebGLRenderer, dt: number, init: boolean) => {
    su.uState.value = read.texture;
    su.uDt.value = dt;
    su.uInit.value = init ? 1 : 0;
    gl.setRenderTarget(write);
    gl.render(simScene, simCam);
    [read, write] = [write, read];
    su.uTime.value += dt;
  };
  /** Um passo da simulação (na primeira vez, sorteia as idades e roda o aquecimento). */
  const step = (gl: THREE.WebGLRenderer, dt: number) => {
    if (simOk === null) {
      simOk = gl.capabilities.isWebGL2 && gl.extensions.has('EXT_color_buffer_float');
      canvas = gl.domElement;
      canvas.addEventListener('webglcontextrestored', onRestored);
    }
    if (!simOk) return;
    const prev = gl.getRenderTarget();
    const xr = gl.xr.enabled;
    gl.xr.enabled = false;
    if (!seeded) {
      pass(gl, 0, true);
      for (let i = 0; i < WARMUP.steps; i++) pass(gl, WARMUP.dt, false);
      seeded = true;
    }
    if (dt > 0) pass(gl, dt, false);
    gl.xr.enabled = xr;
    gl.setRenderTarget(prev);
    u.uState.value = read.texture;
    u.uSim.value = 1;
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uRes: light.uRes,
      uDpr: light.uDpr,
      uCut: light.uCut,
      uCutB: light.uCutB,
      ...u,
      uDescent: descent.uDescent,
      uOrb: descent.uOrb,
      uOrbCol: descent.uOrbCol,
      uOrbShape: descent.uOrbShape,
    },
    transparent: true,
    // Mistura aditiva: resultado = fundo + nó (o alfa do alvo fica como está).
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    depthTest: true,
    // A conversão px -> clip inverte o eixo y e espelha o quad; sem isso ele é descartado como verso.
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  // Depois do metal (que é opaco) e de tudo o que é transparente no data center.
  mesh.renderOrder = 10;

  // ── Traços do cursor: um quad por traço; os atributos só mudam quando nasce um traço.
  const spawn = new Float32Array(SPARK.pool * 4);
  const meta = new Float32Array(SPARK.pool * 4);
  for (let i = 0; i < SPARK.pool; i++) meta[i * 4] = -1e6;
  const sparkGeo = new THREE.InstancedBufferGeometry();
  sparkGeo.setIndex(QUAD_INDEX);
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(QUAD, 3));
  const aSpawn = new THREE.InstancedBufferAttribute(spawn, 4).setUsage(THREE.DynamicDrawUsage);
  const aMeta = new THREE.InstancedBufferAttribute(meta, 4).setUsage(THREE.DynamicDrawUsage);
  sparkGeo.setAttribute('aSpawn', aSpawn);
  sparkGeo.setAttribute('aMeta', aMeta);
  sparkGeo.instanceCount = SPARK.pool;
  const uOn = { value: 0 };
  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: sparkVertex,
    fragmentShader: sparkFragment,
    uniforms: { uRes: light.uRes, uDpr: light.uDpr, uCut: light.uCut, uCutB: light.uCutB, uTime: u.uTime, uOn },
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    // Por cima de tudo na descida, inclusive do metal.
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const sparks = new THREE.Mesh(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.renderOrder = 11;

  const object = new THREE.Group();
  object.add(mesh, sparks);
  object.visible = false;

  const rand = rng(0x5a1c3);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * Math.cos(2 * Math.PI * rand());
  /** Índice da paleta sorteado com o peso de SPARK_HUE. */
  const pickHue = () => {
    let x = rand();
    for (let i = 0; i < SPARK_HUE.length - 1; i++) {
      x -= SPARK_HUE[i];
      if (x < 0) return i;
    }
    return SPARK_HUE.length - 1;
  };
  let next = 0;
  let carry = 0;
  let alive = false;
  let lastPX = Number.NaN;
  let lastPY = Number.NaN;

  /**
   * Solta traços ao longo do caminho que o cursor fez desde o quadro anterior, um a cada
   * SPARK.spacing px, cada um com o nascimento no instante em que o cursor passou por ali.
   */
  const emit = (f: CloudFrame, realDt: number, now: number, clockDt: number) => {
    const on = f.pointerOn > 0.5 && f.presence > 0.05;
    if (!on || !Number.isFinite(lastPX)) {
      carry = 0;
      lastPX = on ? f.pointerX : Number.NaN;
      lastPY = on ? f.pointerY : Number.NaN;
      return;
    }
    const dx = f.pointerX - lastPX;
    const dy = f.pointerY - lastPY;
    const dist = Math.hypot(dx, dy);
    lastPX = f.pointerX;
    lastPY = f.pointerY;
    const speed = dist / Math.max(realDt, 1 / 120);
    if (dist < 0.5 || speed < SPARK.minSpeed) {
      carry = 0;
      return;
    }
    const ux = dx / dist;
    const uy = dy / dist;
    carry += dist;
    const n = Math.min(Math.floor(carry / SPARK.spacing), SPARK.perFrame);
    carry = n === SPARK.perFrame ? 0 : carry - n * SPARK.spacing;
    for (let j = 0; j < n; j++) {
      const t = (j + 1) / n;
      // Sai no sentido do movimento, aberto um pouco para os lados.
      const kick = Math.min(speed * (SPARK_KICK.min + (SPARK_KICK.max - SPARK_KICK.min) * rand()), SPARK_KICK.cap);
      const a = gauss() * 0.35;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const side = (rand() - 0.5) * 0.5;
      const vx = (ux * ca - uy * sa - uy * side) * kick;
      const vy = (ux * sa + uy * ca + ux * side) * kick;
      const i = next * 4;
      spawn[i] = f.pointerX - dx * (1 - t) + gauss() * 2.5;
      spawn[i + 1] = f.pointerY - dy * (1 - t) + gauss() * 2.5;
      spawn[i + 2] = vx;
      spawn[i + 3] = vy;
      meta[i] = now - (1 - t) * clockDt;
      meta[i + 1] = SPARK_LIFE.min + (SPARK_LIFE.max - SPARK_LIFE.min) * rand();
      meta[i + 2] = pickHue();
      meta[i + 3] = rand();
      next = (next + 1) % SPARK.pool;
    }
    if (n > 0) {
      aSpawn.needsUpdate = true;
      aMeta.needsUpdate = true;
      alive = true;
    }
  };

  /** Apaga todos os traços (a descida saiu da tela). */
  const clearSparks = () => {
    if (!alive) return;
    for (let i = 0; i < SPARK.pool; i++) meta[i * 4] = -1e6;
    aMeta.needsUpdate = true;
    alive = false;
  };

  return {
    object,
    update(f, gl) {
      const realDt = Math.min(Math.max(f.dt, 0), 0.25);
      const dt = Math.min(realDt, 1 / 30);
      const U = Math.max(f.width * 0.62, f.height * 0.7);
      const cam = -f.d * TRAVEL;

      object.visible = f.presence > 0.001;
      if (!object.visible) {
        lastPX = Number.NaN;
        clearSparks();
        return;
      }
      u.uTime.value += dt;
      // A simulação só anda com a descida na tela (D-020).
      step(gl, dt);
      uOn.value = f.presence;
      const a = -f.spin + Math.PI * 2 * SPIN_TURNS * f.d + 0.03 * Math.sin(u.uTime.value * 0.05);
      u.uSpin.value.set(Math.cos(a), Math.sin(a));
      u.uView.value.set(U, cam, (f.symX - f.width / 2) / U, f.presence);
      u.uSym.value.set(f.symX, f.symY);
      u.uCursor.value.set(f.cursorX, f.cursorY, f.cursorOn);
      geo.instanceCount = f.width * f.height < 700_000 ? Math.round(plume.count * SMALL_SHARE) : plume.count;
      emit(f, realDt, u.uTime.value, dt);
    },
    dispose() {
      canvas?.removeEventListener('webglcontextrestored', onRestored);
      geo.dispose();
      mat.dispose();
      simGeo.dispose();
      simMat.dispose();
      home.dispose();
      read.dispose();
      write.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}
