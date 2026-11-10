import type { RefObject } from 'react';
import type { SmoothScroll } from './smoothScroll';

/** pending: logo HTML escondido (intro rodando) · reveal: logo HTML entrando · done: estado final. */
export type IntroPhase = 'pending' | 'reveal' | 'done';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Medidas em px CSS, relativas ao canto superior esquerdo do palco (o canvas fixo na tela). */
export interface EntryLayout {
  width: number;
  height: number;
  /** Caixa do <img> do logo vertical oficial. */
  logo: Rect;
  /** Do nome do logo até o fim do texto: o campo de nós some atrás, para preservar o contraste. */
  quiet: Rect | null;
  /** Só o bloco de texto: os nós do logo que se soltam no cursor não entram nele. */
  copy: Rect | null;
  /**
   * Lugar do símbolo no Sobre (D-015): caixa do arquivo oficial do símbolo onde ela fica quando a
   * passagem termina (durante o trecho fixo, já descontada a rolagem que falta).
   */
  slot: Rect | null;
  /** Progresso da passagem para o Sobre (0..1), dirigido pela rolagem da página. */
  progress: number;
}

export interface EntryCanvasProps {
  getLayout: () => EntryLayout | null;
  /**
   * O <img> do logo oficial: recebe só `data-metal` (fica transparente enquanto o logo em metal 3D
   * está no lugar, D-013), nunca outro efeito.
   */
  logoRef: RefObject<HTMLImageElement | null>;
  /** O <img> do símbolo no Sobre: também só recebe `data-metal` (D-015). */
  slotRef: RefObject<HTMLImageElement | null>;
  phaseRef: RefObject<IntroPhase>;
  /**
   * Deslize da roda (D-016). O canvas assume o relógio: cada quadro dele dá um passo na rolagem
   * antes de ler o layout, então página, HTML e WebGL andam juntos.
   */
  scroller: SmoothScroll;
  onStart: () => void;
  onReveal: () => void;
  onDone: () => void;
}
