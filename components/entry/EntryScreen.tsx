'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import PortfolioSection from '../portfolio/PortfolioSection';
import ShowcaseSection from '../showcase/ShowcaseSection';
import AboutSection from './AboutSection';
import styles from './EntryScreen.module.css';
import { createSmoothScroll } from './smoothScroll';
import {
  aboutIn,
  clamp01,
  cutA,
  cutB,
  cutDone,
  smooth,
  sobreClip,
  sobreLimit,
  sobreShift,
  symbolPath,
  textLimit,
} from './transition';
import type { EntryLayout, IntroPhase, Rect } from './types';

const EntryCanvas = dynamic(() => import('./EntryCanvas'), { ssr: false });

/** Se o WebGL não começar a tempo (rede lenta, GPU bloqueada), o logo aparece direto. */
const START_TIMEOUT_MS = 2500;

/**
 * Início do wordmark no arquivo oficial vertical, em fração da altura.
 * Medido no SVG: símbolo y 105–624, wordmark 691–888, assinatura 923–976 (de 1081).
 */
const WORDMARK_TOP = 0.64;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Progresso da passagem (D-015): a entrada fica fixa (sticky) enquanto a página rola o trecho
 * extra do `.pin`. `remaining` é quanto falta rolar até o Sobre ficar no lugar; `travel`, o
 * comprimento desse trecho.
 */
function readProgress(pin: HTMLElement, entry: HTMLElement) {
  const pr = pin.getBoundingClientRect();
  const er = entry.getBoundingClientRect();
  const travel = pr.height - er.height;
  const p = travel > 1 ? clamp01(-pr.top / travel) : 0;
  return { p, remaining: Math.max(0, pr.bottom - er.bottom), travel: Math.max(0, travel) };
}

/** Folga entre o símbolo e o texto do Sobre enquanto o símbolo passa (px). */
const SYMBOL_GAP = 12;
/** Margem para a perspectiva e a inclinação do símbolo em 3D (fração do tamanho dele). */
const SYMBOL_BOX = 1.12;

const EMPTY_CLIP = 'polygon(0 0, 0 0, 0 0)';

