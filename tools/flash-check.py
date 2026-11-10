"""SC 2.3.1: conta flashes do vídeo da descida depois do ganho aplicado no shader.

Uso: python -I flash_check.py <video> <ganho> [teto]
Flash (WCAG): par de variações opostas de luminância relativa >= 0,1, com a mais escura < 0,8.
Reprova se houver mais de 3 flashes em 1 s numa área >= 25% de 10° do campo visual
(aprox. 341x256 px numa tela 1024x768). Aqui: blocos da imagem e a média da tela toda.
"""
import subprocess
import sys

import numpy as np

path = sys.argv[1]
gain = float(sys.argv[2])
cap = float(sys.argv[3]) if len(sys.argv) > 3 else 9.0
W, H = 54, 96
raw = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    capture_output=True, check=True,
).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float64) / 255.0
lin = np.where(fr <= 0.04045, fr / 12.92, ((fr + 0.055) / 1.055) ** 2.4)
Y = lin @ np.array([0.2126, 0.7152, 0.0722])
# Ganho do shader e teto suave.
Y = Y * gain
Y = cap * (1 - np.exp(-Y / cap)) if cap < 9 else Y
# Fundo escuro somado (aprox. o azul da marca escurecido).
Y = Y + 0.006
fps = 24
n = len(Y)
print(f"quadros {n}, {n / fps:.1f} s, luminância média {Y.mean():.4f}, máx {Y.max():.4f}")


def flashes(series):
    """Instantes (quadros) em que se completa um par de variações opostas >= 0,1."""
    events = []
    ref = series[0]
    lo = hi = ref
    direction = 0
    last_change = None
    for i, v in enumerate(series):
        if direction >= 0 and v <= hi - 0.1 and min(v, hi) < 0.8:
            if direction == 1:
                events.append(i)
            direction = -1
            lo = v
            hi = v
            continue
        if direction <= 0 and v >= lo + 0.1 and min(v, lo) < 0.8:
            if direction == -1:
                events.append(i)
            direction = 1
            lo = v
            hi = v
            continue
        hi = max(hi, v)
        lo = min(lo, v)
    return events


# Blocos de ~1/4 da tela (a área de flash relevante é grande).
worst = 0
by, bx = H // 4, W // 2
for y0 in range(0, H - by + 1, by // 2):
    for x0 in range(0, W - bx + 1, bx // 2):
        s = Y[:, y0 : y0 + by, x0 : x0 + bx].mean(axis=(1, 2))
        # com o loop: emenda o fim no começo
        s = np.concatenate([s, s[: fps * 2]])
        ev = flashes(s)
        for e in ev:
            k = sum(1 for f in ev if e <= f < e + fps)
            worst = max(worst, k)
print("pior número de flashes em 1 s (blocos):", worst)
m = np.concatenate([Y.mean(axis=(1, 2)), Y.mean(axis=(1, 2))[: fps * 2]])
d = np.abs(np.diff(m))
print("maiores variações quadro a quadro da média:", np.round(np.sort(d)[-6:], 4))
cuts = np.where(d > 0.01)[0]
print("cortes (s):", np.round(cuts / fps, 2))
