'use client';

/**
 * Portfólio (parte 3, D-024), no modelo do portfólio do Active Theory: o Sobre some pelo corte "/"
 * com a borda de nós (D-025) e, do outro lado, os projetos ficam em cards de vidro numa espiral; a
 * rolagem gira a câmera de um projeto para o próximo.
 *
 * - Com WebGL: um trilho de `--screens` telas de rolagem com uma vista fixa (sticky). A primeira
 *   tela é o corte; depois, uma tela por projeto.
 * - O HTML acompanha o corte: o Sobre só aparece do lado de antes (antes da borda de nós,
 *   contraste) e sobe mais devagar que a página, com o símbolo em metal junto; o painel do
 *   portfólio só aparece do lado de depois.
 * - O índice de projetos é a navegação: cada link rola até o projeto (teclado e leitor de tela
 *   incluídos). O projeto da vez tem `aria-current` e um losango cheio (não só cor).
 * - Clique no card da vez (ou "Abrir projeto", no teclado) abre o projeto (D-049): a câmera
 *   mergulha no card, o vídeo vira um painel com um túnel em volta e o texto entra decifrado.
 *   Rolar, Esc, "Fechar" ou o Voltar do navegador fecham pelo mesmo caminho.
 * - Sem WebGL (ou se ele cair): uma lista simples.
 */
