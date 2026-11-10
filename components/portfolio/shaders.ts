/**
 * Shaders do portfólio (D-024). Técnica estudada no portfólio do Active Theory (vidro que refrata a
 * cena de trás, título fatiado em RGB visto de lado); o código é nosso.
 *
 * - Tudo usa o corte C ("/" com a borda de nós, D-024), no mesmo formato dos cortes da entrada:
 *   do lado de antes (os detalhes do Sobre, em HTML), o canvas fica transparente; do lado de depois,
 *   o portfólio. `uAll` = 1 desenha tudo (passe da refração e corte já terminado).
 * - O canvas tem alfa e é pré-multiplicado: a cor sai já multiplicada pelo alfa.
 * - As contas são em RGB linear, como no palco da entrada; `portOut` converte para a tela (sRGB).
 *   Sem tone mapping (canvas `flat`).
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

  // Lado do portfólio (1) ou dos detalhes do Sobre (0).
  float portSide(vec2 pd) {
    if (uAll > 0.5) return 1.0;
    return cutWith(uCutC, pd).x;
  }

  // Saída: as contas são em RGB linear (o THREE.Color converte o hex); a tela recebe sRGB e a
  // textura da refração fica linear (o linearToOutputTexel muda com o alvo). Alfa pré-multiplicado.
  vec4 portOut(vec3 col, float a) {
    return vec4(linearToOutputTexel(vec4(col, 1.0)).rgb * a, a);
  }
`;

/* ───────────────────────── Fundo ───────────────────────── */

export const backgroundVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fundo: Azul Noturno com as bordas mais fundas e uma luz suave na faixa da coluna de nós (no meio
 * da tela, onde fica o eixo da espiral). Os nós da borda do corte ficam por cima, dos dois lados.
 */
