/**
 * Matriz 45° como chão em perspectiva (conceito oficial: grade modular de 45 graus + nós).
 *
 * Um quad de tela cheia: cada pixel lança um raio da câmera e acha o ponto no plano z = 0.
 * Esse ponto é convertido para "px do plano" (os px CSS da tela quando a câmera está de frente).
 * Na pose final (câmera de frente, distância 10) o resultado é idêntico à matriz da v1:
 * mesma grade, mesmos nós, mesma zona calma e o mesmo contraste.
 *
 * - linhas nas duas diagonais, com a origem no centro do símbolo e a célula calibrada
 *   para que as arestas externas dos colchetes caiam sobre as linhas;
 * - nós (quadrados com cantos arredondados, como os do símbolo) nas interseções;
 * - revelação em losango (distância L1) a partir do centro do símbolo;
 * - ondas de "commit" em losango a partir de cada nó do símbolo;
 * - luz guiada pelo cursor, também em losango;
 * - zona calma atrás do texto, para manter o contraste;
 * - em perspectiva: antisserrilhado por eixo, linhas somem quando a célula fica pequena demais
 *   e névoa radial em volta do símbolo (as duas zeram na pose final).
 *
 * As cores chegam em espaço linear (THREE.Color converte do sRGB); o EffectComposer
 * converte para sRGB na saída.
 */

