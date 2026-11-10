/**
 * Descida (D-019, D-021): o trecho entre a entrada e o Sobre. O fundo é o vídeo, desfocado e visível
 * (não é o destaque); o destaque são as luzes coloridas e irregulares que giram em volta do símbolo,
 * trocam de cor e iluminam o vídeo, o símbolo e a floresta de nós (cloud.ts).
 * A rolagem leva a descida (posição das luzes, cores, recorte do vídeo); enquanto a descida está na
 * tela, o vídeo roda em loop e as luzes derivam devagar sozinhas (D-020). Fora dela, tudo para.
 *
 * Origem no conceito da marca:
 * - cada luz é uma mancha esticada numa diagonal da matriz 45°, com a borda irregular, e gira em
 *   volta do símbolo de tag;
 * - o desfoque do vídeo soma amostras nos eixos e nas diagonais da matriz 45°;
 * - a floresta é feita de nós (pequenos quadrados girados 45°), ver cloud.ts.
 *
 * Cores (D-019): ciano, violeta, verde-limão, laranja e rosa, só na luz da descida e no reflexo dela
 * no metal do símbolo. Todas são levadas à mesma luminância relativa: trocar de cor não muda o brilho.
 *
 * Fotossensibilidade (SC 2.3.1, D-021): o vídeo foi medido quadro a quadro com o ganho daqui
 * (`tools/flash-check.py`): no pior quarto da tela, 2 flashes em 1 s no loop inteiro, mesmo com o dobro
 * do ganho; os cortes do vídeo ficam a 0,6 s ou mais um do outro. As luzes nunca piscam: respiram
 * devagar e só correm com a rolagem (0,6 volta na descida inteira). Um teto suave na luz somada
 * segura o branco.
 */
import * as THREE from 'three';

/** Cores da luz da descida (D-019), na ordem em que uma luz passa de uma para a outra. */
export const LIGHT_HEX = ['#00D2D3', '#8B5CFF', '#FF3D8B', '#FF7A1A', '#B6FF3B'] as const;
/** Luminância relativa comum a todas as cores da paleta (antes da intensidade de cada luz). */
const LIGHT_L = 0.25;
const LUMA = new THREE.Vector3(0.2126, 0.7152, 0.0722);

/** Paleta em RGB linear, com a mesma luminância (o THREE.Color converte o hex sRGB para linear). */
const PALETTE = LIGHT_HEX.map((hex) => {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(LIGHT_L / (LUMA.x * c.r + LUMA.y * c.g + LUMA.z * c.b));
});

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Cor da paleta numa posição contínua (uma unidade = uma cor), sem degrau entre as cores. */
function paletteAt(t: number, out: THREE.Color) {
  const n = PALETTE.length;
  const w = ((t % n) + n) % n;
  const i = Math.floor(w);
  return out.copy(PALETTE[i]).lerp(PALETTE[(i + 1) % n], smooth(w - i));
}

/**
 * Luzes que giram em volta do símbolo. `phase`: ângulo inicial (voltas); `dir`: sentido; `orbit`:
 * raio da órbita (fração da tela); `size`: raio da luz (fração do menor lado); `from`: quando ela
 * aparece (progresso da descida); `hue`: cor inicial (posição na paleta); `depth`: paralaxe do cursor;
 * `axis`: diagonal da matriz em que a luz se estica (1 ou -1); `seed`: forma da borda.
 */
const ORBS = [
  { phase: 0.62, dir: 1, orbit: 0.5, size: 0.3, from: 0, hue: 0, depth: 0.05, axis: 1, seed: 0.13 },
  { phase: 0.1, dir: -1, orbit: 0.42, size: 0.25, from: 0.14, hue: 1.6, depth: 0.08, axis: -1, seed: 0.57 },
  { phase: 0.36, dir: 1, orbit: 0.58, size: 0.34, from: 0.34, hue: 3.2, depth: 0.035, axis: 1, seed: 0.81 },
] as const;
/** Voltas que cada luz dá em volta do símbolo ao longo da descida. */
const ORBIT_TURNS = 0.6;
/** Cores por que cada luz passa ao longo da descida. */
const HUE_SPAN = 3;
/** Deriva sozinha (D-020), por segundo: voltas em volta do símbolo, cores, respiração e borda. */
const DRIFT = { orbit: 0.014, hue: 0.035, breathe: 0.09, shape: 0.06 } as const;
/** Intensidade de cada luz no centro (fração da cor da paleta). */
export const ORB_K = 0.3;
/**
 * Vídeo: ganho na luz linear (o branco do vídeo vira 0,34) e nível da mipmap lido no desfoque.
 * O ganho foi medido para o SC 2.3.1 (D-021); mudar aqui pede medir de novo em tools/flash-check.py.
 */
