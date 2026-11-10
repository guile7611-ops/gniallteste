/**
 * Passagem da entrada para o Sobre (D-015, D-017, D-019), dirigida só pela rolagem da página (sem
 * bibliotecas). A roda desliza até a posição pedida (D-016, `smoothScroll.ts`); teclado, toque e
 * barra são nativos.
 *
 * - `p` (0..1) é o progresso da rolagem dentro do trecho fixo da entrada. Tudo aqui é função
 *   pura de `p`: rolar de volta desfaz a passagem na mesma ordem.
 * - Dois cortes diagonais "/" (a matriz 45°) entram pelo canto inferior direito e varrem até o canto
 *   superior esquerdo, com a borda desfeita em nós (células em losango da matriz). O corte A troca o
 *   data center pela descida; o corte B troca a descida pelo Sobre.
 * - Descida (D-019): o vídeo desfocado corre no fundo junto com a rolagem, luzes coloridas giram em
 *   volta do símbolo e o iluminam, e nós sobem pela tela (quem desce é a página).
 * - Só as 4 peças do símbolo em metal (D-013) saem do meio do logo, vão para o meio da tela, giram
 *   uma volta inteira no eixo vertical durante a descida (D-031), crescendo e diminuindo duas vezes
 *   (D-022), e
 *   pousam no lugar do arquivo oficial do símbolo, no meio do Sobre. O nome e a assinatura ficam no
 *   data center.
 * - Como no Active Theory, o texto do Sobre aparece pelo corte B (do lado do Sobre, depois da borda
 *   de nós) e sobe mais devagar que a página até o lugar (D-017).
 *
 * Linha do tempo (fração de `p`; o trecho fixo tem 3 telas, D-030):
 * - 0 a 0,225: corte A; o símbolo sai do logo e vai para o meio da tela;
 * - 0,045 a 0,73: vídeo e luzes da descida;
 * - 0,7 a 0,925: corte B; o símbolo vai para o lugar dele no Sobre (chega em 0,94);
 * - 0,7 a 1: o texto do Sobre sobe até o lugar e termina na velocidade da página.
 * Os cortes têm o mesmo comprimento de antes (cerca de 0,7 tela cada); só o meio da descida encurtou.
 */
import {
  SYMBOL_CENTER_LOCAL,
  SYMBOL_CENTER_VB,
  SYMBOL_IN_VERTICAL_LOGO,
  SYMBOL_TIP_DIAGONAL_LOCAL,
  VIEWBOX,
} from './symbolGeometry';
import type { Rect } from './types';

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Trecho de `p` (início, fim). */
type Span = readonly [number, number];
/** Progresso (0..1) de `p` dentro de um trecho. */
const span = (p: number, [a, b]: Span) => clamp01((p - a) / (b - a));

/** Corte A (entrada → descida) e corte B (descida → Sobre). */
const CUT_A: Span = [0, 0.225];
const CUT_B: Span = [0.7, 0.925];
/** Vídeo e luzes da descida. */
const DESCENT: Span = [0.045, 0.73];
/** Símbolo: do logo para o meio da tela; do meio da tela para o lugar no Sobre; giro. */
const SYMBOL_IN: Span = [0.015, 0.225];
const SYMBOL_OUT: Span = [0.7, 0.94];
const SPIN: Span = [0.015, 0.7];
/**
 * Voltas do símbolo no eixo vertical (D-031). O verso do símbolo é quase igual à frente, então cada
 * meia volta parece uma volta: uma volta inteira mostra o símbolo de frente 2 vezes (o verso, no
 * meio da descida, e a frente, antes do corte do Sobre). Daí até o Sobre, ele fica de frente.
 */