import dynamic from 'next/dynamic';
import { type CSSProperties, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { SmoothScroll } from '../entry/smoothScroll';
import { cutC, cutDone, portfolioExit, sobreClip, sobreLimit, textLimit } from '../entry/transition';
import { CUT_SCREENS, currentIndex, helixPosition, portfolioProgress, projectScroll, totalScreens } from './helix';
import type { PortfolioDetail, PortfolioFrame } from './PortfolioCanvas';
import styles from './PortfolioSection.module.css';
import ProjectDetail from './ProjectDetail';
import { PROJECTS, type Project, anchorId, factsNote, knownFacts } from './projects';

const PortfolioCanvas = dynamic(() => import('./PortfolioCanvas'), { ssr: false });

const EMPTY_CLIP = 'polygon(0 0, 0 0, 0 0)';
/** O Sobre sobe a 40% da velocidade da página durante o corte (como o texto do Sobre na chegada). */
const SOBRE_LAG = 0.6;
/** Monta o canvas quando o trilho chega a 1,5 tela da vista. */
const MOUNT_MARGIN = '150% 0px';
/** Projeto aberto: o texto entra 1,4 s depois do clique (o painel já está no lugar e a sala, inteira). */
const REVEAL_AT = 1.4;
/** Rolar só fecha depois de 0,8 s aberto (a inércia da rolagem anterior não fecha na hora). */
const SCROLL_CLOSE_AFTER = 0.8;

const pad = (i: number) => String(i + 1).padStart(2, '0');

interface PortfolioSectionProps {
  /** Com WebGL: a espiral. Sem: a lista simples. */
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
  portfolioExit.t = t;
  return { cut, done: cutDone(cut), q, scrolled, screen };
}

export default function PortfolioSection({ scene, scroller, sobreRef }: PortfolioSectionProps) {
  const [lost, setLost] = useState(false);
  if (!scene || lost) return <PortfolioList projects={PROJECTS} />;
  return <PortfolioScene projects={PROJECTS} scroller={scroller} sobreRef={sobreRef} onLost={() => setLost(true)} />;
}

/* ───────────────────────── Espiral ───────────────────────── */

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

  // ── Projeto aberto (D-049)
  const detail = useRef<PortfolioDetail>({
    index: -1,
    target: 0,
    d: 0,
    wake: () => undefined,
    text: [0, 0, 0, 0],
    hint: [0, 0, 0, 0],
    side: [0, 0, 0, 0],
  });
  /** Onde o texto do projeto aberto está na tela: o canvas escurece a sala ali. */
  const onDetailLayout = useCallback(
    (text: PortfolioDetail['text'], hint: PortfolioDetail['hint'], side: PortfolioDetail['side']) => {
    detail.current.text = text;
    detail.current.hint = hint;
    detail.current.side = side;
    detail.current.wake();
    },
    [],
  );
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const openedAt = useRef(0);
  /** Rolagem travada enquanto o projeto está aberto (sem `overflow: hidden` no html: ele soltaria o
   * sticky da vista, porque o body viraria o contêiner de rolagem). */
  const lockY = useRef(0);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  const openProject = useCallback(
    (i: number) => {
      const det = detail.current;
      if (det.index >= 0 || !projects[i]?.video?.length) return;
      det.index = i;
      det.target = 1;
      det.d = 0;
      det.wake();
      openedAt.current = performance.now();
      lockY.current = window.scrollY;
      scroller.stop();
      setOpenIdx(i);
      setReveal(false);
      history.pushState({ gniallProjeto: projects[i].slug }, '', `?projeto=${projects[i].slug}`);
    },
    [projects, scroller],
  );

  /** Fecha pelo mesmo caminho (o texto some na hora). */
  const closeNow = useCallback(() => {
    const det = detail.current;
    if (det.index < 0 || det.target === 0) return;
    det.target = 0;
    det.wake();
    setReveal(false);
  }, []);

  /** Fechar pelo site: volta a entrada do histórico (o Voltar do navegador faz o mesmo). */
  const closeProject = useCallback(() => {
    const st = history.state as { gniallProjeto?: string } | null;
    if (st?.gniallProjeto) history.back();
    else closeNow();
  }, [closeNow]);

  const onSettled = useCallback(
    (target: 0 | 1) => {
      if (target === 1) return;
      detail.current.index = -1;
      scroller.start();
      setOpenIdx(null);
    },
    [scroller],
  );

  // Texto entra depois que a câmera atravessa o vidro.
  useEffect(() => {
    if (openIdx === null) return;
    const id = window.setTimeout(() => {
      if (detail.current.target === 1) setReveal(true);
    }, REVEAL_AT * 1000);
    return () => window.clearTimeout(id);
  }, [openIdx]);

  // Aberto: Voltar do navegador fecha; rolar (roda, toque, teclado ou barra de rolagem) fecha.
  useEffect(() => {
    if (openIdx === null) return;
    const pop = () => closeNow();
    const ready = () => (performance.now() - openedAt.current) / 1000 > SCROLL_CLOSE_AFTER;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (ready() && Math.abs(e.deltaY) > 4) closeProject();
    };
    let ty = 0;
    const touchStart = (e: TouchEvent) => {
      ty = e.touches[0]?.clientY ?? 0;
    };
    const touchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? ty;
      if (e.cancelable) e.preventDefault();
      if (ready() && Math.abs(y - ty) > 30) closeProject();
    };
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
    const key = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(e.key)) return;
      // Espaço num botão é clique, não rolagem.
      if (e.key === ' ' && e.target instanceof Element && e.target.closest('button, a')) return;
      e.preventDefault();
      if (ready()) closeProject();
    };
    const scrolled = () => {
      if (Math.abs(window.scrollY - lockY.current) < 1) return;
      window.scrollTo(0, lockY.current);
      if (ready()) closeProject();
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', scrolled);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchmove', touchMove, { passive: false });
    return () => {
      window.removeEventListener('popstate', pop);
      window.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scrolled);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
    };
  }, [openIdx, closeNow, closeProject]);

  // Desmontou aberto: devolve a rolagem.
  useEffect(
    () => () => {
      if (detail.current.index >= 0) scroller.start();
    },
    [scroller],
  );

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
  const canOpen = !!project.video?.length;
  const opened = openIdx === null ? null : projects[openIdx];
  // Dados do projeto da vez: só os que o cliente já informou (D-028). Sem dado, sem painel.
  const facts = knownFacts(project);
  const hasMeta = facts.length > 0 || project.summary !== null;

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
            {mounted && (
              <PortfolioCanvas
                projects={projects}
                detail={detail.current}
                onPick={openProject}
                onSettled={onSettled}
                read={read}
                scroller={scroller}
                onLost={onLost}
              />
            )}
          </div>

          <div
            ref={hudRef}
            className={styles.hud}
            data-on="off"
            data-detail={openIdx !== null}
            inert={openIdx !== null}
          >
            <h2 id="portfolio-title" className={styles.label}>
              Portfólio
            </h2>

            <p className={styles.counter} aria-hidden="true">
              <span className={styles.counterNow}>{pad(current)}</span> / {String(n).padStart(2, '0')}
            </p>

            {hasMeta && (
              <div key={project.slug} className={styles.meta} aria-hidden="true">
                {facts.length > 0 && (
                  <dl className={styles.metaList}>
                    {facts.map((f) => (
                      <div key={f.label} className={styles.metaRow}>
                        <dt className={styles.metaTerm}>{f.label}</dt>
                        <dd className={styles.metaValue}>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {project.summary !== null && <p className={styles.summary}>{project.summary}</p>}
              </div>
            )}

            {/* Teclado: abre o projeto da vez (o clique no card faz o mesmo). Aparece com o foco. */}
            {canOpen && (
              <button
                ref={openBtnRef}
                type="button"
                className={styles.openProject}
                onClick={() => openProject(current)}
              >
                Abrir projeto {project.name}
              </button>
            )}

            <nav className={styles.nav} aria-label="Projetos">
              <ol className={styles.index}>
                {projects.map((p, i) => {
                  const note = factsNote(p);
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

          {opened && <ProjectDetail
              key={opened.slug}
              project={opened}
              reveal={reveal}
              onClose={closeProject}
              onLayout={onDetailLayout}
            />}
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
              {/* Só os dados que o cliente já informou (D-028). */}
              {knownFacts(p).length > 0 && (
                <dl className={styles.facts}>
                  {knownFacts(p).map((f) => (
                    <div key={f.label} className={styles.fact}>
                      <dt className={styles.metaTerm}>{f.label}</dt>
                      <dd className={styles.metaValue}>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {p.summary !== null && <p className={styles.summary}>{p.summary}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
