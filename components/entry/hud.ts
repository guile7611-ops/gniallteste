/**
 * HUD de medição (D-011): linhas finas sobre o chão, no espaço do símbolo (vb).
 *
 * - Cota de cada colchete: da posição de encaixe até a ponta atual, numa linha da matriz
 *   paralela ao braço (por fora dele), com linhas de chamada nas duas pontas e um traço
 *   a cada célula inteira.
 * - Marcas de registro: os 4 cantos de um quadrado da matriz em volta do símbolo. Girados 45°,
 *   viram chevrons (o mesmo gesto dos delimitadores de código do símbolo).
 *
 * Nenhum número é inventado: as coordenadas mostradas são as das pontas, em índices da matriz,
 * calculadas do estado real da animação.
 */
import * as THREE from 'three';
import { CELL_VB, R } from './pieces';

/** Segmentos máximos (cada um = 2 vértices). */
export const HUD_MAX_SEGMENTS = 64;
const Z = 1.5; // um pouco acima do chão (vb)

/** Distância da cota até a linha do braço (células). */
const DIM_OFFSET = 0.3;
const EXT = 0.16;
const TICK = 0.07;
const MARK_Q = 2.75;
const MARK_ARM = 0.38;

export function createHudGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(HUD_MAX_SEGMENTS * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setDrawRange(0, 0);
  return geometry;
}

/** q (células) → xy no espaço do símbolo (vb). */
export function qToXY(qx: number, qy: number, out: THREE.Vector3, z = Z): THREE.Vector3 {
  return out.set((qx - qy) * R * CELL_VB, (qx + qy) * R * CELL_VB, z);
}

/**
 * Reescreve a geometria do HUD.
 * @param tipR q.x da ponta do colchete direito (encaixe em 2), na linha q.y = −2
 * @param tipL q.x da ponta do colchete esquerdo (encaixe em −2), na linha q.y = 2
 */
export function writeHud(geometry: THREE.BufferGeometry, tipR: number, tipL: number) {
  const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  let n = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    if (n >= HUD_MAX_SEGMENTS) return;
    qToXY(ax, ay, a);
    qToXY(bx, by, b);
    arr.set([a.x, a.y, a.z, b.x, b.y, b.z], n * 6);
    n++;
  };

  // Cotas: direito (lado q.y < 0) e esquerdo (lado q.y > 0).
  const dims: [number, number, number][] = [
    [2, tipR, -1],
    [-2, tipL, 1],
  ];
  for (const [lock, tip, side] of dims) {
    const qy = side * (2 + DIM_OFFSET);
    if (Math.abs(tip - lock) > 0.02) {
      seg(lock, qy, tip, qy);
      const dir = Math.sign(tip - lock);
      for (let k = 1; k < Math.abs(tip - lock); k++) {
        const x = lock + dir * k;
        seg(x, qy - TICK, x, qy + TICK);
      }
    }
    // Linhas de chamada: no encaixe e na ponta atual.
    seg(lock, side * (2 + DIM_OFFSET - EXT), lock, side * (2 + DIM_OFFSET + EXT));
    seg(tip, side * (2 + DIM_OFFSET - EXT), tip, side * (2 + DIM_OFFSET + EXT));
  }

  // Marcas de registro.
  for (const [cx, cy] of [
    [MARK_Q, MARK_Q],
    [-MARK_Q, -MARK_Q],
    [MARK_Q, -MARK_Q],
    [-MARK_Q, MARK_Q],
  ]) {
    seg(cx, cy, cx - Math.sign(cx) * MARK_ARM, cy);
    seg(cx, cy, cx, cy - Math.sign(cy) * MARK_ARM);
  }

  geometry.setDrawRange(0, n * 2);
  attr.needsUpdate = true;
}

/** Âncora do rótulo de cada ponta (fora da cota, além da ponta). */
export function labelAnchor(tip: number, side: 1 | -1, out: THREE.Vector3): THREE.Vector3 {
  return qToXY(tip + Math.sign(tip) * 0.12, side * (2 + DIM_OFFSET + EXT + 0.12), out);
}

/** Texto do rótulo: índices inteiros da matriz, com sinal de menos tipográfico. */
export function formatQ(qx: number, qy: number): string {
  const f = (v: number) => {
    const r = Math.round(v);
    return r < 0 ? `−${-r}` : `${r === 0 ? 0 : r}`;
  };
  return `[${f(qx)}, ${f(qy)}]`;
}
