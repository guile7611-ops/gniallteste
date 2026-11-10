/**
 * Nome e assinatura em metal 3D (D-013), extrudados dos paths do arquivo oficial do logo vertical.
 *
 * - A face da frente fica em z = 0, com a parede externa exatamente sobre o contorno do arquivo
 *   (chanfro para dentro): vista de frente, a silhueta e a posição são as do arquivo.
 * - A cor de cada path vem do próprio arquivo: o que é Ciano Cibernético vira metal ciano
 *   ("SOFTWARE &" e o pingo do i); o que é branco vira metal prata ("GNIALL" e "IA").
 * - O símbolo não entra aqui: ele já existe como as 4 peças em metal (pieces.ts).
 *
 * O arquivo nunca é alterado: só é lido (SVGLoader, que já vem com o three.js).
 * Espaço: o do grupo do símbolo (vb, origem no centro do símbolo, y para cima).
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R } from './pieces';
import { SYMBOL_CENTER_VB } from './symbolGeometry';

/** No arquivo vertical, o símbolo vai até y ≈ 624 e o nome começa em y ≈ 691 (vb). */
const SYMBOL_BOTTOM_VB = 660;
/** O nome (e o pingo do i) termina em y ≈ 888; a assinatura começa em y ≈ 923 (vb). */
const WORDMARK_BOTTOM_VB = 905;

/**
 * Profundidade da parede (vb) e chanfro. O nome acompanha a espessura das peças em repouso;
 * a assinatura tem traços de ~7 vb: sem chanfro, só uma placa fina.
 */
const WORDMARK = { depth: 40, bevel: 4.5, bevelThickness: 5, segments: 2 } as const;
const TAGLINE = { depth: 9, bevel: 0, bevelThickness: 0, segments: 0 } as const;

export interface LogoLetters {
  /** Paths em Ciano Cibernético no arquivo. */
  cyan: THREE.BufferGeometry;
  /** Paths brancos no arquivo. */
  silver: THREE.BufferGeometry;
  /** Faixa da coordenada diagonal q = (x + y)·√½ ocupada pelas letras (para a varredura). */
  qRange: [number, number];
}

function dedupe(pts: THREE.Vector2[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (const p of pts) {
    if (!out.length || out[out.length - 1].distanceToSquared(p) > 1e-8) out.push(p);
  }
  if (out.length > 2 && out[0].distanceToSquared(out[out.length - 1]) <= 1e-8) out.pop();
  return out;
}

/** vb do arquivo (y para baixo) → espaço do símbolo (y para cima). */
const toSymbolSpace = (v: THREE.Vector2) => new THREE.Vector2(v.x - SYMBOL_CENTER_VB.x, -(v.y - SYMBOL_CENTER_VB.y));

/** null se o arquivo não tiver os paths esperados (o logo HTML entra como antes). */
export function buildLogoLetters(svgText: string): LogoLetters | null {
  const data = new SVGLoader().parse(svgText);
  const groups = { cyan: { big: [] as THREE.Shape[], small: [] as THREE.Shape[] }, silver: { big: [] as THREE.Shape[], small: [] as THREE.Shape[] } };
  let qMin = Infinity;
  let qMax = -Infinity;

  for (const path of data.paths) {
    const fill = (path.userData?.style as { fill?: string } | undefined)?.fill;
    if (!fill || fill === 'none') continue;
    for (const shape of SVGLoader.createShapes(path)) {
      const { shape: outlineRaw, holes: holesRaw } = shape.extractPoints(14);
      let minY = Infinity;
      let maxY = -Infinity;
      for (const v of outlineRaw) {
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
      if (maxY < SYMBOL_BOTTOM_VB) continue; // símbolo: vem das peças
      const outline = dedupe(outlineRaw.map(toSymbolSpace));
      if (outline.length < 3) continue;
      const s = new THREE.Shape(outline);
      s.holes = holesRaw.map((h) => dedupe(h.map(toSymbolSpace))).filter((h) => h.length >= 3).map((h) => new THREE.Path(h));
      for (const v of outline) {
        const q = (v.x + v.y) * R;
        qMin = Math.min(qMin, q);
        qMax = Math.max(qMax, q);
      }
      // Branco (1, 1, 1) ou Ciano Cibernético (0, 210, 211): o vermelho separa os dois.
      const color = path.color.r > 0.5 ? groups.silver : groups.cyan;
      (minY < WORDMARK_BOTTOM_VB ? color.big : color.small).push(s);
    }
  }

  const extrude = (shapes: THREE.Shape[], o: typeof WORDMARK | typeof TAGLINE) => {
    if (!shapes.length) return null;
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth: o.depth,
      bevelEnabled: o.bevel > 0,
      bevelThickness: o.bevelThickness,
      bevelSize: o.bevel,
      bevelOffset: -o.bevel,
      bevelSegments: o.segments,
      curveSegments: 14,
    });
    // Frente da parede em z = 0 (a tampa chanfrada fica alguns vb à frente, por dentro do contorno).
    g.translate(0, 0, -o.depth);
    // Curvas suaves, quinas vivas.
    const creased = toCreasedNormals(g, Math.PI / 5);
    g.dispose();
    return creased;
  };

  const merge = (parts: (THREE.BufferGeometry | null)[]) => {
    const list = parts.filter((p): p is THREE.BufferGeometry => p !== null);
    if (!list.length) return null;
    // Só posição e normal: o metal não usa uv.
    for (const g of list) g.deleteAttribute('uv');
    const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (list.length > 1) list.forEach((g) => g.dispose());
    return merged;
  };

  const cyan = merge([extrude(groups.cyan.big, WORDMARK), extrude(groups.cyan.small, TAGLINE)]);
  const silver = merge([extrude(groups.silver.big, WORDMARK), extrude(groups.silver.small, TAGLINE)]);
  if (!cyan || !silver) {
    cyan?.dispose();
    silver?.dispose();
    return null;
  }
  cyan.computeBoundingSphere();
  silver.computeBoundingSphere();
  return { cyan, silver, qRange: [qMin, qMax] };
}
