/**
 * Shaders do portfólio (D-024, D-026). Técnica estudada no portfólio do Active Theory (vidro que
 * refrata a cena de trás, título fatiado em RGB visto de lado) e na penúltima seção do igloo.inc
 * (figura feita de pontos sombreados como esferas, sobre uma base de degraus com luz na borda, que
 * se desfaz perto do cursor); o código é nosso.
 *
 * - Tudo usa o corte C ("/" com a borda de nós, D-024), no mesmo formato dos cortes da entrada:
 *   do lado de antes (o Sobre, em HTML), o canvas fica transparente; do lado de depois, o
 *   portfólio. `uAll` = 1 desenha tudo (passe da refração e corte já terminado).
 * - O canvas tem alfa e é pré-multiplicado: a cor sai já multiplicada pelo alfa.
 * - As contas são em RGB linear, como no palco da entrada; `portOut` converte para a tela (sRGB).
 *   Sem tone mapping (canvas `flat`).
 * - Movimento sozinho (LEDs, faixa de varredura) só com `uTime`, o relógio de atividade, que para
 *   pouco depois do último movimento do usuário (SC 2.2.2).
 */
import { cutGlsl } from '../entry/light';

/** Corte do portfólio, px CSS com y para baixo (`pd`), a partir do gl_FragCoord. */
const portCutGlsl = /* glsl */ `
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec4 uCutC;
  uniform float uAll;
  ${cutGlsl}

  vec2 portPd() {
    vec2 px = gl_FragCoord.xy / uDpr;
    return vec2(px.x, uRes.y - px.y);
  }

  // Lado do portfólio (1) ou do Sobre (0).
  float portSide(vec2 pd) {
    if (uAll > 0.5) return 1.0;
    return cutWith(uCutC, pd).x;
  }

  // Saída: as contas são em RGB linear (o THREE.Color converte o hex); a tela recebe sRGB e a
  // textura da refração fica linear (o linearToOutputTexel muda com o alvo). Alfa pré-multiplicado.
  vec4 portOut(vec3 col, float a) {
    return vec4(linearToOutputTexel(vec4(col, 1.0)).rgb * a, a);
  }

  // Saída aditiva (blend One/One): só soma cor, não mexe no alfa.
  vec4 portAdd(vec3 col, float a) {
    return vec4(portOut(col, a).rgb, 0.0);
  }

  float portHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

/* ───────────────────────── Fundo ───────────────────────── */

export const backgroundVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fundo: Azul Noturno com as bordas mais fundas e uma luz suave em volta do holograma (onde ele
 * cai na tela, `uGlow`). Os nós da borda do corte ficam por cima, dos dois lados.
 */
export const backgroundFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uNodeCol;
  uniform vec3 uNodeAccent;
  uniform vec3 uAccent;
  // xy: centro do holograma na tela (0..1, y para baixo); z: força.
  uniform vec3 uGlow;

  void main() {
    vec2 pd = portPd();
    vec3 cut = uAll > 0.5 ? vec3(1.0, 0.0, 0.0) : cutWith(uCutC, pd);
    float a = max(cut.x, cut.y);
    if (a <= 0.0) discard;

    vec2 uv = pd / uRes - 0.5;
    uv.x *= uRes.x / uRes.y;
    float vig = smoothstep(0.25, 1.1, length(uv));
    vec3 col = mix(uBg, uBgDeep, vig * 0.9);
    // Luz do holograma: larga, um pouco mais alta que larga.
    vec2 gp = pd / uRes - uGlow.xy;
    gp.x *= uRes.x / uRes.y;
    gp.y *= 0.8;
    float g = exp(-dot(gp, gp) / 0.07);
    col = col * (1.0 + 0.45 * g * uGlow.z) + uAccent * 0.004 * g * uGlow.z;

    vec3 nc = mix(uNodeCol * 0.5, uNodeAccent * 0.85, cut.z);
    col = mix(col, nc, cut.y);
    vec4 o = portOut(col, a);
    // Pontilhado fino contra faixas no degradê escuro (fixo).
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    o.rgb += (n - 0.5) * (1.5 / 255.0) * a;
    gl_FragColor = o;
  }
`;

/* ───────────────────────── Base de LED ───────────────────────── */

/**
 * Base em degraus (torno): cada trecho do perfil tem um tipo (`aKind`), a distância desde o começo
 * do trecho (`aDist`) e o degrau (`aLevel`, 0 no de cima).
 */