const VIDEO_GAIN = 0.34;
const VIDEO_LOD = 1.6;

export function createDescentUniforms() {
  return {
    /** Quadro do vídeo (vazio até o primeiro quadro chegar). */
    uVideo: { value: new THREE.Texture() as THREE.Texture },
    /** Recorte "cover" do vídeo: uv = (pd / uRes) · xy + zw (uv com y para baixo). */
    uVideoFit: { value: new THREE.Vector4(1, 1, 0, 0) },
    /** Desfoque do vídeo: distância (uv) das amostras em volta do centro. */
    uVideoBlur: { value: new THREE.Vector2() },
    /** x: rolagem da descida (px), y: progresso (0..1), z: presença das luzes (0..1), w: vídeo (0/1). */
    uDescent: { value: new THREE.Vector4() },
    /** Luzes: centro (px CSS, y para baixo), raio (px) e intensidade; cor (linear). */
    uOrb: { value: ORBS.map(() => new THREE.Vector4()) },
    uOrbCol: { value: ORBS.map(() => new THREE.Color()) },
    /** Forma: diagonal (±1), quanto estica, fase da borda (muda com a rolagem) e semente. */
    uOrbShape: { value: ORBS.map(() => new THREE.Vector4()) },
  };
}

export type DescentUniforms = ReturnType<typeof createDescentUniforms>;

export interface DescentState {
  width: number;
  height: number;
  /** Progresso da descida (0..1). */
  d: number;
  /** Presença das luzes (0..1): acendem com o corte A e apagam quando o símbolo vai para o Sobre. */
  presence: number;
  /** Centro do símbolo agora (px CSS, y para baixo). */
  symX: number;
  symY: number;
  /** Cursor (px CSS) e presença dele (0..1). */
  cursorX: number;
  cursorY: number;
  cursorOn: number;
  /** Tamanho do vídeo (px) ou zero se ainda não chegou. */
  videoW: number;
  videoH: number;
  /** Relógio da descida (s): só anda enquanto a descida está na tela (D-020). */
  time: number;
}

/** Atualiza os uniforms da descida (rolagem, cursor e o relógio da descida). */
export function updateDescent(u: DescentUniforms, s: DescentState) {
  const { width: W, height: H, d, time: t } = s;
  const m = Math.min(W, H);
  const wide = W / H;

  // Vídeo em "cover"; num vídeo mais alto que a tela, o recorte desce junto com a rolagem.
  if (s.videoW > 0 && s.videoH > 0) {
    const va = s.videoW / s.videoH;
    const pan = 0.12 + 0.76 * d;
    if (wide > va) {
      const fy = va / wide;
      u.uVideoFit.value.set(1, fy, 0, (1 - fy) * pan);
    } else {
      const fx = wide / va;
      u.uVideoFit.value.set(fx, 1, (1 - fx) / 2, 0);
    }
    u.uVideoBlur.value.set(VIDEO_BLUR / s.videoW, VIDEO_BLUR / s.videoH);
  }
  // Rolagem da descida em px (a descida tem cerca de 2 telas, D-030).
  u.uDescent.value.set(d * H * 2.05, d, s.presence, s.videoW > 0 ? 1 : 0);

  // Luzes: giram em volta do símbolo e trocam de cor. A órbita é mais larga em tela larga.
  const rx = wide >= 1 ? W * 0.5 : W * 0.62;
  const ry = wide >= 1 ? H * 0.42 : H * 0.3;
  ORBS.forEach((o, i) => {
    const a = Math.PI * 2 * (o.phase + o.dir * (ORBIT_TURNS * d + DRIFT.orbit * t));
    const parX = (s.cursorX - W / 2) * o.depth * s.cursorOn;
    const parY = (s.cursorY - H / 2) * o.depth * s.cursorOn;
    const on = smooth(span(d, o.from, o.from + 0.14));
    // Cada luz respira devagar (nunca apaga) e muda de forma: luz irregular, sem piscar.
    const breathe = 0.75 + 0.25 * Math.sin(Math.PI * 2 * (o.seed + d * 2.2 + DRIFT.breathe * t));
    u.uOrb.value[i].set(
      s.symX + Math.cos(a) * rx * o.orbit + parX,
      s.symY + Math.sin(a) * ry * o.orbit + parY,
      m * o.size,
      ORB_K * on * breathe * s.presence,
    );
    u.uOrbShape.value[i].set(
      o.axis,
      1.55 + 0.4 * Math.sin(Math.PI * 2 * (o.seed * 1.7 + d * 1.3 + DRIFT.shape * 0.7 * t)),
      Math.PI * 2 * (o.seed + d * 1.6 + DRIFT.shape * t),
      o.seed * 10,
    );
    paletteAt(o.hue + HUE_SPAN * d + DRIFT.hue * t, u.uOrbCol.value[i]);
  });
}

