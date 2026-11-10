import type { RefObject } from 'react';
import styles from './AboutSection.module.css';
import { SYMBOL_FILE } from './transition';

/*
 * Sobre a Gniall (parte 2). Textos do documento de identidade (§1), sem dados inventados. Uma tela
 * só (D-025): título, símbolo e texto. Depois dela vem o corte do portfólio.
 */

interface AboutSectionProps {
  /** Lugar do símbolo: o arquivo oficial, ou, com WebGL, o lugar onde o símbolo em metal pousa (D-015). */
  slotRef: RefObject<HTMLImageElement | null>;
  /** Primeira tela (título, símbolo e texto): sobe mais devagar que a página na passagem (D-017). */
  introRef?: RefObject<HTMLDivElement | null>;
  /** Blocos de texto da primeira tela: aparecem pelo corte diagonal (D-017). */
  headRef?: RefObject<HTMLDivElement | null>;
  textRef?: RefObject<HTMLDivElement | null>;
  /** A seção inteira: some pelo corte do portfólio (D-024, D-025). */
  sectionRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/*
 * Primeira tela, no modelo do Sobre do Active Theory (D-017): título grande à esquerda, símbolo no
 * meio e texto pequeno à direita. No celular: título, símbolo e texto, um embaixo do outro.
 * Ordem de leitura: título, depois texto (o símbolo é decorativo).
 */
export default function AboutSection({ slotRef, introRef, headRef, textRef, sectionRef, className }: AboutSectionProps) {
  return (
    <section ref={sectionRef} className={[styles.about, className].filter(Boolean).join(' ')} aria-labelledby="sobre-title">
      <div ref={introRef} className={styles.intro}>
        <div ref={headRef} className={styles.head}>
          {/* Brincadeira com o nome: ser genial é ter a ideia; ser Gniall é fazer a ideia rodar. */}
          <h2 id="sobre-title" className={styles.heading}>
            <span className={styles.line}>Isso que</span> <span className={styles.line}>é ser</span>{' '}
            <span className={styles.line}>Gniall.</span>
          </h2>
        </div>

        <div className={styles.mark}>
          {/* Arquivo oficial do símbolo, sem alterações (CLAUDE.md › Logo). Decorativo: o nome está no h1. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={slotRef}
            className={`${styles.symbol} ${styles.markReveal}`}
            src={SYMBOL_FILE.src}
            alt=""
            width={SYMBOL_FILE.viewBox}
            height={SYMBOL_FILE.viewBox}
            decoding="async"
          />
        </div>

        <div ref={textRef} className={styles.text}>
          <p className={styles.lead}>Ser genial é ter a ideia.</p>
          <p className={styles.essence}>
            Ser Gniall é fazer a ideia rodar: engenharia de software de missão crítica e Inteligência
            Artificial aplicada para transformar gargalos operacionais em escala, produtividade e
            rentabilidade.
          </p>
        </div>
      </div>
    </section>
  );
}