const SPIN_TURNS = 1;
/** Giro na passagem para o Sobre (D-035): mais uma volta enquanto ele viaja até o lugar dele. */
const SPIN_OUT_TURNS = 1;
/** Pose de repouso no Sobre (D-039): o símbolo para virado de lado, em três quartos (rad). */
export const REST_YAW = 0;
/** Quanto da pose de repouso já entrou (0 → 1) no progresso p da passagem. */
export const restYawAt = (p: number) => REST_YAW * smooth(span(p, SYMBOL_OUT));
/** Na descida, o símbolo fica no meio da tela e desce um pouco (fração da altura). */
const SPOT_Y: Span = [0.46, 0.54];
/** Tamanho do símbolo na descida, em relação ao tamanho dele no Sobre (D-030: maior). */
const SPOT_SCALE = 1.7;
/**
 * Pulso de tamanho na descida (D-022): enquanto gira, o símbolo cresce e diminui `PULSE_CYCLES` vezes,
 * entre e^-PULSE_AMP e e^PULSE_AMP do tamanho da descida (cerca de 0,6x a 1,6x). Volta ao tamanho
 * normal antes do corte B, para pousar no Sobre igual ao arquivo.
 */
const PULSE: Span = [0.195, 0.7];
const PULSE_CYCLES = 2;
const PULSE_AMP = 0.47;
/** O símbolo crescido nunca passa desta fração da altura e da largura da tela. */
const PULSE_MAX = { h: 0.78, w: 0.9 } as const;

/*
 * Arquivo oficial do símbolo (sy-color-inverted.svg): o path é o mesmo do símbolo no logo
 * vertical, sob outra transformação. Matrizes lidas do próprio SVG (grupo · path), compostas aqui.
 */
const FILE_SX = 0.495576 * 6.210128;
const FILE_TX = 0.495576 * 2965.524511 - 937.969941 - 1341;
const FILE_SY = 0.499573 * 6.160443;
const FILE_TY = 0.499573 * -4996.757909 + 2128.719588 - 2128;

export const SYMBOL_FILE = {
  src: '/brand/oficial/sy-color-inverted.svg',
  viewBox: 1081,
  /** Centro do símbolo no arquivo (unidades do viewBox do arquivo). */
  cx: FILE_SX * SYMBOL_CENTER_LOCAL.x + FILE_TX,
  cy: FILE_SY * SYMBOL_CENTER_LOCAL.y + FILE_TY,
  /** Unidades do arquivo do símbolo por unidade do viewBox do logo vertical (espaço do símbolo). */
  ratio: FILE_SX / SYMBOL_IN_VERTICAL_LOGO.a,
} as const;

/**
 * Linha de um corte em px CSS do palco, y para baixo: o lado de depois é x + y > c.
 * `band` é a largura da borda que se desfaz em nós; `cell`, o lado de uma célula da matriz;
 * `on`, se o corte já começou.
 */
export interface Cut {
  c: number;
  band: number;
  cell: number;
  on: boolean;
}

function sweep(t: number, width: number, height: number): Cut {
  const m = Math.min(width, height);
  const band = clamp(m * 0.16, 64, 160);
  const cell = clamp(m / 48, 10, 18);
  const c = lerp(width + height + band, -band, smooth(t));
  return { c, band, cell, on: t > 0 };
}

/** Corte A: o data center (antes) e a descida (depois). */
export const cutA = (p: number, width: number, height: number) => sweep(span(p, CUT_A), width, height);
/** Corte B: a descida (antes) e o Sobre (depois). */
export const cutB = (p: number, width: number, height: number) => sweep(span(p, CUT_B), width, height);
/**
 * Corte C (D-024): os detalhes do Sobre (antes) e o portfólio (depois). Mesmo corte "/" com a borda
 * de nós; `t` (0..1) é o progresso do corte, dirigido pela rolagem do portfólio.
 */
/**
 * Saída do Sobre para o portfólio (D-040): progresso 0..1 do corte do portfólio, escrito pela seção
 * do portfólio a cada quadro e lido pelo palco da entrada, que gira o símbolo mais uma volta e o
 * desce até a base do holograma.
 */
export const portfolioExit = { t: 0 };

