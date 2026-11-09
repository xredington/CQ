"""Synthesize an original ambient-tech music bed + transition whooshes (no external assets)."""
import json, os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, "build/timeline.json")))
SR = 48000
T = TL["total"] + 0.5
n = int(T * SR)
t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(3)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

BPM = 112; beat = 60 / BPM; bar = beat * 4
# i - vi - IV - V style progression in D (D, Bm, G, A), voiced with 9ths
chords = [[50, 57, 62, 64, 66, 69], [47, 54, 59, 61, 62, 66], [43, 50, 55, 57, 59, 62], [45, 52, 57, 59, 61, 64]]
lp = lambda x, a: np.concatenate([[0], np.cumsum(np.diff(x) * 0)]) if False else x

def one_pole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y

# pads: soft detuned saw-ish (few harmonics), crossfaded per bar
for k in range(int(T / bar) + 1):
    c = chords[k % 4]; s0 = int(k * bar * SR); s1 = min(n, int((k + 1) * bar * SR + 0.8 * SR))
    if s0 >= n: break
    tt = t[s0:s1] - k * bar
    env = np.minimum(1, tt / 0.6) * np.minimum(1, np.maximum(0, (bar + 0.8 - tt) / 0.8))
    for m in c:
        f = hz(m + 12)
        for det, side in ((-0.12, 0), (0.12, 1)):
            ff = f * 2 ** (det / 12)
            w = sum(np.sin(2 * np.pi * ff * h * tt) / h ** 1.6 for h in (1, 2, 3))
            (L if side == 0 else R)[s0:s1] += 0.018 * env * w
    # bass
    fb = hz(c[0] - 12)
    for b in range(4):
        bs = int((k * bar + b * beat) * SR); be = min(n, bs + int(beat * SR))
        if bs >= n: break
        tb = t[bs:be] - (k * bar + b * beat)
        v = 0.09 * np.exp(-tb * 3.5) * np.sin(2 * np.pi * fb * tb)
        L[bs:be] += v; R[bs:be] += v
    # arpeggio plucks, 16ths
    arp = [c[2], c[3], c[4], c[5], c[4], c[3], c[2] + 12, c[5]]
    for j in range(16):
        ps = int((k * bar + j * beat / 4) * SR); pe = min(n, ps + int(0.35 * SR))
        if ps >= n: break
        tp = t[ps:pe] - (k * bar + j * beat / 4)
        f = hz(arp[j % 8] + 12)
        v = 0.022 * np.exp(-tp * 11) * (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(4 * np.pi * f * tp))
        pan = 0.5 + 0.35 * np.sin(j)
        L[ps:pe] += v * (1 - pan); R[ps:pe] += v * pan

# soft kick + hat from the 2nd scene on
start_beat = TL["scenes"][1]["start"]
for b in range(int((T - start_beat) / beat)):
    s = start_beat + b * beat; i0 = int(s * SR); i1 = min(n, i0 + int(0.3 * SR))
    tk = t[i0:i1] - s
    kick = 0.16 * np.exp(-tk * 18) * np.sin(2 * np.pi * (45 + 90 * np.exp(-tk * 40)) * tk)
    L[i0:i1] += kick; R[i0:i1] += kick
    h0 = int((s + beat / 2) * SR); h1 = min(n, h0 + int(0.05 * SR))
    if h0 < n:
        hn = rng.standard_normal(h1 - h0) * np.exp(-np.arange(h1 - h0) / SR * 90) * 0.02
        hn = hn - one_pole(hn, 6000)
        L[h0:h1] += hn; R[h0:h1] += hn

# whooshes into each scene + impact on the logo
for sc in TL["scenes"][1:]:
    s = sc["start"] - 0.55; i0 = max(0, int(s * SR)); i1 = min(n, i0 + int(0.8 * SR))
    m = i1 - i0; x = rng.standard_normal(m)
    env = np.sin(np.linspace(0, np.pi, m)) ** 2
    y = one_pole(x, 2500) * env * 0.12
    L[i0:i1] += y * np.linspace(1, .3, m); R[i0:i1] += y * np.linspace(.3, 1, m)
imp = TL["scenes"][1]["start"]; i0 = int(imp * SR); i1 = min(n, i0 + int(2.5 * SR)); ti = t[i0:i1] - imp
boom = 0.35 * np.exp(-ti * 2.2) * np.sin(2 * np.pi * (38 + 40 * np.exp(-ti * 8)) * ti)
L[i0:i1] += boom; R[i0:i1] += boom

# master fade in/out, soft clip
fade = np.minimum(1, t / 1.0) * np.minimum(1, np.maximum(0, (T - t) / 2.5))
out = np.tanh(np.stack([L, R], 1) * fade[:, None] * 1.6) * 0.8
pcm = (out * 32767).astype(np.int16)
with wave.open(os.path.join(HERE, "build/music.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("music", round(T, 2), "s")
