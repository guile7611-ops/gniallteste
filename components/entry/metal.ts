/**
 * Metal das peças (D-011, direção C): MeshPhysicalMaterial na cor do acento, com a varredura
 * do commit injetada no shader. Só aparece o que a frente diagonal já passou
 * (q = (x + y)·√½ no espaço do símbolo), com uma faixa de luz na frente.
 *
 * Passagem para o Sobre (D-015), opcional por material:
 * - `cut`: as letras (nome e assinatura) ficam no data center e somem com o corte diagonal;
 * - `depth`: as peças do símbolo passam por cima do corredor enquanto descem (só no passe
 *   principal; no reflexo do chão a profundidade é a real).
 *
 * Descida (D-019), opcional: `wash` soma ao metal o reflexo das luzes coloridas que giram em volta
 * do símbolo (difuso, brilho e borda). É soma, como o reflexo do verniz: o metal ciano não apaga o
 * vermelho de uma luz rosa. Fora da descida, `uWash` = 0.
 */
import * as THREE from 'three';
import { cutGlsl } from './light';

export interface ScanUniforms {
  uFront: { value: number };
  uCenter: { value: THREE.Vector2 };
  uScanColor: { value: THREE.Color };
}

type Uniform<T> = { value: T };

export interface MetalOptions {
  cut?: {
    uCut: Uniform<THREE.Vector4>;
    uRes: Uniform<THREE.Vector2>;
    uDpr: Uniform<number>;
    uReflect: Uniform<number>;
  };
  depth?: {
    uDepthBias: Uniform<number>;
    uReflect: Uniform<number>;
  };
  wash?: WashUniforms;
}

/** Luzes coloridas da descida no metal: cor (linear) e posição (espaço da câmera) de cada uma. */
export interface WashUniforms {
  uWash: Uniform<number>;
  uWashCol: Uniform<THREE.Color[]>;
  uWashPos: Uniform<THREE.Vector3[]>;
}

export const WASH_LIGHTS = 3;

export function createWashUniforms(): WashUniforms {
  return {
    uWash: { value: 0 },
    uWashCol: { value: Array.from({ length: WASH_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
    uWashPos: { value: Array.from({ length: WASH_LIGHTS }, () => new THREE.Vector3()) },
  };
}

const washGlsl = /* glsl */ `
  if (uWash > 0.0) {
    vec3 wV = normalize(vViewPosition);
    vec3 wP = -vViewPosition;
    float wF = pow(1.0 - clamp(dot(normal, wV), 0.0, 1.0), 2.0);
    vec3 wSum = vec3(0.0);
    for (int i = 0; i < ${WASH_LIGHTS}; i++) {
      vec3 wL = normalize(uWashPos[i] - wP);
      float wD = max(dot(normal, wL), 0.0);
      float wS = pow(max(dot(normal, normalize(wL + wV)), 0.0), 28.0);
      wSum += uWashCol[i] * (0.3 * wD + 0.9 * wS + 0.55 * wF * (0.4 + 0.6 * wD));
    }
    gl_FragColor.rgb += wSum * uWash;
  }
`;

export function createMetalMaterial(
  accent: string,
  scan: ScanUniforms,
  opts: MetalOptions = {},
): THREE.MeshPhysicalMaterial {
  const { cut, depth, wash } = opts;
  const m = new THREE.MeshPhysicalMaterial({
    color: accent,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
    emissive: accent,
    emissiveIntensity: 0.08,
    envMapIntensity: 1,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, scan, cut, depth, wash);
    let decl = 'uniform float uFront;\nuniform vec3 uScanColor;\nvarying float vSymQ;';
    if (cut || depth) decl += '\nuniform float uReflect;';
    if (cut) decl += `\nuniform vec2 uRes;\nuniform float uDpr;\n${cutGlsl}`;
    if (depth) decl += '\nuniform float uDepthBias;';
    if (wash) {
      decl += `\nuniform float uWash;\nuniform vec3 uWashCol[${WASH_LIGHTS}];\nuniform vec3 uWashPos[${WASH_LIGHTS}];`;
    }

    let clip = 'if (vSymQ > uFront) discard;';
    if (cut) {
      clip +=
        '\nif (uReflect < 0.5 && cutAt(vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr)).x > 0.5) discard;';
    }

    let tail = '{ float b = (uFront - vSymQ) / 16.0; gl_FragColor.rgb += uScanColor * exp(-b * b); }';
    if (wash) tail += washGlsl;
    if (depth) tail += '\ngl_FragDepth = uReflect < 0.5 ? max(gl_FragCoord.z - uDepthBias, 0.0) : gl_FragCoord.z;';

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uCenter;\nvarying float vSymQ;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSymQ = (transformed.x + uCenter.x + transformed.y + uCenter.y) * 0.70710678;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${decl}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${clip}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${tail}`);
  };
  // Materiais com as mesmas opções usam o mesmo código: um programa só na GPU (cada material
  // guarda seus uniforms).
  const key = `gniall-metal${cut ? '-cut' : ''}${depth ? '-depth' : ''}${wash ? '-wash' : ''}`;
  m.customProgramCacheKey = () => key;
  return m;
}