export const latticeVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const latticeFragment = /* glsl */ `
  precision highp float;

  uniform vec2 uRes;       // px CSS
  uniform float uDpr;
  uniform vec3 uCamPos;    // câmera (mundo)
  uniform mat4 uInvProj;   // projectionMatrixInverse
  uniform mat4 uCamWorld;  // matrixWorld da câmera
  uniform float uK;        // mundo por px do plano
  uniform vec2 uOrigin;    // px do plano, y para cima
  uniform float uCell;     // px do plano
  uniform float uNode;     // meio-lado do nó, px do plano
  uniform float uDraw;     // raio L1 da revelação, px do plano
  uniform float uEdge;     // brilho da frente de revelação, 0..1
  uniform vec3 uMouse;     // xy px do plano (y para cima), z = presença 0..1
  uniform vec3 uWaveA;     // xy origem, z raio
  uniform float uWaveAAmp;
  uniform vec3 uWaveB;
  uniform float uWaveBAmp;
  uniform vec4 uQuiet;     // xy centro, zw meia-largura/altura (px do plano)
  uniform float uCalmK;    // 0..1: força da zona calma (1 quando o texto aparece)
  uniform vec4 uFog;       // xy centro (px do plano), z início, w fim (px do plano)
  uniform float uFogK;     // 0..1 (0 na pose final)

  uniform vec3 uBg;
  uniform vec3 uBgDeep;
  uniform vec3 uLine;
  uniform vec3 uLineHi;
  uniform vec3 uAccent;

  const float R = 0.70710678;

  float l1(vec2 v) { return abs(v.x) + abs(v.y); }

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float ring(vec2 px, vec3 w, float amp) {
    if (amp <= 0.0) return 0.0;
    float d = (l1(px - w.xy) - w.z) / 26.0;
    return exp(-d * d) * amp;
  }

  // Linha de meia-largura lw (px do plano) com antisserrilhado aa (px do plano por pixel da tela).
  // Quando o pixel cobre mais que a linha, ela afina em cobertura em vez de sumir ou serrilhar.
  float lineCov(float d, float lw, float aa) {
    float w = max(lw, aa * 0.5);
    return (1.0 - smoothstep(w - aa * 0.5, w + aa * 0.5, d)) * (lw / w);
  }

  void main() {
    // Fundo: Azul Noturno Soberano no centro, background mais profundo nas bordas (espaço da tela).
    vec2 sp = gl_FragCoord.xy / uDpr;
    vec2 uv = sp / uRes - 0.5;
    uv.x *= uRes.x / uRes.y;
    float vig = smoothstep(0.3, 1.05, length(uv));
    vec3 col = mix(uBg, uBgDeep, vig * 0.9);

    // Raio da câmera → plano z = 0.
    vec2 ndc = gl_FragCoord.xy / (uRes * uDpr) * 2.0 - 1.0;
    vec4 v = uInvProj * vec4(ndc, 1.0, 1.0);
    vec3 dir = normalize((uCamWorld * vec4(v.xyz / v.w, 0.0)).xyz);
    if (dir.z > -1e-4) {
      gl_FragColor = vec4(mix(col, uBgDeep, uFogK), 1.0);
      return;
    }
    vec3 hit = uCamPos + dir * (-uCamPos.z / dir.z);
    vec2 px = hit.xy / uK + uRes * 0.5;
    vec2 p = px - uOrigin;

    // Coordenadas giradas 45°: as linhas da matriz são q.x = n·célula e q.y = m·célula.
    vec2 q = vec2(p.x + p.y, p.y - p.x) * R;
    vec2 g = q / uCell;
    float aaX = length(vec2(dFdx(q.x), dFdy(q.x)));
    float aaY = length(vec2(dFdx(q.y), dFdy(q.y)));
    float aaN = max(aaX, aaY);
    // Célula com menos de ~6 pixels na tela: a grade some antes de virar moiré.
    float lod = smoothstep(3.0, 8.0, uCell / aaN);

    // Interações (todas em losango, L1).
    float light = exp(-l1(px - uMouse.xy) / 170.0) * uMouse.z;
    float rings = ring(px, uWaveA, uWaveAAmp) + ring(px, uWaveB, uWaveBAmp);
    float dist = l1(p);
    float reveal = 1.0 - smoothstep(uDraw - 70.0, uDraw, dist);
    float edgeD = (dist - uDraw) / 16.0;
    float edge = exp(-edgeD * edgeD) * uEdge;
    float acc = clamp(rings + edge, 0.0, 1.0);
    float hi = clamp(light * 1.25, 0.0, 1.0);

    float qd = sdBox(px - uQuiet.xy, uQuiet.zw);
    // 95% mais calmo atrás do texto: contraste ≥ 6:1 no pior caso (nó aceso pelo cursor).
    float calm = 1.0 - uCalmK * 0.95 * (1.0 - smoothstep(0.0, 72.0, qd));

    float fog = smoothstep(uFog.z, uFog.w, length(px - uFog.xy)) * uFogK;
    float vis = reveal * calm * lod * (1.0 - fog);

    // Linhas.
    vec2 fd = abs(fract(g + 0.5) - 0.5) * uCell;
    float lw = 0.5;
    float line = max(lineCov(fd.x, lw, aaX), lineCov(fd.y, lw, aaY));
    float lineA = line * vis * (0.5 + 0.45 * light + 0.8 * acc);
    vec3 lineC = mix(mix(uLine, uLineHi, hi * 0.6), uAccent, acc);
    col = mix(col, lineC, clamp(lineA, 0.0, 1.0));

    // Nós nas interseções: quadrado alinhado aos eixos do plano, cantos arredondados.
    vec2 dq = q - floor(g + 0.5) * uCell;
    vec2 dp = vec2(dq.x - dq.y, dq.x + dq.y) * R;
    float ns = uNode * (1.0 + 0.5 * light + 0.9 * acc);
    float rr = ns * 0.3;
    float nd = sdBox(dp, vec2(ns - rr)) - rr;
    float node = 1.0 - smoothstep(-aaN * 0.5, aaN * 0.5, nd);
    float nodeA = node * vis * (0.75 + 0.25 * light + acc);
    vec3 nodeC = mix(mix(uLine * 1.5, uLineHi, hi), uAccent, clamp(acc + light * light * 0.9, 0.0, 1.0));
    nodeC *= 1.0 + 1.3 * acc;
    col = mix(col, nodeC, clamp(nodeA, 0.0, 1.0));

    col = mix(col, uBgDeep, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;
