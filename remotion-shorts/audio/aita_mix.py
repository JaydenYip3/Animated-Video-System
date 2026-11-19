# Sound for the AITA test (first 10.8 s): voice (gain only) + an original light pizzicato / glock bed in F major
# (F Dm Bb C, 116 bpm), ducked under the voice from words.json, + synthesized SFX on the picture events.
# Standard mix: music bed -10 LU under the voice (= the +3 dB music standard), SFX events -6 dB from the bridge level,
# master -15 LUFS integrated, <= -1 dBTP. Writes ../out/aita/mix.wav (48 kHz stereo, exactly 10.800 s) + stems.
import json
import os
import numpy as np
from dsp import SR, ns, st, dbg, rng, read_wav, write_wav, integrated, momentary_max, true_peak, place, pan, fades, lp
from instruments import m2f, pluck, glock, pad, musicbox, brush, triangle
from sfx_gen import whoosh, bird_chirps, breeze

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DUR = 10.8
N = ns(DUR)
FPS = 30
BPM = 116
B = 60 / BPM


def voice():
    v = read_wav(os.path.join(ROOT, "voice/aita/voice_full.wav"))
    v = v[0] if isinstance(v, tuple) else v
    v = st(v)[:, :N]
    out = np.zeros((2, N))
    out[:, : v.shape[1]] = v
    out[:, ns(10.62):] *= np.linspace(1, 0, N - ns(10.62))[None, :] ** 2  # cut after "four", before "we've"
    return out


def music():
    r = rng(7)
    m = np.zeros((2, N + ns(3)))
    chords = [(53, [65, 69, 72]), (50, [62, 65, 69]), (46, [62, 65, 70]), (48, [64, 67, 72]), (53, [65, 69, 72]), (50, [62, 65, 69])]
    t0 = 0.12
    for bar, (root, tri) in enumerate(chords):
        tb = t0 + bar * 4 * B
        if tb > DUR:
            break
        place(m, pan(pluck(m2f(root - 12), 0.9, r, 0.6, 0.3), -0.1), tb)              # bass on 1
        place(m, pan(pluck(m2f(root - 5), 0.7, r, 0.5, 0.3), -0.1), tb + 2 * B)       # fifth on 3
        for k in (1, 3):                                                               # offbeat chord plucks on 2, 4
            for j, n in enumerate(tri):
                place(m, pan(pluck(m2f(n), 0.32, r, 0.35, 0.6), 0.25 * (j - 1)), tb + k * B + 0.006 * j)
        place(m, pad([m2f(n) for n in tri], 4 * B, 0.12, r, att=0.4, rel=0.6), tb)
        place(m, pan(brush(0.25, r, 0.2), 0.3), tb + 1 * B)
        place(m, pan(brush(0.25, r, 0.2), 0.3), tb + 3 * B)
    # glock motif: a cheeky question on the hook, an answer after the flash, music box for "since we were four"
    mel = [(0.0, 72), (0.5, 74), (1.0, 76), (2.0, 72), (6.0, 77), (6.5, 76), (7.0, 74), (8.0, 72), (12.0, 70), (12.5, 72), (13.0, 74), (14.0, 76)]
    for b_, n in mel:
        place(m, pan(glock(m2f(n + 12), 0.38, r, 1.4), 0.2), t0 + b_ * B)
    for k, n in enumerate([84, 88, 91, 96, 91, 88]):
        place(m, pan(musicbox(m2f(n), 0.5, r, 1.6), -0.2 + 0.08 * k), 9.72 + k * B / 2)
    m = m[:, :N]
    m[:, ns(10.3):] *= np.linspace(1, 0, N - ns(10.3))[None, :] ** 1.5
    return m


def duck(words):
    """-3 dB under speech (from the word table, not the audio), 70 ms attack / 450 ms release"""
    g = np.zeros(N)
    for w in words:
        if w["s"] < DUR:
            g[ns(max(0, w["s"] - 0.08)): ns(min(DUR, w["e"] + 0.12))] = 1
    k = np.exp(-np.arange(ns(0.45)) / ns(0.15))
    g = np.minimum(1, np.convolve(g, k / k.sum() * 3, "same"))
    return dbg(-3.0 * g)


def sfx():
    r = rng(11)
    s = np.zeros((2, N + ns(2)))
    ev = []
    def at(f, x, name, p=0.0, g=1.0):
        place(s, pan(x, p) if np.ndim(x) == 1 else x, f / FPS, g); ev.append((f, name))
    at(74 - 9, whoosh(0.5, r, peak=0.3, f_lo=500, f_hi=3000, tail=0.12), "whoosh into the CU on 'ruining'", 0.3)
    at(76, triangle(0.6, r, 0.9, 1760.0), "ting on Loreen's shock", 0.2, 0.7)
    at(150, glock(m2f(96), 0.6, r, 1.6), "bell on the white flash")
    at(182, whoosh(0.8, r, peak=0.4, f_lo=300, f_hi=1500, tail=0.2), "glide me -> Loreen", 0.2, 0.6)
    at(228 - 6, whoosh(0.35, r, peak=0.2, f_lo=700, f_hi=3500, tail=0.1), "cut to the wide", -0.2, 0.7)
    at(286, whoosh(1.0, r, peak=0.5, f_lo=900, f_hi=4000, tail=0.3, air=0.4), "shimmer into the flashback", 0, 0.6)
    amb = st(breeze(DUR, r, 0.5)) * 0.4 + pan(bird_chirps(DUR, r, 0.35), 0.4) * 0.5
    s = s[:, :N]
    return s, amb, ev


def main():
    words = json.load(open(os.path.join(ROOT, "voice/aita/words.json")))
    v = voice()
    lv = integrated(v)
    m = music()
    m *= dbg((lv - 10.0) - integrated(m))           # bed 10 LU under the voice (+3 dB standard)
    m *= duck(words)[None, :]
    s, amb, ev = sfx()
    s *= dbg((lv - 12.0) - momentary_max(s))         # events: bridge -6 standard
    amb *= dbg((lv - 24.0) - integrated(amb))
    s = s + amb
    mix = v + m + s
    g = dbg(-15.0 - integrated(mix))
    mix *= g
    tp = true_peak(mix)
    if tp > -1.2:
        mix *= dbg(-1.2 - tp)
    mix = fades(mix, 0.002, 0.05)
    out = os.path.join(ROOT, "out/aita")
    os.makedirs(out, exist_ok=True)
    write_wav(os.path.join(out, "mix.wav"), mix)
    for name, x in (("voice", v), ("music", m), ("sfx", s)):
        write_wav(os.path.join(out, f"stem_{name}.wav"), x * g)
    print(f"voice {lv:.1f} LUFS | mix {integrated(mix):.1f} LUFS, TP {true_peak(mix):.1f} dBTP, {mix.shape[1] / SR:.3f} s")
    for f, n in ev:
        print(f"  f{f:4d} {f / FPS:6.2f}s  {n}")


if __name__ == "__main__":
    main()