export const cutC = (t: number, width: number, height: number) => sweep(clamp01(t), width, height);
/** O corte já passou pela tela toda (nada do lado de antes aparece). */
export const cutDone = (cut: Cut) => cut.on && cut.c <= -cut.band;

/** Progresso da descida (0..1): o vídeo vai do primeiro ao último quadro e as luzes giram. */
export const descentProgress = (p: number) => span(p, DESCENT);

/** Presença das luzes da descida (0..1): acendem com o corte A e apagam com o corte B. */
export const descentPresence = (p: number) => smooth(span(p, [0.03, 0.18])) * (1 - smooth(span(p, [0.7, 0.895])));

/**
 * Até onde o texto da entrada pode ir (soma x + y em px): antes da borda e dos nós dela, para o
 * texto nunca ficar por cima dos nós (contraste).
 */
export function textLimit(cut: Cut) {
  return cut.c - cut.band * 0.9 - cut.cell;
}

/** De onde o texto do Sobre pode aparecer (soma x + y em px): depois da borda e dos nós dela. */
export function sobreLimit(cut: Cut) {
  return cut.c + cut.band * 0.9 + cut.cell;
}

/** Entrada do arquivo do símbolo sem o metal (0..1): só no fim da passagem. */
export const aboutIn = (p: number) => smooth(span(p, [0.85, 1]));

/** Velocidade do texto do Sobre na passagem, em fração da rolagem (no AT, o texto sobe devagar). */
const TEXT_SPEED = 0.4;
/** Trecho final (fração de `p`) em que o texto acelera até a velocidade da página, sem tranco. */
const TEXT_BLEND = 0.12;

/**
 * Deslocamento do texto do Sobre (px, negativo = para cima) durante o trecho fixo: ele sobe a
 * `TEXT_SPEED` da rolagem e, no fim, acelera até a velocidade da página. Em `p` = 1 vale zero e a
 * velocidade é a da página (a curva não quebra quando o trecho fixo acaba). Antes do corte B o texto
 * fica escondido (recortado), e no começo do corte ele está a meia tela abaixo do lugar.
 * `travel` é o comprimento do trecho fixo em px.
 */
export function sobreShift(p: number, travel: number) {
  const u = 1 - clamp01(p);
  const h = u < TEXT_BLEND ? (u * u) / (2 * TEXT_BLEND) : u - TEXT_BLEND / 2;
  return -(1 - TEXT_SPEED) * travel * h;
}

/** Largura do símbolo no viewBox do logo vertical (= 4 células da matriz na diagonal). */
const SYMBOL_W_VB = 2 * Math.SQRT2 * SYMBOL_TIP_DIAGONAL_LOCAL * SYMBOL_IN_VERTICAL_LOGO.a;
/** Altura do símbolo no viewBox do logo vertical (medida no SVG: y 105–624). */
const SYMBOL_H_VB = 519;

/**
 * Onde o símbolo está na passagem (px CSS do palco, y para baixo): sai do meio do logo da entrada,
 * vai para o meio da tela (a descida) e pousa no lugar do arquivo do símbolo no Sobre (`slot`, já
 * onde ele fica no fim). `scale` é px por unidade do viewBox do logo vertical; `w` e `h`, o tamanho
 * do símbolo; `a` e `b`, o progresso das duas viagens; `spin`, o giro no eixo vertical (rad).
 * O palco WebGL e o recorte do texto usam a mesma conta.
 */
