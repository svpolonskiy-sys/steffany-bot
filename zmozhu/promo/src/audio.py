"""Синтез звукової доріжки для промо-ролика ZMOZHU (≈21 с, стерео, 44.1 кГц).

Усе генерується кодом, без сторонніх треків. Музика й ефекти в одній тональності
(ре мажор), ефекти лежать тихо під музичною подушкою.

Використання:  python3 zmozhu/promo/src/audio.py  [шлях/до/audio.wav]
"""

import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
DUR = 21.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

# Межі сцен — ті самі, що в brag.html
SCENES = [(0.0, 3.8), (3.8, 8.2), (8.2, 12.8), (12.8, 16.6), (16.6, DUR)]

# Акорди по сценах: D – Bm – G – A – D(add9)
PAD = [
    [50, 57, 62, 66],  # D3 A3 D4 F#4
    [47, 54, 59, 62],  # B2 F#3 B3 D4
    [43, 50, 55, 59],  # G2 D3 G3 B3
    [45, 52, 57, 61],  # A2 E3 A3 C#4
    [50, 57, 62, 66, 69],  # D3 A3 D4 F#4 A4
]
BASS = [38, 35, 31, 33, 38]
ARP = [
    [62, 66, 69, 74],
    [59, 62, 66, 71],
    [55, 59, 62, 67],
    [57, 61, 64, 69],
    [62, 66, 69, 74, 76],
]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


L = np.zeros(N)
R = np.zeros(N)
Ld = np.zeros(N)  # "сухі" (без реверберації): бас
Rd = np.zeros(N)


def add(buf, start_s, sig):
    i = int(start_s * SR)
    if i >= N:
        return
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i]


def env_adsr(n, a, r, total):
    t = np.arange(n) / SR
    e = np.ones(n)
    e = np.minimum(e, t / a if a > 0 else 1)
    rel_start = total - r
    e = np.where(t > rel_start, np.maximum(0, 1 - (t - rel_start) / r), e)
    return e


# ---------- Подушка ----------
for k, (s, e) in enumerate(SCENES):
    start = max(0.0, s - 0.3)
    end = min(DUR, e + 0.6)
    n = int((end - start) * SR)
    t = np.arange(n) / SR
    env = env_adsr(n, 0.9, 0.9, end - start)
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t + k)
    for vi, m in enumerate(PAD[k]):
        f = hz(m)
        for side, cents in ((0, -4), (1, 4)):
            ff = f * 2 ** (cents / 1200)
            sig = np.zeros(n)
            for h in range(1, 7):
                sig += np.sin(2 * np.pi * ff * h * t + vi * 0.7 + side) / h ** 1.7
            sig *= env * lfo * 0.030
            add(L if side == 0 else R, start, sig)
    # Бас
    fb = hz(BASS[k])
    b = (np.sin(2 * np.pi * fb * t) + 0.25 * np.sin(2 * np.pi * 2 * fb * t)) * env * 0.055
    add(Ld, start, b)
    add(Rd, start, b)

# ---------- Арпеджіо ----------
BPM = 92
STEP = 60 / BPM / 2  # восьмі
PATTERN = [0, 1, 2, 1, 3, 2, 1, 2]
SCENE_GAIN = [0.55, 0.85, 1.0, 1.0, 0.75]


def pluck(f, dur=1.4, tau=0.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    e = np.exp(-t / tau) * np.minimum(1, t / 0.006)
    return sig * e


t0 = 0.9
step_i = 0
while True:
    ts = t0 + step_i * STEP
    if ts > 20.2:
        break
    k = next(i for i, (s, e) in enumerate(SCENES) if s <= ts < e)
    notes = ARP[k]
    m = notes[PATTERN[step_i % len(PATTERN)] % len(notes)]
    vel = (0.075 if step_i % 4 == 0 else 0.05) * SCENE_GAIN[k]
    # Легке наростання на початку
    vel *= min(1.0, 0.35 + (ts - t0) / 3.0)
    sig = pluck(hz(m)) * vel
    pan = 0.3 if step_i % 2 else -0.3
    add(L, ts, sig * (1 - pan) / 1.3)
    add(R, ts, sig * (1 + pan) / 1.3)
    step_i += 1


# ---------- Дзвіночки на ключових моментах ----------
def bell(f, dur=3.0, tau=1.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    parts = [(1.0, 1.0), (2.0, 0.35), (2.76, 0.18), (5.4, 0.06)]
    sig = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (tau / r ** 0.5)) for r, a in parts)
    return sig * np.minimum(1, t / 0.004)