export const pedestalVertex = /* glsl */ `
  attribute float aKind;
  attribute float aDist;
  attribute float aLevel;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vKind;
  varying float vDist;
  varying float vLevel;

  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vKind = aKind;
    vDist = aDist;
    vLevel = aLevel;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * Pedra escura (Azul Noturno) com:
 * - 0, lente: a matriz de LEDs que projeta o símbolo, nós quadrados na matriz 45°;
 * - 1, anel em volta da lente: LED aceso;
 * - 2, topo de cada degrau: gravação fraca da matriz 45° e a luz da fita de LED do degrau de cima;
 * - 3, fita de LED na borda de cada degrau (mais fraca nos degraus de baixo);
 * - 4, lateral: a luz da fita logo abaixo dela;
 * - 5, chanfro: pega a luz.
 * O holograma ilumina a base de cima (ciano).
 */
export const pedestalFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform float uTime;
  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uSilver;
  uniform vec3 uWhite;
  uniform vec3 uAccent;
  uniform vec3 uHoloPos;
  uniform float uOn;
  uniform float uLens;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vKind;
  varying float vDist;
  varying float vLevel;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);

    vec3 stone = mix(uBgDeep, uBg, 0.6);
    vec3 toH = uHoloPos - vWorld;
    float dh = length(toH);
    float lh = max(dot(n, toH / dh), 0.0) / (1.0 + dh * dh * 0.45);
    vec3 holoCol = mix(uAccent, uWhite, 0.25);
    vec3 ledCol = mix(uWhite, uAccent, 0.3);
    float sky = 0.5 + 0.5 * n.y;
    vec3 col = stone * (0.5 + 0.4 * sky) + holoCol * lh * 0.4 * uOn + uSilver * fres * 0.08;

    float k = vKind;
    if (k < 0.5) {
      // Lente: LEDs quadrados na matriz 45°; o miolo mais claro.
      vec2 xz = vWorld.xz;
      vec2 g = vec2(xz.x + xz.y, xz.x - xz.y) * (0.70710678 / 0.05);
      vec2 cell = floor(g);
      vec2 f = abs(fract(g) - 0.5);
      float node = 1.0 - smoothstep(0.22, 0.32, max(f.x, f.y));
      float r = length(xz) / uLens;
      float h = portHash(cell);
      float tw = 0.78 + 0.22 * sin(uTime * (0.8 + 1.6 * h) + h * 6.2831853);
      float lit = node * (0.3 + 0.7 * h) * tw * (1.0 - smoothstep(0.82, 0.98, r));
      vec3 led = mix(uAccent, uWhite, 0.25 + 0.45 * (1.0 - r));
      col = stone * 0.5 + led * lit * (0.2 + 0.8 * uOn) + uAccent * 0.1 * (1.0 - r) * uOn;
    } else if (k < 1.5) {
      col = ledCol * (0.55 + 0.45 * uOn);
    } else if (k < 2.5) {
      vec2 xz = vWorld.xz;
      vec2 g = vec2(xz.x + xz.y, xz.x - xz.y) * (0.70710678 / 0.2);
      vec2 gf = abs(fract(g) - 0.5);
      vec2 fw = fwidth(g);
      float etch = 1.0 - smoothstep(0.0, 1.5 * max(fw.x, fw.y), min(gf.x, gf.y));
      col += uSilver * etch * 0.02;
      col += ledCol * exp(-vDist / 0.08) * 0.2 * (1.0 - 0.15 * vLevel);
    } else if (k < 3.5) {
      col = mix(uWhite, uAccent, 0.18 + 0.1 * vLevel) * (1.0 - 0.14 * vLevel);
    } else if (k < 4.5) {
      col += ledCol * exp(-vDist / 0.05) * 0.16 * (1.0 - 0.15 * vLevel);
      col += uSilver * fres * 0.1;
    } else {
      col += uSilver * (0.08 + 0.22 * fres) + holoCol * lh * 0.35 * uOn;
    }
    gl_FragColor = portOut(col, 1.0);
  }
`;

/**
 * Brilho das fitas de LED: faixas finas em volta de cada fita (aditivas), mais fortes no meio.
 * `aDist` vai de 0 (em cima) a 2·meia altura (embaixo).
 */