/**
 * Luzes da descida (px CSS, y para baixo): `orbsAt(pd)` é a cor (linear) que as luzes somam em `pd`.
 * Serve ao fundo (fragment) e à nuvem de nós (vertex).
 */
export const orbGlsl = /* glsl */ `
  uniform vec4 uDescent;
  uniform vec4 uOrb[3];
  uniform vec3 uOrbCol[3];
  uniform vec4 uOrbShape[3];

  float dHash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }
  float dNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x),
               mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // Luz irregular: mancha esticada numa diagonal da matriz (s.x = ±1), com a borda ondulada (s.z
  // muda com a rolagem) e recortada em manchas por ruído. s.y: quanto estica; s.w: semente.
  float orbAt(vec2 pd, vec4 o, vec4 s) {
    vec2 d = (pd - o.xy) / max(o.z, 1.0);
    vec2 q = vec2(d.x + s.x * d.y, d.y - s.x * d.x) * 0.70710678;
    q.x /= s.y;
    float a = atan(q.y, q.x + 1e-5);
    float wob = 1.0 + 0.26 * sin(3.0 * a + s.z) + 0.15 * sin(5.0 * a - 1.7 * s.z + s.w)
              + 0.1 * sin(2.0 * a + 0.6 * s.z + 2.0 * s.w);
    float r = length(q) / wob;
    float n = 0.65 * dNoise(q * 2.4 + vec2(0.35 * s.z, s.w)) + 0.35 * dNoise(q * 5.3 - vec2(s.w, 0.5 * s.z));
    return exp(-r * r * 2.6) * (0.3 + n) * o.w;
  }

  vec3 orbsAt(vec2 pd) {
    vec3 l = vec3(0.0);
    for (int i = 0; i < 3; i++) l += uOrbCol[i] * orbAt(pd, uOrb[i], uOrbShape[i]);
    return l;
  }
`;

/**
 * Fundo da descida (px CSS, y para baixo). Depende de lightGlsl (cursorAt, uRes) e hazeGlsl (uBg).
 */
export const descentGlsl = /* glsl */ `
  ${orbGlsl}
  uniform sampler2D uVideo;
  uniform vec4 uVideoFit;
  uniform vec2 uVideoBlur;

  const vec3 D_LUMA = vec3(0.2126, 0.7152, 0.0722);
  /** Ganho do vídeo (luz linear). Medido para o SC 2.3.1 em tools/flash-check.py (D-021). */
  const float VIDEO_GAIN = ${VIDEO_GAIN.toFixed(3)};
  /** Nível da mipmap lido em cada amostra: o vídeo já chega desfocado. */
  const float VIDEO_LOD = ${VIDEO_LOD.toFixed(2)};
  /** Teto suave da luminância somada ao fundo (segura o branco) e começo da compressão. */
  const float D_CAP = 0.4;
  const float D_KNEE = 0.24;

  vec3 videoTap(vec2 uv) { return texture2D(uVideo, vec2(uv.x, 1.0 - uv.y), VIDEO_LOD).rgb; }

  // Vídeo desfocado: o centro e 8 amostras em volta, nos eixos e nas diagonais da matriz 45°.
  vec3 videoAt(vec2 pd) {
    if (uDescent.w < 0.5) return vec3(0.0);
    vec2 uv = (pd / uRes) * uVideoFit.xy + uVideoFit.zw;
    vec2 o = uVideoBlur;
    vec2 a = o * 0.70710678;
    vec2 b = vec2(a.x, -a.y);
    vec3 v = videoTap(uv) * 0.2
           + (videoTap(uv + vec2(o.x, 0.0)) + videoTap(uv - vec2(o.x, 0.0))
            + videoTap(uv + vec2(0.0, o.y)) + videoTap(uv - vec2(0.0, o.y))) * 0.1
           + (videoTap(uv + a) + videoTap(uv - a) + videoTap(uv + b) + videoTap(uv - b)) * 0.1;
    // Um pouco menos de saturação, puxado para o azul da marca; os escuros continuam escuros.
    float l = dot(v, D_LUMA);
    return mix(v, l * vec3(0.55, 0.88, 1.3), 0.4);
  }

  vec3 descentAt(vec2 pd) {
    vec2 uv = pd / uRes - 0.5;
    uv.x *= uRes.x / uRes.y;
    float vig = smoothstep(0.25, 1.0, length(uv));
    vec3 base = mix(uBg * 0.55, uBgDeep * 0.8, vig * 0.8);

    vec3 lights = orbsAt(pd);
    // O cursor clareia um pouco o vídeo em volta dele (a página é iluminada por onde se olha).
    float cur = cursorAt(vec2(pd.x, uRes.y - pd.y));
    vec3 vid = videoAt(pd) * VIDEO_GAIN * (1.0 - 0.5 * vig) * (1.0 + 0.4 * cur);
    // As luzes tingem o vídeo por onde passam.
    vec3 add = vid * (1.0 + 6.0 * lights) + lights;

    // Compressão suave da luminância somada: nunca passa de D_CAP.
    float L = dot(add, D_LUMA);
    if (L > D_KNEE) {
      float Lc = D_KNEE + (D_CAP - D_KNEE) * (1.0 - exp(-(L - D_KNEE) / (D_CAP - D_KNEE)));
      add *= Lc / L;
    }
    return base + add;
  }
`;