export const backgroundFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uNodeCol;
  uniform vec3 uNodeAccent;
  uniform float uAxisX;

  void main() {
    vec2 pd = portPd();
    vec3 cut = uAll > 0.5 ? vec3(1.0, 0.0, 0.0) : cutWith(uCutC, pd);
    float a = max(cut.x, cut.y);
    if (a <= 0.0) discard;

    vec2 uv = pd / uRes - 0.5;
    uv.x *= uRes.x / uRes.y;
    float vig = smoothstep(0.25, 1.1, length(uv));
    vec3 col = mix(uBg, uBgDeep, vig * 0.9);
    // Luz da coluna: faixa vertical larga no eixo.
    float ax = (pd.x / uRes.x - uAxisX) * uRes.x / uRes.y;
    col *= 1.0 + 0.32 * exp(-ax * ax / 0.07);

    vec3 nc = mix(uNodeCol * 0.5, uNodeAccent * 0.85, cut.z);
    col = mix(col, nc, cut.y);
    vec4 o = portOut(col, a);
    // Pontilhado fino contra faixas no degradê escuro (fixo).
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    o.rgb += (n - 0.5) * (1.5 / 255.0) * a;
    gl_FragColor = o;
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
 * e nas laterais e acende perto do cursor. Na face, a gravação fraca da matriz 45°.
 */
export const glassFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform sampler2D uScene;
  uniform sampler2D uMedia;
  uniform float uMediaOn;
  uniform vec2 uMediaFit;
  uniform float uTime;
  uniform vec3 uCursor;
  uniform vec2 uHalf;
  uniform float uCorner;
  uniform float uCurrent;
  uniform float uLift;
  uniform vec3 uSilver;
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

  void main() {
    vec2 pd = portPd();
    if (portSide(pd) < 0.5) discard;

    vec3 n = normalize(vViewN);
    vec3 v = normalize(-vViewPos);
    float cap = step(0.5, abs(vLocalN.z));
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
      vec2 muv = (p / (uHalf * 2.0)) * uMediaFit + 0.5;
      // Vídeo meio desfocado (D-043): média de 13 amostras num disco.
      vec2 mc = muv - offs * 0.6;
      vec3 media = vec3(texture2D(uMedia, mc + offs * 0.06).r, texture2D(uMedia, mc).g, texture2D(uMedia, mc - offs * 0.06).b);
      for (int i = 0; i < 12; i++) {
        float an = float(i) * 0.5235988;
        float rr = mod(float(i), 2.0) < 0.5 ? 0.003 : 0.006;
        media += texture2D(uMedia, mc + vec2(cos(an), sin(an)) * rr).rgb;
      }
      media /= 13.0;
      // Só na face da frente.
      // Vídeo escurecido e translúcido, como atrás de um vidro fumê: a coluna refratada
      // continua aparecendo um pouco por baixo.
      // Projeto abrindo (D-049): o vídeo clareia até o normal e a refração sai de baixo dele.
      vec3 sharp = texture2D(uMedia, muv).rgb;
      media = mix(media * 0.2 + vec3(0.002, 0.006, 0.012), sharp, uLift);
      base = mix(base, media + base * 0.5 * (1.0 - uLift), uMediaOn * cap * step(0.0, vLocalN.z));
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
    // Card da vez: um pouco mais claro.
    col *= 1.0 + 0.06 * uCurrent;
    // Cursor: brilho leve, quase branco, com um toque do acento.
    vec2 dc = (pd - uCursor.xy) / 280.0;
    float glow = exp(-dot(dc, dc)) * uCursor.z;
    col += mix(uSilver, uAccent, 0.3) * glow * (0.08 + 0.18 * rim) * (0.4 + 0.6 * cap);

    gl_FragColor = portOut(col, 1.0);
  }
`;

/* ───────────────────────── Título ───────────────────────── */

/** Máximo de letras com efeito próprio no título (as que passarem disso ficam na última célula). */
export const TITLE_MAX_LETTERS = 24;

export const titleVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Título do projeto, solto um pouco na frente do card, no modelo do Active Theory (técnica estudada
 * no site deles; o código é nosso).
 * - De frente (`uEdge` = 0), fica inteiro e nítido.
 * - Visto de lado (`uEdge` → 1), cada letra se repete dentro do próprio espaço, de 1 a 4 cópias
 *   mais estreitas ("EEE.C.C.H"): o título nunca passa da sua largura. As cópias saem mais fracas,
 *   com franja fina em vermelho, verde e azul, e uma ou outra pula um pouco para cima ou para baixo.
 * - O efeito começa pelas letras do lado de fora (as mais longe do meio da tela) e vai até as de
 *   dentro, conforme o card gira (`uSide` diz de que lado ele está). Segue a rolagem; não pisca.
 * - A textura traz o texto no canal R e um halo escuro em volta das letras no canal G (contraste
 *   sobre o vidro). `uCuts` são as bordas das células das letras, em uv.
 */
export const titleFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  #define MAX_LETTERS ${TITLE_MAX_LETTERS}
  uniform sampler2D uMap;
  uniform float uCuts[MAX_LETTERS + 1];
  uniform float uCount;
  uniform float uSeed;
  uniform float uEdge;
  uniform float uSide;
  uniform float uFade;
  uniform vec3 uHalo;
  varying vec2 vUv;

  float tHash(float n) { return fract(sin(n * 91.3458) * 47453.5453); }

  float mask(vec2 uv) {
    if (uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture2D(uMap, uv).r;
  }

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec2 uv = vUv;

    // Célula da letra sob o pixel.
    float x0 = 0.0;
    float x1 = 1.0;
    float idx = 0.0;
    float found = 0.0;
    for (int k = 0; k < MAX_LETTERS; k++) {
      if (float(k) >= uCount) break;
      float ca = uCuts[k];
      float cb = uCuts[k + 1];
      if (uv.x >= ca && uv.x < cb) {
        x0 = ca;
        x1 = cb;
        idx = float(k);
        found = 1.0;
      }
    }

    vec2 src = uv;
    float gain = 1.0;
    float split = 0.0;
    float amt = 0.0;
    if (found > 0.5 && uEdge > 0.001) {
      float w = x1 - x0;
      float local = (uv.x - x0) / w;
      float h1 = tHash(idx + uSeed);
      float h2 = tHash(idx * 1.618 + uSeed + 3.0);
      float h3 = tHash(idx * 2.414 + uSeed + 7.0);
      // Lado de fora primeiro: 0 na letra mais perto do meio da tela, 1 na mais longe.
      float r = (idx + 0.5) / uCount;
      float outer = uSide > 0.0 ? 1.0 - r : r;
      amt = clamp(uEdge * 1.7 - 0.75 * (1.0 - outer) - 0.15 * h1, 0.0, 1.0);
      // Cópias da letra dentro da própria célula.
      float reps = 1.0 + floor(amt * (1.0 + 2.999 * h2));
      float copy = floor(local * reps);
      float lt = fract(local * reps);
      // Uma ou outra cópia sai da linha.
      float hc = tHash(copy * 3.7 + idx * 1.3 + uSeed);
      float jump = step(0.8, hc) * step(1.5, reps) * (tHash(hc * 9.1) - 0.5) * 0.22 * amt;
      src = vec2(x0 + lt * w, uv.y + jump);
      // A última cópia fica inteira; as outras, mais fracas.
      gain = copy > reps - 1.5 ? 1.0 : 0.45 + 0.4 * tHash(hc * 5.3);
      split = (0.04 + 0.06 * h3) * amt * w;
    }
    float mr = found * mask(src + vec2(split, 0.0));
    float mg = found * mask(src);
    float mb = found * mask(src - vec2(split, 0.0));
    float halo = texture2D(uMap, clamp(src, 0.0, 1.0)).g * (1.0 - amt);
    float ta = max(max(mr, mg), mb) * gain;
    vec3 text = mix(vec3(ta), vec3(mr, mg, mb) * gain, min(1.0, amt * 2.0));
    // Sem contorno escuro em volta das letras (pedido do cliente, D-044).
    float ha = halo * 0.0;
    vec3 col = text + uHalo * ha * (1.0 - ta);
    float a = max(ta, ha);
    if (a < 1e-4) discard;
    gl_FragColor = portOut(col / a, a) * uFade;
  }
`;

/* ───────────────────────── Coluna de nós ───────────────────────── */

/**
 * Coluna de nós no eixo da espiral, como a nuvem da descida (D-022): fitas em hélice, um miolo
 * fino e nós soltos em volta. Os nós sobem com o relógio de atividade (só anda enquanto o usuário
 * rola ou mexe o cursor) e a coluna gira com a rolagem. Nós redondos (D-022, D-024); os maiores
 * viram bolhas.
 */
export const columnVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpin;
  uniform float uTop;
  uniform float uBottom;
  uniform float uDpr;
  uniform float uPx;
  uniform vec3 uSilver;
  uniform vec3 uWhite;
  uniform vec3 uAccent;

  attribute vec4 aRand;
  attribute float aKind;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vBubble;

  void main() {
    float H = uTop - uBottom;
    float speed = 0.12 + 0.22 * aRand.w;
    float rise = uTime * speed;
    float y = uBottom + mod(aRand.y * H + rise, H);
    float life = (y - uBottom) / H;

    float ang;
    float rad;
    if (aKind < 0.5) {
      // Trança de 3 fios: cada fio gira em hélice e entra e sai em relação aos outros, cruzando
      // por cima e por baixo. Fios finos (tubo estreito em volta da linha central).
      float k = floor(aRand.x * 3.0);
      float t = y * 1.1 + k * 2.0943951;
      float tube = (aRand.z - 0.5) * (aRand.z - 0.5) * 4.0 * sign(aRand.z - 0.5);
      ang = t + tube * 0.18;
      rad = 0.72 + 0.32 * sin(2.0 * t) + tube * 0.10;
    } else if (aKind < 1.5) {
      // Miolo fino.
      ang = aRand.x * 6.2831853;
      rad = 0.16 * sqrt(aRand.z);
    } else {
      // Nós soltos em volta.
      ang = aRand.x * 6.2831853;
      rad = 1.0 + 1.5 * pow(aRand.z, 1.4);
    }
    ang += uSpin + rise * 0.35;
    vec3 p = vec3(cos(ang) * rad, y, sin(ang) * rad);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Quase todos pequenos; poucos grandes (bolhas).
    float big = pow(aRand.w, 9.0);
    float px = mix(1.1, 5.5, big) * uPx;
    gl_PointSize = max(1.0, px * uDpr * (7.5 / max(-mv.z, 0.5)));
    vBubble = smoothstep(0.35, 0.8, big);

    float ends = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.85, 1.0, life));
    float kindA = aKind > 1.5 ? 0.55 : (aKind > 0.5 ? 0.8 : 1.0);
    vAlpha = ends * kindA * mix(0.55, 1.0, fract(aRand.x * 7.13));

    // Prata e branco; cerca de 12% em ciano (acento).
    float c = fract(aRand.z * 13.37 + aRand.w * 5.11);
    vColor = c < 0.12 ? uAccent : mix(uSilver, uWhite, fract(aRand.y * 9.71));
  }