export const ledGlowFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform vec3 uWhite;
  uniform vec3 uAccent;
  uniform float uHalfH;
  uniform float uOn;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDist;
  varying float vLevel;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    float y = vDist / uHalfH - 1.0;
    float a = (exp(-y * y * 14.0) * 0.4 + exp(-y * y * 3.0) * 0.14) * (1.0 - 0.16 * vLevel);
    a *= 0.55 + 0.45 * uOn;
    gl_FragColor = portAdd(mix(uWhite, uAccent, 0.35), a);
  }
`;

/* ───────────────────────── Feixe, anel e chão ───────────────────────── */

export const beamVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * Feixe da lente até o anel de cima (cone aberto, aditivo): mais forte embaixo e nas bordas vistas
 * de lado, com raios fixos e uma faixa de varredura que sobe com o relógio de atividade.
 */
export const beamFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform float uTime;
  uniform vec3 uSilver;
  uniform vec3 uAccent;
  uniform float uOn;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;

  float bNoise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(portHash(vec2(i, 3.1)), portHash(vec2(i + 1.0, 3.1)), f * f * (3.0 - 2.0 * f));
  }

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec3 v = normalize(cameraPosition - vWorld);
    float edge = 1.0 - abs(dot(normalize(vNormal), v));
    float h = vUv.y;
    float fall = pow(1.0 - h, 1.8) * smoothstep(0.0, 0.03, h);
    float rays = bNoise(vUv.x * 64.0) * 0.6 + bNoise(vUv.x * 151.0) * 0.4;
    float scan = exp(-pow((h - fract(uTime * 0.2)) * 10.0, 2.0));
    float a = fall * (0.2 + 0.8 * rays) * (0.3 + 0.7 * edge * edge) * 0.16 + scan * fall * 0.05;
    gl_FragColor = portAdd(mix(uSilver, uAccent, 0.55), a * uOn);
  }
`;

/** Anel de luz em cima do holograma: o miolo (fino) e o brilho em volta (tubo mais grosso). */
export const haloFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform vec3 uWhite;
  uniform vec3 uAccent;
  uniform float uCore;
  uniform float uOn;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec3 v = normalize(cameraPosition - vWorld);
    float facing = abs(dot(normalize(vNormal), v));
    float a = uCore > 0.5 ? 0.9 : pow(facing, 3.0) * 0.16;
    gl_FragColor = portAdd(mix(uWhite, uAccent, uCore > 0.5 ? 0.2 : 0.5), a * uOn);
  }
`;

/** Chão: a luz das fitas em volta da base e a matriz 45° bem fraca, que some com a distância. */
export const floorFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform vec3 uSilver;
  uniform vec3 uAccent;
  uniform float uOuter;
  uniform float uOn;
  varying vec3 vWorld;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec2 xz = vWorld.xz;
    float r = length(xz);
    float spill = exp(-max(r - uOuter, 0.0) / 0.5) * smoothstep(uOuter - 0.02, uOuter + 0.02, r);
    vec2 g = vec2(xz.x + xz.y, xz.x - xz.y) * (0.70710678 / 0.6);
    vec2 gf = abs(fract(g) - 0.5);
    vec2 fw = fwidth(g);
    float line = 1.0 - smoothstep(0.0, 1.5 * max(fw.x, fw.y), min(gf.x, gf.y));
    float fade = exp(-max(r - uOuter, 0.0) / 2.2) * smoothstep(uOuter, uOuter + 0.4, r);
    float a = spill * 0.2 * (0.5 + 0.5 * uOn) + line * fade * 0.05;
    gl_FragColor = portAdd(mix(uSilver, uAccent, 0.4), a);
  }
`;

/* ───────────────────────── Holograma do símbolo ───────────────────────── */

/**
 * Holograma do símbolo oficial (D-026): pontos tirados da superfície das 4 peças (o arquivo
 * oficial extrudado, D-013). No espaço do grupo: x para a direita, y para cima, z para a frente.
 *
 * - Formação (`uForm` 0 → 1, 2 s, quando o portfólio entra): cada ponto sai de um lugar da lente,
 *   sobe e depois fecha no lugar dele; os de baixo primeiro.
 * - Esfarelar (`uCrumble`): perto do cursor (`uHit`, w = quanto) os pontos se soltam na hora; com
 *   o cursor em cima, o alcance (`uReach`) cresce a partir de `uCenter` até o símbolo todo. Sem
 *   cursor, o alcance encolhe e o símbolo se refaz de fora para dentro.
 * - Fatias (`uGlitch`): com a câmera girando rápido, faixas "/" da matriz deslizam ao longo delas.
 */