export function symbolPath(p: number, logo: Rect, slot: Rect, width: number, height: number) {
  const sp = Math.min(logo.w, logo.h) / VIEWBOX;
  const x0 = logo.x + (logo.w - VIEWBOX * sp) / 2 + SYMBOL_CENTER_VB.x * sp;
  const y0 = logo.y + (logo.h - VIEWBOX * sp) / 2 + SYMBOL_CENTER_VB.y * sp;
  const s2 = (slot.w / SYMBOL_FILE.viewBox) * SYMBOL_FILE.ratio;
  const x2 = slot.x + (SYMBOL_FILE.cx / SYMBOL_FILE.viewBox) * slot.w;
  const y2 = slot.y + (SYMBOL_FILE.cy / SYMBOL_FILE.viewBox) * slot.h;
  const x1 = width / 2;
  const y1 = height * lerp(SPOT_Y[0], SPOT_Y[1], smooth(span(p, [SYMBOL_IN[1], SYMBOL_OUT[0]])));
  const a = smooth(span(p, SYMBOL_IN));
  const b = smooth(span(p, SYMBOL_OUT));
  // Cresce e diminui na descida; o envelope zera a curva (e a inclinação dela) nas duas pontas.
  const u = span(p, PULSE);
  const env = smooth(clamp01(u / 0.14)) * smooth(clamp01((1 - u) / 0.14));
  const pulse = Math.exp(PULSE_AMP * Math.sin(Math.PI * 2 * PULSE_CYCLES * u) * env);
  const spot = s2 * SPOT_SCALE;
  let spotNow = spot * pulse;
  if (pulse > 1) {
    const cap = Math.min((PULSE_MAX.h * height) / SYMBOL_H_VB, (PULSE_MAX.w * width) / SYMBOL_W_VB);
    spotNow = Math.min(spotNow, Math.max(spot, cap));
  }
  const scale = lerp(lerp(sp, spotNow, a), s2, b);
  return {
    x: lerp(lerp(x0, x1, a), x2, b),
    y: lerp(lerp(y0, y1, a), y2, b),
    scale,
    w: SYMBOL_W_VB * scale,
    h: SYMBOL_H_VB * scale,
    a,
    b,
    spin:
      -Math.PI * 2 * (SPIN_TURNS * smooth(span(p, SPIN)) + SPIN_OUT_TURNS * smooth(span(p, SYMBOL_OUT))) +
      restYawAt(p),
  };
}

type Point = [number, number];

/** Recorta um polígono convexo pelo semiplano a·x + b·y ≥ c (Sutherland–Hodgman). */
function clipHalfPlane(poly: Point[], a: number, b: number, c: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i];
    const Q = poly[(i + 1) % poly.length];
    const dp = a * P[0] + b * P[1] - c;
    const dq = a * Q[0] + b * Q[1] - c;
    if (dp >= 0) out.push(P);
    if (dp >= 0 !== dq >= 0) {
      const t = dp / (dp - dq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

/** Folga em volta do bloco de texto (px): acentos, caudas e o brilho do título não são cortados. */
const CLIP_PAD = 48;

/**
 * `clip-path` de um bloco de texto do Sobre (coordenadas locais do bloco):
 * - só a parte do lado do Sobre, depois da borda de nós (`limit`, soma x + y no palco);
 * - opcionalmente, só acima de `maxY` ou abaixo de `minY` (px no palco), para o texto nunca ficar
 *   por cima do símbolo enquanto ele passa (no celular, o símbolo fica entre o título e o texto).
 * Devolve '' quando nada é cortado.
 */
export function sobreClip(block: Rect, limit: number, maxY = Infinity, minY = -Infinity) {
  const L = limit - (block.x + block.y);
  const top = minY - block.y;
  const bottom = maxY - block.y;
  const P = CLIP_PAD;
  if (L <= -2 * P && top <= -P && bottom >= block.h + P) return '';
  let poly: Point[] = [
    [-P, -P],
    [block.w + P, -P],
    [block.w + P, block.h + P],
    [-P, block.h + P],
  ];
  poly = clipHalfPlane(poly, 1, 1, L);
  if (bottom < block.h + P) poly = clipHalfPlane(poly, 0, -1, -bottom);
  if (top > -P) poly = clipHalfPlane(poly, 0, 1, top);
  if (poly.length < 3) return 'polygon(0 0, 0 0, 0 0)';
  return `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
}
