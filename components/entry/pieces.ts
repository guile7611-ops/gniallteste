/**
 * Peças do símbolo oficial para a entrada v2 (D-009, D-011).
 *
 * - Geometria: as 4 subformas do path oficial (symbolGeometry.ts), extrudadas "para cima"
 *   a partir do chão (z = 0). O chanfro é para dentro (bevelOffset = −bevelSize): as paredes
 *   externas ficam exatamente sobre o contorno oficial, e a silhueta vista de frente não muda.
 * - Alvos do enxame: pontos de uma subgrade da matriz 45° (1/9 da célula) que caem dentro do
 *   contorno oficial, empilhados em camadas na altura da peça.
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import {
  SYMBOL_CENTER_VB,
  SYMBOL_IN_VERTICAL_LOGO as SYM,
  SYMBOL_PATH_D,
  SYMBOL_TIP_DIAGONAL_LOCAL,
} from './symbolGeometry';

export const R = Math.SQRT1_2;

/** Célula da matriz em unidades do viewBox: metade da distância diagonal centro→ponta do colchete. */
export const CELL_VB = (SYMBOL_TIP_DIAGONAL_LOCAL / 2) * SYM.a;
/** Subgrade dos nós do enxame (na diagonal). */
export const SUB_VB = CELL_VB / 9;
/** Espessura de cada camada de nós. */
export const LAYER_VB = SUB_VB * R;
export const LAYERS = 8;
/** Altura das peças sólidas (e do volume preenchido pelos nós). */
export const PIECE_HEIGHT = LAYER_VB * LAYERS;

const BEVEL = { thickness: 8, size: 7, segments: 3 } as const;

export type PieceId = 'right' | 'left' | 'nodeA' | 'nodeB';

export interface PieceDef {
  id: PieceId;
  geometry: THREE.ExtrudeGeometry;
  /** Centro da peça, em unidades do viewBox, relativo ao centro do símbolo (y para cima). */
  center: THREE.Vector2;
  /** Caixa da peça no espaço local (centrado). */
  box: THREE.Box2;
  /** Alvos do enxame no espaço local: x, y, z por nó. */
  targets: Float32Array;
  /** Coordenada diagonal (q = (x + y)·√½, no espaço do símbolo) de cada alvo. */
  targetQ: Float32Array;
  /** Faixa de q ocupada pelo contorno da peça. */
  qRange: [number, number];
}

/** Remove pontos repetidos em sequência (o chanfro do three.js gera NaN com arestas de comprimento zero). */
function dedupe(pts: THREE.Vector2[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (const p of pts) {
    if (!out.length || out[out.length - 1].distanceToSquared(p) > 1e-8) out.push(p);
  }
  if (out.length > 2 && out[0].distanceToSquared(out[out.length - 1]) <= 1e-8) out.pop();
  return out;
}

function inside(poly: THREE.Vector2[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function edgeDistance(poly: THREE.Vector2[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    const ex = a.x + dx * t - x;
    const ey = a.y + dy * t - y;
    best = Math.min(best, ex * ex + ey * ey);
  }
  return Math.sqrt(best);
}

function sampleTargets(outline: THREE.Vector2[], holes: THREE.Vector2[][], center: THREE.Vector2, box: THREE.Box2) {
  const s = SUB_VB;
  const margin = s * 0.22;
  const minX = box.min.x + center.x;
  const maxX = box.max.x + center.x;
  const minY = box.min.y + center.y;
  const maxY = box.max.y + center.y;
  const i0 = Math.floor(((minX + minY) * R) / s) - 1;
  const i1 = Math.ceil(((maxX + maxY) * R) / s) + 1;
  const j0 = Math.floor(((minY - maxX) * R) / s) - 1;
  const j1 = Math.ceil(((maxY - minX) * R) / s) + 1;

  const xyz: number[] = [];
  const qs: number[] = [];
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      // Subgrade ancorada no centro do símbolo, como a matriz de fundo.
      const qx = (i + 0.5) * s;
      const qy = (j + 0.5) * s;
      const x = (qx - qy) * R - center.x;
      const y = (qx + qy) * R - center.y;
      if (!inside(outline, x, y)) continue;
      if (holes.some((h) => inside(h, x, y))) continue;
      if (edgeDistance(outline, x, y) < margin) continue;
      for (let k = 0; k < LAYERS; k++) {
        xyz.push(x, y, (k + 0.5) * LAYER_VB);
        qs.push(qx);
      }
    }
  }
  return { targets: new Float32Array(xyz), targetQ: new Float32Array(qs) };
}

export function buildPieces(): PieceDef[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${SYMBOL_PATH_D}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => p.toShapes());

  // path do símbolo → viewBox do logo vertical → relativo ao centro do símbolo, y para cima.
  const toSymbolSpace = (v: THREE.Vector2) =>
    new THREE.Vector2(SYM.a * v.x + SYM.e - SYMBOL_CENTER_VB.x, -(SYM.d * v.y + SYM.f - SYMBOL_CENTER_VB.y));

  const raw = shapes.map((shape) => {
    const { shape: outlineRaw, holes: holesRaw } = shape.extractPoints(16);
    const pts = dedupe(outlineRaw.map(toSymbolSpace));
    const symBox = new THREE.Box2().setFromPoints(pts);
    const center = symBox.getCenter(new THREE.Vector2());
    const size = symBox.getSize(new THREE.Vector2());

    const outline = pts.map((v) => v.clone().sub(center));
    const holes = holesRaw.map((h) => dedupe(h.map(toSymbolSpace)).map((v) => v.sub(center)));
    const box = new THREE.Box2().setFromPoints(outline);

    const s = new THREE.Shape(outline);
    s.holes = holes.map((h) => new THREE.Path(h));
    const geometry = new THREE.ExtrudeGeometry(s, {
      depth: PIECE_HEIGHT - 2 * BEVEL.thickness,
      bevelEnabled: true,
      bevelThickness: BEVEL.thickness,
      bevelSize: BEVEL.size,
      bevelOffset: -BEVEL.size,
      bevelSegments: BEVEL.segments,
      curveSegments: 1,
    });
    geometry.translate(0, 0, BEVEL.thickness); // base no chão (z = 0), topo em PIECE_HEIGHT

    let qMin = Infinity;
    let qMax = -Infinity;
    for (const v of pts) {
      const q = (v.x + v.y) * R;
      qMin = Math.min(qMin, q);
      qMax = Math.max(qMax, q);
    }

    const { targets, targetQ } = sampleTargets(outline, holes, center, box);
    return { geometry, center, box, targets, targetQ, qRange: [qMin, qMax] as [number, number], area: size.x * size.y };
  });

  raw.sort((a, b) => b.area - a.area);
  const [b1, b2, n1, n2] = raw;
  const [right, left] = b1.center.x > b2.center.x ? [b1, b2] : [b2, b1];
  const [nodeA, nodeB] = n1.center.y > n2.center.y ? [n1, n2] : [n2, n1];
  const pick = (id: PieceId, r: (typeof raw)[number]): PieceDef => ({
    id,
    geometry: r.geometry,
    center: r.center,
    box: r.box,
    targets: r.targets,
    targetQ: r.targetQ,
    qRange: r.qRange,
  });
  return [pick('right', right), pick('left', left), pick('nodeA', nodeA), pick('nodeB', nodeB)];
}