export const holoVertex = /* glsl */ `
  uniform float uTime;
  uniform float uForm;
  uniform float uReach;
  uniform vec4 uHit;
  uniform vec3 uCenter;
  uniform float uGlitch;
  uniform float uPxScale;
  uniform float uLens;
  uniform float uBaseY;
  uniform vec2 uSpan;

  attribute vec4 aRand;
  attribute float aSize;

  varying float vHn;
  varying float vGlow;
  varying float vTone;
  varying float vScan;

  float hHash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }

  void main() {
    vec3 home = position;
    vec3 p = home;
    float hn = clamp((home.y - uSpan.x) / (uSpan.y - uSpan.x), 0.0, 1.0);

    // Fatias "/".
    float gb = floor((home.x - home.y) * 0.70710678 / 0.085);
    float gs = step(0.6, hHash(gb + 7.31));
    p.xy += vec2(0.70710678) * (hHash(gb) - 0.5) * 0.6 * uGlitch * gs;

    // Esfarelar.
    float spread = clamp((uReach - distance(home, uCenter)) / 0.6, 0.0, 1.0);
    float push = uHit.w * (1.0 - smoothstep(0.05, 0.5, distance(home.xy, uHit.xy)));
    float amt = max(spread, push);
    amt = amt * amt * (3.0 - 2.0 * amt);
    vec3 rdir = normalize(aRand.xyz - 0.5 + 1e-3);
    vec3 away = home - uCenter;
    away.z = away.z * 0.5 + 0.25;
    vec3 dir = normalize(normalize(away + 1e-3) * 0.75 + rdir);
    vec3 disp = dir * (0.3 + 1.1 * aRand.w);
    disp.y -= 0.45 * (0.3 + aRand.y);
    disp += vec3(
      sin(uTime * (0.4 + 0.6 * aRand.x) + aRand.y * 6.2831853),
      cos(uTime * (0.35 + 0.5 * aRand.z) + aRand.w * 6.2831853),
      sin(uTime * (0.3 + 0.6 * aRand.w) + aRand.x * 6.2831853)
    ) * 0.09;
    p += disp * amt;

    // Formação: da lente para cima, depois para o lugar.
    float s0 = hn * 0.55 + aRand.x * 0.1;
    float fi = smoothstep(s0, s0 + 0.35, uForm);
    float ang = aRand.z * 6.2831853;
    float rr = uLens * 0.92 * sqrt(aRand.w);
    vec3 start = vec3(cos(ang) * rr, uBaseY, sin(ang) * rr);
    vec3 q;
    q.y = mix(start.y, p.y, 1.0 - pow(1.0 - fi, 3.0));
    q.xz = mix(start.xz, p.xz, smoothstep(0.2, 1.0, fi));
    p = q;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = fi <= 0.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * mv;
    float size = aSize * mix(1.0, 0.55, amt * amt) * mix(0.4, 1.0, fi);
    gl_PointSize = max(1.0, size * uPxScale / max(-mv.z, 0.1));

    vHn = hn;
    vGlow = max(fi * (1.0 - fi) * 3.2, amt * (1.0 - amt) * 2.4 + amt * 0.2) + uGlitch * gs * 0.3;
    vTone = aRand.y;
    vScan = 0.84 + 0.16 * step(0.4, fract(home.y / 0.075));
  }
`;

/**
 * Cada ponto é uma esfera pequena (sombreada a partir do gl_PointCoord): luz de cima à esquerda,
 * a luz ciano da lente vindo de baixo (mais forte embaixo do símbolo) e um brilho especular. A cor
 * é a do arquivo oficial (ciano), clareando para o branco; linhas horizontais e uma faixa de
 * varredura dão o ar de projeção. Pontos em movimento acendem.
 */