/* ───────────────────────── Vídeo ───────────────────────── */

/** Distância das amostras do desfoque (px do vídeo). */
const VIDEO_BLUR = 7;

export interface DescentVideo {
  texture: THREE.Texture;
  /** Tamanho do vídeo (px); zero até o primeiro quadro. */
  size: THREE.Vector2;
  /** Liga (descida na tela) ou pausa o vídeo. Chamar a cada quadro: só age quando muda. */
  setActive(on: boolean): void;
  dispose(): void;
}

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Vídeo da descida: baixado inteiro (1,2 MB) e tocado de um blob, em loop e sem som, enquanto a
 * descida está na tela (D-020); fora dela, pausa. `onFrame` pede um quadro novo do canvas quando um
 * quadro do vídeo fica pronto.
 */
export function createDescentVideo(onFrame: () => void): DescentVideo {
  const video = document.createElement('video') as FrameVideo;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('loop', '');

  const texture = new THREE.Texture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Com mipmap: o desfoque lê níveis menores do vídeo (barato e sem serrilhado).
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  const size = new THREE.Vector2();
  let ready = false;
  let active = false;
  let url = '';
  let disposed = false;
  let frameId = 0;
  const ac = new AbortController();
  const rvfc = typeof video.requestVideoFrameCallback === 'function';

  const show = () => {
    if (disposed) return;
    texture.needsUpdate = true;
    onFrame();
  };
  // Cada quadro novo do vídeo vai para a textura (sem requestVideoFrameCallback: a cada quadro do canvas).
  const onVideoFrame = () => {
    frameId = 0;
    if (disposed || !active) return;
    show();
    frameId = video.requestVideoFrameCallback?.(onVideoFrame) ?? 0;
  };
  const sync = () => {
    if (!ready || disposed) return;
    if (active) {
      video.play().catch(() => {
        /* o navegador recusou: fica no quadro parado */
      });
      if (rvfc && !frameId) frameId = video.requestVideoFrameCallback?.(onVideoFrame) ?? 0;
    } else {
      video.pause();
      if (frameId) video.cancelVideoFrameCallback?.(frameId);
      frameId = 0;
    }
  };

  video.addEventListener('loadeddata', () => {
    if (disposed || ready) return;
    ready = true;
    size.set(video.videoWidth, video.videoHeight);
    // O three.js aloca a textura com video.width/height (atributos, 0 por padrão), não com videoWidth.
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    show();
    sync();
  });

  // Economia de dados ligada: a descida fica só com as luzes.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!conn?.saveData) {
    const webm = video.canPlayType('video/webm; codecs="vp9"') !== '';
    fetch(webm ? '/media/descida.webm' : '/media/descida.mp4', { signal: ac.signal })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (disposed) return;
        url = URL.createObjectURL(blob);
        video.src = url;
        video.load();
      })
      .catch(() => {
        /* sem vídeo: a descida fica só com as luzes */
      });
  }

  return {
    texture,
    size,
    setActive(on) {
      if (!rvfc && on && ready && !video.paused) texture.needsUpdate = true;
      if (on === active) return;
      active = on;
      sync();
    },
    dispose() {
      disposed = true;
      active = false;
      ac.abort();
      if (frameId) video.cancelVideoFrameCallback?.(frameId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (url) URL.revokeObjectURL(url);
      texture.dispose();
    },
  };
}
