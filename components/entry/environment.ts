/**
 * Ambiente de reflexo das peças em metal (D-011), gerado em código: nenhum HDRI baixado.
 *
 * Sala escura no Azul Noturno Soberano, com poucas fontes finas de luz branca: um anel no
 * horizonte (pega nas paredes e no chanfro), dois painéis verticais estreitos (riscos de brilho
 * quando o ambiente gira) e um painel no zênite (topo das peças quando a câmera fica de frente).
 * Superfícies grandes refletem quase só o escuro; o chanfro curvo varre várias direções e acende.
 * O metal tem a cor do acento, então o reflexo branco sai ciano, sem cor nova.
 *
 * Eixo vertical: +z (o chão da cena é o plano z = 0).
 */
import * as THREE from 'three';

function panel(w: number, h: number, color: THREE.Color, intensity: number) {
  const mat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export function buildEnvironment(gl: THREE.WebGLRenderer, bg: string, bgDeep: string): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgDeep).multiplyScalar(0.6);
  const white = new THREE.Color('#ffffff');
  const objects: THREE.Mesh[] = [];
  const add = (m: THREE.Mesh) => {
    objects.push(m);
    scene.add(m);
    return m;
  };

  // Chão escuro (abaixo do horizonte).
  const floor = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(bg).multiplyScalar(0.5), side: THREE.DoubleSide }),
    ),
  );
  floor.position.z = -0.6;

  // Anel de luz no horizonte (elevação ≈ 0–7°).
  const ring = add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 1.1, 96, 1, true),
      new THREE.MeshBasicMaterial({ color: white.clone().multiplyScalar(1.6), side: THREE.DoubleSide }),
    ),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.55;

  // Dois painéis verticais estreitos.
  for (const az of [0.95, -2.3]) {
    const p = add(panel(0.5, 5, white, 3.2));
    p.position.set(Math.cos(az) * 7, Math.sin(az) * 7, 2.5);
    p.up.set(0, 0, 1); // altura do painel na vertical, face voltada para o centro
    p.lookAt(0, 0, 2.5);
  }

  // Painel no zênite (elevação > ~70°): é o que as faces da frente refletem com a câmera de frente.
  // Degradê na diagonal da matriz (mais claro no alto, à esquerda, onde fica a luz pontual) e dois
  // riscos finos de luz, também a 45°. Vista de frente, cada letra ganha um degradê de metal; com a
  // inclinação do cursor, o reflexo corre na diagonal (D-013).
  const topGeo = new THREE.PlaneGeometry(4.4, 4.4, 12, 1);
  const pos = topGeo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / 4.4 + 0.5; // 0..1 ao longo do degradê
    const k = THREE.MathUtils.lerp(0.5, 1.45, u * u * (3 - 2 * u));
    colors.set([k, k, k], i * 3);
  }
  topGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const top = add(new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  top.position.z = 6;
  top.rotation.z = (3 * Math.PI) / 4; // degradê na direção (−1, 1)
  const D = Math.SQRT1_2;
  for (const [off, w, k] of [
    [0.3, 0.09, 2.1],
    [-0.9, 0.07, 1.5],
  ] as const) {
    const strip = add(panel(w, 7, white, k));
    strip.rotation.z = -Math.PI / 4; // comprimento na direção (1, 1)
    strip.position.set(-off * D, off * D, 5.97);
  }

  const pmrem = new THREE.PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.035, 0.1, 40);
  pmrem.dispose();
  for (const o of objects) {
    o.geometry.dispose();
    (o.material as THREE.Material).dispose();
  }
  return target;
}