export const holoFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform float uTime;
  uniform vec3 uWhite;
  uniform vec3 uAccent;
  varying float vHn;
  varying float vGlow;
  varying float vTone;
  varying float vScan;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    q.y = -q.y;
    float r2 = dot(q, q);
    if (r2 > 1.0) discard;
    vec3 nrm = vec3(q, sqrt(1.0 - r2));
    float key = max(dot(nrm, normalize(vec3(-0.45, 0.65, 0.6))), 0.0);
    float under = max(dot(nrm, normalize(vec3(0.0, -0.85, 0.5))), 0.0) * (1.0 - 0.7 * vHn);
    float spec = pow(max(dot(nrm, normalize(vec3(-0.2, 0.4, 0.9))), 0.0), 24.0);
    vec3 albedo = mix(uAccent, mix(uAccent, uWhite, 0.55), vTone * 0.7);
    vec3 col = albedo * (0.2 + 0.72 * key) + uAccent * under * 0.5 + uWhite * spec * 0.35;
    col *= vScan;
    float band = exp(-pow((vHn - (fract(uTime * 0.14) * 1.4 - 0.2)) * 8.0, 2.0));
    col += mix(uAccent, uWhite, 0.5) * band * 0.22;
    col += mix(uAccent, uWhite, 0.6) * vGlow * 0.55;
    gl_FragColor = portOut(col, 1.0);
  }
`;

/* ───────────────────────── Vidro dos cards ───────────────────────── */

export const glassVertex = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vLocalN;
  varying vec3 vViewN;
  varying vec3 vViewPos;

  void main() {
    vLocal = position;
    vLocalN = normal;
    vViewN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

/**
 * Vidro grosso: distorce a cena de trás (refração em espaço de tela, com uma pequena separação de
 * cor), reflete um ambiente falso (degradê e uma faixa de luz na diagonal 45°), clareia nas bordas
 * e nas laterais e acende perto do cursor. Na face, a gravação fraca da matriz 45°. No card da
 * vez, cantoneiras nos 4 cantos da face (os delimitadores do símbolo de tag).
 */
export const glassFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform sampler2D uScene;
  uniform sampler2D uMedia;
  uniform float uMediaOn;
  uniform float uTime;
  uniform vec3 uCursor;
  uniform vec2 uHalf;
  uniform float uCorner;
  uniform float uCurrent;
  uniform float uDim;
  uniform vec3 uSilver;
  uniform vec3 uWhite;
  uniform vec3 uAccent;
  uniform vec3 uBgDeep;

  varying vec3 vLocal;
  varying vec3 vLocalN;
  varying vec3 vViewN;
  varying vec3 vViewPos;

  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // Cantoneiras: dois braços em L em cada canto, por dentro da borda.
  float brackets(vec2 p) {
    vec2 c = uHalf - 0.075;
    vec2 a = abs(p);
    const float th = 0.014;
    const float len = 0.17;
    float h = step(c.y - th, a.y) * step(a.y, c.y) * step(c.x - len, a.x) * step(a.x, c.x);
    float v = step(c.x - th, a.x) * step(a.x, c.x) * step(c.y - len, a.y) * step(a.y, c.y);
    return max(h, v);
  }

  void main() {
    vec2 pd = portPd();
    if (portSide(pd) < 0.5) discard;

    vec3 n = normalize(vViewN);
    vec3 v = normalize(-vViewPos);
    float cap = step(0.5, abs(vLocalN.z));
    float front = cap * step(0.0, vLocalN.z);
    vec2 p = vLocal.xy;

    // Relevo da face: ondas lentas e as linhas da matriz 45°.
    vec2 g = vec2(p.x + p.y, p.x - p.y) * (0.70710678 / 0.16);
    vec2 gf = abs(fract(g) - 0.5);
    float etch = (1.0 - smoothstep(0.0, 0.05, min(gf.x, gf.y))) * cap;
    vec2 wave = vec2(sin(p.y * 2.3 + p.x * 0.7 + uTime * 0.5), cos(p.x * 1.9 - uTime * 0.4));

    // Refração: a normal na vista desloca a amostra da cena de trás; laterais e borda deslocam mais.
    float sd = sdRoundRect(p, uHalf, uCorner);
    float rim = 1.0 - smoothstep(0.0, 0.07, -sd);
    vec2 offs = n.xy * (0.05 + 0.05 * rim) + wave * 0.006 * cap + (gf - 0.25) * 0.004 * etch;
    vec2 suv = gl_FragCoord.xy / (uRes * uDpr);
    vec3 refr;
    refr.r = texture2D(uScene, suv - offs * 1.06).r;
    refr.g = texture2D(uScene, suv - offs).g;
    refr.b = texture2D(uScene, suv - offs * 0.94).b;

    vec3 base = refr * vec3(0.9, 0.95, 1.0);
    if (uMediaOn > 0.0) {
      vec2 muv = p / (uHalf * 2.0) + 0.5;
      vec3 media = texture2D(uMedia, muv - offs * 0.25).rgb;
      // Só na face da frente.
      base = mix(base, media, uMediaOn * front);
    }

    // Ambiente falso: degradê de cima para baixo e uma faixa de luz na diagonal 45° (o "/" da marca).
    vec3 r = reflect(-v, n);
    float sky = smoothstep(-0.3, 0.9, r.y);
    float streak = exp(-pow((r.x + r.y) * 2.4 - 0.5, 2.0));
    vec3 env = mix(uBgDeep, uSilver * 0.55, sky) + uSilver * streak * 0.35;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);

    vec3 col = base;
    col += env * (0.1 + 0.6 * fres);
    // Laterais (a espessura do vidro) e a borda da face mais claras.
    col += uSilver * (1.0 - cap) * (0.18 + 0.25 * abs(vLocalN.x));
    col += uSilver * rim * cap * 0.16;
    col += uSilver * etch * 0.035;
    // Card da vez: um pouco mais claro e com as cantoneiras.
    col *= 1.0 + 0.06 * uCurrent;
    col = mix(col, uWhite * 0.85, brackets(p) * front * uCurrent);
    // Do outro lado da órbita: escuro, para não disputar com o holograma.
    col *= 1.0 - 0.65 * uDim;
    // Cursor: brilho leve, quase branco, com um toque do acento.
    vec2 dc = (pd - uCursor.xy) / 280.0;
    float glow = exp(-dot(dc, dc)) * uCursor.z;
    col += mix(uSilver, uAccent, 0.3) * glow * (0.08 + 0.18 * rim) * (0.4 + 0.6 * cap);

    gl_FragColor = portOut(col, 1.0);
  }
`;

