/**
 * Órbita do portfólio (D-024, D-026): contas puras, sem three.js. Técnica estudada no portfólio do
 * Active Theory (cards em volta de um eixo, câmera que gira de um card para o próximo) e na
 * penúltima seção do igloo.inc (figura de pontos no centro, sobre uma base); o código é nosso.
 *
 * - No eixo, a base de LED e o holograma do símbolo (D-026). Os cards ficam numa órbita plana em
 *   volta dele, card `i` no ângulo `i · passo`, olhando para fora do eixo.
 * - A posição na órbita (`x`, em cards) vai de -0,5 a N - 0,5: meio passo antes do primeiro card
 *   até meio passo depois do último. Com 2 projetos (passo de 180°), isso dá uma volta inteira.
 * - Perto de cada card a câmera anda mais devagar (o card da vez fica um tempo de frente).
 * - A câmera fica um pouco acima, olhando para o eixo e para baixo: o holograma na parte de cima
 *   da tela e o card da vez embaixo dele, na frente da base.
 */

/** Raio da órbita dos cards (unidades do mundo). */
export const RADIUS = 3.6;
/** Passo mínimo entre cards (50°, o do Active Theory). */
const MIN_STEP = (50 * Math.PI) / 180;
/** Tamanho do card (largura e altura do vidro, espessura). */
export const CARD = { w: 2.4, h: 1.4, depth: 0.14, radius: 0.12 } as const;
/** Campo de visão vertical da câmera (graus). */
export const FOV = 40;
/** 0 = câmera em velocidade constante; perto de 1 = para mais tempo em cada card. */
const DWELL = 0.7;

/**
 * Base de LED: topo do degrau de cima, chão e raio da lente (de onde sai a luz).
 * Holograma: largura do símbolo e altura do centro dele. A altura do símbolo é a do arquivo
 * oficial (193,8 / 310,3 da largura).
 */
export const BASE = { top: 0, floor: -1.05, lens: 0.86, outer: 2.22 } as const;
export const HOLO = { width: 3, aspect: 193.8 / 310.3, y: 1.3 } as const;
/** A câmera olha um pouco para baixo (graus → rad). */
const PITCH = (8 * Math.PI) / 180;

/** Rolagem do portfólio, em telas: o corte e o trecho de cada projeto. */
export const CUT_SCREENS = 1;
export const PROJECT_SCREENS = 1;
/** A câmera começa a andar no meio do corte (fração do corte): o corte já revela a cena girando. */
const CAMERA_LEAD = 0.4;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Ângulo entre cards: uma volta dividida pelos projetos, no mínimo 50°. */
export const helixStep = (n: number) => Math.max(MIN_STEP, (Math.PI * 2) / Math.max(1, n));

/** Telas de rolagem do portfólio inteiro (corte + projetos). */
export const totalScreens = (n: number) => CUT_SCREENS + n * PROJECT_SCREENS;

/**
 * Progresso da rolagem do portfólio, a partir de `scrolled` (px rolados desde que o topo do
 * trilho chegou ao topo da tela) e `screen` (px de uma tela de rolagem).
 * - `cut` (0..1): progresso do corte "/";
 * - `q` (0..1): progresso da câmera pela órbita.
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

/** Posição na órbita (em cards) para o progresso `q`, com a pausa perto de cada card. */
export function helixPosition(q: number, n: number) {
  const x = q * n - 0.5;
  return x - (DWELL * Math.sin(Math.PI * 2 * x)) / (Math.PI * 2);
}

/** Card da vez: o mais perto da posição `x`. */
export const currentIndex = (x: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(x)));

/**
 * Enquadramento para a tela (largura / altura). `pull` afasta a câmera (antes do primeiro card e
 * depois do último) sem tirar o holograma do lugar na tela.
 * - `dist`, `camY`, `pitch`: distância até o eixo, altura e inclinação da câmera;
 * - `cardY`, `scale`: altura e escala dos cards (as do enquadramento sem `pull`).
 */
export function framing(aspect: number, pull = 1) {
  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  const wide = smoothstep(0.6, 1.5, aspect);
  // O holograma ocupa `hFrac` da altura da tela e no máximo 80% da largura; a base passa no
  // máximo um pouco da largura da tela (no celular).
  const hFrac = lerp(0.3, 0.36, wide);
  const base = Math.max(
    (HOLO.width * HOLO.aspect) / (hFrac * 2 * tanHalf),
    HOLO.width / (0.8 * 2 * tanHalf * aspect),
    (2 * BASE.outer) / (1.1 * 2 * tanHalf * aspect),
  );
  // Onde ficam na tela (-1 embaixo, 1 em cima): o centro do holograma e o do card da vez.
  const holoAt = lerp(0.4, 0.3, wide);
  // Na tela larga, o card fica abaixo da lente (a fonte da luz aparece inteira).
  const cardAt = lerp(-0.06, -0.52, wide);
  const camYAt = (dist: number) => HOLO.y - dist * Math.tan(Math.atan(holoAt * tanHalf) - PITCH);
  const near = base - RADIUS;
  const cardY = camYAt(base) + near * Math.tan(Math.atan(cardAt * tanHalf) - PITCH);
  // O card da vez ocupa `cardFrac` da largura da tela: mais no celular, menos na tela larga.
  const cardFrac = lerp(0.72, 0.24, wide);
  const scale = Math.min(1, Math.max(0.35, (cardFrac * 2 * near * tanHalf * aspect) / CARD.w));
  const dist = base * pull;
  return { dist, camY: camYAt(dist), pitch: PITCH, cardY, scale };
}

/**
 * Pose da câmera para a posição `x`: ângulo em volta do eixo, altura e distância até o eixo.
 * Antes do primeiro card e depois do último, a câmera se afasta um pouco.
 */
export function cameraPose(x: number, n: number, aspect: number) {
  const step = helixStep(n);
  const before = clamp01(-x * 2);
  const after = clamp01((x - (n - 1)) * 2);
  const edge = n > 0 ? Math.max(before, after) : 0;
  const f = framing(aspect, 1 + 0.3 * edge * edge);
  return { angle: x * step, y: f.camY, dist: f.dist };
}

export type CameraPose = ReturnType<typeof cameraPose>;
