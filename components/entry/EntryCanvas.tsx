'use client';

/**
 * Tela de entrada v5 (D-011 + D-012 + D-013 + D-014): data center, enxame, commit em metal e logo
 * em metal 3D.
 *
 * 1. Um corredor de data center liga numa frente em losango a partir da base do logo: luzes do
 *    teto e LEDs dos racks. A câmera entra pelo corredor (dolly) até a pose de frente.
 * 2. LEDs saem dos racks e voam até o volume das 4 peças do símbolo oficial (enxame).
 * 3. Uma varredura na diagonal troca os nós por metal chanfrado (commit). Enquanto isso, o nome
 *    e a assinatura se formam com nós que saem de outros LEDs, nos pixels do arquivo oficial.
 * 4. Os colchetes deslizam pela matriz até travar (HUD mede a distância em células); os nós do
 *    símbolo assentam, e o impacto manda ondas em losango pelo chão.
 * 5. A câmera assenta de frente e a luz da cena acende: foco no logo e dois feixes nas diagonais
 *    da matriz. Os LEDs que saíram acendem de novo, numa passada só. Uma segunda varredura troca
 *    os nós do nome e da assinatura por letras em metal, extrudadas dos paths do arquivo (D-013).
 * 6. Depois, só o cursor (ou o toque) mexe: o logo inclina de leve na direção dele, a câmera faz
 *    paralaxe e a luz do cursor corre pelo metal. Sem cursor, volta à pose de frente.
 * 7. Rolagem (D-015, D-019): uma linha "/" varre a tela e troca o data center pela descida, com a
 *    borda em nós. Só as 4 peças do símbolo vão para o meio da tela e giram, crescendo e diminuindo,
 *    enquanto a página desce (D-022): no fundo, o vídeo desfocado roda em loop (D-020, D-021); luzes
 *    coloridas giram em volta do símbolo e refletem no metal (descent.ts), e a câmera desce por uma
 *    pluma de nós redondos que essas luzes colorem; o movimento do cursor solta traços finos que saem
 *    do caminho e apagam (cloud.ts, D-023). Uma segunda linha "/" troca a descida pelo Sobre, e o símbolo pousa no lugar do arquivo do símbolo, de frente, inclinando na direção
 *    do cursor. Rolar de volta desfaz. A roda desliza (D-016): cada quadro do canvas dá um passo na
 *    rolagem antes de ler o layout.
 *
 * O chão polido reflete o logo e os LEDs (reflexo plano em datacenter.ts). Tudo em código, sem
 * imagens baixadas.
 *
 * Se as letras em metal não ficarem prontas a tempo (ou o WebGL cair), o logo HTML oficial
 * assume como na v3 (as peças achatam na cor oficial).
 *
 * O movimento automático dura menos de 5 s e termina parado (D-004).
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import gsap from 'gsap';
import { type RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import hudStyles from './EntryHud.module.css';
import {
  assignLogoLeds,
  buildLeds,
  corridorReach,
  createCorridor,
  createCorridorUniforms,
  createReflection,
} from './datacenter';
import { buildEnvironment } from './environment';
import { createNodeCloud } from './cloud';
import { createDescentUniforms, createDescentVideo, type DescentVideo, ORB_K, updateDescent } from './descent';
import { createFieldUniforms } from './field';
import { createHudGeometry, formatQ, labelAnchor, writeHud } from './hud';
import { backgroundFragment, backgroundVertex, createHazeUniforms, createLightUniforms } from './light';
import { buildLogoLetters, type LogoLetters } from './logoMetal';
import {
  buildLogoParticles,
  createLogoMaterial,
  createLogoUniforms,
  fetchLogoSvg,
  loadLogoImage,
  sampleLogo,
} from './logoParticles';
import { createMetalMaterial, createWashUniforms, type ScanUniforms, WASH_LIGHTS } from './metal';
import { buildPieces, CELL_VB, PIECE_HEIGHT, type PieceId, R, SUB_VB } from './pieces';
import { buildSwarm, createSwarmMaterial, createSwarmUniforms } from './swarm';
import { SYMBOL_CENTER_VB, VIEWBOX } from './symbolGeometry';
import { cutA, cutB, cutDone, descentPresence, descentProgress, portfolioExit, restYawAt, symbolPath } from './transition';
import type { EntryCanvasProps, EntryLayout, Rect } from './types';

/* ───────────────────────── Cores (tokens oficiais e complementares) ───────────────────────── */

const HEX = {
  bg: '#0C1E36', // Azul Noturno Soberano (oficial)
  bgDeep: '#071321', // --color-background
  line: '#29415B', // --color-border
  lineHi: '#B7C5D4', // --color-text-secondary
  accent: '#00D2D3', // Ciano Cibernético (oficial, acento)
  white: '#ffffff', // branco do arquivo do logo (vira metal prata)
} as const;
const ACCENT = new THREE.Color(HEX.accent);
/** Racks: o cinza-azulado do texto secundário, escurecido (é luz, não uma cor nova). */
const RACK_K = 0.16;

/* ───────────────────────── Linha do tempo (s). Total < 5 s, depois para. ───────────────────────── */

const T = {
  drawEnd: 1.15,
  // enxame
  swarmDepart: 0.7,
  swarmSpread: 0.45,
  swarmFlight: 0.62,
  // commit em metal
  scanStart: 2.0,
  scanEnd: 2.5,
  slideStart: 2.45,
  lock: 2.9,
  glintStart: 2.5,
  glintEnd: 3.4,
  nodeAFall: 2.82,
  nodeAHit: 3.12,
  nodeBFall: 2.95,
  nodeBHit: 3.25,
  // nome e assinatura em nós (da esquerda para a direita)
  logoDepart: 2.1,
  logoSweep: 0.55,
  logoFlight: 0.8,
  logoFade: 4.35, // sem metal: os nós somem por baixo do logo HTML, já quase opaco
  // HUD
  hudIn: 1.15,
  hudOut: 3.05,
  // ambiente (D-013): a luz acende; os LEDs que saíram acendem de novo (D-014)
  lightStart: 2.7,
  lightEnd: 3.95,
  relightStart: 3.3,
  relightEnd: 4.3,
  // decisão: letras em metal prontas → logo em metal; senão → logo HTML (v3)
  latch: 3.4,
  // commit das letras (D-013)
  letterScanStart: 3.45,
  letterScanEnd: 4.2,
  // câmera e entrega
  camEnd: 3.9,
  flatStart: 3.55,
  flatEnd: 3.95,
  reveal: 3.9, // texto (e, sem metal, o logo HTML) entra: transição CSS de 0,9 s
  hide: 4.8, // sem metal: logo HTML já opaco, as peças saem
} as const;

const CAMERA_Z = 10;
const FOV = 30;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
/** Largura do símbolo (ponta a ponta dos colchetes), em vb. */
const SYMBOL_W_VB = 4 * Math.SQRT2 * CELL_VB;
/** Altura em que os nós do símbolo esperam antes de cair (vb). */
const NODE_HOVER = PIECE_HEIGHT * 2.4;

/**
 * Centro do conteúdo do arquivo vertical (símbolo y 105 → assinatura y 976, de 1081): o pivô da
 * inclinação e o centro do foco de luz. Em vb do arquivo.
 */
const CONTENT_CENTER_VB = { x: VIEWBOX / 2, y: (105 + 976) / 2 } as const;
/** O mesmo no espaço do símbolo (y para cima), com z no meio da espessura das letras. */
const PIVOT = new THREE.Vector3(
  CONTENT_CENTER_VB.x - SYMBOL_CENTER_VB.x,
  -(CONTENT_CENTER_VB.y - SYMBOL_CENTER_VB.y),
  -PIECE_HEIGHT * 0.25,
);