/* ───────────────────────── Título fatiado ───────────────────────── */

export const titleVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Título do projeto na frente do card. Visto de lado (`uEdge` → 1), se fatia em 15 faixas na
 * diagonal "/" da matriz, as faixas se deslocam e as bordas das letras se separam em vermelho,
 * verde e azul (franja fina; o miolo continua branco).
 * De frente (`uEdge` = 0), fica inteiro e nítido. A textura traz o texto no canal R e um halo
 * escuro em volta das letras no canal G (contraste sobre o vidro).
 */
export const titleFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uEdge;
  uniform float uFade;
  uniform vec3 uHalo;
  varying vec2 vUv;

  float tHash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }

  vec2 sliced(vec2 uv, float e) {
    const float N = 15.0;
    vec2 p = vec2(uv.x * uAspect, uv.y);
    // s: através das faixas "/"; t: ao longo delas.
    float s = (p.x - p.y) * 0.70710678;
    float t = (p.x + p.y) * 0.70710678;
    float smin = -0.70710678;
    float w = (uAspect + 1.0) * 0.70710678 / N;
    float k = (s - smin) / w;
    float i = floor(k);
    float f = k - i;
    s = smin + (i + f * (1.0 - 0.85 * e)) * w;
    t += (tHash(i) - 0.5) * 0.22 * e;
    p = vec2(s + t, t - s) * 0.70710678;
    return vec2(p.x / uAspect, p.y);
  }

  float mask(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture2D(uMap, uv).r;
  }

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    float e = uEdge;
    vec2 uv = e > 0.001 ? sliced(vUv, e) : vUv;
    // Separação curta (menor que o traço da letra): franjas coloridas nas bordas, miolo branco.
    vec2 split = vec2(0.005 * e, 0.0);
    float mr = mask(uv + split);
    float mg = mask(uv);
    float mb = mask(uv - split);
    float halo = texture2D(uMap, clamp(uv, 0.0, 1.0)).g * (1.0 - e);
    float ta = max(max(mr, mg), mb);
    vec3 text = mix(vec3(ta), vec3(mr, mg, mb), 0.6);
    float ha = halo * 0.55;
    vec3 col = text + uHalo * ha * (1.0 - ta);
    float a = max(ta, ha);
    if (a < 1e-4) discard;
    gl_FragColor = portOut(col / a, a) * uFade;
  }
`;