def bell_at(ts, midi, g, pan=0.0):
    s = bell(hz(midi)) * g
    add(L, ts, s * (1 - pan))
    add(R, ts, s * (1 + pan))


bell_at(0.25, 74, 0.05)             # старт хука, D5
bell_at(1.35, 78, 0.035, 0.2)       # «Складніше…», F#5
bell_at(3.85, 71, 0.05, -0.15)      # розкриття, B4
bell_at(8.25, 67, 0.05, 0.15)       # Міра, G4
for m_t in (9.35, 10.2, 11.15):     # поява повідомлень, E6 — м'який «поп»
    bell_at(m_t, 88, 0.018, 0.25)
bell_at(12.85, 69, 0.05, -0.15)     # внесок, A4
bell_at(15.3, 81, 0.04, 0.2)        # сума 2000 набрана, A5
bell_at(15.34, 88, 0.02, -0.2)      # E6
for i, m in enumerate((74, 78, 81, 86)):  # кнопка «Я ЗМОЖУ»: D5 F#5 A5 D6
    bell_at(18.72 + i * 0.07, m, 0.04, (-0.3, -0.1, 0.1, 0.3)[i])


# ---------- Тихі «друкування» у сцені з Мірою ----------
def click():
    n = int(0.012 * SR)
    c = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.002 * SR))
    return np.diff(c, prepend=0)  # грубий high-pass


for m_t in (9.35, 10.2, 11.15):
    ts = m_t - 0.62
    while ts < m_t - 0.05:
        c = click() * 0.010
        add(L, ts, c)
        add(R, ts, c * 0.8)
        ts += 0.105 + rng.uniform(-0.02, 0.02)


# ---------- Шелест переходів ----------
def whoosh(dur=0.6):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    spec = np.fft.rfft(noise)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    mask = np.exp(-((np.log(freqs + 1) - np.log(1400)) ** 2) / 0.9)
    s = np.fft.irfft(spec * mask, n)
    e = np.sin(np.pi * np.arange(n) / n) ** 2
    return s / (np.abs(s).max() + 1e-9) * e


for b in (3.8, 8.2, 12.8, 16.6):
    w = whoosh() * 0.030
    add(L, b - 0.45, w)
    add(R, b - 0.42, w)


# ---------- Реверберація ----------
def reverb(x, seconds=1.8, seed=0):
    n = int(seconds * SR)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / (0.45 * SR))
    ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y


WET = 0.28
Lm = L + WET * reverb(L, seed=1) + Ld
Rm = R + WET * reverb(R, seed=2) + Rd

# Загасання на початку й в кінці
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.12) * np.clip((DUR - t) / 1.6, 0, 1) ** 0.8
Lm *= fade
Rm *= fade

# М'який лімітер і нормалізація до −1 dBFS
peak = max(np.abs(Lm).max(), np.abs(Rm).max())
Lm, Rm = Lm / peak, Rm / peak
Lm, Rm = np.tanh(Lm * 1.2) / np.tanh(1.2), np.tanh(Rm * 1.2) / np.tanh(1.2)
Lm *= 0.89
Rm *= 0.89

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "work" / "audio.wav"
out.parent.mkdir(parents=True, exist_ok=True)
pcm = (np.stack([Lm, Rm], axis=1) * 32767).astype(np.int16)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(out, f"{DUR:.1f}s")
