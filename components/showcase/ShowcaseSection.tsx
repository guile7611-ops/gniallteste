'use client';

/**
 * Mostruário (D-040): depois da espiral do portfólio, a base de LED projeta o símbolo oficial em
 * holograma de pontos (a cena guardada da D-026, sem os cards). A seção prende a tela enquanto a
 * página rola um trecho; a rolagem gira a câmera devagar em volta da base.
 * Sem WebGL, a seção não aparece (é só visual; o conteúdo do site não depende dela).
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SmoothScroll } from '../entry/smoothScroll';
import type { Cut } from '../entry/transition';
import type { PortfolioFrame } from './ShowcaseCanvas';
import Fog from './Fog';
import styles from './ShowcaseSection.module.css';

const ShowcaseCanvas = dynamic(() => import('./ShowcaseCanvas'), { ssr: false });

/** Corte já passado: a cena aparece inteira. */
const OPEN: Cut = { c: 1e6, band: 1, cell: 1, on: true };

/**
 * Passagem do portfólio (D-051), em telas desde que a seção prende (ela prende meia tela antes de o
 * portfólio soltar, por cima dele): a névoa fecha até `reveal`, a cena aparece atrás dela e a
 * câmera mergulha até `end`, enquanto a névoa abre.
 */
const DIVE = { reveal: 0.5, end: 1.6 } as const;

interface ShowcaseSectionProps {
  scene: boolean;
  scroller: SmoothScroll;
}

export default function ShowcaseSection({ scene, scroller }: ShowcaseSectionProps) {
  const trackRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || mounted) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setMounted(true), {
      rootMargin: '100% 0px',
    });
    io.observe(track);
    return () => io.disconnect();
  }, [mounted, scene, lost]);

  const read = useCallback((): PortfolioFrame | null => {
    const track = trackRef.current;
    if (!track) return null;
    const r = track.getBoundingClientRect();
    const vh = window.innerHeight;
    // Na tela: do topo da seção entrando por baixo até o fim dela sair por cima.
    if (r.top > vh || r.bottom < 0) return null;
    // Em telas desde que a seção prendeu: primeiro o mergulho na névoa, depois a descida (D-050).
    const s = -r.top / vh;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    return { cut: OPEN, done: true, q: clamp((s - DIVE.end) / 2), dive: clamp((s - DIVE.reveal) / (DIVE.end - DIVE.reveal)) };
  }, []);

  // A névoa segue a rolagem: `--fog` (0..1) e `--deep` (profundidade, para as camadas passarem).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !scene || lost) return;
    const set = () => {
      const r = track.getBoundingClientRect();
      const s = -r.top / window.innerHeight;
      const fogIn = Math.min(1, Math.max(0, s / DIVE.reveal));
      const fogOut = Math.min(1, Math.max(0, (s - DIVE.reveal) / (DIVE.end - DIVE.reveal)));
      track.style.setProperty('--fog', String(fogIn * (1 - fogOut * fogOut)));
      track.style.setProperty('--deep', String(Math.min(1, Math.max(0, s / DIVE.end))));
      track.style.setProperty('--scene', s >= DIVE.reveal ? '1' : '0');
    };
    set();
    window.addEventListener('scroll', set, { passive: true });
    window.addEventListener('resize', set);
    const off = scroller.onFrame(set);
    return () => {
      window.removeEventListener('scroll', set);
      window.removeEventListener('resize', set);
      off();
    };
  }, [scene, lost, scroller]);

  if (!scene || lost) return null;
  return (
    <section ref={trackRef} className={styles.track} aria-label="Símbolo da Gniall em holograma">
      <div className={styles.view}>
        <div className={styles.scene}>
          {mounted && <ShowcaseCanvas projects={[]} read={read} scroller={scroller} onLost={() => setLost(true)} />}
        </div>
        <Fog className={styles.fog} />
      </div>
    </section>
  );
}