`;

export const columnFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBubble;

  void main() {
    if (portSide(portPd()) < 0.5) discard;
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(q, q);
    if (r2 > 1.0) discard;
    float disc = 1.0 - smoothstep(0.55, 1.0, r2);
    // Bolha: sombreado de esfera, luz vinda de cima à esquerda, borda mais clara.
    float z = sqrt(max(0.0, 1.0 - r2));
    vec3 nrm = vec3(q.x, -q.y, z);
    float lit = max(dot(nrm, normalize(vec3(-0.5, 0.6, 0.6))), 0.0);
    float shade = mix(1.0, 0.25 + 0.75 * lit + 0.5 * pow(1.0 - z, 3.0), vBubble);
    float a = disc * vAlpha * mix(0.75, 0.6, vBubble);
    gl_FragColor = vec4(portOut(vColor * shade, a).rgb, 0.0);
  }
`;

/* ───────────────────────── Projeto aberto (D-049) ───────────────────────── */

export const detailVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Projeto aberto (D-049), reprodução da página de projeto do Active Theory; o código é nosso.
 * Em tela cheia, por raio a partir de uma câmera que orbita um pouco com o cursor (`uLook`):
 * - uma sala em perspectiva (teto, chão, paredes e fundo). As paredes são metal escovado em fileiras
 *   retas (a grade da matriz) que refletem o vídeo: cada trecho da fileira estica um pixel do vídeo
 *   (blocos), mais nítido perto do fundo e escurecendo para perto da câmera;
 * - o painel do vídeo no fundo da sala (`uRect` em repouso, px CSS com y para baixo), com dois cantos
 *   chanfrados (os delimitadores da tag girados 45°) e espessura que aparece com a paralaxe;
 * - `uText`, `uHint` e `uSide`: caixas do texto, do aviso e do botão (px CSS), onde a luminância tem teto (contraste garantido).
 * `uPanel` (com dissolução em blocos, os nós) e `uTunnel` fazem a passagem a partir do card.
 */
