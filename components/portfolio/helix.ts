/**
 * Espiral do portfólio (D-024): contas puras, sem three.js. Técnica estudada no portfólio do Active
 * Theory (cards em volta de um eixo, câmera que gira e desce de um card para o próximo); o código é
 * nosso.
 *
 * - Card `i` fica no ângulo `i · STEP` e na altura `-i · Y_STEP`, olhando para fora do eixo. O
 *   passo é o do Active Theory (50°): os cards ficam perto um do outro e o vizinho aparece ao lado
 *   do card da vez (D-029).
 * - A posição na espiral (`x`, em cards) vai de -0,5 a N - 0,5: meio passo antes do primeiro card
 *   até meio passo depois do último.
 * - Perto de cada card a câmera anda mais devagar (o card da vez fica um tempo de frente).
 * - A câmera fica sempre no raio do card da vez, olhando para o eixo; em `x` inteiro, de frente
 *   para o card `x`.
 */

/** Raio da espiral (unidades do mundo). */
export const RADIUS = 3.1;
/** Ângulo entre cards (50°, o do Active Theory). */
export const STEP = (50 * Math.PI) / 180;
/** Quanto cada card fica abaixo do anterior. */
export const Y_STEP = 0.65;
/** Tamanho do card (largura e altura do vidro, espessura). */
export const CARD = { w: 2.4, h: 1.4, depth: 0.14, radius: 0.12 } as const;
/** Campo de visão vertical da câmera (graus). */
export const FOV = 40;
/** 0 = câmera em velocidade constante; perto de 1 = para mais tempo em cada card. */
const DWELL = 0.7;

/** Rolagem do portfólio, em telas: o corte e o trecho de cada projeto. */
export const CUT_SCREENS = 1;
export const PROJECT_SCREENS = 1;
/** A câmera começa a andar no meio do corte (fração do corte): o corte já revela a cena girando. */
const CAMERA_LEAD = 0.4;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Telas de rolagem do portfólio inteiro (corte + projetos). */
export const totalScreens = (n: number) => CUT_SCREENS + n * PROJECT_SCREENS;

/**
 * Progresso da rolagem do portfólio, a partir de `scrolled` (px rolados desde que o topo do
 * trilho chegou ao topo da tela) e `screen` (px de uma tela de rolagem).
 * - `cut` (0..1): progresso do corte "/";
 * - `q` (0..1): progresso da câmera pela espiral.
 */
export function portfolioProgress(scrolled: number, screen: number, n: number) {
  const cutLen = CUT_SCREENS * screen;
  const start = CAMERA_LEAD * cutLen;
  const end = totalScreens(n) * screen;
  return {
    cut: cutLen > 0 ? clamp01(scrolled / cutLen) : 0,
    q: end > start ? clamp01((scrolled - start) / (end - start)) : 0,
  };
}

/** Onde rolar (px desde o topo do trilho) para o card `i` ficar de frente. */
export function projectScroll(i: number, screen: number, n: number) {
  const start = CAMERA_LEAD * CUT_SCREENS * screen;
  const end = totalScreens(n) * screen;
  return start + ((i + 0.5) / n) * (end - start);
}

/** Posição na espiral (em cards) para o progresso `q`, com a pausa perto de cada card. */
export function helixPosition(q: number, n: number) {
  const x = q * n - 0.5;
  return x - (DWELL * Math.sin(Math.PI * 2 * x)) / (Math.PI * 2);
}

/** Card da vez: o mais perto da posição `x`. */
export const currentIndex = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(x)));

/** Escala dos cards em telas estreitas (largura / altura). */
export const cardScale = (aspect: number) => Math.min(1, Math.max(0.55, aspect / 1.2));

/**
 * Pose da câmera para a posição `x`: ângulo em volta do eixo, altura e distância até o eixo.
 * Antes do primeiro card e depois do último, a câmera se afasta um pouco e sobe (ou desce) mais.
 */
export function cameraPose(x: number, n: number, aspect: number) {
  const scale = cardScale(aspect);
  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  // O card da vez ocupa `frac` da largura da tela: mais no celular, menos na tela larga (sobra
  // lugar para o vizinho aparecer ao lado).
  const frac = 0.8 + (0.44 - 0.8) * smoothstep(0.6, 1.6, aspect);
  const d = Math.max(3.4, (CARD.w * scale) / (frac * 2 * tanHalf * aspect));
  const before = clamp01(-x * 2);
  const after = clamp01((x - (n - 1)) * 2);
  const edge = Math.max(before, after);
  return {
    angle: x * STEP,
    y: -x * Y_STEP + 0.6 * before - 0.6 * after,
    dist: RADIUS + d * (1 + 0.35 * edge * edge),
  };
}

export type CameraPose = ReturnType<typeof cameraPose>;