/**
 * Passagem para o Sobre (D-015, D-017): só as 4 peças do símbolo giram e descem. Pivô do símbolo
 * sozinho (centro do símbolo, meio da espessura) e eixo do giro: o vertical, como no Active Theory.
 */
const SYM_PIV = new THREE.Vector3(0, 0, -PIECE_HEIGHT * 0.25);
const ENV_YAW_SIGN = -1;
const SPIN_AXIS = new THREE.Vector3(0, 1, 0);
/** Na descida (D-019), o símbolo também balança de leve para a frente e para trás (rad). */
const WOBBLE_AXIS = new THREE.Vector3(1, 0, 0);
const WOBBLE = 0.2;
/** Reflexo das luzes da descida no metal do símbolo (D-019). */
const WASH_K = 1.4;

/** Entrada pelo corredor (D-014): de longe, baixa e um pouco de lado, até a pose de frente. */
const DOLLY = {
  z0: 19,
  /** Lado (fração da meia-largura do corredor) e altura acima do chão (mundo). */
  side: 0.35,
  height: 0.75,
  /** Altura do ponto olhado no começo (mundo) e giro inicial (rad). */
  lookY: 0.3,
  roll: 0.06,
} as const;
/** Assinatura: fim da tinta no arquivo vertical (vb). */
const SIGNATURE_BOTTOM_VB = 976;

/** Logo em metal em repouso (D-013). */
const REST = {
  /** Espessura das peças em repouso (fração da altura da montagem): acompanha a das letras. */
  pieceZ: 0.5,
  /** Reflexo do ambiente: abaixo de 1 nas faces da frente (sem bloom em repouso). */
  envCyan: 0.72,
  envSilver: 0.6,
  roughness: 0.2,
  key: 0.9,
  point: 3.2,
  /** Inclinação máxima na direção do cursor (rad) e paralaxe da câmera (mundo). */
  tilt: 0.13,
  // Paralaxe da câmera com o cursor: só na entrada (D-046).
  parallax: new THREE.Vector2(0.5, 0.32),
} as const;

interface PieceAnim {
  off: number; // deslocamento na diagonal da matriz, em células
  z: number; // altura acima do chão (vb)
  glow: number;
  sq: number;
}

/* ───────────────────────── Intro (GSAP pausado, dirigido pelo relógio do frame) ───────────────────────── */

function createIntro() {
  const s = {
    draw: 0,
    edge: 0,
    waveA: 0,
    waveB: 0,
    flat: 0,
    cam: 0,
    scan: 0,
    hud: 0,
    glint: 0,
    bloom: 0,
    light: 0,
    relight: 0,
    letters: 0,
    pieces: {
      right: { off: 2, z: 0, glow: 0, sq: 1 },
      left: { off: -2, z: 0, glow: 0, sq: 1 },
      nodeA: { off: 0, z: NODE_HOVER, glow: 0, sq: 1 },
      nodeB: { off: 0, z: NODE_HOVER, glow: 0, sq: 1 },
    } satisfies Record<PieceId, PieceAnim>,
  };

  const tl = gsap.timeline({ paused: true });

  // Câmera: um único progresso linear; as curvas ficam em poseCamera().
  tl.to(s, { cam: 1, duration: T.camEnd, ease: 'none' }, 0);

  // 1. A matriz se desenha a partir do centro do símbolo.
  tl.to(s, { draw: 1, duration: T.drawEnd, ease: 'sine.inOut' }, 0)
    .to(s, { edge: 1, duration: 0.15, ease: 'none' }, 0)
    .to(s, { edge: 0, duration: 0.5, ease: 'power1.in' }, T.drawEnd - 0.4);

  // 2. HUD de medição durante a montagem.
  tl.to(s, { hud: 1, duration: 0.3, ease: 'power1.out' }, T.hudIn).to(
    s,
    { hud: 0, duration: 0.3, ease: 'power1.in' },
    T.hudOut,
  );

  // 3. Commit: a varredura troca os nós pelo metal.
  tl.to(s, { scan: 1, duration: T.scanEnd - T.scanStart, ease: 'power1.inOut' }, T.scanStart);

  // 4. Colchetes deslizam pelas linhas da matriz até travar; o reflexo varre o metal.
  for (const id of ['right', 'left'] as const) {
    const p = s.pieces[id];
    tl.to(p, { off: 0, duration: T.lock - T.slideStart, ease: 'power3.in' }, T.slideStart)
      .to(p, { glow: 1, duration: 0.05, ease: 'power1.out' }, T.lock)
      .to(p, { glow: 0, duration: 0.6, ease: 'power2.out' }, T.lock + 0.05);
  }
  tl.to(s, { glint: 1, duration: T.glintEnd - T.glintStart, ease: 'power2.inOut' }, T.glintStart);

  // 5. Nós caem e fazem commit: pulso + onda no chão + um único pulso de brilho.
  const drop = (p: PieceAnim, fall: number, hit: number, wave: 'waveA' | 'waveB') => {
    tl.to(p, { z: 0, duration: hit - fall, ease: 'power3.in' }, fall)
      .to(p, { glow: 1.2, sq: 1.15, duration: 0.05, ease: 'power1.out' }, hit)
      .to(p, { glow: 0, sq: 1, duration: 0.55, ease: 'power2.out' }, hit + 0.05)
      .to(s, { [wave]: 1, duration: 1.4, ease: 'power1.out' }, hit);
  };
  drop(s.pieces.nodeA, T.nodeAFall, T.nodeAHit, 'waveA');
  drop(s.pieces.nodeB, T.nodeBFall, T.nodeBHit, 'waveB');
  tl.to(s, { bloom: 1, duration: 0.06, ease: 'power1.out' }, T.nodeAHit).to(
    s,
    { bloom: 0, duration: 0.7, ease: 'power2.out' },
    T.nodeBHit,
  );

  // 6. Ambiente: a luz sobe uma vez (sem piscar); os LEDs que saíram acendem de novo, numa passada.
  tl.to(s, { light: 1, duration: T.lightEnd - T.lightStart, ease: 'sine.inOut' }, T.lightStart);
  tl.to(s, { relight: 1, duration: T.relightEnd - T.relightStart, ease: 'sine.inOut' }, T.relightStart);

  // 7. Peças assentam (metal) ou achatam (logo HTML); as letras viram metal.
  tl.to(s, { flat: 1, duration: T.flatEnd - T.flatStart, ease: 'power2.inOut' }, T.flatStart);
  tl.to(s, { letters: 1, duration: T.letterScanEnd - T.letterScanStart, ease: 'power1.inOut' }, T.letterScanStart);

  return { s, tl };
}

/** Somente em desenvolvimento: ?t=2.4 congela a intro nesse instante (para revisão quadro a quadro). */
function readFrozenTime(): number | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('t');
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ───────────────────────── Câmera ───────────────────────── */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const smooth = (x: number) => x * x * (3 - 2 * x);

const _cam = {
  pos: new THREE.Vector3(),
  end: new THREE.Vector3(),
  target: new THREE.Vector3(),
};

/**
 * Dolly pelo corredor: começa longe, baixa, perto do chão e um pouco de lado, com um leve giro;
 * termina na pose final, de frente: (0, 0, 10) olhando para a origem. Na pose final, `par`
 * desloca a câmera (paralaxe do cursor), sempre olhando para a origem.
 */
function poseCamera(cam: THREE.PerspectiveCamera, c: number, start: THREE.Vector3, par: THREE.Vector2) {
  const { pos, end, target } = _cam;
  end.set(par.x, par.y, CAMERA_Z);
  if (c >= 1) {
    cam.position.copy(end);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    return;
  }
  const e = easeInOutCubic(c);
  pos.copy(start).lerp(end, e);
  target.set(0, DOLLY.lookY * (1 - e), 0);
  const roll = DOLLY.roll * (1 - e);
  cam.position.copy(pos);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(target);
  cam.updateMatrixWorld();
}

