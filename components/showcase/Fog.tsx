'use client';

/**
 * Névoa do mergulho (D-051): fumaça em camadas, em perspectiva, que a câmera atravessa conforme a
 * rolagem. Cada camada é ruído fractal num plano a uma profundidade; ao rolar, os planos vêm na
 * direção da tela, crescem e somem quando passam por ela, e o próximo assume. Luz fria vinda do
 * centro (a base lá embaixo), com um fio de ciano só no miolo. Só segue a rolagem: sem rolar, para.
 */
import { useEffect, useRef } from 'react';

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uFog;   // 0..1: quanto de névoa há
uniform float uDeep;  // 0..1: quanto a câmera já desceu
uniform float uTime;  // deriva própria, contínua enquanto a névoa está na tela (D-052)

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++){ v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(uv);

  // Fundo da névoa: azul noturno, mais claro no meio (luz de baixo atravessando).
  vec3 deep = vec3(0.047, 0.118, 0.212);
  vec3 mist = vec3(0.42, 0.52, 0.64);
  vec3 col = deep + vec3(0.06, 0.09, 0.13) * exp(-r * r * 2.5);
  float alpha = 1.0;

  // Camadas: profundidade z que diminui com a rolagem; perto da câmera elas crescem e somem.
  const int N = 7;
  float travel = uDeep * 4.0;
  for (int i = 0; i < N; i++){
    float fi = float(i);
    float z = mod(fi * (4.0 / float(N)) - travel, 4.0) + 0.15;
    float scale = 1.0 / z;
    vec2 q = uv * z * 1.6 + vec2(fi * 3.17, fi * 1.91);
    // Deriva leve com a profundidade (a fumaça gira devagar enquanto se desce).
    float a = fi * 0.9 + uDeep * (0.6 + fi * 0.1);
    q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    vec2 flow = vec2(uTime * (0.05 + fi * 0.012), -uTime * 0.03);
    vec2 w = vec2(fbm(q + 1.3 + flow), fbm(q - 2.7 - flow * 0.7));
    float d = fbm(q + w * 1.6 + vec2(sin(uTime * 0.4 + fi), cos(uTime * 0.3 + fi)) * 0.15);
    d = smoothstep(0.42, 0.85, d);
    // Some ao chegar perto (passa pela câmera) e ao ficar longe demais.
    float fade = smoothstep(0.15, 0.7, z) * (1.0 - smoothstep(2.8, 4.1, z));
    // Luz: mais clara perto do centro e nas bordas finas da fumaça.
    float light = 0.55 + 0.6 * exp(-r * r * (1.5 * scale * 0.3 + 1.0));
    vec3 c = mix(deep * 1.4, mist, light * (0.5 + 0.5 * d));
    col = mix(col, c, d * fade * 0.55);
  }

  // Fio de ciano no miolo (a lente da base, lá embaixo), só acento.
  col += vec3(0.0, 0.82, 0.83) * 0.05 * exp(-r * r * 30.0) * uDeep;

  // Vinheta.
  col *= 1.0 - 0.35 * smoothstep(0.4, 1.2, r);
  gl_FragColor = vec4(col, alpha * uFog);
}`;

export default function Fog({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('Fog shader:', gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uFog = gl.getUniformLocation(prog, 'uFog');
    const uDeep = gl.getUniformLocation(prog, 'uDeep');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let last = '';
    // Deriva (D-052): anda sozinha enquanto a névoa está na tela; fora dela, para.
    let lastScroll = '';
    let lastMove = -1e9;
    let t = 0;
    let prev = performance.now();
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const host = canvas.parentElement;
      if (!host) return;
      const cs = getComputedStyle(host);
      const fog = parseFloat(cs.getPropertyValue('--fog')) || 0;
      const deepV = parseFloat(cs.getPropertyValue('--deep')) || 0;
      // Meia resolução: a fumaça é macia, e assim pesa pouco.
      const dpr = Math.min(window.devicePixelRatio, 2) * 0.5;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      const now = performance.now();
      const sk = `${fog.toFixed(4)}|${deepV.toFixed(4)}`;
      if (sk !== lastScroll) { lastScroll = sk; lastMove = now; }
      // Mais rápida logo depois de rolar, nunca parada enquanto visível.
      const idle = Math.min(1, (now - lastMove) / 1500);
      const speed = fog > 0.001 ? 1 + 1.5 * (1 - idle) * (1 - idle) : 0;
      t += Math.min(0.05, (now - prev) / 1000) * speed;
      prev = now;
      const key = `${sk}|${t.toFixed(4)}|${w}|${h}`;
      if (key === last) return;
      last = key;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (fog <= 0.001) return;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uFog, fog);
      gl.uniform1f(uDeep, deepV);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      // Não perde o contexto: no modo estrito o mesmo canvas é montado de novo e o reaproveita.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
