"""Synthesize the 90 s music bed (A minor, 120 BPM) whose sections follow the video's story.

  0-13   intro: warm pad fades in, soft arpeggio from 6 s
  13-41  platform run-through: four-on-the-floor kick, offbeat hats, bass, arpeggio
  41-46  "built separately": drums drop out, dark sustained pad
  46-53.6 tornado: pad swells (SFX riser carries the build), then hard cut to silence
  54     reveal: huge sustained chord; groove returns at 57.5 with claps
  57.5-86 full groove under architecture / integration / finale
  86-90  final chord rings out and fades

Usage: python3 music.py music.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 90.0
N = int(SR * DUR)
BEAT = 0.5          # 120 BPM
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)


def hz(note):
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o - 4)) / 12)


def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= N or i + len(sig) <= 0:
        return
    s = sig[max(0, -i):max(0, min(len(sig), N - i))]
    buf[max(i, 0):max(i, 0) + len(s)] += s * gain


def saw(f, t, harm=7, detune=0.0):
    out = np.zeros_like(t)
    for h in range(1, harm + 1):
        out += np.sin(2 * np.pi * f * (1 + detune) * h * t) / h ** 1.6
    return out


# chord progression: Am(add9) - Fmaj7 - C(add9) - G(6), 4 s each (2 bars)
CHORDS = [
    ('A1', ['A3', 'C4', 'E4', 'B4']),
    ('F1', ['F3', 'A3', 'C4', 'E4']),
    ('C2', ['G3', 'C4', 'E4', 'D5']),
    ('G1', ['G3', 'B3', 'D4', 'E4']),
]


def chord_at(t):
    return CHORDS[int(t // 4) % 4]


# ---------- pad: one chord block every 4 s with crossfades ----------
def pad_level(t):
    lv = np.interp(t, [0, 3, 13, 41, 42, 46, 53.4, 53.6, 54.5, 57.5, 86, 88.5, 90],
                      [0, .55, .6, .5, .65, .7, 1.0, 0, 0, .6, .6, .7, 0])
    return lv


for k in range(int(DUR // 4) + 1):
    t0 = k * 4.0
    if 53.6 <= t0 < 54:      # keep the silence beat clean
        continue
    seglen = 4.6
    t = np.arange(int(seglen * SR)) / SR
    env = np.minimum(1, t / 0.5) * np.minimum(1, np.maximum(0, (seglen - t) / 0.6))
    root, notes = chord_at(t0 + 0.01)
    sl = np.zeros_like(t); sr_ = np.zeros_like(t)
    for n in notes:
        f = hz(n)
        sl += saw(f, t, 6, -0.0025); sr_ += saw(f, t, 6, 0.0025)
    lv = pad_level(t0 + t)
    add(L, t0, sl * env * lv, 0.075); add(R, t0, sr_ * env * lv, 0.075)

# reveal chord at 54: wide, bright, long sustain (A minor add9 over A)
t = np.arange(int(8 * SR)) / SR
env = (1 - np.exp(-t * 30)) * np.exp(-t * 0.35)
big = np.zeros_like(t)
for n in ['A1', 'A2', 'E3', 'A3', 'C4', 'E4', 'B4', 'E5']:
    big += saw(hz(n), t, 8, 0.002 * (1 if n[-1] in '35' else -1))
add(L, 54.0, big * env, 0.045); add(R, 54.0, big * env, 0.045)

# final chord at 86 ringing out
t = np.arange(int(4 * SR)) / SR
env = (1 - np.exp(-t * 25)) * np.maximum(0, 1 - t / 4) ** 1.5
fin = sum(saw(hz(n), t, 8) for n in ['A1', 'A2', 'E3', 'A3', 'C4', 'E4', 'B4'])
add(L, 86.0, fin * env, 0.05); add(R, 86.0, fin * env, 0.05)


# ---------- drums ----------
def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 45 + 95 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)


def hat():
    t = np.arange(int(0.06 * SR)) / SR
    n = rng.standard_normal(len(t)); n = np.diff(np.diff(n, prepend=0), prepend=0)
    return n * np.exp(-t * 70) * 0.25


def clap():
    t = np.arange(int(0.25 * SR)) / SR
    n = rng.standard_normal(len(t)); n = np.diff(n, prepend=0)
    e = np.exp(-t * 22) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0) * (t < 0.03))
    return n * e * 0.35


K, H, C = kick(), hat(), clap()


def groove(a, b, claps=False, kick_gain=0.55):
    t = a
    while t < b - 1e-6:
        beat_no = int(round((t - a) / BEAT))
        add(L, t, K, kick_gain); add(R, t, K, kick_gain)
        add(L, t + BEAT / 2, H, 0.5); add(R, t + BEAT / 2, H, 0.65)
        if claps and beat_no % 2 == 1:
            add(L, t, C, 0.4); add(R, t, C, 0.4)
        t += BEAT


groove(13.0, 41.0, claps=False)
groove(57.5, 86.0, claps=True)
# tornado: heartbeat kicks that speed up into the cut
tb = 46.0
while tb < 53.4:
    add(L, tb, K, 0.5); add(R, tb, K, 0.5)
    tb += max(0.18, 0.6 - (tb - 46.0) * 0.06)


# ---------- bass: 8th-note pulse on the root ----------
def bassnote(f, length=0.24):
    t = np.arange(int(length * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 5) * np.minimum(1, t / 0.005)


for a, b in [(13.0, 41.0), (57.5, 86.0)]:
    t = a
    while t < b - 1e-6:
        root, _ = chord_at(t + 0.01)
        add(L, t, bassnote(hz(root) * 2), 0.22); add(R, t, bassnote(hz(root) * 2), 0.22)
        t += BEAT / 2


# ---------- arpeggio plucks (16ths in groove, 8ths in intro) ----------
def pluck(f):
    t = np.arange(int(0.35 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 9) * np.minimum(1, t / 0.003)


for a, b, step, g in [(6.0, 13.0, BEAT / 2, 0.05), (13.0, 41.0, BEAT / 4, 0.045), (57.5, 86.0, BEAT / 4, 0.05)]:
    t, j = a, 0
    while t < b - 1e-6:
        _, notes = chord_at(t + 0.01)
        seq = notes + notes[::-1][1:-1]
        f = hz(seq[j % len(seq)]) * 2
        pan = 0.5 + 0.35 * np.sin(j * 0.7)
        p = pluck(f)
        add(L, t, p, g * (1 - pan) * 2); add(R, t, p, g * pan * 2)
        t += step; j += 1

# ---------- master: fade in/out, normalize ----------
fade = np.ones(N)
fi = int(1.0 * SR); fade[:fi] = np.linspace(0, 1, fi)
fo = int(1.4 * SR); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L /= peak / 0.89; R /= peak / 0.89
st = np.stack([L, R], 1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print('music written')
