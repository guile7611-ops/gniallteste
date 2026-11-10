'use client';

/**
 * Texto do projeto aberto (D-049): pequeno, em caixa alta, entrando decifrado (os caracteres trocam
 * por delimitadores de código até virar o texto, o "tag" da marca). Em cima do painel, o aviso de que
 * rolar fecha; nas laterais, o texto sobre o projeto (à esquerda) e "Acessar projeto" (à direita).
 * Sem espaço nas laterais (tela estreita), os dois vão para baixo do painel.
 *
 * - É um diálogo modal: o foco fica preso dentro dele e volta para onde estava quando ele fecha;
 *   Esc, rolar e o Voltar do navegador fecham. O nome do projeto fica só para leitores de tela.
 * - O texto final fica para leitores de tela desde o começo; só a versão embaralhada é
 *   `aria-hidden`.
 * - Só dados já informados pelo cliente (D-028): o nome e a linha do card; o resto entra quando
 *   houver.
 */
import { useEffect, useRef, useState } from 'react';
import styles from './PortfolioSection.module.css';
import type { Project } from './projects';

/** Caracteres da decifragem: delimitadores de código e nós. */
const GLYPHS = '<>/\\[]{}#=+_:;*01';
/** Cada linha decifra em 0,55 s, 0,12 s depois da anterior. */
const LINE = { dur: 0.55, stagger: 0.12 } as const;

function Scramble({ text, delay, on }: { text: string; delay: number; on: boolean }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!on) {
      setShown('');
      return;
    }
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const t = (now - start) / 1000 / LINE.dur;
      if (t >= 1) {
        setShown(text);
        return;
      }
      if (t > 0) {
        // Da esquerda para a direita: o que já passou fica certo; a frente, embaralhada.
        const done = Math.floor(text.length * t);
        const front = Math.min(text.length, done + 6);
        let out = text.slice(0, done);
        for (let i = done; i < front; i++) {
          out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setShown(out);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, on]);
  // O texto final, invisível, guarda o lugar: a caixa não muda de tamanho enquanto decifra.
  return (
    <span className={styles.scr}>
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true" className={styles.scrGhost}>
        {text}
      </span>
      <span aria-hidden="true" className={styles.scrLive}>
        {shown}
      </span>
    </span>
  );
}

interface ProjectDetailProps {
  project: Project;
  /** O texto entra (a passagem já atravessou o vidro); falso some na hora. */
  reveal: boolean;
  onClose: () => void;
  /** Caixas do texto, do aviso e do botão (px, a partir do canto da vista), para o canvas escurecer ali. */
  onLayout: (text: Box, hint: Box, side: Box) => void;
}

type Box = [number, number, number, number];
/** Folga em volta do texto, dentro da área de luminância controlada. */
const BOX_PAD = 12;
const NO_BOX: Box = [0, 0, 0, 0];

/** Há espaço ao lado do painel (mesma conta de `panelRect` e do CSS) para o texto e o botão? */
function sideFits() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const half = Math.min(h * 0.28, (w * (w < 700 ? 0.45 : 0.42)) / 2) * (16 / 9);
  return w / 2 - half >= 300;
}

export default function ProjectDetail({ project, reveal, onClose, onLayout }: ProjectDetailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(true);

  // Laterais ou embaixo, conforme a tela.
  useEffect(() => {
    const fit = () => setSide(sideFits());
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Onde o texto está: mede ao montar e sempre que a vista ou o texto mudam de tamanho.
  useEffect(() => {
    const root = ref.current;
    const text = textRef.current;
    const hint = hintRef.current;
    const aside = sideRef.current;
    if (!root || !hint) return;
    const box = (el: HTMLElement, o: DOMRect): Box => {
      const b = el.getBoundingClientRect();
      return [b.left - o.left - BOX_PAD, b.top - o.top - BOX_PAD, b.right - o.left + BOX_PAD, b.bottom - o.top + BOX_PAD];
    };
    const measure = () => {
      const o = root.getBoundingClientRect();
      onLayout(text ? box(text, o) : NO_BOX, box(hint, o), aside ? box(aside, o) : NO_BOX);
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [root, text, hint, aside]) if (el) ro.observe(el);
    return () => {
      ro.disconnect();
      onLayout(NO_BOX, NO_BOX, NO_BOX);
    };
  }, [onLayout, side]);

  // Foco: vai para o diálogo (Tab leva ao botão) e volta para onde estava quando ele sai.
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
    return () => before?.focus({ preventScroll: true });
  }, []);

  // Esc fecha; Tab fica dentro do diálogo.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!ref.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const titleId = `detalhe-${project.slug}`;

  return (
    <div
      ref={ref}
      className={styles.detail}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-reveal={reveal}
      data-layout={side ? 'side' : 'below'}
      tabIndex={-1}
    >
      <h2 id={titleId} className={styles.srOnly}>
        {project.name}
      </h2>
      <p ref={hintRef} className={styles.detailHint}>
        <Scramble text="Role para fechar" delay={0.35} on={reveal} />
      </p>

      {/* Laterais: o invólucro some (display: contents) e cada parte fica ao lado do painel.
          Embaixo: o invólucro empilha as duas partes abaixo do painel. */}
      <div className={styles.detailBody}>
      {project.about !== null && (
        <div ref={textRef} className={styles.detailText}>
          <p className={styles.detailSummary}>
            <Scramble text={project.about} delay={0.3} on={reveal} />
          </p>
        </div>
      )}

      {project.link !== null && (
        <div ref={sideRef} className={styles.detailAside}>
          <a className={styles.detailLink} href={project.link}>
            <Scramble text="Acessar projeto" delay={0.45} on={reveal} />
            <span aria-hidden="true" className={styles.detailLinkMark}>
              &gt;
            </span>
          </a>
        </div>
      )}
      </div>
    </div>
  );
}