export const detailFragment = /* glsl */ `
  precision highp float;
  ${portCutGlsl}
  uniform float uTime;
  uniform sampler2D uMedia;
  uniform float uMediaOn;
  uniform float uLod;
  uniform vec2 uFit;
  uniform vec4 uRect;
  uniform vec4 uText;
  uniform vec4 uHint;
  uniform vec4 uSide;
  uniform vec2 uLook;
  uniform float uPanel;
  uniform float uTunnel;
  uniform vec3 uBg;
  uniform vec3 uBgDeep;

  // Teto de luminância (linear) debaixo do texto: 0,07 dá 4,9:1 ou mais para o cinza secundário
  // (#b7c5d4) e 8:1 para o texto principal.
  const float TEXT_LUM = 0.07;
  const float DP = 1.0;   // profundidade do painel
  const float DB = 1.06;  // profundidade da parede do fundo

  float dHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 mediaLod(vec2 uv, float lod) {
    if (uMediaOn < 0.5) return uBg;
    // O vídeo chega em sRGB (a GPU não decodifica textura de vídeo): passa para linear, e a cor
    // sai na tela igual à do arquivo.
    vec3 c = textureLod(uMedia, clamp(uv, 0.004, 0.996), max(lod, 0.0)).rgb;
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
  }
  // uv do vídeo (cover) a partir de coordenadas normalizadas do painel (0..1, y para baixo).
  vec2 fitUv(vec2 n) { return vec2((n.x - 0.5) * uFit.x + 0.5, 0.5 - (n.y - 0.5) * uFit.y); }
  // 1 dentro da caixa, caindo suave (sem borda) em cerca de f px para fora; caixa vazia não conta.
  float softBox(vec2 p, vec4 r, float f) {
    vec2 q = abs(p - (r.xy + r.zw) * 0.5) - (r.zw - r.xy) * 0.5;
    float dd = max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0), 0.0);
    return exp(-dd * dd / (f * f)) * step(r.x + 1.0, r.z);
  }
  // Forma do painel (px, y para baixo): cantos arredondados, chanfro em cima à esquerda e embaixo à direita.
  float panelSd(vec2 p, vec2 hs) {
    float r = 6.0;
    vec2 q = abs(p) - hs + r;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    float ch = clamp(hs.x * 0.045, 8.0, 30.0);
    vec2 n = vec2(0.70710678);
    sd = max(sd, dot(p, -n) - dot(vec2(-hs.x + ch, -hs.y), -n));
    sd = max(sd, dot(p, n) - dot(vec2(hs.x - ch, hs.y), n));
    return sd;
  }
  float dNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x),
               mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float dFbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * dNoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return s;
  }
  void main() {
    vec2 px = portPd();
    vec2 sc = uRes * 0.5;
    float f = uRes.y * 0.95;
    vec2 L = uLook * uTunnel;

    // Câmera: orbita um ponto atrás do painel, na direção do cursor.
    vec3 ro = vec3(L.x * 0.07, -L.y * 0.05, 0.0);
    vec3 fw = normalize(vec3(0.0, 0.0, -DP * 2.6) - ro);
    vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(rt, fw);
    vec2 s = vec2(px.x - sc.x, sc.y - px.y) / f;
    vec3 rd = normalize(fw + rt * s.x + up * s.y);

    // Painel em repouso (px) para o mundo: centro e meia-medida no plano z = -DP.
    vec2 cpx = (uRect.xy + uRect.zw) * 0.5;
    vec2 hs = max((uRect.zw - uRect.xy) * 0.5, vec2(1.0));
    vec2 P0 = vec2(cpx.x - sc.x, sc.y - cpx.y) / f * DP;
    float tp = (-DP - ro.z) / rd.z;
    vec3 qp = ro + rd * tp;
    vec2 lp = vec2(qp.x - P0.x, P0.y - qp.y) / DP * f;   // px do painel, y para baixo
    float sdF = panelSd(lp, hs);
    // Espessura: a face de trás, deslocada na direção do olhar, aparece como borda.
    vec2 off = (L + vec2(0.35, -0.15)) * vec2(9.0, 7.0);
    float sdB = panelSd(lp - off, hs);
    float inF = 1.0 - smoothstep(-0.75, 0.75, sdF);
    float inB = (1.0 - smoothstep(-0.75, 0.75, sdB)) * (1.0 - inF);
    vec2 nP = lp / (hs * 2.0) + 0.5;
    vec3 pc = mediaLod(fitUv(nP), 0.0);
    vec3 side = mediaLod(fitUv(clamp((lp - off) / (hs * 2.0) + 0.5, 0.0, 1.0)), uLod - 5.0) * 0.6 + 0.02;
    // Dissolução em blocos na entrada: o lado direito chega por último.
    vec2 blk = floor(px / 12.0);
    float reveal = uPanel * 1.35 - 0.35 * clamp(nP.x, 0.0, 1.0);
    float bv = step(dHash(blk + 3.1), reveal) * step(0.001, uPanel);
    float pa = max(inF, inB) * mix(bv, 1.0, step(0.999, uPanel));
    vec3 pcol = inF > 0.0 ? mix(side, pc, inF / max(inF + inB, 1e-4)) : side;

    // Fundo preto com o reflexo do vídeo atrás do painel (pedido do cliente, D-049): um halo bem
    // borrado, com a cor do vídeo, que vaza em volta do painel como fumaça e rola devagar.
    vec2 hn = (px - cpx) / (hs * 2.0);
    float outD = length(max(abs(px - cpx) - hs, 0.0)) / uRes.y;
    vec2 sp = px / uRes.y * 2.6;
    float tt = uTime * 0.06;
    float s1 = dFbm(sp + vec2(tt, -tt * 0.6));
    float s2 = dFbm(sp * 1.9 - vec2(tt * 0.8, tt * 0.5) + s1 * 1.5);
    float smoke = smoothstep(0.2, 0.85, s1 * 0.55 + s2 * 0.6);
    vec3 glow = mediaLod(fitUv(clamp(hn * 0.7 + (vec2(s1, s2) - 0.5) * 0.25 + 0.5, 0.0, 1.0)), uLod - 2.0);
    vec3 tc = glow * 0.07 * smoke * exp(-outD * 9.0);

    // Composição (alfa pré-multiplicado no fim). Nada escurece o vídeo; só a parede debaixo do
    // aviso de cima tem teto de luminância.
    float scrim = max(max(softBox(px, uHint, 60.0), softBox(px, uText, 40.0)), softBox(px, uSide, 40.0)) * uTunnel;
    float ta = uTunnel;
    float a = pa + ta * (1.0 - pa);
    float lumT = dot(tc, vec3(0.2126, 0.7152, 0.0722));
    tc *= mix(1.0, min(1.0, TEXT_LUM / max(lumT, 1e-4)), scrim);
    vec3 colr = (pcol * pa + tc * ta * (1.0 - pa)) / max(a, 1e-4);
    gl_FragColor = portOut(colr, a);
  }
`;
