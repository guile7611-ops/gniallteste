/**
 * Rolagem suave da roda (D-016), no modelo do Active Theory: a posição na tela persegue a posição
 * pedida, andando 10% da distância que falta a cada quadro (a 60 quadros/s; corrigido para outras
 * taxas). Mesma constante do site deles (ScrollController.LERP = 0,1). Sem bibliotecas.
 *
 * - Só a roda (mouse e touchpad) desliza. A rolagem continua sendo a da página (`window.scrollY`):
 *   sticky, barra de rolagem, busca, foco por teclado e links funcionam como sempre.
 * - Teclado, toque e barra de rolagem ficam nativos. Se um deles mexer durante o deslize, o
 *   deslize para e a posição nova vale.
 * - Ctrl + roda (zoom), rolagem horizontal e áreas com rolagem própria ficam nativos.
 * - Nada se move sozinho: o deslize só completa o pedido da roda (menos de 1 s) e para.
 *
 * Quem desenha a cena pode assumir o relógio (`setDriver`): o passo da rolagem, o HTML que depende
 * dela e o quadro do WebGL acontecem no mesmo quadro, sem um ficar um quadro atrás do outro.
 */

/** Fração da distância que falta, percorrida por quadro a 60 quadros/s. */
const LERP = 0.1;
/** Abaixo desta distância (px) o deslize termina. */
const REST = 0.5;
/** Passo máximo de tempo (s): depois de uma pausa, o deslize continua de onde estava. */
const MAX_DT = 1 / 30;
/** px por linha quando a roda vem em linhas (Firefox): ~100 px por clique de 3 linhas. */
const LINE_PX = 33;

export interface SmoothScroll {
  /** Liga os eventos (idempotente). */
  start(): void;
  /** Desliga os eventos e para o deslize. */
  stop(): void;
  /** Avança um quadro do deslize (chamado pelo relógio: o próprio ou o do driver). */
  step(): void;
  /** Quem pede os quadros enquanto desliza. `null` volta ao relógio próprio. */
  setDriver(request: (() => void) | null): void;
  /** Chamado logo depois de cada passo do deslize, no mesmo quadro. Devolve o cancelamento. */
  onFrame(fn: () => void): () => void;
  readonly moving: boolean;
}

function scrollingElement() {
  return document.scrollingElement ?? document.documentElement;
}

function maxScroll() {
  const el = scrollingElement();
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

/** Algum elemento com rolagem própria, entre o alvo da roda e a página, ainda rola nessa direção? */
function scrollsInside(target: EventTarget | null, dy: number) {
  let el = target instanceof Element ? target : null;
  const root = scrollingElement();
  while (el && el !== root && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dy < 0 && el.scrollTop > 0) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

export function createSmoothScroll(): SmoothScroll {
  let target = 0;
  let current = 0;
  /** Última posição escrita pelo deslize: outra posição no evento de rolagem é rolagem nativa. */
  let written = 0;
  let moving = false;
  let last = 0;
  let raf = 0;
  let started = false;
  let driver: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const request = () => {
    if (driver) driver();
    else if (!raf) raf = requestAnimationFrame(tick);
  };

  function tick() {
    raf = 0;
    step();
  }

  function settle(y: number) {
    moving = false;
    target = current = written = y;
  }

  function step() {
    if (!moving) return;
    const now = performance.now();
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT);
    last = now;
    current += (target - current) * (1 - Math.pow(1 - LERP, dt * 60));
    if (Math.abs(target - current) < REST) {
      current = target;
      moving = false;
    }
    written = current;
    window.scrollTo({ top: current, behavior: 'instant' });
    listeners.forEach((fn) => fn());
    if (moving) request();
  }

  const onWheel = (e: WheelEvent) => {
    if (e.defaultPrevented || e.ctrlKey) return;
    const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? window.innerHeight : 1;
    const dy = e.deltaY * unit;
    if (Math.abs(e.deltaX * unit) > Math.abs(dy) || dy === 0) return;
    if (scrollsInside(e.target, dy)) return;
    e.preventDefault();
    if (!moving) {
      target = current = written = window.scrollY;
      last = performance.now();
    }
    target = Math.min(Math.max(target + dy, 0), maxScroll());
    if (Math.abs(target - current) < REST) return;
    moving = true;
    request();
  };

  const onScroll = () => {
    const y = window.scrollY;
    // Durante o deslize, só a posição escrita por ele é esperada; outra veio do teclado, do toque
    // ou da barra de rolagem, e vale.
    if (!moving || Math.abs(y - written) > 2) settle(y);
  };

  const onResize = () => {
    if (moving) target = Math.min(target, maxScroll());
    else settle(window.scrollY);
  };

  return {
    start() {
      if (started) return;
      started = true;
      settle(window.scrollY);
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
    },
    stop() {
      if (!started) return;
      started = false;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      raf = 0;
      moving = false;
    },
    step,
    setDriver(next) {
      driver = next;
      if (moving) request();
    },
    onFrame(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get moving() {
      return moving;
    },
  };
}