function relative(r: DOMRect, origin: DOMRect): Rect {
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

export default function EntryScreen() {
  const expRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLImageElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const sobreRef = useRef<HTMLElement>(null);
  /** Deslocamento aplicado agora à primeira tela do Sobre (px): o lugar final do símbolo o desconta. */
  const shiftRef = useRef(0);
  const phaseRef = useRef<IntroPhase>('pending');
  const startTimer = useRef<number | undefined>(undefined);

  const [phase, setPhaseState] = useState<IntroPhase>('pending');
  const [webgl, setWebgl] = useState(false);
  // Roda com deslize (D-016). Criado sem tocar no window; os eventos só ligam no efeito.
  const [scroller] = useState(createSmoothScroll);

  const setPhase = useCallback((next: IntroPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  useEffect(() => {
    if (!supportsWebGL()) {
      setPhase('done');
      return;
    }
    setWebgl(true);
    // Em desenvolvimento, ?t= congela a intro para revisão: sem tempo-limite de início.
    const reviewing =
      process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('t');
    if (reviewing) return;
    startTimer.current = window.setTimeout(() => {
      if (phaseRef.current === 'pending') setPhase('done');
    }, START_TIMEOUT_MS);
    return () => window.clearTimeout(startTimer.current);
  }, [setPhase]);

  useEffect(() => {
    scroller.start();
    return () => scroller.stop();
  }, [scroller]);

  // Passagem para o Sobre (D-015, D-017, D-019): a rolagem da página dirige tudo, e a roda desliza
  // (D-016). O teclado rola como sempre e rolar de volta desfaz tudo. O que é HTML acompanha os
  // cortes do palco:
  // - o texto da entrada é recortado na diagonal pelo corte A, antes da borda de nós (contraste);
  // - o logo HTML (quando não está em metal) sai inteiro com opacidade, nunca recortado;
  // - na descida não há texto: só o vídeo, as luzes e o símbolo;
  // - o texto do Sobre aparece pelo corte B, depois da borda de nós, e sobe mais devagar que a
  //   página (como no Active Theory). Enquanto o símbolo passa, o texto nunca fica por cima dele.
  useEffect(() => {
    if (!webgl) return;
    const expEl = expRef.current;
    const copyEl = copyRef.current;
    const titleEl = titleRef.current;
    const introEl = introRef.current;
    const blockEls = [headRef.current, textRef.current];
    const update = () => {
      const exp = expRef.current;
      const stage = stageRef.current;
      const pin = pinRef.current;
      const entry = rootRef.current;
      if (!exp || !stage || !pin || !entry) return;
      const { p, remaining, travel } = readProgress(pin, entry);
      exp.style.setProperty('--about-in', aboutIn(p).toFixed(4));

      // Leituras primeiro (com o deslocamento ainda antigo), escritas depois.
      const s = stage.getBoundingClientRect();
      const entryCut = cutA(p, s.width, s.height);
      const cut = cutB(p, s.width, s.height);
      const allSobre = cutDone(cut);
      const prevShift = shiftRef.current;
      const shift = Math.round(sobreShift(p, travel) * 10) / 10;
      const dy = shift - prevShift;
      const blocks = [headRef.current, textRef.current].map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { el, x: r.left - s.left, y: r.top - s.top + dy, w: r.width, h: r.height };
      });

      // Símbolo em metal no caminho (mesma conta do palco). `slotY` é o centro do lugar final dele
      // agora na tela, para saber se um bloco fica acima ou abaixo do símbolo.
      let sym: { x: number; y: number; w: number; h: number; slotY: number; slotX: number; slotW: number } | null = null;
      const slotEl = slotRef.current;
      const logoEl = logoRef.current;
      if (slotEl && logoEl && slotEl.dataset.metal !== undefined) {
        const sr = slotEl.getBoundingClientRect();
        if (sr.width > 0) {
          const slot = { x: sr.left - s.left, y: sr.top - s.top - remaining - prevShift, w: sr.width, h: sr.height };
          const at = symbolPath(p, relative(logoEl.getBoundingClientRect(), s), slot, s.width, s.height);
          sym = { ...at, slotY: slot.y + slot.h / 2 + remaining + shift, slotX: slot.x, slotW: slot.w };
        }
      }

      if (introEl) introEl.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : '';
      shiftRef.current = shift;

      const limit = sobreLimit(cut);
      for (const b of blocks) {
        if (!b) continue;
        if (!cut.on) {
          b.el.style.clipPath = EMPTY_CLIP;
          continue;
        }
        let maxY = Infinity;
        let minY = -Infinity;
        if (sym) {
          const hw = (sym.w / 2) * SYMBOL_BOX + SYMBOL_GAP;
          const hh = (sym.h / 2) * SYMBOL_BOX + SYMBOL_GAP;
          // Só quando o bloco fica em cima ou embaixo do lugar final do símbolo (celular). No
          // desktop, título e símbolo ficam em colunas lado a lado: o título nunca é cortado.
          const overlapsX =
            b.x < sym.slotX + sym.slotW && b.x + b.w > sym.slotX && b.x < sym.x + hw && b.x + b.w > sym.x - hw;
          // Bloco acima do lugar do símbolo (o título, no celular) só aparece acima dele; o bloco
          // abaixo (o texto), só abaixo dele.
          if (overlapsX && b.y + b.h / 2 < sym.slotY) maxY = sym.y - hh;
          else if (overlapsX) minY = sym.y + hh;
        }
        b.el.style.clipPath = sobreClip(b, allSobre ? -Infinity : limit, maxY, minY);
      }

      const copy = copyRef.current;
      const title = titleRef.current;
      if (p <= 0) {
        if (copy) copy.style.clipPath = '';
        if (title) title.style.opacity = '';
        return;
      }
      if (copy) {
        const c = copy.getBoundingClientRect();
        const lim = textLimit(entryCut) - (c.left - s.left + c.top - s.top);
        copy.style.clipPath =
          lim > 0 ? `polygon(0 0, ${lim.toFixed(1)}px 0, 0 ${lim.toFixed(1)}px)` : EMPTY_CLIP;
      }
      const logo = logoRef.current;
      if (title && logo) {
        const l = logo.getBoundingClientRect();
        const lo = l.left - s.left + l.top - s.top - entryCut.band;
        const hi = lo + l.width + l.height + entryCut.band * 2;
        title.style.opacity = smooth(clamp01((entryCut.c - lo) / (hi - lo))).toFixed(3);
      }
    };
    update();
    // Rolagem nativa (teclado, toque, barra) chega pelo evento; o deslize da roda chama no mesmo
    // quadro em que move a página e o canvas desenha.
    const off = scroller.onFrame(update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      off();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      expEl?.style.removeProperty('--about-in');
      if (copyEl) copyEl.style.clipPath = '';
      if (titleEl) titleEl.style.opacity = '';
      if (introEl) introEl.style.transform = '';
      for (const el of blockEls) if (el) el.style.clipPath = '';
      shiftRef.current = 0;
    };
  }, [webgl, scroller]);

  const getLayout = useCallback((): EntryLayout | null => {
    const stage = stageRef.current;
    const pin = pinRef.current;
    const entry = rootRef.current;
    const logo = logoRef.current;
    if (!stage || !pin || !entry || !logo) return null;
    const s = stage.getBoundingClientRect();
    const l = logo.getBoundingClientRect();
    const c = copyRef.current?.getBoundingClientRect();
    const slot = slotRef.current?.getBoundingClientRect();
    const { p, remaining } = readProgress(pin, entry);
    // Zona calma: do wordmark (a partir de ~64% da altura do arquivo vertical) até o fim do texto.
    // O símbolo continua sobre o campo de nós; o wordmark e o texto, não.
    const top = l.top + l.height * WORDMARK_TOP;
    const left = Math.min(l.left, c?.left ?? l.left);
    const right = Math.max(l.right, c?.right ?? l.right);
    const bottom = Math.max(l.bottom, c?.bottom ?? l.bottom);
    return {
      width: s.width,
      height: s.height,
      logo: relative(l, s),
      quiet: { x: left - s.left, y: top - s.top, w: right - left, h: bottom - top },
      copy: c ? relative(c, s) : null,
      // Onde o símbolo pousa: a caixa do arquivo do símbolo quando a passagem terminar (sem a rolagem
      // que falta e sem o deslocamento da primeira tela do Sobre, que é zero no fim).
      slot:
        slot && slot.width > 0
          ? {
              x: slot.left - s.left,
              y: slot.top - s.top - remaining - shiftRef.current,
              w: slot.width,
              h: slot.height,
            }
          : null,
      progress: p,
    };
  }, []);

  const handleStart = useCallback(() => window.clearTimeout(startTimer.current), []);
  const handleReveal = useCallback(() => {
    if (phaseRef.current === 'pending') setPhase('reveal');
  }, [setPhase]);
  const handleDone = useCallback(() => setPhase('done'), [setPhase]);

  return (
    <div ref={expRef} className={styles.experience} data-scroll={webgl ? 'pin' : undefined}>
      {webgl && (
        <div ref={stageRef} className={styles.stage} aria-hidden="true">
          <EntryCanvas
            getLayout={getLayout}
            logoRef={logoRef}
            slotRef={slotRef}
            phaseRef={phaseRef}
            scroller={scroller}
            onStart={handleStart}
            onReveal={handleReveal}
            onDone={handleDone}
          />
        </div>
      )}

      <div ref={pinRef} className={styles.pin}>
        <section ref={rootRef} className={styles.entry} data-intro={phase} aria-labelledby="entry-title">
          <div className={styles.content}>
            <h1 ref={titleRef} id="entry-title" className={styles.title}>
              {/* Arquivo oficial do manual, sem alterações (CLAUDE.md › Logo). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={logoRef}
                className={styles.logo}
                src="/brand/oficial/lg-vt-color-inverted.svg"
                alt="Gniall"
                width={1081}
                height={1081}
                fetchPriority="high"
              />
            </h1>

            <div ref={copyRef} className={styles.copy}>
              <p className={styles.lead}>
                Engenharia de software de missão crítica e Inteligência Artificial aplicada.
              </p>
            </div>
          </div>
        </section>
      </div>

      <AboutSection
        slotRef={slotRef}
        introRef={introRef}
        headRef={headRef}
        textRef={textRef}
        sectionRef={sobreRef}
        className={styles.about}
      />

      <PortfolioSection scene={webgl} scroller={scroller} sobreRef={sobreRef} />
      <ShowcaseSection scene={webgl} scroller={scroller} />
    </div>
  );
}
