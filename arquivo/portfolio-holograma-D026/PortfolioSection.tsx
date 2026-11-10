'use client';

/**
 * Portfólio (parte 3, D-024, D-026), no modelo do portfólio do Active Theory e da penúltima seção
 * do igloo.inc: o Sobre some pelo corte "/" com a borda de nós (D-025) e, do outro lado, os
 * projetos ficam em cards de vidro numa órbita em volta do holograma do símbolo, projetado por uma
 * base de LED; a rolagem gira a câmera de um projeto para o próximo.
 *
 * - Com WebGL: um trilho de `--screens` telas de rolagem com uma vista fixa (sticky). A primeira
 *   tela é o corte; depois, uma tela por projeto.
 * - O HTML acompanha o corte: o Sobre só aparece do lado de antes (antes da borda de nós,
 *   contraste) e sobe mais devagar que a página, com o símbolo em metal junto; o painel do
 *   portfólio só aparece do lado de depois.
 * - O índice de projetos é a navegação: cada link rola até o projeto (teclado e leitor de tela
 *   incluídos). O projeto da vez tem `aria-current` e um losango cheio (não só cor).
 * - Sem WebGL (ou se ele cair): uma lista simples.
 */
import dynamic from 'next/dynamic';
import { type CSSProperties, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { SmoothScroll } from '../entry/smoothScroll';
import { cutC, cutDone, sobreClip, sobreLimit, textLimit } from '../entry/transition';
import { CUT_SCREENS, currentIndex, helixPosition, portfolioProgress, projectScroll, totalScreens } from './helix';
import type { PortfolioFrame } from './PortfolioCanvas';
import styles from './PortfolioSection.module.css';
import { FIELDS, PROJECTS, type Project, anchorId, pendingNote } from './projects';

const PortfolioCanvas = dynamic(() => import('./PortfolioCanvas'), { ssr: false });

const EMPTY_CLIP = 'polygon(0 0, 0 0, 0 0)';
/** O Sobre sobe a 40% da velocidade da página durante o corte (como o texto do Sobre na chegada). */
const SOBRE_LAG = 0.6;
/** Monta o canvas quando o trilho chega a 1,5 tela da vista. */
const MOUNT_MARGIN = '150% 0px';

const pad = (i: number) => String(i + 1).padStart(2, '0');

interface PortfolioSectionProps {
  /** Com WebGL: a órbita com o holograma. Sem: a lista simples. */
  scene: boolean;
  scroller: SmoothScroll;
  /** A seção do Sobre: some pelo corte. */
  sobreRef: RefObject<HTMLElement | null>;
}

interface Measure extends PortfolioFrame {
  /** px rolados desde que o topo do trilho chegou ao topo da tela. */
  scrolled: number;
  /** px de uma tela de rolagem. */
  screen: number;
}

function measure(track: HTMLElement, view: HTMLElement, n: number): Measure {
  const top = track.getBoundingClientRect().top;
  const vw = view.offsetWidth;
  const vh = view.offsetHeight;
  const screen = Math.max(1, (track.offsetHeight - vh) / totalScreens(n));
  const scrolled = -top;
  const { cut: t, q } = portfolioProgress(scrolled, screen, n);
  const cut = cutC(t, vw, vh);
  return { cut, done: cutDone(cut), q, scrolled, screen };
}

export default function PortfolioSection({ scene, scroller, sobreRef }: PortfolioSectionProps) {
  const [lost, setLost] = useState(false);
  if (!scene || lost) return <PortfolioList projects={PROJECTS} />;
  return <PortfolioScene projects={PROJECTS} scroller={scroller} sobreRef={sobreRef} onLost={() => setLost(true)} />;
}

/* ───────────────────────── Órbita ───────────────────────── */

interface SceneProps {
  projects: readonly Project[];
  scroller: SmoothScroll;
  sobreRef: RefObject<HTMLElement | null>;
  onLost: () => void;
}

function PortfolioScene({ projects, scroller, sobreRef, onLost }: SceneProps) {
  const n = projects.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const anchorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const sobreShift = useRef(0);
  const state = useRef({ current: 0, done: false, screen: 0 });

  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState(0);

  // O canvas só monta perto da vista; depois de montado, fica.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || mounted) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setMounted(true);
      },
      { rootMargin: MOUNT_MARGIN },
    );
    io.observe(track);
    return () => io.disconnect();
  }, [mounted]);

  const read = useCallback((): PortfolioFrame | null => {
    const track = trackRef.current;
    const view = viewRef.current;
    if (!track || !view) return null;
    return measure(track, view, n);
  }, [n]);

  useEffect(() => {
    const sobreEl = sobreRef.current;
    const hudEl = hudRef.current;
    const update = () => {
      const track = trackRef.current;
      const view = viewRef.current;
      const hud = hudRef.current;
      if (!track || !view || !hud) return;
      const m = measure(track, view, n);
      const st = state.current;

      // Âncoras: onde rolar para cada projeto ficar de frente (links e #projeto-…).
      if (Math.abs(m.screen - st.screen) > 0.5) {
        st.screen = m.screen;
        anchorRefs.current.forEach((el, i) => {
          if (el) el.style.top = `${projectScroll(i, m.screen, n).toFixed(1)}px`;
        });
      }

      // Sobre: do lado de antes do corte, antes da borda de nós, subindo devagar (o símbolo em metal
      // acompanha o lugar dele, que sobe junto).
      const sobre = sobreRef.current;
      if (sobre) {
        if (!m.cut.on) {
          sobre.style.clipPath = '';
          sobre.style.transform = '';
          sobreShift.current = 0;
        } else {
          // Leituras primeiro (com o deslocamento antigo), escritas depois.
          const vr = view.getBoundingClientRect();
          const dr = sobre.getBoundingClientRect();
          const shift = Math.round(Math.min(m.scrolled, CUT_SCREENS * m.screen) * SOBRE_LAG * 10) / 10;
          const x = dr.left - vr.left;
          const y = dr.top - vr.top - sobreShift.current + shift;
          sobre.style.transform = `translate3d(0, ${shift}px, 0)`;
          sobreShift.current = shift;
          const lim = textLimit(m.cut) - (x + y);
          sobre.style.clipPath =
            m.done || lim <= 0 ? EMPTY_CLIP : `polygon(0 0, ${lim.toFixed(1)}px 0, 0 ${lim.toFixed(1)}px)`;
        }
      }

      // Painel do portfólio: do lado de depois, depois da borda de nós.
      if (!m.cut.on) hud.style.clipPath = EMPTY_CLIP;
      else if (m.done) hud.style.clipPath = '';
      else hud.style.clipPath = sobreClip({ x: 0, y: 0, w: hud.offsetWidth, h: hud.offsetHeight }, sobreLimit(m.cut));
      hud.dataset.on = m.done ? 'all' : m.cut.on ? 'cut' : 'off';

      const idx = currentIndex(helixPosition(m.q, n), n);
      st.done = m.done;
      if (idx !== st.current) {
        st.current = idx;
        setCurrent(idx);
      }
    };
    update();
    const off = scroller.onFrame(update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      off();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (sobreEl) {
        sobreEl.style.clipPath = '';
        sobreEl.style.transform = '';
      }
      if (hudEl) hudEl.style.clipPath = '';
      sobreShift.current = 0;
    };
  }, [n, scroller, sobreRef]);

  /** Rola até o projeto `i` ficar de frente. */
  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      const view = viewRef.current;
      if (!track || !view) return;
      const { screen } = measure(track, view, n);
      const top = window.scrollY + track.getBoundingClientRect().top + projectScroll(i, screen, n);
      window.scrollTo({ top: Math.round(top), behavior: 'smooth' });
    },
    [n],
  );

  const project = projects[current];

  return (
    <section className={styles.portfolio} aria-labelledby="portfolio-title">
      <div ref={trackRef} className={styles.track} style={{ '--screens': totalScreens(n) } as CSSProperties}>
        {projects.map((p, i) => (
          <span
            key={p.slug}
            id={anchorId(p)}
            ref={(el) => {
              anchorRefs.current[i] = el;
            }}
            className={styles.anchor}
          />
        ))}

        <div ref={viewRef} className={styles.view}>
          <div className={styles.layer} aria-hidden="true">
            {mounted && <PortfolioCanvas projects={projects} read={read} scroller={scroller} onLost={onLost} />}
          </div>

          <div ref={hudRef} className={styles.hud} data-on="off">
            <h2 id="portfolio-title" className={styles.label}>
              Portfólio
            </h2>

            <p className={styles.counter} aria-hidden="true">
              <span className={styles.counterNow}>{pad(current)}</span> / {String(n).padStart(2, '0')}
            </p>

            <div key={project.slug} className={styles.meta} aria-hidden="true">
              <dl className={styles.metaList}>
                {FIELDS.map((f) => (
                  <div key={f.key} className={styles.metaRow}>
                    <dt className={styles.metaTerm}>{f.label}</dt>
                    <dd className={styles.metaValue}>
                      {project[f.key] ?? <span className={styles.pending}>Pendente</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className={styles.summary}>
                {project.summary ?? <span className={styles.pending}>Resumo pendente</span>}
              </p>
            </div>

            <nav className={styles.nav} aria-label="Projetos">
              <ol className={styles.index}>
                {projects.map((p, i) => {
                  const note = pendingNote(p);
                  return (
                    <li key={p.slug}>
                      <a
                        className={styles.link}
                        href={`#${anchorId(p)}`}
                        aria-current={i === current ? 'true' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          goTo(i);
                        }}
                        onFocus={() => {
                          // O painel pode estar recortado: o foco leva até o projeto (foco visível).
                          // No quadro seguinte, depois da rolagem do próprio navegador até o foco.
                          if (i !== state.current.current || !state.current.done) requestAnimationFrame(() => goTo(i));
                        }}
                      >
                        <span className={styles.marker} aria-hidden="true" />
                        <span className={styles.num}>{pad(i)}</span>
                        <span className={styles.name}>{p.name}</span>
                        {note && <span className={styles.srOnly}> {note}</span>}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Lista simples (sem WebGL) ───────────────────────── */

function PortfolioList({ projects }: { projects: readonly Project[] }) {
  return (
    <section className={styles.plain} aria-labelledby="portfolio-title">
      <h2 id="portfolio-title" className={styles.label}>
        Portfólio
      </h2>
      <ol className={styles.list}>
        {projects.map((p, i) => (
          <li key={p.slug} id={anchorId(p)} className={styles.item}>
            <span className={styles.itemIndex} aria-hidden="true">
              {pad(i)}
            </span>
            <div>
              <h3 className={styles.itemTitle}>{p.name}</h3>
              <dl className={styles.facts}>
                {FIELDS.map((f) => (
                  <div key={f.key} className={styles.fact}>
                    <dt className={styles.metaTerm}>{f.label}</dt>
                    {/* Pendência explícita: dado ainda não informado pelo cliente (CLAUDE.md › Conteúdo). */}
                    <dd className={styles.metaValue}>{p[f.key] ?? <span className={styles.pending}>Pendente</span>}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.summary}>{p.summary ?? <span className={styles.pending}>Resumo pendente</span>}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