/* ───────────────────────── Cena ───────────────────────── */

function waveAmp(progress: number) {
  return progress > 0 && progress < 1 ? Math.pow(1 - progress, 1.4) : 0;
}

/** pending: antes da decisão · metal: logo em metal 3D (D-013) · flat: logo HTML assume (v3). */
type LogoMode = 'pending' | 'metal' | 'flat';

interface LetterMeshes {
  cyan: THREE.Mesh;
  silver: THREE.Mesh;
  qRange: [number, number];
}

interface SceneProps extends EntryCanvasProps {
  bloomRef: RefObject<{ intensity: number } | null>;
  labelRefs: readonly [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>];
}

function Scene({
  getLayout,
  logoRef,
  slotRef,
  phaseRef,
  scroller,
  onStart,
  onReveal,
  onDone,
  bloomRef,
  labelRefs,
}: SceneProps) {
  const size = useThree((st) => st.size);
  const gl = useThree((st) => st.gl);
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const scene = useThree((st) => st.scene);
  const invalidate = useThree((st) => st.invalidate);
  const setFrameloop = useThree((st) => st.setFrameloop);

  const pieces = useMemo(buildPieces, []);
  // ── Data center (D-014): os LEDs dos racks. O enxame e o nome saem deles.
  const leds = useMemo(() => buildLeds(pieces.reduce((n, p) => n + p.targets.length / 3, 0)), [pieces]);
  const swarm = useMemo(
    () => buildSwarm(pieces, { depart: T.swarmDepart, spread: T.swarmSpread, flight: T.swarmFlight }, leds),
    [pieces, leds],
  );
  // A timeline vive num ref: o StrictMode desmonta e remonta os efeitos em dev, e uma
  // timeline morta (kill) não volta. Se a limpeza matar, a próxima leitura recria.
  const introRef = useRef<ReturnType<typeof createIntro> | null>(null);
  const getIntro = () => (introRef.current ??= createIntro());
  const frozen = useMemo(readFrozenTime, []);

  // ── Luz da cena (D-013) e névoa: uniforms compartilhados por fundo, corredor e letras
  const light = useMemo(() => createLightUniforms(HEX.white), []);
  const haze = useMemo(() => createHazeUniforms(HEX.bg, HEX.bgDeep), []);
  // ── Descida (D-019): vídeo e luzes coloridas no fundo; o reflexo delas no metal do símbolo.
  const descent = useMemo(createDescentUniforms, []);
  const wash = useMemo(createWashUniforms, []);
  const video = useRef<DescentVideo | null>(null);
  // Relógio da descida (s): só anda com a descida na tela (D-020).
  const descentClock = useRef(0);
  // Pluma de nós da descida (D-022): na frente e atrás do símbolo, coloridos pelas luzes; e os
  // traços que o cursor solta (D-023).
  const cloud = useMemo(() => createNodeCloud(descent, light), [descent, light]);

  // ── Campo de nós (D-012): uniforms compartilhados por enxame e logo
  const field = useMemo(
    () => createFieldUniforms({ fog: HEX.bg, line: HEX.line, lineHi: HEX.lineHi, accent: HEX.accent }),
    [],
  );

  // ── Corredor do data center (D-014): racks, teto, chão polido com reflexo e LEDs
  const corridorU = useMemo(() => {
    const u = createCorridorUniforms({ rack: HEX.lineHi, ledA: HEX.lineHi, ledB: HEX.white, accent: HEX.accent });
    u.uRackCol.value.multiplyScalar(RACK_K);
    return u;
  }, []);

  // ── Metal (peças, reflexo e letras), com as varreduras do commit
  const scanFront = useMemo(() => ({ value: -1e5 }), []);
  const letterFront = useMemo(() => ({ value: -1e5 }), []);
  const scanColor = useMemo(() => ({ value: ACCENT.clone().multiplyScalar(2.4) }), []);
  // Passagem para o Sobre (D-015): as peças passam por cima do corredor enquanto descem.
  const depthBias = useMemo(() => ({ value: 0 }), []);
  const metal = useMemo(() => {
    const scans = {} as Record<PieceId, ScanUniforms>;
    const real = {} as Record<PieceId, THREE.MeshPhysicalMaterial>;
    const depth = { uDepthBias: depthBias, uReflect: corridorU.uReflect };
    for (const p of pieces) {
      scans[p.id] = { uFront: scanFront, uCenter: { value: new THREE.Vector2() }, uScanColor: scanColor };
      real[p.id] = createMetalMaterial(HEX.accent, scans[p.id], { depth, wash });
    }
    // Letras: já estão no espaço do símbolo (centro zero). A cor de cada path vem do arquivo.
    // Ficam no data center e somem com o corte diagonal (D-015).
    const letterScan: ScanUniforms = { uFront: letterFront, uCenter: { value: new THREE.Vector2() }, uScanColor: scanColor };
    const cut = { uCut: light.uCut, uRes: light.uRes, uDpr: light.uDpr, uReflect: corridorU.uReflect };
    const letters = {
      cyan: createMetalMaterial(HEX.accent, letterScan, { cut }),
      silver: createMetalMaterial(HEX.white, letterScan, { cut }),
    };
    for (const m of [letters.cyan, letters.silver]) {
      m.roughness = REST.roughness;
      m.envMapIntensity = REST.envCyan;
    }
    letters.silver.envMapIntensity = REST.envSilver;
    return { scans, real, letters };
  }, [pieces, scanFront, letterFront, scanColor, depthBias, corridorU, light, wash]);

  const reflection = useMemo(() => createReflection(gl), [gl]);
  const corridor = useMemo(
    () => createCorridor(leds, corridorU, light, haze, field.uTime, reflection),
    [leds, corridorU, light, haze, field, reflection],
  );

  // ── Nome e assinatura em nós. A geometria depende do tamanho do logo: é trocada no quadro.
  const logoUniforms = useMemo(() => createLogoUniforms(field, corridorU), [field, corridorU]);
  const logoParticles = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.InstancedBufferGeometry(), createLogoMaterial(logoUniforms));
    mesh.frustumCulled = false;
    mesh.visible = false;
    return mesh;
  }, [logoUniforms]);
  const logoImage = useRef<HTMLImageElement | null>(null);
  const logoBuiltW = useRef(0);

  // ── Letras em metal (D-013): chegam depois do arquivo; null se não der para extrudar.
  const letters = useRef<LetterMeshes | null>(null);
  /** Arquivo do logo: carregando, pronto (letras e imagem resolvidas) ou falhou. */
  const assets = useRef<'loading' | 'ready' | 'failed'>('loading');

  // ── Enxame (o reflexo vem do chão polido)
  const swarmUniforms = useMemo(() => {
    const u = createSwarmUniforms(field, corridorU);
    u.uFront = scanFront;
    return u;
  }, [field, corridorU, scanFront]);
  const swarmMaterial = useMemo(() => createSwarmMaterial(swarmUniforms), [swarmUniforms]);

  // ── HUD
  const hudGeometry = useMemo(createHudGeometry, []);
  const hudMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: HEX.lineHi, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );

  // ── Fundo: névoa azul iluminada + vinheta. Material criado aqui (e não via props JSX): o R3F
  // clonaria os uniforms e as atualizações por quadro não chegariam à GPU.
  const bgUniforms = useMemo(() => ({ ...light, ...haze, ...descent }), [light, haze, descent]);
  const bgMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backgroundVertex,
        fragmentShader: backgroundFragment,
        uniforms: bgUniforms,
        depthTest: false,
        depthWrite: false,
      }),
    [bgUniforms],
  );

  // O ambiente (PMREM) é um render target: depois de dispose, não volta sozinho.
  // Por isso é criado no primeiro quadro e descartado na limpeza (StrictMode recria).
  const envRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const group = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const content = useRef<THREE.Group>(null);
  /** As 4 peças do símbolo: na entrada, no mesmo lugar do logo; depois, descem até o Sobre (D-015). */
  const pieceRoot = useRef<THREE.Group>(null);
  const fieldGroup = useRef<THREE.Group>(null);
  const meshes = useRef<Partial<Record<PieceId, THREE.Mesh>>>({});
  const swarmMesh = useRef<THREE.Mesh>(null);
  const hudLines = useRef<THREE.LineSegments>(null);
  const bgMesh = useRef<THREE.Mesh>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const pointLight = useRef<THREE.PointLight>(null);

  const run = useRef({
    start: -1,
    skipPieces: false,
    revealed: false,
    hidden: false,
    done: false,
    mode: 'pending' as LogoMode,
    lost: false,
    /** A intro pulou para o fim porque a página já estava rolada. */
    jumped: false,
  });
  const mouse = useRef({ target: new THREE.Vector2(), pos: new THREE.Vector2(), on: 0, cur: 0 });
  const labelText = useRef(['', '']);
  const tmp = useMemo(
    () => ({
      v: new THREE.Vector3(),
      w: new THREE.Vector3(),
      sym: new THREE.Vector3(),
      ndc: new THREE.Vector3(),
      light: new THREE.Vector3(),
      rest: new THREE.Vector3(),
      start: new THREE.Vector3(),
      piv: new THREE.Vector3(),
      par: new THREE.Vector2(),
      tp: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      e: new THREE.Euler(),
    }),
    [],
  );

  useEffect(() => {
    // Os LEDs que saem para o enxame já estão marcados (buildSwarm).
    corridor.ledHide.needsUpdate = true;
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[entrada] enxame: ${swarm.count} nós, último pouso em ${swarm.lastLanding.toFixed(2)} s; ` +
          `LEDs: ${leds.count} (enxame ${leds.swarmPool.length}, nome ${leds.logoPool.length})`,
      );
    }
  }, [swarm, leds, corridor]);

  // Fundo e HUD na camada 1: a câmera principal vê; a do reflexo do chão, não.
  useEffect(() => {
    camera.layers.enable(1);
    bgMesh.current?.layers.set(1);
    hudLines.current?.layers.set(1);
  }, [camera]);

  // Arquivo oficial do logo: extruda as letras em metal (D-013) e amostra os nós (D-012).
  // Se falhar, o logo HTML entra como antes.
  useEffect(() => {
    const ac = new AbortController();
    assets.current = 'loading';
    fetchLogoSvg(ac.signal)
      .then(async (text) => {
        let built: LogoLetters | null = null;
        try {
          built = buildLogoLetters(text);
        } catch {
          built = null;
        }
        if (ac.signal.aborted) {
          built?.cyan.dispose();
          built?.silver.dispose();
          return;
        }
        if (built) {
          const cyan = new THREE.Mesh(built.cyan, metal.letters.cyan);
          const silver = new THREE.Mesh(built.silver, metal.letters.silver);
          for (const m of [cyan, silver]) {
            m.visible = false;
            m.frustumCulled = false;
          }
          letters.current = { cyan, silver, qRange: built.qRange };
        }
        try {
          logoImage.current = await loadLogoImage(text);
        } catch {
          logoImage.current = null;
        }
        if (ac.signal.aborted) return;
        assets.current = built ? 'ready' : 'failed';
        invalidate();
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          assets.current = 'failed';
          invalidate();
        }
      });
    return () => {
      ac.abort();
      const l = letters.current;
      if (l) {
        for (const m of [l.cyan, l.silver]) {
          m.removeFromParent();
          m.geometry.dispose();
        }
      }
      letters.current = null;
      logoImage.current = null;
    };
  }, [invalidate, metal]);

  // Cursor (e toque): afasta os nós do campo, inclina e ilumina o logo em metal (D-013).
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.current.target.set(e.clientX - r.left, e.clientY - r.top);
      if (mouse.current.cur < 0.02) mouse.current.pos.copy(mouse.current.target);
      mouse.current.on = 1;
      invalidate();
    };
    const leave = () => {
      mouse.current.on = 0;
      invalidate();
    };
    const out = (e: MouseEvent) => {
      if (!e.relatedTarget) leave();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'touch') leave();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', leave, { passive: true });
    window.addEventListener('mouseout', out);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', leave);
      window.removeEventListener('mouseout', out);
    };
  }, [gl, invalidate]);

  // Passagem para o Sobre (D-015): a rolagem da página dirige tudo. Depois da intro o quadro só é
  // desenhado sob demanda, então cada rolagem nativa (teclado, toque, barra) pede um quadro.
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [invalidate]);

  // Deslize da roda (D-016): o canvas assume o relógio. Enquanto desliza, cada quadro pedido aqui
  // dá um passo na rolagem (useFrame) e desenha a cena na posição nova, no mesmo quadro.
  useEffect(() => {
    scroller.setDriver(invalidate);
    return () => scroller.setDriver(null);
  }, [scroller, invalidate]);

  // Vídeo da descida (D-019): baixado só quando a intro acaba ou a página rola (useFrame); sai aqui.
  useEffect(
    () => () => {
      video.current?.dispose();
      video.current = null;
      descent.uVideo.value = new THREE.Texture();
    },
    [descent],
  );
  useEffect(() => () => cloud.dispose(), [cloud]);

  // Se o WebGL cair, os arquivos oficiais (logo e símbolo do Sobre) voltam na hora.
  useEffect(() => {
    const el = gl.domElement;
    const lost = () => {
      run.current.lost = true;
      scroller.setDriver(null); // a rolagem volta ao relógio próprio
      for (const img of [logoRef.current, slotRef.current]) if (img) delete img.dataset.metal;
      onDone();
    };
    el.addEventListener('webglcontextlost', lost);
    return () => el.removeEventListener('webglcontextlost', lost);
  }, [gl, logoRef, slotRef, scroller, onDone]);

  useEffect(
    () => () => {
      introRef.current?.tl.kill();
      introRef.current = null;
      envRef.current?.dispose();
      envRef.current = null;
      // O three.js reenvia geometria e material à GPU se forem usados de novo após dispose.
      pieces.forEach((p) => p.geometry.dispose());
      Object.values(metal.real).forEach((m) => m.dispose());
      metal.letters.cyan.dispose();
      metal.letters.silver.dispose();
      swarm.geometry.dispose();
      swarmMaterial.dispose();
      hudGeometry.dispose();
      hudMaterial.dispose();
      bgMaterial.dispose();
      corridor.dispose();
      reflection.dispose();
      logoParticles.geometry.dispose();
      (logoParticles.material as THREE.Material).dispose();
      // A próxima montagem amostra de novo (a geometria acabou de ser descartada).
      logoBuiltW.current = 0;
      // A próxima montagem decide de novo (metal ou logo HTML).
      run.current.mode = 'pending';
      for (const img of [logoRef.current, slotRef.current]) if (img) delete img.dataset.metal;
    },
    [
      pieces,
      metal,
      swarm,
      swarmMaterial,
      hudGeometry,
      hudMaterial,
      bgMaterial,
      corridor,
      reflection,
      logoParticles,
      logoRef,
      slotRef,
    ],
  );

  useFrame((_, delta) => {
    // Primeiro a rolagem (D-016), depois o layout: a cena sai na mesma posição que a página.
    scroller.step();
    const layout: EntryLayout | null = getLayout();
    if (!layout || layout.logo.w <= 0) return;
    const r = run.current;

    // ── Ambiente de reflexo (uma vez)
    if (!envRef.current) {
      envRef.current = buildEnvironment(gl, HEX.bg, HEX.bgDeep);
      const all = [...Object.values(metal.real), metal.letters.cyan, metal.letters.silver];
      for (const m of all) m.envMap = envRef.current.texture;
    }

    // ── Relógio da intro
    // Relógio próprio: o setFrameloop do R3F zera state.clock, e a intro voltaria ao início.
    const now = performance.now() / 1000;
    if (r.start < 0) {
      r.start = now;
      r.skipPieces = phaseRef.current === 'done'; // o logo já apareceu sem intro
      onStart();
    }
    const intro = getIntro();
    const dur = intro.tl.duration();
    // Rolou antes de a intro acabar (ou a página voltou já rolada): a intro pula para o fim, parada.
    if (layout.progress > 0 && frozen === null && !r.done && !r.skipPieces) {
      r.start = Math.min(r.start, now - Math.max(dur, T.hide));
      r.jumped = true;
    }
    const elapsed = frozen ?? now - r.start;
    // Sem intro, tudo já começa no estado final (parado).
    const tl = r.skipPieces ? dur : Math.min(Math.max(elapsed, 0), dur);
    intro.tl.time(tl);
    const s = intro.s;

    // ── Decisão do logo: metal (D-013) ou logo HTML (v3). Uma vez só.
    const assetsState = assets.current;
    if (r.mode === 'pending' && !r.lost) {
      const due = r.skipPieces || elapsed >= T.latch;
      // Na revisão congelada (dev), sem intro ou com a intro pulada pela rolagem (a página voltou já
      // rolada), espera o arquivo; na intro, decide na hora.
      const canDecide = assetsState !== 'loading' || (frozen === null && !r.skipPieces && !r.jumped);
      if (due && canDecide) {
        r.mode = assetsState === 'ready' && letters.current ? 'metal' : 'flat';
        if (r.mode === 'metal') {
          for (const img of [logoRef.current, slotRef.current]) if (img) img.dataset.metal = '';
        }
      }
    }
    if (r.lost) r.mode = 'flat';
    const isMetal = r.mode === 'metal';

    // Revisão (dev): conta quadros desenhados, para saber quando o quadro congelado está pronto.
    if (frozen !== null && assetsState !== 'loading') {
      gl.domElement.dataset.frames = String(Number(gl.domElement.dataset.frames ?? 0) + 1);
    }

    // O texto (e, sem metal, o logo HTML) só entra depois da decisão: o <img> não acende e apaga.
    if (!r.revealed && r.mode !== 'pending' && (r.skipPieces || elapsed >= T.reveal)) {
      r.revealed = true;
      onReveal();
    }
    if (!r.hidden && elapsed >= T.hide && !isMetal) r.hidden = true;
    // Fim: depois da timeline e com o logo final já no lugar (< 5 s, D-004).
    if (
      !r.done &&
      frozen === null &&
      r.mode !== 'pending' &&
      (r.skipPieces || elapsed >= Math.max(dur, T.hide))
    ) {
      r.done = true;
      onDone();
      setFrameloop('demand'); // depois da intro, só renderiza quando o cursor mexe
    }

    // ── Medidas: px CSS → mundo (plano z = 0). k fixo: é o da pose final (câmera a 10 de distância).
    const W = size.width;
    const H = size.height;
    const k = (2 * CAMERA_Z * TAN_HALF_FOV) / H;
    const { logo } = layout;
    const scalePx = Math.min(logo.w, logo.h) / VIEWBOX; // px por unidade do viewBox (meet)
    const offX = (logo.w - VIEWBOX * scalePx) / 2;
    const offY = (logo.h - VIEWBOX * scalePx) / 2;
    const symX = logo.x + offX + SYMBOL_CENTER_VB.x * scalePx;
    const symY = logo.y + offY + SYMBOL_CENTER_VB.y * scalePx;
    const pivX = logo.x + offX + CONTENT_CENTER_VB.x * scalePx;
    const pivY = logo.y + offY + CONTENT_CENTER_VB.y * scalePx;
    const unit = scalePx * k; // mundo por unidade do viewBox
    const symWX = (symX - W / 2) * k;
    const symWY = -(symY - H / 2) * k;

    // ── Data center: o chão fica entre a assinatura e o texto; o corredor, um pouco mais largo
    // que o logo e o texto (os racks ficam nas laterais, longe do texto).
    const toWorldY = (py: number) => -(py - H / 2) * k;
    const toWorldX = (px: number) => Math.abs(px - W / 2) * k;
    const copy = layout.copy;
    const sigBottomY = toWorldY(logo.y + offY + SIGNATURE_BOTTOM_VB * scalePx);
    const floorY = copy ? (sigBottomY + toWorldY(copy.y + copy.h)) / 2 - 0.05 : sigBottomY - 0.5;
    let aisle = Math.max(toWorldX(logo.x), toWorldX(logo.x + logo.w));
    if (copy) aisle = Math.max(aisle, toWorldX(copy.x), toWorldX(copy.x + copy.w));
    aisle += 0.35;

    // ── Cursor amortecido (px da tela)
    const ms = mouse.current;
    const damp = 1 - Math.exp(-Math.min(delta, 1 / 30) * 6);
    ms.pos.lerp(ms.target, damp);
    ms.cur += (ms.on - ms.cur) * damp;
    if (r.done && (ms.pos.distanceTo(ms.target) > 0.3 || Math.abs(ms.on - ms.cur) > 0.004)) invalidate();

    // ── Passagem para o Sobre (D-015, D-017, D-019): só o símbolo em metal viaja. Sai do meio do
    // logo para o meio da tela, gira uma volta no eixo vertical durante a descida e pousa no lugar
    // do arquivo do símbolo no Sobre. A mesma conta (`symbolPath`) diz ao texto onde ele está.
    const progress = layout.progress;
    const cutIn = cutA(progress, W, H);
    const cutOut = cutB(progress, W, H);
    /** A tela toda já saiu do data center (o corredor e as letras saem da cena). */
    const allDescent = cutDone(cutIn);
    const dp = descentProgress(progress);
    const presence = descentPresence(progress);
    const slot = layout.slot;
    const travel = isMetal && slot !== null && slot.w > 0;
    let bx = symX;
    let by = symY;
    let symScale = unit;
    /** Viagem do logo até o meio da tela (0..1) e giro (rad). */
    let ps = 0;
    let spin = 0;
    if (travel) {
      const at = symbolPath(progress, logo, slot, W, H);
      bx = at.x;
      by = at.y;
      symScale = at.scale * k;
      ps = at.a;
      spin = at.spin;
      // D-040: na saída para o portfólio, mais uma volta e descida até a base do holograma, que
      // fica no meio, embaixo. O símbolo diminui enquanto desce.
      const ex = smooth(clamp01(portfolioExit.t / 0.85));
      if (ex > 0) {
        // D-048: sem a volta extra na saída; o símbolo dá só 2 giros inteiros (D-035).
        bx = THREE.MathUtils.lerp(bx, W / 2, ex);
        by = THREE.MathUtils.lerp(by, H * 0.78, ex);
        symScale *= THREE.MathUtils.lerp(1, 0.45, ex);
      }
      spin %= Math.PI * 2;
    }
    const pwX = (bx - W / 2) * k;
    const pwY = -(by - H / 2) * k;

    // ── Câmera (+ paralaxe do cursor na pose final)
    const camC = r.skipPieces ? 1 : s.cam;
    const camE = easeInOutCubic(camC);
    // Inclinação e paralaxe só valem com o logo final no lugar.
    const settleK = isMetal ? smooth(clamp01((camE - 0.85) / 0.15)) * s.flat : 0;
    const nx = THREE.MathUtils.clamp((ms.pos.x - pivX) / (W / 2), -1.2, 1.2) * ms.cur * settleK;
    const ny = THREE.MathUtils.clamp(-(ms.pos.y - pivY) / (H / 2), -1.2, 1.2) * ms.cur * settleK;
    // O símbolo inclina na direção do cursor em volta de onde ele está agora (no Sobre também).
    const nxP = THREE.MathUtils.lerp(nx, THREE.MathUtils.clamp((ms.pos.x - bx) / (W / 2), -1.2, 1.2) * ms.cur, ps);
    const nyP = THREE.MathUtils.lerp(ny, THREE.MathUtils.clamp(-(ms.pos.y - by) / (H / 2), -1.2, 1.2) * ms.cur, ps);
    const showPieces = isMetal || (!r.skipPieces && !r.hidden);
    const symW = SYMBOL_W_VB * symScale;
    tmp.sym.set(pwX, pwY, PIECE_HEIGHT * 0.5 * symScale);
    // Sem paralaxe no Sobre: a câmera fica de frente e o símbolo pousa exatamente no lugar do arquivo.
    tmp.par.set(nx * REST.parallax.x * (1 - ps), ny * REST.parallax.y * (1 - ps));
    tmp.start.set(DOLLY.side * aisle, floorY + DOLLY.height, DOLLY.z0);
    poseCamera(camera, camC, tmp.start, tmp.par);

    // Cursor → ponto do plano z = 0 (raio da câmera)
    tmp.ndc.set((ms.pos.x / W) * 2 - 1, -(ms.pos.y / H) * 2 + 1, 0.5).unproject(camera);
    tmp.w.copy(tmp.ndc).sub(camera.position).normalize();
    let mouseHit = false;
    if (tmp.w.z < -1e-4) {
      const t = -camera.position.z / tmp.w.z;
      tmp.v.copy(camera.position).addScaledVector(tmp.w, t);
      mouseHit = true;
    }

    // ── Campo e logo em nós: mesmo espaço do símbolo, sempre visíveis
    const fg = fieldGroup.current;
    if (fg) {
      fg.visible = !allDescent;
      fg.position.set(symWX, symWY, 0);
      fg.scale.setScalar(unit);
      fg.updateMatrixWorld();
    }

    // ── Peças e letras
    const f = s.flat;
    // Rotação do ambiente: gira na intro e termina em zero; depois, só o cursor mexe.
    const envRot = tl * 0.22 + s.glint * 1.9 - (dur * 0.22 + 1.9);
    const g = group.current;
    const tg = tiltGroup.current;
    const ct = content.current;
    const pr = pieceRoot.current;
    if (g && tg && ct && pr) {
      g.visible = showPieces;
      g.position.set(symWX, symWY, 0);
      g.scale.setScalar(unit);
      // Inclinação na direção do cursor, em volta do centro do logo.
      tg.position.copy(PIVOT);
      tg.rotation.set(-ny * REST.tilt, nx * REST.tilt, 0);
      ct.position.copy(PIVOT).negate();
      g.updateMatrixWorld();

      // Peças do símbolo: T(posição) · S(escala) · balanço e giro em volta do pivô do símbolo ·
      // inclinação. Em p = 0 é exatamente a matriz do grupo do logo (pivô no centro do logo, sem
      // giro); depois, o pivô é o centro do símbolo e, no Sobre, o giro já completou as voltas.
      pr.visible = showPieces;
      tmp.tp.copy(PIVOT).lerp(SYM_PIV, ps);
      const M = pr.matrix;
      M.makeTranslation(pwX, pwY, 0);
      M.multiply(tmp.m.makeScale(symScale, symScale, symScale));
      M.multiply(tmp.m.makeTranslation(SYM_PIV.x, SYM_PIV.y, SYM_PIV.z));
      // Balanço de leve na descida e giro no eixo vertical (sentido do Active Theory); termina de frente.
      if (dp > 0 && dp < 1) M.multiply(tmp.m.makeRotationAxis(WOBBLE_AXIS, WOBBLE * Math.sin(Math.PI * dp)));
      if (spin !== 0) M.multiply(tmp.m.makeRotationAxis(SPIN_AXIS, spin));
      M.multiply(tmp.m.makeTranslation(tmp.tp.x - SYM_PIV.x, tmp.tp.y - SYM_PIV.y, tmp.tp.z - SYM_PIV.z));
      M.multiply(tmp.m.makeRotationFromEuler(tmp.e.set(-nyP * REST.tilt, nxP * REST.tilt, 0)));
      M.multiply(tmp.m.makeTranslation(-tmp.tp.x, -tmp.tp.y, -tmp.tp.z));
      pr.matrixWorldNeedsUpdate = true;
      depthBias.value = travel && progress > 0 ? 0.9 : 0;

      // Frente da varredura (q no espaço do símbolo, com os colchetes onde estão agora).
      let qLo = Infinity;
      let qHi = -Infinity;
      for (const def of pieces) {
        const shift = s.pieces[def.id].off * CELL_VB;
        qLo = Math.min(qLo, def.qRange[0] + shift);
        qHi = Math.max(qHi, def.qRange[1] + shift);
      }
      scanFront.value =
        s.scan <= 0 ? -1e5 : s.scan >= 1 ? 1e5 : THREE.MathUtils.lerp(qLo - 30, qHi + 30, s.scan);

      const envRotX = -ny * 0.18;
      const envRotY = nx * 0.18;
      const envRotZ = envRot + nx * 0.3;
      // As peças refletem o ambiente pela inclinação delas (que, no Sobre, segue o cursor de lá).
      const pieceEnvX = -nyP * 0.18;
      // D-039: o ambiente gira junto com a pose de repouso, para o metal virado de lado refletir a
      // mesma luz que refletia de frente (senão ele escurece).
      const pieceEnvY = nxP * 0.18 + ENV_YAW_SIGN * restYawAt(progress);
      const pieceEnvZ = envRot + nxP * 0.3;
      pieces.forEach((def, i) => {
        const a = s.pieces[def.id];
        const d = a.off * CELL_VB * R;
        const px = def.center.x + d;
        const py = def.center.y + d;
        // Metal: as peças afinam até a espessura das letras, com a frente em z = 0.
        // Logo HTML: achatam no chão.
        const zs = isMetal ? THREE.MathUtils.lerp(1, REST.pieceZ, f) : THREE.MathUtils.lerp(1, 0.004, f);
        const zOff = isMetal ? -PIECE_HEIGHT * REST.pieceZ * f : 0;
        const real = meshes.current[def.id];
        if (real) {
          real.position.set(px, py, a.z + zOff);
          real.scale.set(a.sq, a.sq, zs);
          real.updateMatrix();
        }
        metal.scans[def.id].uCenter.value.set(px, py);
        if (real) swarmUniforms.uPiece.value[i].copy(real.matrix);

        {
          const m = metal.real[def.id];
          if (isMetal) {
            m.color.copy(ACCENT);
            m.metalness = 1;
            m.roughness = THREE.MathUtils.lerp(0.24, REST.roughness, f);
            m.clearcoat = 0.55;
            m.envMapIntensity = THREE.MathUtils.lerp(1, REST.envCyan, f);
            m.specularIntensity = 1;
            m.emissiveIntensity = 0.08 + a.glow * 2.2;
          } else {
            m.color.copy(ACCENT).multiplyScalar(1 - f);
            m.metalness = 1 - f;
            m.roughness = THREE.MathUtils.lerp(0.24, 1, f);
            // Nunca zero: mudar o clearcoat de > 0 para 0 recompila o shader no meio da animação.
            m.clearcoat = 0.55 * (1 - f) + 1e-4;
            m.envMapIntensity = 1 - f;
            m.specularIntensity = 1 - f;
            m.emissiveIntensity = THREE.MathUtils.lerp(0.08, 1, f) + a.glow * 2.2;
          }
          m.envMapRotation.set(pieceEnvX, pieceEnvY, pieceEnvZ);
        }
      });
      pr.updateMatrixWorld(true);

      // Letras em metal (D-013): entram na cena uma vez e aparecem com a varredura.
      const lt = letters.current;
      if (lt) {
        if (lt.cyan.parent !== ct) ct.add(lt.cyan, lt.silver);
        const on = isMetal && s.letters > 0 && !allDescent;
        lt.cyan.visible = on;
        lt.silver.visible = on;
        letterFront.value =
          s.letters <= 0
            ? -1e5
            : s.letters >= 1
              ? 1e5
              : THREE.MathUtils.lerp(lt.qRange[0] - 30, lt.qRange[1] + 30, s.letters);
        for (const m of [metal.letters.cyan, metal.letters.silver]) m.envMapRotation.set(envRotX, envRotY, envRotZ);
      }

      // Enxame
      const sw = swarmUniforms;
      sw.uTime.value = tl;
      sw.uCube.value = SUB_VB * 0.27;
      if (swarmMesh.current) swarmMesh.current.visible = s.scan < 1;

      // HUD
      if (hudLines.current) hudLines.current.visible = s.hud > 0.001;
      hudMaterial.opacity = 0.75 * s.hud;
      const tipR = 2 + s.pieces.right.off;
      const tipL = -2 + s.pieces.left.off;
      if (s.hud > 0.001) writeHud(hudGeometry, tipR, tipL);

      const tips: [number, 1 | -1, number][] = [
        [tipR, -1, -2],
        [tipL, 1, 2],
      ];
      tips.forEach(([tip, side, qy], i) => {
        const el = labelRefs[i].current;
        if (!el) return;
        const on = showPieces && s.hud > 0.001;
        if (!on) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          return;
        }
        labelAnchor(tip, side, tmp.v);
        tmp.v.applyMatrix4(ct.matrixWorld).project(camera);
        if (tmp.v.z > 1) {
          el.style.opacity = '0';
          return;
        }
        const x = (tmp.v.x * 0.5 + 0.5) * W;
        const y = (-tmp.v.y * 0.5 + 0.5) * H;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.opacity = s.hud.toFixed(3);
        const text = formatQ(tip, qy);
        if (labelText.current[i] !== text) {
          labelText.current[i] = text;
          el.textContent = text;
        }
      });
    } else {
      for (const ref of labelRefs) if (ref.current) ref.current.style.opacity = '0';
    }

    // ── Luzes. Metal: ficam acesas em repouso; a pontual segue o cursor e corre pelo metal.
    if (keyLight.current) keyLight.current.intensity = isMetal ? THREE.MathUtils.lerp(2.2, REST.key, f) : 2.2 * (1 - f);
    if (pointLight.current) {
      const pl = pointLight.current;
      // Na montagem: passa uma vez por baixo do símbolo. Em repouso: no alto, à esquerda do logo.
      tmp.light.set(tmp.sym.x + Math.sin(tl * 1.3) * symW * 0.6, tmp.sym.y - symW * 0.4, symW * 0.35);
      tmp.rest.set(tmp.sym.x - symW * 0.5, tmp.sym.y + symW * 0.35, symW * 0.5);
      tmp.light.lerp(tmp.rest, isMetal ? f : 0);
      if (isMetal && mouseHit) {
        tmp.rest.set(tmp.v.x, tmp.v.y, symW * 0.42);
        tmp.light.lerp(tmp.rest, ms.cur * settleK);
      }
      pl.position.copy(tmp.light);
      // Na descida, a luz branca abaixa e as coloridas (reflexo abaixo) assumem o metal.
      pl.intensity = (isMetal ? THREE.MathUtils.lerp(6, REST.point, f) : 6 * (1 - f)) * (1 - 0.6 * presence);
    }

    // ── Bloom: um único pulso no commit dos nós
    if (bloomRef.current) bloomRef.current.intensity = 1.1 + 0.9 * s.bloom;

    // ── Luz da cena (fundo e corredor), em px CSS com y para cima
    const L = light;
    L.uRes.value.set(W, H);
    L.uDpr.value = gl.getPixelRatio();
    L.uLightPx.value.set(pivX, H - pivY);
    L.uLightR.value = Math.max(logo.w * 0.85, 160);
    L.uFocusK.value = s.light;
    L.uBeamK.value = s.light;
    L.uBeamW.value = Math.max(logo.w * 0.55, 110);
    L.uBeamLen.value = Math.hypot(W, H) * 0.7;
    L.uAmbient.value = THREE.MathUtils.lerp(1, 0.5, s.light);
    L.uCursorPx.value.set(ms.pos.x, H - ms.pos.y, ms.cur * s.light);
    L.uCursorR.value = Math.max(logo.w * 0.6, 140);
    L.uSobreFx.value.set(ms.pos.x, ms.pos.y, ms.cur, performance.now() / 1000 % 3600);
    // Cortes diagonais (D-015, D-019) e luz suave atrás do símbolo no Sobre (px CSS, y para baixo).
    L.uCut.value.set(cutIn.c, cutIn.band, cutIn.cell, cutIn.on ? cutClock() : 0);
    L.uCutB.value.set(cutOut.c, cutOut.band, cutOut.cell, cutOut.on ? cutClock() : 0);
    if (travel) {
      L.uSobre.value.set(bx, by, (SYMBOL_W_VB * symScale) / k * 1.1, 1);
    } else if (slot) {
      L.uSobre.value.set(slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w * 0.8, 1);
    } else {
      L.uSobre.value.set(W / 2, H / 2, Math.min(W, H) * 0.3, 1);
    }

    // ── Fundo e névoa: mais fundos no começo do corredor
    haze.uDeep.value = (1 - camE) * 0.6;

    // ── Descida (D-019): o vídeo só é baixado quando a intro acaba ou a página rola. Com a descida na
    // tela, o vídeo roda em loop, a nuvem flui e as luzes derivam sozinhas (D-020); fora dela, param.
    // As luzes giram em volta do símbolo e refletem no metal dele.
    const descentOn = presence > 0.001;
    if (descentOn) descentClock.current += Math.min(delta, 1 / 30);
    if (!video.current && (r.done || progress > 0)) {
      video.current = createDescentVideo(invalidate);
      descent.uVideo.value = video.current.texture;
    }
    const vid = video.current;
    vid?.setActive(descentOn);
    updateDescent(descent, {
      width: W,
      height: H,
      d: dp,
      presence,
      symX: bx,
      symY: by,
      cursorX: ms.pos.x,
      cursorY: ms.pos.y,
      cursorOn: ms.cur,
      videoW: vid?.size.x ?? 0,
      videoH: vid?.size.y ?? 0,
      time: descentClock.current,
    });
    // Luzes no metal: do centro de cada luz (px da tela), um pouco à frente do símbolo, no espaço da câmera.
    wash.uWash.value = isMetal ? WASH_K * presence : 0;
    if (wash.uWash.value > 0) {
      for (let i = 0; i < WASH_LIGHTS; i++) {
        const o = descent.uOrb.value[i];
        wash.uWashCol.value[i].copy(descent.uOrbCol.value[i]).multiplyScalar(o.w / ORB_K);
        wash.uWashPos.value[i]
          .set((o.x - W / 2) * k, -(o.y - H / 2) * k, tmp.sym.z + symW * 0.9)
          .applyMatrix4(camera.matrixWorldInverse);
      }
    }
    // Pluma de nós da descida e os traços do cursor.
    cloud.update({
      dt: delta,
      width: W,
      height: H,
      d: dp,
      presence,
      symX: bx,
      symY: by,
      cursorX: ms.pos.x,
      cursorY: ms.pos.y,
      cursorOn: ms.cur,
      pointerX: ms.target.x,
      pointerY: ms.target.y,
      pointerOn: ms.on,
      spin,
    }, gl);
    // A descida anda sozinha enquanto está na tela: pede o próximo quadro.
    if (descentOn) invalidate();

    // ── Nós (enxame e logo): relógio, câmera no espaço do símbolo e caixa do texto
    const fu = field;
    fu.uTime.value = tl;
    if (fg) fu.uCamLocal.value.copy(camera.position).sub(fg.position).divideScalar(unit);
    // Retângulo em px CSS → caixa no espaço do símbolo (centro e meia-largura/altura, vb).
    const toBox = (q: Rect, out: THREE.Vector4) =>
      out.set((q.x + q.w / 2 - symX) / scalePx, -(q.y + q.h / 2 - symY) / scalePx, q.w / 2 / scalePx, q.h / 2 / scalePx);
    if (copy) toBox(copy, fu.uCopy.value);

    // ── Corredor (mundo). Com a tela toda no Sobre, o data center sai da cena.
    corridor.group.visible = !allDescent;
    const cu = corridorU;
    const reach = corridorReach(aisle, symWX);
    cu.uAisle.value = aisle;
    cu.uFloor.value = floorY;
    cu.uPowerO.value.set(symWX, 0);
    // Os racks ligam numa frente em losango, da base do logo para o fundo (uma passada).
    cu.uPower.value = s.draw * (reach.power + cu.uPowerW.value);
    cu.uPowerEdge.value = s.edge;
    cu.uRelight.value = s.relight * (reach.relight + cu.uPowerW.value);
    tmp.piv.copy(PIVOT).multiplyScalar(unit).add(tmp.v.set(symWX, symWY, 0));
    cu.uFocusD.value = camera.position.distanceTo(tmp.piv);
    cu.uCoc.value = THREE.MathUtils.clamp(H * 0.04, 18, 44);
    cu.uTanH.value = TAN_HALF_FOV;
    // Retângulo em px CSS → caixa em px com y para cima (centro e meia-largura/altura).
    const toPxBox = (q: Rect, out: THREE.Vector4) => out.set(q.x + q.w / 2, H - (q.y + q.h / 2), q.w / 2, q.h / 2);
    if (layout.quiet) toPxBox(layout.quiet, cu.uQuietPx.value);
    cu.uGlow.value.copy(tmp.piv);
    cu.uGlowK.value = 0.9 * s.light;
    cu.uSpin.value = spin;
    cu.uDustR.value = symW / 2;
    // A poeira flutua sozinha enquanto a entrada está na tela (D-038): pede o próximo quadro.
    cu.uDrift.value = (performance.now() / 1000) % 3600;
    if (corridor.group.visible) invalidate();
    // Ondas do commit no chão (losangos a partir da base do logo).
    const waveR = 14;
    cu.uWaves.value.set(
      s.waveA * waveR,
      r.skipPieces ? 0 : waveAmp(s.waveA),
      s.waveB * waveR,
      r.skipPieces ? 0 : waveAmp(s.waveB),
    );
    cu.uWorldOrigin.value.set(symWX, symWY, 0);
    cu.uWorldUnit.value = unit;

    // ── Nome e assinatura em nós: amostra o arquivo oficial no passo do tamanho atual
    const img = logoImage.current;
    if (img && (logoBuiltW.current === 0 || Math.abs(logo.w / logoBuiltW.current - 1) > 0.08)) {
      logoBuiltW.current = logo.w;
      const stepPx = THREE.MathUtils.clamp(logo.w / 150, 1.8, 2.8);
      const sample = sampleLogo(img, stepPx / scalePx);
      if (sample && sample.count > 0) {
        const built = buildLogoParticles(
          sample,
          { depart: T.logoDepart, sweep: T.logoSweep, flight: T.logoFlight },
          leds,
        );
        assignLogoLeds(leds, corridor, built.slots, built.departs);
        logoParticles.geometry.dispose();
        logoParticles.geometry = built.geometry;
        logoParticles.visible = true;
        logoUniforms.uDot.value = sample.step * 0.42;
        if (process.env.NODE_ENV !== 'production') {
          console.info(
            `[entrada] logo: ${sample.count} nós (passo ${stepPx.toFixed(2)} px), último pouso em ${built.lastLanding.toFixed(2)} s`,
          );
        }
      } else {
        logoImage.current = null; // canvas indisponível: segue sem nós no logo
      }
    }
    if (isMetal) {
      // Os nós pousados viram metal atrás da frente das letras; depois, saem da cena.
      logoUniforms.uShow.value = 1;
      logoUniforms.uCommit.value = letterFront.value;
      if (logoParticles.geometry.attributes.position) logoParticles.visible = s.letters < 1 && !r.skipPieces;
    } else {
      logoUniforms.uCommit.value = -1e5;
      logoUniforms.uShow.value = 1 - smooth(clamp01((elapsed - T.logoFade) / (T.hide - T.logoFade)));
      if (logoParticles.geometry.attributes.position) logoParticles.visible = !r.skipPieces;
    }

    // ── Reflexo do chão polido (antes do quadro principal, que o composer desenha depois)
    if (!allDescent) {
      // A floresta é desenhada em px da tela: fica fora do reflexo do chão.
      const cloudOn = cloud.object.visible;
      cloud.object.visible = false;
      reflection.render(gl, scene, camera, floorY, corridor.floor, cu.uReflect);
      cloud.object.visible = cloudOn;
    }
  });

  return (
    <>
      <mesh ref={bgMesh} frustumCulled={false} renderOrder={-1} material={bgMaterial}>
        <planeGeometry args={[2, 2]} />
      </mesh>

      <primitive object={corridor.group} />

      <group ref={fieldGroup}>
        <primitive object={logoParticles} />
      </group>

      <directionalLight ref={keyLight} position={[2, -5, 6]} intensity={2.2} />
      <pointLight ref={pointLight} position={[0, 0, 1]} intensity={6} color={HEX.white} />

      {/* Matriz montada no quadro (D-015): no começo, igual à do grupo do logo. */}
      <group ref={pieceRoot} matrixAutoUpdate={false}>
        {pieces.map((p) => (
          <mesh
            key={p.id}
            ref={(m) => {
              meshes.current[p.id] = m ?? undefined;
            }}
            geometry={p.geometry}
            material={metal.real[p.id]}
            matrixAutoUpdate={false}
          />
        ))}
      </group>

      <primitive object={cloud.object} />

      <group ref={group}>
        <group ref={tiltGroup}>
          <group ref={content}>
            <mesh ref={swarmMesh} geometry={swarm.geometry} material={swarmMaterial} frustumCulled={false} />
            <lineSegments ref={hudLines} geometry={hudGeometry} material={hudMaterial} frustumCulled={false} />
          </group>
        </group>
      </group>
    </>
  );
}

/** Tempo da falha da borda (D-033), guardado em uCut.w: 1 + segundos, em ciclo de 600 s. */
const cutClock = () => 1 + ((performance.now() / 1000) % 600);

export default function EntryCanvas(props: EntryCanvasProps) {
  const bloomRef = useRef<{ intensity: number } | null>(null);
  const labelR = useRef<HTMLSpanElement>(null);
  const labelL = useRef<HTMLSpanElement>(null);
  const labelRefs = useMemo(() => [labelR, labelL] as const, []);

  return (
    <>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ fov: FOV, near: 0.05, far: 200, position: [0, 0, CAMERA_Z] }}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(HEX.bg)}
      >
        <Scene {...props} bloomRef={bloomRef} labelRefs={labelRefs} />
        <EffectComposer multisampling={4}>
          <Bloom
            ref={(e) => {
              bloomRef.current = e;
            }}
            mipmapBlur
            luminanceThreshold={1}
            luminanceSmoothing={0.15}
            intensity={1.1}
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>
      <div className={hudStyles.layer}>
        <span ref={labelR} className={hudStyles.label} />
        <span ref={labelL} className={hudStyles.label} />
      </div>
    </>
  );
}
